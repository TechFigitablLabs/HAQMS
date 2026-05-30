const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/doctor-stats
// Highly inefficient nested loop aggregate reporting for admin/receptionists dashboard
// Optimized: per-doctor independent queries run in parallel.
router.get('/doctor-stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Fetch all doctors
    const doctors = await prisma.doctor.findMany({
      select: {
        id: true,
        name: true,
        specialization: true,
        department: true,
        consultationFee: true,
      },
    });

    const doctorsIds = doctors.map((d)=> d.id);
    if(doctorsIds.length === 0){
        return res.json({ success: true, timeTakenMs: Date.now() - start, data: []});
}

    // 2) Run independent aggregations in parallel (few queries, no nested loop DB calls)

  const [totalByDoctor , completedByDoctor, cancelledByDoctor , todayQueueByDoctor] = await Promise.all([
    prisma.appointment.groupBy({
      by: ['doctorId'],
      where: { doctorId: { in: doctorsIds}},
      _count: { _all: true},
    }),

    prisma.appointment.groupBy({
      by: ['doctorId'],
      where: {doctorId: { in: doctorsIds}, status: 'COMPLETED'},
      _count: {_all: true},

    }),
    prisma.appointment.groupBy({
      by: ['doctorId'],
      where: {doctorId: {in: doctorsIds}, status: 'CANCELLED'},
      _count: {_all: true},
    }),

    prisma.queueToken.groupBy({
      by: ['doctorId'],
      where: { doctorId: { in: doctorsIds }, createdAt: { gte: today } },
      _count: { _all: true },
    }),
  ]);

    const toCountMap = (rows) => new Map(rows.map((r) => [r.doctorId, r._count._all]));

  const totalMap = toCountMap(totalByDoctor);
  const completedMap = toCountMap(completedByDoctor);
  const cancelledMap = toCountMap(cancelledByDoctor);
  const queueMap = toCountMap(todayQueueByDoctor);

      // 4) Compose response without extra DB calls
  const data = doctors.map((doc)=> {
    const totalAppointments = totalMap.get(doc.id) || 0;
    const completedAppointments = completedMap.get(doc.id) || 0;
    const cancelledAppointments = cancelledMap.get(doc.id) || 0;
    const todayQueueSize = queueMap.get(doc.id) || 0;

    return {
      id: doc.id,
      name: doc.name,
      specialization: doc.specialization,
      department: doc.department,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      todayQueueSize,
      revenue: completedAppointments * doc.consultationFee,
    };
  });



    res.json({
      success: true,
      timeTakenMs: Date.now() - start,
      data,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
});

module.exports = router;
