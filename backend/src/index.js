const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Guard: Crash fast if critical secrets are missing
if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET is not set in environment variables. Exiting.');
  process.exit(1);
}

const authRoutes        = require('./routes/auth');
const patientRoutes     = require('./routes/patients');
const doctorRoutes      = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const queueRoutes       = require('./routes/queue');
const reportRoutes      = require('./routes/reports');

const app  = express();
const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

// FIX: Restrict CORS to known origins instead of allowing all (*)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or same-origin requests with no origin header
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed.`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Request logger (development only)
if (isDev) {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/auth',         authRoutes);
app.use('/api/patients',     patientRoutes);
app.use('/api/doctors',      doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue',        queueRoutes);
app.use('/api/reports',      reportRoutes);

// Health check
app.get('/', (_req, res) => {
  res.json({ message: 'HAQMS Backend API', status: 'Running', version: '1.1.0' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// FIX: Global error handler — never expose stack traces in production.
// In development, include the stack for debugging; in production, log server-side only.
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'An unexpected error occurred.',
    ...(isDev && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`============================================`);
  console.log(` HAQMS API running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`============================================`);
});

// Log unhandled rejections but do NOT silently swallow them
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UnhandledRejection]', promise, 'reason:', reason);
  if (!isDev) process.exit(1); // crash cleanly in production
});
