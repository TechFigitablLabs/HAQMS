const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET; // Guaranteed set by middleware/auth.js startup check


// FIX: Centralised response shape — same structure everywhere.
const userPayload = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Min 8 chars, at least one uppercase, one lowercase, one digit
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    // FIX: Removed console.log that printed the raw request body (cleartext password).
    const { email, password, name, role } = req.body;

    // FIX: Validate email format and password strength before touching the DB.
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, and name are required.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters and include uppercase, lowercase, and a digit.',
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        // FIX: Only allow RECEPTIONIST self-registration. ADMIN/DOCTOR roles must be
        // assigned by an existing ADMIN — never trust role from the request body directly.
        role: 'RECEPTIONIST',
      },
    });

    // FIX: Return only safe fields — never include the password hash.
    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user: userPayload(user),
    });
  } catch (error) {
    // FIX: Log the full error server-side; return a generic message to the client.
    console.error('[AUTH] Registration error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    // FIX: Removed console.log that printed the plaintext password.
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Keep the message generic to prevent user-enumeration attacks.
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // FIX: Short-lived token (15 min access). For production, pair with a refresh-token
    // flow. Using 1h here as a pragmatic middle ground that still expires.
    const token = jwt.sign(userPayload(user), JWT_SECRET, { expiresIn: '1h' });

    // FIX: Consistent response shape — success boolean at top level, data nested.
    res.json({
      success: true,
      data: {
        token,
        user: userPayload(user),
      },
    });
  } catch (error) {
    // FIX: Never send error.stack to the client.
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // FIX: Consistent response shape.
    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('[AUTH] /me error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;