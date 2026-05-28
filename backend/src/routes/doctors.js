const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/doctors
// FIX: Replaced raw $queryRawUnsafe string interpolation (SQL injection) with
// Prisma's type-safe findMany + proper `where` filters using parameterized bindings.
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, specialization } = req.query;

    const where = {};

    if (search) {
      // FIX: Prisma's `contains` with `mode: 'insensitive'` produces a parameterized
      // ILIKE query — immune to SQL injection
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (specialization && specialization !== 'All') {
      where.specialization = specialization;
    }

    const doctors = await prisma.doctor.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(doctors);
  } catch (error) {
    console.error('[DOCTORS] List error:', error.message);
    res.status(500).json({ error: 'Failed to fetch doctors.' });
  }
});

// GET /api/doctors/stats
// FIX: Replaced 4 sequential awaits with Promise.all() — all queries run in parallel,
// reducing latency from ~4× individual query time to ~1× slowest query time.
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [totalDoctors, surgeonsCount, averageFeeResult, highestExpResult] = await Promise.all([
      prisma.doctor.count(),
      prisma.doctor.count({ where: { department: 'Surgery' } }),
      prisma.doctor.aggregate({ _avg: { consultationFee: true } }),
      prisma.doctor.aggregate({ _max: { experience: true } }),
    ]);

    res.json({
      success: true,
      data: {
        total: totalDoctors,
        surgeons: surgeonsCount,
        averageFee: Math.round(averageFeeResult._avg.consultationFee || 0),
        maxExperience: highestExpResult._max.experience || 0,
      },
    });
  } catch (error) {
    console.error('[DOCTORS] Stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch doctor stats.' });
  }
});

// GET /api/doctors/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('[DOCTORS] Find error:', error.message);
    res.status(500).json({ error: 'Failed to fetch doctor.' });
  }
});

module.exports = router;
