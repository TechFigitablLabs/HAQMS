const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { formatDoctorTimes, timeToMins, isValidTimeStr } = require('../utils/time.js');

const router = express.Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/doctors
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, specialization } = req.query;
console.log(`[DOCTORS] List request with search='${search}' and specialization='${specialization}'`); // Debug log for query params
    // FIX: Replaced $queryRawUnsafe + string interpolation with Prisma's type-safe
    // query builder. No SQL injection possible — all values go through parameterised binds.
    const where = {};

    if (search) {
      // Prisma's `contains` with `mode: 'insensitive'` compiles to ILIKE under Postgres.
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (specialization && specialization !== 'All') {
      where.specialization = specialization;
    }

    const doctors = await prisma.doctor.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        specialization: true,
        department: true,
        consultationFee: true,
        experience: true,
        availableFrom: true,
        availableTo: true,
      },
    });
console.log(`[DOCTORS] Retrieved ${doctors.length} doctors from DB`); // Debug log for DB result count
    // Convert DB integers back to "HH:MM" strings before sending to the client.
    res.json({ success: true, count: doctors.length, data: doctors.map(formatDoctorTimes) });
  } catch (error) {
    // FIX: No SQL message or query details leaked to the client.
    console.error('[DOCTORS] List error:', error);
    res.status(500).json({ error: 'Failed to retrieve doctors.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/doctors/stats
// NOTE: This route must be registered BEFORE /:id so Express doesn't treat
//       "stats" as a dynamic segment.
// ---------------------------------------------------------------------------
router.get('/stats', authenticate, async (req, res) => {
  try {
    // FIX: All four independent DB calls run in parallel with Promise.all.
    // Previously sequential — this cut latency to the duration of the slowest single call.
    const [totalDoctors, surgeonsCount, averageFeeResult, highestExperienceResult] =
      await Promise.all([
        prisma.doctor.count(),
        prisma.doctor.count({ where: { department: 'Surgery' } }),
        prisma.doctor.aggregate({ _avg: { consultationFee: true } }),
        prisma.doctor.aggregate({ _max: { experience: true } }),
      ]);

    // FIX: Removed debugInfo.executionTimeMs — don't hand attackers a timing oracle.
    res.json({
      success: true,
      data: {
        total: totalDoctors,
        surgeons: surgeonsCount,
        averageFee: Math.round(averageFeeResult._avg.consultationFee || 0),
        maxExperience: highestExperienceResult._max.experience || 0,
      },
    });
  } catch (error) {
    console.error('[DOCTORS] Stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve doctor stats.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/doctors/:id
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    res.json({ success: true, data: formatDoctorTimes(doctor) });
  } catch (error) {
    console.error('[DOCTORS] Get by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve doctor.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/doctors
// Accepts availableFrom / availableTo as "HH:MM" strings; stores as Int.
// ---------------------------------------------------------------------------
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, specialization, department, consultationFee, experience, availableFrom, availableTo } = req.body;

    if (!name || !specialization || !department || consultationFee == null || experience == null) {
      return res.status(400).json({ error: 'name, specialization, department, consultationFee, and experience are required.' });
    }

    // Validate and convert time strings if provided; fall back to schema defaults (540 / 1020).
    let fromMins = 540;
    let toMins = 1020;

    if (availableFrom !== undefined) {
      if (!isValidTimeStr(availableFrom)) {
        return res.status(400).json({ error: 'availableFrom must be a valid "HH:MM" string.' });
      }
      fromMins = timeToMins(availableFrom);
    }
    if (availableTo !== undefined) {
      if (!isValidTimeStr(availableTo)) {
        return res.status(400).json({ error: 'availableTo must be a valid "HH:MM" string.' });
      }
      toMins = timeToMins(availableTo);
    }

    if (fromMins >= toMins) {
      return res.status(400).json({ error: 'availableFrom must be earlier than availableTo.' });
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        specialization,
        department,
        consultationFee: parseFloat(consultationFee),
        experience: parseInt(experience, 10),
        availableFrom: fromMins,
        availableTo: toMins,
      },
    });

    res.status(201).json({ success: true, data: formatDoctorTimes(doctor) });
  } catch (error) {
    console.error('[DOCTORS] Create error:', error);
    res.status(500).json({ error: 'Failed to create doctor.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/doctors/:id
// Accepts availableFrom / availableTo as "HH:MM" strings; converts on write.
// ---------------------------------------------------------------------------
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { availableFrom, availableTo, ...rest } = req.body;
    const data = { ...rest };

    if (availableFrom !== undefined) {
      if (!isValidTimeStr(availableFrom)) {
        return res.status(400).json({ error: 'availableFrom must be a valid "HH:MM" string.' });
      }
      data.availableFrom = timeToMins(availableFrom);
    }
    if (availableTo !== undefined) {
      if (!isValidTimeStr(availableTo)) {
        return res.status(400).json({ error: 'availableTo must be a valid "HH:MM" string.' });
      }
      data.availableTo = timeToMins(availableTo);
    }

    // If both are being updated in the same request, validate order.
    if (data.availableFrom != null && data.availableTo != null && data.availableFrom >= data.availableTo) {
      return res.status(400).json({ error: 'availableFrom must be earlier than availableTo.' });
    }

    const doctor = await prisma.doctor.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: formatDoctorTimes(doctor) });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Doctor not found.' });
    }
    console.error('[DOCTORS] Update error:', error);
    res.status(500).json({ error: 'Failed to update doctor.' });
  }
});

module.exports = router;