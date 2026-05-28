const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/doctor-stats
router.get('/doctor-stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [doctors, appointmentStats, queueStats] = await Promise.all([
      prisma.doctor.findMany(),
      prisma.appointment.groupBy({
        by: ['doctorId', 'status'],
        _count: { _all: true },
      }),
      prisma.queueToken.groupBy({
        by: ['doctorId'],
        where: { createdAt: { gte: today } },
        _count: { _all: true },
      }),
    ]);

    const statsByDoctor = {};
    for (const row of appointmentStats) {
      if (!statsByDoctor[row.doctorId]) {
        statsByDoctor[row.doctorId] = {
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
        };
      }
      const count = row._count._all;
      statsByDoctor[row.doctorId].totalAppointments += count;
      if (row.status === 'COMPLETED') {
        statsByDoctor[row.doctorId].completedAppointments = count;
      }
      if (row.status === 'CANCELLED') {
        statsByDoctor[row.doctorId].cancelledAppointments = count;
      }
    }

    const queueByDoctor = {};
    for (const row of queueStats) {
      queueByDoctor[row.doctorId] = row._count._all;
    }

    const reportData = doctors.map((doc) => {
      const stats = statsByDoctor[doc.id] || {
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
      };
      const revenue = stats.completedAppointments * doc.consultationFee;

      return {
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        department: doc.department,
        totalAppointments: stats.totalAppointments,
        completedAppointments: stats.completedAppointments,
        cancelledAppointments: stats.cancelledAppointments,
        todayQueueSize: queueByDoctor[doc.id] || 0,
        revenue,
      };
    });

    const durationMs = Date.now() - start;

    res.json({
      success: true,
      timeTakenMs: durationMs,
      data: reportData,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
});

module.exports = router;
