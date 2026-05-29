const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Date object representing the start of today (00:00:00.000 UTC).
 * This is what you store in queueDate so the @@unique([doctorId, tokenNumber, queueDate])
 * constraint correctly scopes tokens per calendar day.
 */
const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ---------------------------------------------------------------------------
// GET /api/queue
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const tokens = await prisma.queueToken.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phoneNumber: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
      orderBy: { tokenNumber: 'asc' },
    });

    res.json({ success: true, count: tokens.length, data: tokens });
  } catch (error) {
    console.error('[QUEUE] List error:', error);
    res.status(500).json({ error: 'Failed to retrieve queue.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/queue/checkin
//
// FIX: The original code had a classic read-then-write race condition:
//   1. Read MAX(tokenNumber) — say it returns 4
//   2. Sleep 350ms          — another request also reads 4
//   3. Both write token 5   — duplicate tokens, unique constraint fires
//
// Correct fix: use a serialisable DB transaction so the read and the write
// are atomic. Prisma's $transaction with `isolationLevel: 'Serializable'`
// prevents phantom reads; if two requests race, the second will retry (or fail
// with a serialisation error that we catch and return as 409 Conflict).
//
// Additionally: the artificial setTimeout is removed entirely.
// ---------------------------------------------------------------------------
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentId } = req.body;

    if (!patientId || !doctorId) {
      return res.status(400).json({ error: 'patientId and doctorId are required.' });
    }

    const today = todayMidnight();

    const newToken = await prisma.$transaction(
      async (tx) => {
        // Inside the transaction, MAX() + INSERT are a single atomic unit.
        // The serialisable isolation level prevents another concurrent transaction
        // from inserting between our read and our write.
        const maxResult = await tx.queueToken.aggregate({
          where: { doctorId, queueDate: today },
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
            queueDate: today,       // explicit date — not relying on @default(now())
          },
          include: {
            patient: { select: { id: true, name: true, phoneNumber: true } },
            doctor: { select: { id: true, name: true } },
          },
        });
      },
      { isolationLevel: 'Serializable' }
    );

    res.status(201).json({
      success: true,
      message: 'Checked in successfully.',
      data: newToken,
    });
  } catch (error) {
    // P2034 = transaction serialisation failure (concurrent conflict) — safe to retry client-side
    if (error.code === 'P2034' || error.code === 'P2002') {
      return res.status(409).json({
        error: 'Check-in conflict — another token was being assigned simultaneously. Please retry.',
      });
    }
    console.error('[QUEUE] Check-in error:', error);
    res.status(500).json({ error: 'Check-in failed.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/queue/:id
// ---------------------------------------------------------------------------
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required.' });
    }

    const validStatuses = ['WAITING', 'CALLING', 'COMPLETED', 'SKIPPED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}.` });
    }

    const updatedToken = await prisma.queueToken.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: updatedToken });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Queue token not found.' });
    }
    console.error('[QUEUE] Update error:', error);
    res.status(500).json({ error: 'Failed to update queue token.' });
  }
});

module.exports = router;