const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/doctor-stats
// FIX: Replaced nested sequential loop + artificial sleep with a single parallel
// Promise.all strategy — O(n*queries) → O(1) round trips via groupBy aggregation
router.get('/doctor-stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // FIX: All aggregations run in parallel via Promise.all
    const [doctors, appointmentsByStatus, todayQueueCounts] = await Promise.all([
      prisma.doctor.findMany(),

      // Single groupBy to get COMPLETED + CANCELLED counts per doctor
      prisma.appointment.groupBy({
        by: ['doctorId', 'status'],
        _count: { id: true },
      }),

      // Today's queue per doctor
      prisma.queueToken.groupBy({
        by: ['doctorId'],
        where: { createdAt: { gte: today } },
        _count: { id: true },
      }),
    ]);

    // Build lookup maps from aggregation results
    const apptMap = {};
    for (const row of appointmentsByStatus) {
      if (!apptMap[row.doctorId]) apptMap[row.doctorId] = { total: 0, completed: 0, cancelled: 0 };
      apptMap[row.doctorId].total += row._count.id;
      if (row.status === 'COMPLETED') apptMap[row.doctorId].completed = row._count.id;
      if (row.status === 'CANCELLED') apptMap[row.doctorId].cancelled = row._count.id;
    }

    const queueMap = {};
    for (const row of todayQueueCounts) {
      queueMap[row.doctorId] = row._count.id;
    }

    const reportData = doctors.map((doc) => {
      const stats = apptMap[doc.id] || { total: 0, completed: 0, cancelled: 0 };
      return {
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        department: doc.department,
        totalAppointments: stats.total,
        completedAppointments: stats.completed,
        cancelledAppointments: stats.cancelled,
        todayQueueSize: queueMap[doc.id] || 0,
        revenue: stats.completed * doc.consultationFee,
      };
    });

    res.json({
      success: true,
      timeTakenMs: Date.now() - start,
      data: reportData,
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

module.exports = router;
