const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// FIX: Basic phone validation — at least 7 digits, optional leading +, no letters.
// Adjust the regex to match your target locale(s) if needed.
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

// ---------------------------------------------------------------------------
// GET /api/patients
// DB-level search, filter, and pagination — no more full table scans.
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, gender } = req.query;

    // FIX: Parse and clamp pagination params server-side.
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // FIX: Build the where clause and push all filtering into the DB query.
    // The old code fetched every row, then filtered in JS — O(n) memory regardless of page size.
    const where = {};

    if (gender && gender !== 'All') {
      // Schema uses a Gender enum, values are uppercase: MALE | FEMALE | OTHER
      where.gender = gender.toUpperCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // FIX: Run count and data fetch in parallel — one round-trip instead of two.
    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          age: true,
          gender: true,
          medicalHistory: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[PATIENTS] List error:', error);
    res.status(500).json({ error: 'Failed to fetch patients.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/patients/:id
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          include: {
            // Include just enough doctor info so the UI can display it.
            doctor: { select: { id: true, name: true, specialization: true } },
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    res.json({ success: true, data: patient });
  } catch (error) {
    console.error('[PATIENTS] Get by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch patient.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/patients
// ---------------------------------------------------------------------------
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, email, phoneNumber, age, gender, medicalHistory } = req.body;

    // FIX: All required fields checked before DB touch.
    if (!name || !phoneNumber || !age || !gender) {
      return res.status(400).json({ error: 'name, phoneNumber, age, and gender are required.' });
    }

    // FIX: Validate phone format — previously accepted arbitrary strings like "abc".
    if (!PHONE_REGEX.test(phoneNumber)) {
      return res.status(400).json({
        error: 'Invalid phone number. Use digits only (7–15), with an optional leading +.',
      });
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      return res.status(400).json({ error: 'Age must be a valid number between 0 and 150.' });
    }

    // FIX: Validate gender against the enum values defined in the schema.
    const validGenders = ['MALE', 'FEMALE', 'OTHER'];
    if (!validGenders.includes(gender.toUpperCase())) {
      return res.status(400).json({ error: `gender must be one of: ${validGenders.join(', ')}.` });
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        email: email || null,
        phoneNumber,
        age: parsedAge,
        gender: gender.toUpperCase(),
        medicalHistory: medicalHistory || null,
      },
    });

    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    // Prisma unique constraint violation on phoneNumber
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A patient with this phone number already exists.' });
    }
    console.error('[PATIENTS] Create error:', error);
    res.status(500).json({ error: 'Failed to register patient.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/patients/:id
// FIX: authorizeAdmin middleware is now a real guard (not the old commented-out no-op).
// Only ADMIN role can delete patients.
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    await prisma.patient.delete({ where: { id } });

    res.json({ success: true, message: `Patient '${patient.name}' deleted successfully.` });
  } catch (error) {
    console.error('[PATIENTS] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete patient.' });
  }
});

module.exports = router;