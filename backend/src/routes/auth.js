const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET; 	//forcing to get the JWT from env

//checking
if(!JWT_SECRET) throw new Error(`JWT_SECRET environment variable is not set`)


// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // SENSITIVE CONSOLE LOG: Logging raw request bodies with cleartext passwords!
    console.log('[DEBUG] Registering user with payload:', req.body.email);	// removing the JSON.stringify() to not consoling the password in logs

    const { email, password, name, role } = req.body;

    // MISSING VALIDATION: Does not check if email is valid format or if password is strong
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'RECEPTIONIST',
      },
    });

//Removing the hash paswword from thee token and also make the structure of all response( register, login, me) -> same 
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
      	      user: {
	      id: user.id,
	      email: user.email,
	      name: user.name,
	      role: user.role,
      }
      }
    });
  } catch (error) {
    // IMPROPER ERROR HANDLING: Leaking database errors and details //fixed
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration'});
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // SENSITIVE CONSOLE LOG: Logging plain-text passwords on login attempts!
    console.log(`[AUTH] Login attempt for email: ${req.body.email}`); //removing the password logs from here too

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Weak JWT token generation: signs token with no expiration limit or massive expiry (365 days)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '12h' }	//reducing exep time for expiration
    );

    // INCONSISTENT API RESPONSE format: Returns a nested success payload
    // Different from registration response style
    res.json({
	success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error'});
  }
});

// GET /api/auth/me
// Returns current user details based on JWT
const { authenticate } = require('../middleware/auth');

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
    	success: true,
	    data: {user},
    }); // Returns flat object, inconsistent with the nested login response! (FIXED MAKE IT NESTED)
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
