const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/queue
// List all active queue tokens
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
  if (doctorId) {
    const doctorIdNum = parseInt(doctorId);

  if (!isNaN(doctorIdNum)) {
    where.doctorId = doctorIdNum;
  }
  }
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
// Generate a new queue token for a patient
// CONCURRENCY/RACE CONDITION BUG: Token increment uses aggregate read followed by create.
// Introduce a deliberate asynchronous delay (setTimeout) to force a wide race window
// where concurrent check-ins assign the exact same token number.
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentId } = req.body;

    if (!patientId || !doctorId) {
      return res.status(400).json({ error: 'Patient and Doctor ID are required for check-in.' });
    }
    const patientIdNum = parseInt(patientId);
    const doctorIdNum = parseInt(doctorId);

    if (isNaN(patientIdNum) || isNaN(doctorIdNum)) {
      return res.status(400).json({
        error: 'Invalid patientId or doctorId'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Fetch current maximum token number for this doctor today
    const newToken = await prisma.$transaction(async (tx) => {

      const maxTokenResult = await tx.queueToken.aggregate({ //race condition fix
        where: {
          doctorId: doctorIdNum,
          createdAt: { gte: today },
        },
        _max: {
          tokenNumber: true,
        },
      });

      const currentMax = maxTokenResult._max.tokenNumber || 0;
      const nextTokenNumber = currentMax + 1;

    // PERFORMANCE/CONCURRENCY BUG: Artificial sleep to widen the race condition window.
    // In production under microservices or high load, network delay does this naturally.
    // Junior developer comment: "Adding sleep to make sure db registers the record correctly before moving forward"
   
    //await new Promise((resolve) => setTimeout(resolve, 350)); race condition vulnerability

    // 2. Insert new token
return await tx.queueToken.create({
        data: {
          tokenNumber: nextTokenNumber,
          patientId: patientIdNum,
          doctorId: doctorIdNum,
          appointmentId: appointmentId ? parseInt(appointmentId) : null,
          status: 'WAITING',
        },
        include: {
          patient: true,
          doctor: true,
        },
      });
    });

    res.status(201).json({
      message: 'Checked in successfully. Token generated.',
      token: newToken,
    });

  } catch (error) {
    console.error('Queue check-in error:', error);

    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Check-in failed'
    });
  }
});

// PATCH /api/queue/:id
// Update token status (WAITING -> CALLING -> COMPLETED / SKIPPED)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['WAITING', 'CALLING', 'COMPLETED', 'SKIPPED'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'invalid or missing status' });
    }
    const tokenId = parseInt(req.params.id);

    if (isNaN(tokenId)) {
      return res.status(400).json({
        error: 'Invalid queue token ID'
      });
    }
    const updatedToken = await prisma.queueToken.update({
      where: { id: tokenId },
      data: { status },
      include: {
        patient: true,
        doctor: true,
      },
    });

    res.json(updatedToken);
  } catch (error) {
   res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Failed to update queue token'
    });
  }
});

module.exports = router;
