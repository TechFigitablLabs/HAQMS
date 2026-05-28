const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/queue
// Public monitor listing for queue tokens
router.get('/', async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const tokens = await prisma.queueToken.findMany({
      where,
      include: {
        patient: true,
        doctor: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve queue', details: error.message });
  }
});

// POST /api/queue/checkin
// Generate a queue token for a patient (idempotent for active same-day check-ins)
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentId, forceReassign } = req.body;

    if (!patientId || !doctorId) {
      return res.status(400).json({ error: 'Patient and Doctor ID are required for check-in.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tokenResult = await prisma.$transaction(async (tx) => {
      // Lock per doctor/day token generation to prevent duplicate token numbers under concurrency.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`queue:${doctorId}:${today.toISOString().slice(0, 10)}`}));`;

      // If patient is already active under another doctor today, require explicit reassignment confirmation.
      const existingActiveAnyDoctor = await tx.queueToken.findFirst({
        where: {
          patientId,
          createdAt: { gte: today },
          status: { in: ['WAITING', 'CALLING'] },
        },
        include: {
          patient: true,
          doctor: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (
        existingActiveAnyDoctor &&
        existingActiveAnyDoctor.doctorId !== doctorId &&
        !forceReassign
      ) {
        return {
          needsReassignConfirmation: true,
          existingToken: existingActiveAnyDoctor,
        };
      }

      if (
        existingActiveAnyDoctor &&
        existingActiveAnyDoctor.doctorId !== doctorId &&
        forceReassign
      ) {
        // Close previous active token before assigning a new doctor.
        await tx.queueToken.update({
          where: { id: existingActiveAnyDoctor.id },
          data: { status: 'SKIPPED' },
        });
      }

      // Idempotency: if the patient already has an active token for this doctor today, return it.
      const existingActiveToken = await tx.queueToken.findFirst({
        where: {
          patientId,
          doctorId,
          createdAt: { gte: today },
          status: { in: ['WAITING', 'CALLING'] },
        },
        include: {
          patient: true,
          doctor: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingActiveToken) {
        return { token: existingActiveToken, created: false };
      }

      const maxTokenResult = await tx.queueToken.aggregate({
        where: {
          doctorId,
          createdAt: { gte: today },
        },
        _max: {
          tokenNumber: true,
        },
      });

      const nextTokenNumber = (maxTokenResult._max.tokenNumber || 0) + 1;

      const newToken = await tx.queueToken.create({
        data: {
          tokenNumber: nextTokenNumber,
          patientId,
          doctorId,
          appointmentId: appointmentId || null,
          status: 'WAITING',
        },
        include: {
          patient: true,
          doctor: true,
        },
      });

      return { token: newToken, created: true };
    });

    if (tokenResult.needsReassignConfirmation) {
      return res.status(409).json({
        error: `Patient is already assigned to Dr. ${tokenResult.existingToken.doctor.name} with active Token #${tokenResult.existingToken.tokenNumber}. Reassign?`,
        requiresReassign: true,
        existingToken: tokenResult.existingToken,
      });
    }

    res.status(tokenResult.created ? 201 : 200).json({
      message: tokenResult.created
        ? 'Checked in successfully. Token generated.'
        : 'Patient already has an active token for this doctor today. Reusing existing token.',
      token: tokenResult.token,
      reusedExisting: !tokenResult.created,
    });
  } catch (error) {
    console.error('Queue check-in error:', error);
    res.status(500).json({ error: 'Check-in failed', details: error.message });
  }
});

// PATCH /api/queue/:id
// Update token status (WAITING -> CALLING -> COMPLETED / SKIPPED)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updatedToken = await prisma.queueToken.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        patient: true,
        doctor: true,
      },
    });

    res.json(updatedToken);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update queue token', details: error.message });
  }
});

module.exports = router;
