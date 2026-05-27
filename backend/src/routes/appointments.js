const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/appointments
// FIX: Replaced N+1 loop with Prisma include (single JOIN query)
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { appointmentDate: 'asc' },
      // FIX: Single query with JOIN instead of N+1 per-appointment lookups
      include: {
        patient: {
          select: { id: true, name: true, phoneNumber: true, age: true, medicalHistory: true },
        },
        doctor: {
          select: { id: true, name: true, specialization: true },
        },
      },
    });

    res.json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error('Appointments fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments.' });
  }
});

// POST /api/appointments
// FIX: Proper duplicate detection — checks date range (same hour slot) not exact millisecond
router.post('/', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    if (!patientId || !doctorId || !appointmentDate) {
      return res.status(400).json({ error: 'Patient, Doctor, and Appointment Date are required.' });
    }

    const appDate = new Date(appointmentDate);
    if (isNaN(appDate.getTime())) {
      return res.status(400).json({ error: 'Invalid appointment date.' });
    }

    // FIX: Check for bookings within a ±30 minute window of the requested slot
    const windowStart = new Date(appDate.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(appDate.getTime() + 30 * 60 * 1000);

    const existingBooking = await prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate: { gte: windowStart, lte: windowEnd },
        status: { not: 'CANCELLED' },
      },
    });

    if (existingBooking) {
      return res.status(409).json({
        error: 'Doctor already has an appointment within 30 minutes of this slot.',
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        appointmentDate: appDate,
        reason: reason || '',
        status: 'PENDING',
      },
    });

    res.status(201).json({ message: 'Appointment booked successfully', appointment });
  } catch (error) {
    console.error('Appointment create error:', error);
    res.status(500).json({ error: 'Failed to book appointment.' });
  }
});

// PATCH /api/appointments/:id
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const VALID_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json(updated);
  } catch (error) {
    console.error('Appointment update error:', error);
    res.status(500).json({ error: 'Failed to update appointment.' });
  }
});

module.exports = router;
