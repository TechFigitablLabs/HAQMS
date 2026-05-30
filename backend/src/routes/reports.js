const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/doctor-stats
// Optimized: Uses set-based groupBy queries instead of per-doctor loops
router.get('/doctor-stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run all three set-based queries in parallel (3 queries total, regardless of doctor count)
    const [doctors, appointmentStats, todayQueueStats] = await Promise.all([
      prisma.doctor.findMany(),
      prisma.appointment.groupBy({
        by: ['doctorId', 'status'],
        _count: { id: true },
      }),
      prisma.queueToken.groupBy({
        by: ['doctorId'],
        where: { createdAt: { gte: today } },
        _count: { id: true },
      }),
    ]);

    // Build lookup maps from the grouped results
    // appointmentMap: { doctorId -> { status -> count } }
    const appointmentMap = {};
    for (const stat of appointmentStats) {
      if (!appointmentMap[stat.doctorId]) {
        appointmentMap[stat.doctorId] = {};
      }
      appointmentMap[stat.doctorId][stat.status] = stat._count.id;
    }

    // queueMap: { doctorId -> count }
    const queueMap = {};
    for (const stat of todayQueueStats) {
      queueMap[stat.doctorId] = stat._count.id;
    }

    // Assemble the report from pre-fetched data (zero additional queries)
    const reportData = doctors.map((doc) => {
      const docStats = appointmentMap[doc.id] || {};
      const totalAppointments =
        (docStats['PENDING'] || 0) +
        (docStats['COMPLETED'] || 0) +
        (docStats['CANCELLED'] || 0);
      const completedAppointments = docStats['COMPLETED'] || 0;
      const cancelledAppointments = docStats['CANCELLED'] || 0;

      return {
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        department: doc.department,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        todayQueueSize: queueMap[doc.id] || 0,
        revenue: completedAppointments * doc.consultationFee,
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
