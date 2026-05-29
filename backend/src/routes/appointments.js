const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/appointments
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    // FIX: Single query with `include` replaces the N+1 loop.
    // Previously: 1 query for appointments + 2 queries (patient + doctor) per row.
    // Now: 1 query total, Prisma uses JOINs under the hood.
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

    res.json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    console.error('[APPOINTMENTS] List error:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/appointments
// ---------------------------------------------------------------------------
router.post('/', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    if (!patientId || !doctorId || !appointmentDate) {
      return res.status(400).json({ error: 'patientId, doctorId, and appointmentDate are required.' });
    }

    const appDate = new Date(appointmentDate);
    if (isNaN(appDate.getTime())) {
      return res.status(400).json({ error: 'Invalid appointmentDate format.' });
    }

    // FIX: The @@unique([doctorId, appointmentDate]) constraint in the schema is the true
    // guardian against double-booking. The old millisecond-level check was trivially bypassed.
    // We attempt the create inside a try/catch; if the unique constraint fires (Prisma P2002),
    // we return a clear 409 Conflict instead of a generic 500.
    //
    // For slot-based systems you would also validate here that appDate falls within the
    // doctor's availableFrom..availableTo window — left as a domain-specific extension.
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        appointmentDate: appDate,
        reason: reason || '',
        status: 'PENDING',
      },
      include: {
        patient: { select: { id: true, name: true, phoneNumber: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
    });

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'This doctor already has an appointment at the requested date and time.',
      });
    }
    console.error('[APPOINTMENTS] Create error:', error);
    res.status(500).json({ error: 'Failed to book appointment.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/appointments/:id
// ---------------------------------------------------------------------------
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required.' });
    }

    // FIX: Validate status against the enum before hitting the DB.
    const validStatuses = ['PENDING', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}.` });
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    console.error('[APPOINTMENTS] Update error:', error);
    res.status(500).json({ error: 'Failed to update appointment.' });
  }
});

module.exports = router;