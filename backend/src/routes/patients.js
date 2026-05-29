const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeAdminOnlyLegacy } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/patients
// Get all patients with search, filtering, and INEFICIENT IN-MEMORY PAGINATION
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, gender } = req.query;
    
    // Inefficient: Retrieve all matching rows without take/skip limits from the database.
    // Scales poorly as patient directory grows.

    // Database pagination setup
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 5, 1),
      100
    );
    const offset = (page - 1) * limit;

    // Database filtering
    const where = {};

if (typeof search === 'string' && search.trim().length > 0) {

      const safeSearch = search.trim();

      where.OR = [
        {
          name: {
            contains: safeSearch,
            mode: 'insensitive',
          },
        },
        {
          phoneNumber: {
            contains: safeSearch,
          },
        },
        {
          email: {
            contains: safeSearch,
            mode: 'insensitive',
          },
        },
      ];
    }

   if (
      typeof gender === 'string' &&
      gender.trim() !== '' &&
      gender !== 'All'
    ) {
      where.gender = {
        equals: gender.trim(),
        mode: 'insensitive',
      };
    }

    //Efficient DB-level pagination already preserved
    const [patients, totalPatients] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),

      prisma.patient.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(totalPatients / limit);

    // Response
    res.json({
      success: true,
      data: patients,
      pagination: {
        page,
        limit,
        totalPatients,
        totalPages,
      },
    });

  } catch (error) {

    //Prevent internal error leakage
    console.error('Fetch patients error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch patients'
    });

  }
});

// GET /api/patients/:id
// Get patient details by ID. Notice N+1 issue could be placed here or in appointments,
// but let's make it fetch the patient with their appointments and tokens.
router.get('/:id', authenticate, async (req, res) => {
  try {

    const patientId = Number(req.params.id);

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid patient ID'
      });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },

      //Explicit relation loading preserved
      include: {
        appointments: true,
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    //Consistent response format
    res.json({
      success: true,
      data: patient
    });

  } catch (error) {

    //Prevent sensitive error exposure
    console.error('Patient fetch error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });

  }
});

// POST /api/patients (Register patient)
//Added strong validation and sanitization
router.post('/', authenticate, async (req, res) => {
  try {

    let {
      name,
      email,
      phoneNumber,
      age,
      gender,
      medicalHistory
    } = req.body;

    // Trim all string inputs
    name = typeof name === 'string' ? name.trim() : '';
    email = typeof email === 'string' ? email.trim() : null;
    phoneNumber = typeof phoneNumber === 'string'
      ? phoneNumber.trim()
      : '';
    gender = typeof gender === 'string' ? gender.trim() : '';
    medicalHistory = typeof medicalHistory === 'string'
      ? medicalHistory.trim()
      : null;

    //Required field validation
    if (!name || !phoneNumber || !age || !gender) {
      return res.status(400).json({
        success: false,
        error: 'Name, phoneNumber, age, and gender are required.'
      });
    }

    // Validate age
    const parsedAge = Number(age);

    if (!Number.isInteger(parsedAge) || parsedAge <= 0 || parsedAge > 130) {
      return res.status(400).json({
        success: false,
        error: 'Invalid age provided.'
      });
    }

    //Validate phone number format
    const phoneRegex = /^[0-9+\-\s()]{7,20}$/;

    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format.'
      });
    }

    //Validate email format if provided
    if (email) {

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format.'
        });
      }
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

    //Consistent API response
    res.status(201).json({
      success: true,
      data: patient
    });

  } catch (error) {

    //Remove detailed DB error leakage
    console.error('Patient creation error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to register patient'
    });
  }
});

// DELETE /api/patients/:id
//Enforced strict admin authorization
router.delete('/:id', authenticate, async (req, res) => {
  try {

    //Explicit strict role validation
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admins only.'
      });
    }

    //Safer numeric validation
    const patientId = Number(req.params.id);

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid patient ID'
      });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    await prisma.patient.delete({
      where: { id: patientId }
    });

    //Consistent API response
    res.json({
      success: true,
      message: `Successfully deleted patient ${patient.name}`
    });

  } catch (error) {

    //Prevent sensitive error leakage
    console.error('Patient delete error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to delete patient'
    });

  }
});

module.exports = router;