const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Basic phone validation: 7–15 digits, optional leading +
const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

// GET /api/patients
// FIX: Replaced full-table fetch + in-memory filter/pagination with proper DB-level
// WHERE / ORDER BY / SKIP / TAKE — scales correctly regardless of table size.
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, gender } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Build a single Prisma where clause — all filtering done in PostgreSQL
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (gender && gender !== 'All') {
      where.gender = { equals: gender, mode: 'insensitive' };
    }

    // Run count and page fetch in parallel
    const [totalPatients, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalPatients / limit);

    res.json({
      success: true,
      patients,
      pagination: { page, limit, totalPatients, totalPages },
    });
  } catch (error) {
    console.error('[PATIENTS] List error:', error.message);
    res.status(500).json({ error: 'Failed to fetch patients.' });
  }
});

// GET /api/patients/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: { appointments: { orderBy: { appointmentDate: 'desc' } } },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    res.json(patient);
  } catch (error) {
    console.error('[PATIENTS] Find error:', error.message);
    res.status(500).json({ error: 'Failed to fetch patient.' });
  }
});

// POST /api/patients
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, email, phoneNumber, age, gender, medicalHistory } = req.body;

    if (!name || !phoneNumber || !age || !gender) {
      return res.status(400).json({ error: 'Name, phoneNumber, age, and gender are required.' });
    }

    // FIX: Validate phone number format to prevent garbage data (e.g. "abc") in DB
    if (!PHONE_REGEX.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    const parsedAge = parseInt(age);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      return res.status(400).json({ error: 'Age must be a valid number between 0 and 150.' });
    }

    const VALID_GENDERS = ['Male', 'Female', 'Other'];
    if (!VALID_GENDERS.includes(gender)) {
      return res.status(400).json({ error: 'Gender must be Male, Female, or Other.' });
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        email: email || null,
        phoneNumber,
        age: parsedAge,
        gender,
        medicalHistory: medicalHistory || null,
      },
    });

    res.status(201).json({ success: true, patient });
  } catch (error) {
    console.error('[PATIENTS] Create error:', error.message);
    res.status(500).json({ error: 'Failed to register patient.' });
  }
});

// DELETE /api/patients/:id
// FIX: Now uses authorizeAdmin (the real check) — non-admin users (receptionist, doctor)
// can no longer delete patient records even if they are authenticated.
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    await prisma.patient.delete({ where: { id } });

    res.json({ success: true, message: `Patient record for ${patient.name} deleted.` });
  } catch (error) {
    console.error('[PATIENTS] Delete error:', error.message);
    res.status(500).json({ error: 'Failed to delete patient.' });
  }
});

module.exports = router;
