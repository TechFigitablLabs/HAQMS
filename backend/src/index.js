const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Fail fast if critical env vars are missing
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const queueRoutes = require('./routes/queue');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// FIX: Restrict CORS to known frontend origins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Request logger (no sensitive data)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'HAQMS Backend API',
    status: 'Running',
    version: '1.1.0',
  });
});

// FIX: Global error handler — no stack traces in production
app.use((err, req, res, next) => {
  console.error('[ERROR]:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`HAQMS backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// FIX: Crash on unhandled rejections in production — silent failures are worse
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});
