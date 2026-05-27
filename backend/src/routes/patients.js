const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeAdminOnly } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const PHONE_REGEX = /^[\d\s\-+().]{7,20}$/;

// GET /api/patients
// FIX: DB-level pagination via take/skip instead of in-memory slicing
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, gender } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 5));
    const skip = (page - 1) * limit;

    // Build Prisma where clause for DB-level filtering
    const where = {};

    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (gender && gender !== 'All') {
      where.gender = { equals: gender, mode: 'insensitive' };
    }

    // FIX: Single query with count + paginated result using DB-level skip/take
    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      patients,
      pagination: {
        page,
        limit,
        totalPatients: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Patients fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch patients.' });
  }
});

// GET /api/patients/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: { appointments: true },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Patient fetch error:', error);
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

    // FIX: Validate phone number format
    if (!PHONE_REGEX.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    const parsedAge = parseInt(age);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      return res.status(400).json({ error: 'Age must be a valid number between 0 and 150.' });
    }

    const patient = await prisma.patient.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phoneNumber: phoneNumber.trim(),
        age: parsedAge,
        gender,
        medicalHistory: medicalHistory?.trim() || null,
      },
    });

    res.status(201).json(patient);
  } catch (error) {
    console.error('Patient create error:', error);
    res.status(500).json({ error: 'Failed to register patient.' });
  }
});

// DELETE /api/patients/:id
// FIX: Uses authorizeAdminOnly — actually enforces ADMIN role now
router.delete('/:id', authenticate, authorizeAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    await prisma.patient.delete({ where: { id } });

    res.json({ message: `Successfully deleted patient ${patient.name}` });
  } catch (error) {
    console.error('Patient delete error:', error);
    res.status(500).json({ error: 'Failed to delete patient.' });
  }
});

module.exports = router;
