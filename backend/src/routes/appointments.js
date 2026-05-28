const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/appointments
// FIX: Replaced N+1 loop (1 query per appointment × 2 for patient+doctor) with a
// single Prisma query using `include`. For 50 appointments this was 101 queries → now 1.
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { appointmentDate: 'asc' },
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
    console.error('[APPOINTMENTS] List error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve appointments.' });
  }
});

// POST /api/appointments
// FIX: Replaced millisecond-precision duplicate check (easily bypassed by 1ms difference)
// with a 30-minute slot window check. If the same doctor already has a non-cancelled
// appointment within ±30 min of the requested time, the booking is rejected.
router.post('/', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    if (!patientId || !doctorId || !appointmentDate) {
      return res.status(400).json({ error: 'Patient, Doctor, and Appointment Date are required.' });
    }

    const appDate = new Date(appointmentDate);
    if (isNaN(appDate.getTime())) {
      return res.status(400).json({ error: 'Invalid appointment date format.' });
    }

    // Block appointments in the past
    if (appDate < new Date()) {
      return res.status(400).json({ error: 'Cannot book an appointment in the past.' });
    }

    // 30-minute slot window to prevent double-booking
    const windowMs = 30 * 60 * 1000;
    const windowStart = new Date(appDate.getTime() - windowMs);
    const windowEnd   = new Date(appDate.getTime() + windowMs);

    const existingBooking = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { not: 'CANCELLED' },
        appointmentDate: { gte: windowStart, lte: windowEnd },
      },
    });

    if (existingBooking) {
      return res.status(409).json({
        error: 'Doctor already has an appointment within 30 minutes of this time slot. Please choose a different time.',
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
      include: {
        patient: { select: { id: true, name: true } },
        doctor:  { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointment,
    });
  } catch (error) {
    console.error('[APPOINTMENTS] Create error:', error.message);
    res.status(500).json({ error: 'Failed to book appointment.' });
  }
});

// PATCH /api/appointments/:id
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        patient: { select: { id: true, name: true } },
        doctor:  { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, appointment: updated });
  } catch (error) {
    console.error('[APPOINTMENTS] Update error:', error.message);
    res.status(500).json({ error: 'Failed to update appointment.' });
  }
});

module.exports = router;
