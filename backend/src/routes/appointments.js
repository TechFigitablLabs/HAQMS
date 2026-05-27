const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/appointments
// List all appointments
// PERFORMANCE BUG: Classic N+1 Query Issue!
// Instead of using Prisma's include, it loops through each appointment and executes
// individual select statements for Patient and Doctor details.
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
   
    if (doctorId) {
      const doctorIdNum = parseInt(doctorId);
      if (!isNaN(doctorIdNum)) {
        where.doctorId = doctorIdNum;
      }
    }
    if (status) where.status = status;

    // Fetch core appointments
    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { appointmentDate: 'asc' },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            age: true,
            medicalHistory: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
      },
    });

    res.json({
      success: true,
      count: appointments.length,
      appointments,
    });

  } catch (error) {

    // FIX #3: avoid leaking raw DB errors in production
    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Failed to retrieve appointments'
    });
  }
});
    

//     const detailedAppointments = [];

//     // N+1 triggers here: For every single appointment, we perform two extra queries!
//     for (const app of appointments) {
//       console.log(`[N+1 DB QUERY] Fetching Patient (${app.patientId}) and Doctor (${app.doctorId}) for Appointment ${app.id}`);
      
//       const patient = await prisma.patient.findUnique({
//         where: { id: app.patientId },
//       });

//       const doctor = await prisma.doctor.findUnique({
//         where: { id: app.doctorId },
//       });

//       detailedAppointments.push({
//         ...app,
//         patient: patient ? { id: patient.id, name: patient.name, phoneNumber: patient.phoneNumber, age: patient.age, medicalHistory: patient.medicalHistory } : null,
//         doctor: doctor ? { id: doctor.id, name: doctor.name, specialization: doctor.specialization } : null,
//       });
//     }

//     res.json({
//       success: true,
//       count: detailedAppointments.length,
//       appointments: detailedAppointments,
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to retrieve appointments', details: error.message });
//   }
// });

// POST /api/appointments
// Book an appointment
// DESIGN BUG: Duplicate-prone schema. No unique index blocks duplicate appointment bookings.
// In this API, we have a half-hearted verification that is easily bypassed or logically flawed,
// allowing multiple bookings for the exact same date and doctor.
router.post('/', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    // Flawed duplicate check:
    // It only checks if the exact millisecond matches. If the candidate books for "2026-05-25 10:00:00"
    // and another for "2026-05-25 10:00:01", they are treated as unique!
    // Junior dev logic: "Same time bookings will be blocked."
 

    // type safety validation
    const patientIdNum = parseInt(patientId);
    const doctorIdNum = parseInt(doctorId);

    if (!patientIdNum || !doctorIdNum || !appointmentDate) {
      return res.status(400).json({
        error: 'Patient, Doctor, and Appointment Date are required.'
      });
    }

    const appDate = new Date(appointmentDate);

    // no duplicates
    const startOfMinute = new Date(appDate);
    startOfMinute.setSeconds(0, 0);

    const endOfMinute = new Date(appDate);
    endOfMinute.setSeconds(59, 999);

    const existingBooking = await prisma.appointment.findFirst({
      where: {
        doctorId: doctorIdNum,
        appointmentDate: {
          gte: startOfMinute,
          lte: endOfMinute,
        },
        status: { not: 'CANCELLED' },
      },
    });

    if (existingBooking) {
      return res.status(400).json({
        error: 'Double booking detected for this time slot (minute-level check).'
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientIdNum,
        doctorId: doctorIdNum,
        appointmentDate: appDate,
        reason: reason || '',
        status: 'PENDING',
      },
    });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment,
    });

  } catch (error) {

    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Failed to book appointment'
    });
  }
});
// PATCH /api/appointments/:id
// Update appointment status (COMPLETED, CANCELLED, etc.)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    // status validation...no invalid state injection
    const allowedStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid or missing status'
      });
    }

    //id validation
    const appointmentId = parseInt(req.params.id);

    if (isNaN(appointmentId)) {
      return res.status(400).json({
        error: 'Invalid appointment ID'
      });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });

    res.json(updated);

  } catch (error) {

    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Failed to update appointment'
    });
  }
});

module.exports = router;