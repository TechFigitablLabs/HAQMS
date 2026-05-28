const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // FIX: Removed cleartext password logging
    const { email, password, name, role } = req.body;

    // FIX: Proper validation — email format + minimum password length
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    // Only allow valid roles to be assigned
    const ALLOWED_ROLES = ['ADMIN', 'RECEPTIONIST', 'DOCTOR'];
    const assignedRole = ALLOWED_ROLES.includes(role) ? role : 'RECEPTIONIST';

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: assignedRole },
    });

    // FIX: Never return password hash in response — select safe fields only
    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', error.message);
    // FIX: Never expose raw database error to client
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // FIX: Removed cleartext password logging — only log email (never password)
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // FIX: Use a consistent message to prevent email enumeration attacks
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // FIX: Token expires in 24h instead of 365 days
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // FIX: Consistent API response format — same structure as register
    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // FIX: Consistent response wrapper
    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('[AUTH] /me error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve user.' });
  }
});

module.exports = router;
