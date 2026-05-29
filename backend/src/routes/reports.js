const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/reports/doctor-stats
//
// FIX: The original route had 5 sequential DB queries per doctor plus an
// artificial 80ms sleep, meaning 10 doctors = ~50 queries + 800ms of pure wait.
//
// Fixed approach:
//   1. Fetch all doctors once.
//   2. Run a single groupBy aggregation for appointments (covers total, completed,
//      cancelled, and revenue in one pass).
//   3. Run a single groupBy aggregation for today's queue tokens.
//   4. Merge in JS — O(n) with a Map lookup.
//
// Total DB round-trips: 3 (doctors, appointment aggregation, queue aggregation),
// regardless of the number of doctors.
// ---------------------------------------------------------------------------
router.get('/doctor-stats', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. All three independent DB calls run in parallel.
    const [doctors, appointmentStats, queueStats] = await Promise.all([
      prisma.doctor.findMany({
        select: {
          id: true,
          name: true,
          specialization: true,
          department: true,
          consultationFee: true,
        },
      }),

      // 2a. Appointment counts grouped by doctorId + status in a single query.
      //     Prisma's groupBy can't simultaneously count and sum across multiple status
      //     values in one call, so we fetch two counts (COMPLETED, CANCELLED) and
      //     derive total client-side from the raw appointment count below.
      //     Alternatively: use $queryRaw with parameterised inputs — safe because
      //     there is NO user input here, only an internal enum string.
      prisma.$queryRaw`
        SELECT
          "doctorId",
          COUNT(*)::int                                                   AS "total",
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int               AS "completed",
          COUNT(*) FILTER (WHERE status = 'CANCELLED')::int               AS "cancelled"
        FROM "Appointment"
        GROUP BY "doctorId"
      `,

      // 2b. Queue token count for today, grouped by doctorId.
      prisma.queueToken.groupBy({
        by: ['doctorId'],
        where: { queueDate: { gte: today } },
        _count: { _all: true },
      }),
    ]);

    // 3. Build lookup maps for O(1) access during the merge.
    const apptMap = new Map(
      appointmentStats.map((row) => [row.doctorId, row])
    );
    const queueMap = new Map(
      queueStats.map((row) => [row.doctorId, row._count._all])
    );

    // 4. Merge into the final report shape.
    const reportData = doctors.map((doc) => {
      const appt = apptMap.get(doc.id) ?? { total: 0, completed: 0, cancelled: 0 };
      const todayQueue = queueMap.get(doc.id) ?? 0;
      // Revenue = completed appointments × consultation fee
      const revenue = Number(appt.completed) * doc.consultationFee;

      return {
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        department: doc.department,
        totalAppointments: Number(appt.total),
        completedAppointments: Number(appt.completed),
        cancelledAppointments: Number(appt.cancelled),
        todayQueueSize: todayQueue,
        revenue,
      };
    });

    res.json({ success: true, data: reportData });
  } catch (error) {
    console.error('[REPORTS] Doctor stats error:', error);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

module.exports = router;