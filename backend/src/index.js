const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars FIRST — middleware/auth.js throws if JWT_SECRET is missing.
dotenv.config();

// Route modules
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const queueRoutes = require('./routes/queue');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ---------------------------------------------------------------------------
// CORS
// FIX: origin: "*" allows any website to call this API with credentialed requests.
// Restrict to your actual frontend origin(s). Use an array for multiple envs.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed.`));
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// ---------------------------------------------------------------------------
// Request logger — log method + path only, never body (contains passwords, PII)
// ---------------------------------------------------------------------------
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (_req, res) => {
  res.json({
    message: 'HAQMS Backend API',
    status: 'running',
    version: '1.0.0',
  });
});

// ---------------------------------------------------------------------------
// Global error handler
// FIX: Never send error.stack to the client — it leaks file paths, DB schema
// details, and library internals. Log it server-side only.
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[CRITICAL]', err);
  res.status(err.status || 500).json({
    error: NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`HAQMS running on port ${PORT} [${NODE_ENV}]`);
});

// Log unhandled rejections but exit cleanly so the process manager can restart.
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
  process.exit(1);
});

module.exports = app; // export for testing