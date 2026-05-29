const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/doctors
// Retrieve list of doctors with special search filtering
// SECURITY BUG: SQL Injection vulnerability in the search parameter!
// Uses queryRawUnsafe with string concatenation instead of parameterized inputs.
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, specialization } = req.query;

 const where = {};

if (typeof search === 'string' && search.trim().length > 0) {
      where.name = {
        contains: search.trim(), // ✅ Prisma safely parameterizes this
        mode: 'insensitive',
      };
    }

    // 🔒 FIX: Validate specialization input
    if (
      typeof specialization === 'string' &&
      specialization.trim() !== '' &&
      specialization !== 'All'
    ) {
      where.specialization = specialization.trim();
    }

    // 🔒 FIX: Removed unsafe raw SQL logging/comments
    console.log('[DEBUG] Executing safe Prisma doctor search');

    const doctors = await prisma.doctor.findMany({
      where,
    });

    // ✅ FIX: Consistent API response structure
    res.json( doctors
    );

  } catch (error) {

    // 🔒 FIX: Prevent sensitive error leakage
    console.error('Doctor fetch error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// GET /api/doctors/stats
// Returns aggregation details about available doctors
// PERFORMANCE BUG: Sequential async calls instead of Promise.all()
router.get('/stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();

    // Independent database calls are run sequentially with await, stalling the event loop
const [
  totalDoctors,
  surgeonsCount,
  averageFee,
  highestExperience
] = await Promise.all([
  prisma.doctor.count(),

  prisma.doctor.count({
    where: { department: 'Surgery' },
  }),

  prisma.doctor.aggregate({
    _avg: {
      consultationFee: true,
    },
  }),

  prisma.doctor.aggregate({
    _max: {
      experience: true,
    },
  }),
]);

    const durationMs = Date.now() - start;

    res.json({
      success: true,
      data: {
        total: totalDoctors,
        surgeons: surgeonsCount,
        averageFee: Math.round(averageFee._avg.consultationFee || 0),
        maxExperience: highestExperience._max.experience || 0,
      },
      debugInfo: {
        executionTimeMs: durationMs,
        notes: 'Loaded sequentially for safety. Optimization needed.'
      }
    });
  } catch (error) {
    console.error('Doctor stats error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// GET /api/doctors/:id
router.get('/:id', authenticate, async (req, res) => {
  try {

    const doctorId = parseInt(req.params.id);

    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid doctor ID'
      });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId }
    });

    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    //Consistent API response structure
    res.json({
      success: true,
      data: doctor
    });

  } catch (error) {

    //Prevent stack trace...SQL leak exposure
    console.error('Doctor lookup error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;
