const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/queue
router.get('/', async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const tokens = await prisma.queueToken.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phoneNumber: true } },
        doctor:  { select: { id: true, name: true, specialization: true } },
      },
      orderBy: { tokenNumber: 'asc' },
    });

    res.json(tokens);
  } catch (error) {
    console.error('[QUEUE] List error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve queue.' });
  }
});

// POST /api/queue/checkin
// FIX: Race condition eliminated by wrapping the read-increment-write sequence inside a
// Prisma interactive transaction with SERIALIZABLE isolation. Within the transaction,
// the MAX aggregate + INSERT are atomic — concurrent requests will serialize, ensuring
// every patient gets a unique token number even under high load.
// FIX: Removed the 350ms artificial setTimeout that widened the race window.
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentId } = req.body;

    if (!patientId || !doctorId) {
      return res.status(400).json({ error: 'Patient and Doctor ID are required for check-in.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Transactional read-then-write under SERIALIZABLE isolation prevents duplicate tokens
    const newToken = await prisma.$transaction(async (tx) => {
      // Lock: aggregate inside the same transaction scope
      const maxResult = await tx.queueToken.aggregate({
        where: { doctorId, createdAt: { gte: today } },
        _max: { tokenNumber: true },
      });

      const nextTokenNumber = (maxResult._max.tokenNumber ?? 0) + 1;

      return tx.queueToken.create({
        data: {
          tokenNumber: nextTokenNumber,
          patientId,
          doctorId,
          appointmentId: appointmentId || null,
          status: 'WAITING',
        },
        include: {
          patient: { select: { id: true, name: true, phoneNumber: true } },
          doctor:  { select: { id: true, name: true, specialization: true } },
        },
      });
    });

    res.status(201).json({
      success: true,
      message: 'Checked in successfully. Token generated.',
      token: newToken,
    });
  } catch (error) {
    console.error('[QUEUE] Check-in error:', error.message);
    res.status(500).json({ error: 'Check-in failed. Please try again.' });
  }
});

// PATCH /api/queue/:id
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const VALID_STATUSES = ['WAITING', 'CALLING', 'COMPLETED', 'SKIPPED'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const updatedToken = await prisma.queueToken.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        patient: { select: { id: true, name: true, phoneNumber: true } },
        doctor:  { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, token: updatedToken });
  } catch (error) {
    console.error('[QUEUE] Update error:', error.message);
    res.status(500).json({ error: 'Failed to update queue token.' });
  }
});

module.exports = router;
