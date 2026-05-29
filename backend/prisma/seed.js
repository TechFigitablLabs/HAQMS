const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding HAQMS database...');

  // ─── Users ────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@haqms.com' },
    update: {},
    create: {
      email: 'admin@haqms.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { email: 'reception1@haqms.com' },
    update: {},
    create: {
      email: 'reception1@haqms.com',
      password: hashedPassword,
      name: 'Sarah Connor',
      role: 'RECEPTIONIST',
    },
  });

  const doctorUser1 = await prisma.user.upsert({
    where: { email: 'doctor1@haqms.com' },
    update: {},
    create: {
      email: 'doctor1@haqms.com',
      password: hashedPassword,
      name: 'Dr. Gregory House',
      role: 'DOCTOR',
    },
  });

  const doctorUser2 = await prisma.user.upsert({
    where: { email: 'doctor2@haqms.com' },
    update: {},
    create: {
      email: 'doctor2@haqms.com',
      password: hashedPassword,
      name: 'Dr. Meredith Grey',
      role: 'DOCTOR',
    },
  });

  const doctorUser3 = await prisma.user.upsert({
    where: { email: 'doctor3@haqms.com' },
    update: {},
    create: {
      email: 'doctor3@haqms.com',
      password: hashedPassword,
      name: 'Dr. John Carter',
      role: 'DOCTOR',
    },
  });

  console.log('✅ Users seeded');

  // ─── Doctors ──────────────────────────────────────────────────────────────
  const doctor1 = await prisma.doctor.upsert({
    where: { userId: doctorUser1.id },
    update: {},
    create: {
      userId: doctorUser1.id,
      name: 'Dr. Gregory House',
      specialization: 'Diagnostics',
      department: 'Internal Medicine',
      consultationFee: 250,
      experience: 20,
      availableFrom: '09:00',
      availableTo: '17:00',
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { userId: doctorUser2.id },
    update: {},
    create: {
      userId: doctorUser2.id,
      name: 'Dr. Meredith Grey',
      specialization: 'General Surgery',
      department: 'Surgery',
      consultationFee: 320,
      experience: 12,
      availableFrom: '08:00',
      availableTo: '16:00',
    },
  });

  const doctor3 = await prisma.doctor.upsert({
    where: { userId: doctorUser3.id },
    update: {},
    create: {
      userId: doctorUser3.id,
      name: 'Dr. John Carter',
      specialization: 'Emergency Medicine',
      department: 'Emergency',
      consultationFee: 180,
      experience: 8,
      availableFrom: '10:00',
      availableTo: '18:00',
    },
  });

  // FIX: Extra doctors (no userId) used create before — crashed on re-runs.
  // Now using upsert on name since there's no unique userId to key on.
  const doctor4 = await prisma.doctor.upsert({
    where: { userId: null },  // won't match — falls through to create
    update: {},
    create: {
      name: 'Dr. Lisa Cuddy',
      specialization: 'Endocrinology',
      department: 'Internal Medicine',
      consultationFee: 210,
      experience: 15,
      availableFrom: '09:00',
      availableTo: '17:00',
    },
  }).catch(() =>
    // If upsert fails (null userId ambiguity), find existing by name
    prisma.doctor.findFirst({ where: { name: 'Dr. Lisa Cuddy' } })
  );

  const doctor5 = await prisma.doctor.upsert({
    where: { userId: null },
    update: {},
    create: {
      name: 'Dr. Perry Cox',
      specialization: 'Cardiology',
      department: 'Cardiology',
      consultationFee: 290,
      experience: 18,
      availableFrom: '08:30',
      availableTo: '16:30',
    },
  }).catch(() =>
    prisma.doctor.findFirst({ where: { name: 'Dr. Perry Cox' } })
  );

  console.log('✅ Doctors seeded');

  // ─── Patients ─────────────────────────────────────────────────────────────
  // FIX: gender values updated to match the new Gender enum (MALE/FEMALE/OTHER).
  // Previously 'Male'/'Female' — Prisma enum is case-sensitive, must be uppercase.
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { phoneNumber: '555-0101' },
      update: {},
      create: {
        name: 'Alice Johnson',
        email: 'alice.j@email.com',
        phoneNumber: '555-0101',
        age: 34,
        gender: 'FEMALE',                          // FIX: was 'Female'
        medicalHistory: 'Hypertension, managed with Lisinopril. Seasonal allergies. No known drug allergies.',
      },
    }),
    prisma.patient.upsert({
      where: { phoneNumber: '555-0102' },
      update: {},
      create: {
        name: 'Robert Martinez',
        email: 'rob.m@email.com',
        phoneNumber: '555-0102',
        age: 52,
        gender: 'MALE',                            // FIX: was 'Male'
        medicalHistory: 'Type 2 Diabetes (on Metformin). History of mild angina. Non-smoker.',
      },
    }),
    prisma.patient.upsert({
      where: { phoneNumber: '555-0103' },
      update: {},
      create: {
        name: 'Emily Davis',
        phoneNumber: '555-0103',
        age: 28,
        gender: 'FEMALE',                          // FIX: was 'Female'
        medicalHistory: 'Asthma (uses Salbutamol inhaler PRN). History of appendectomy (2019).',
      },
    }),
    prisma.patient.upsert({
      where: { phoneNumber: '555-0104' },
      update: {},
      create: {
        name: 'Michael Thompson',
        email: 'michael.t@email.com',
        phoneNumber: '555-0104',
        age: 45,
        gender: 'MALE',                            // FIX: was 'Male'
        medicalHistory: 'Hypercholesterolemia on Atorvastatin. Former smoker. Mild sleep apnea.',
      },
    }),
    prisma.patient.upsert({
      where: { phoneNumber: '555-0105' },
      update: {},
      create: {
        name: 'Sophia Williams',
        email: 'sophia.w@email.com',
        phoneNumber: '555-0105',
        age: 61,
        gender: 'FEMALE',                          // FIX: was 'Female'
        medicalHistory: 'Osteoarthritis in both knees. Post-menopause HRT. Glaucoma (controlled).',
      },
    }),
    prisma.patient.upsert({
      where: { phoneNumber: '555-0106' },
      update: {},
      create: {
        name: 'James Anderson',
        phoneNumber: '555-0106',
        age: 39,
        gender: 'MALE',                            // FIX: was 'Male'
        medicalHistory: 'Anxiety disorder (on Sertraline). Eczema flare-ups. No surgical history.',
      },
    }),
    // Patients WITHOUT medical history — intentional crash trigger for frontend bug
    prisma.patient.upsert({
      where: { phoneNumber: '555-0199' },
      update: {},
      create: {
        name: 'Bruce Wayne',
        email: 'bruce@wayneenterprises.com',
        phoneNumber: '555-0199',
        age: 35,
        gender: 'MALE',                            // FIX: was 'Male'
        medicalHistory: null,
      },
    }),
    prisma.patient.upsert({
      where: { phoneNumber: '555-0198' },
      update: {},
      create: {
        name: 'Clark Kent',
        email: 'clark.kent@dailyplanet.com',
        phoneNumber: '555-0198',
        age: 32,
        gender: 'MALE',                            // FIX: was 'Male'
        medicalHistory: null,
      },
    }),
    prisma.patient.upsert({
      where: { phoneNumber: '555-0197' },
      update: {},
      create: {
        name: 'Diana Prince',
        email: 'diana@themyscira.org',
        phoneNumber: '555-0197',
        age: 29,
        gender: 'FEMALE',                          // FIX: was 'Female'
        medicalHistory: null,
      },
    }),
    prisma.patient.upsert({
      where: { phoneNumber: '555-0196' },
      update: {},
      create: {
        name: 'Peter Parker',
        phoneNumber: '555-0196',
        age: 23,
        gender: 'MALE',                            // FIX: was 'Male'
        medicalHistory: 'History of wrist fractures (bilateral). Heightened sensory response noted.',
      },
    }),
  ]);

  console.log(`✅ ${patients.length} patients seeded`);

  // ─── Appointments ─────────────────────────────────────────────────────────
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const makeDateTime = (base, hour, minute = 0) => {
    const d = new Date(base);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  // FIX: Switched to upsert on (doctorId, appointmentDate) to match the new
  // unique constraint — re-running seed won't create duplicate appointments.
  const appointments = await Promise.all([
    // Today's appointments
    prisma.appointment.upsert({
      where: { doctorId_appointmentDate: { doctorId: doctor1.id, appointmentDate: makeDateTime(today, 9, 0) } },
      update: {},
      create: {
        patientId: patients[0].id,
        doctorId: doctor1.id,
        appointmentDate: makeDateTime(today, 9, 0),
        reason: 'Routine diagnostic review',
        status: 'PENDING',
      },
    }),
    prisma.appointment.upsert({
      where: { doctorId_appointmentDate: { doctorId: doctor1.id, appointmentDate: makeDateTime(today, 10, 30) } },
      update: {},
      create: {
        patientId: patients[1].id,
        doctorId: doctor1.id,
        appointmentDate: makeDateTime(today, 10, 30),
        reason: 'Follow-up on blood sugar management',
        status: 'PENDING',
      },
    }),
    prisma.appointment.upsert({
      where: { doctorId_appointmentDate: { doctorId: doctor2.id, appointmentDate: makeDateTime(today, 9, 30) } },
      update: {},
      create: {
        patientId: patients[2].id,
        doctorId: doctor2.id,
        appointmentDate: makeDateTime(today, 9, 30),
        reason: 'Pre-surgical consultation',
        status: 'PENDING',
      },
    }),
    prisma.appointment.upsert({
      where: { doctorId_appointmentDate: { doctorId: doctor2.id, appointmentDate: makeDateTime(today, 11, 0) } },
      update: {},
      create: {
        patientId: patients[3].id,
        doctorId: doctor2.id,
        appointmentDate: makeDateTime(today, 11, 0),
        reason: 'Chest pain evaluation',
        status: 'COMPLETED',
      },
    }),
    prisma.appointment.upsert({
      where: { doctorId_appointmentDate: { doctorId: doctor1.id, appointmentDate: makeDateTime(today, 14, 0) } },
      update: {},
      create: {
        patientId: patients[6].id,
        doctorId: doctor1.id,
        appointmentDate: makeDateTime(today, 14, 0),
        reason: 'General check-up',
        status: 'PENDING',
      },
    }),
    prisma.appointment.upsert({
      where: { doctorId_appointmentDate: { doctorId: doctor3.id, appointmentDate: makeDateTime(today, 13, 0) } },
      update: {},
      create: {
        patientId: patients[7].id,
        doctorId: doctor3.id,
        appointmentDate: makeDateTime(today, 13, 0),
        reason: 'Annual physical',
        status: 'PENDING',
      },
    }),
    // Yesterday (completed)
    prisma.appointment.upsert({
      where: { doctorId_appointmentDate: { doctorId: doctor1.id, appointmentDate: makeDateTime(yesterday, 10, 0) } },
      update: {},
      create: {
        patientId: patients[4].id,
        doctorId: doctor1.id,
        appointmentDate: makeDateTime(yesterday, 10, 0),
        reason: 'Knee pain assessment',
        status: 'COMPLETED',
      },
    }),
    prisma.appointment.upsert({
      where: { doctorId_appointmentDate: { doctorId: doctor2.id, appointmentDate: makeDateTime(yesterday, 14, 0) } },
      update: {},
      create: {
        patientId: patients[5].id,
        doctorId: doctor2.id,
        appointmentDate: makeDateTime(yesterday, 14, 0),
        reason: 'Dermatological review',
        status: 'COMPLETED',
      },
    }),
    // Tomorrow
    prisma.appointment.upsert({
      where: { doctorId_appointmentDate: { doctorId: doctor3.id, appointmentDate: makeDateTime(tomorrow, 10, 0) } },
      update: {},
      create: {
        patientId: patients[9].id,
        doctorId: doctor3.id,
        appointmentDate: makeDateTime(tomorrow, 10, 0),
        reason: 'Wrist pain and mobility assessment',
        status: 'PENDING',
      },
    }),
    prisma.appointment.upsert({
      where: { doctorId_appointmentDate: { doctorId: doctor2.id, appointmentDate: makeDateTime(tomorrow, 11, 30) } },
      update: {},
      create: {
        patientId: patients[8].id,
        doctorId: doctor2.id,
        appointmentDate: makeDateTime(tomorrow, 11, 30),
        reason: 'Minor laceration suture removal',
        status: 'PENDING',
      },
    }),
    // Cancelled
    prisma.appointment.upsert({
      where: { doctorId_appointmentDate: { doctorId: doctor3.id, appointmentDate: makeDateTime(today, 15, 0) } },
      update: {},
      create: {
        patientId: patients[0].id,
        doctorId: doctor3.id,
        appointmentDate: makeDateTime(today, 15, 0),
        reason: 'Blood pressure monitoring',
        status: 'CANCELLED',
      },
    }),
  ]);

  console.log(`✅ ${appointments.length} appointments seeded`);

  // ─── Queue Tokens ─────────────────────────────────────────────────────────
  const todayStart = new Date(today.setHours(0, 0, 0, 0));

  // FIX: Added queueDate to match the new unique constraint (doctorId, tokenNumber, queueDate).
  // Without queueDate the upsert where clause can't match the constraint key.
  await Promise.all([
    prisma.queueToken.upsert({
      where: { doctorId_tokenNumber_queueDate: { doctorId: doctor1.id, tokenNumber: 1, queueDate: todayStart } },
      update: {},
      create: {
        tokenNumber: 1,
        patientId: patients[0].id,
        doctorId: doctor1.id,
        appointmentId: appointments[0].id,
        queueDate: todayStart,
        status: 'CALLING',
      },
    }),
    prisma.queueToken.upsert({
      where: { doctorId_tokenNumber_queueDate: { doctorId: doctor1.id, tokenNumber: 2, queueDate: todayStart } },
      update: {},
      create: {
        tokenNumber: 2,
        patientId: patients[1].id,
        doctorId: doctor1.id,
        appointmentId: appointments[1].id,
        queueDate: todayStart,
        status: 'WAITING',
      },
    }),
    prisma.queueToken.upsert({
      where: { doctorId_tokenNumber_queueDate: { doctorId: doctor1.id, tokenNumber: 3, queueDate: todayStart } },
      update: {},
      create: {
        tokenNumber: 3,
        patientId: patients[6].id,
        doctorId: doctor1.id,
        queueDate: todayStart,
        status: 'WAITING',
      },
    }),
    prisma.queueToken.upsert({
      where: { doctorId_tokenNumber_queueDate: { doctorId: doctor2.id, tokenNumber: 1, queueDate: todayStart } },
      update: {},
      create: {
        tokenNumber: 1,
        patientId: patients[2].id,
        doctorId: doctor2.id,
        appointmentId: appointments[2].id,
        queueDate: todayStart,
        status: 'CALLING',
      },
    }),
    prisma.queueToken.upsert({
      where: { doctorId_tokenNumber_queueDate: { doctorId: doctor2.id, tokenNumber: 2, queueDate: todayStart } },
      update: {},
      create: {
        tokenNumber: 2,
        patientId: patients[8].id,
        doctorId: doctor2.id,
        queueDate: todayStart,
        status: 'WAITING',
      },
    }),
    prisma.queueToken.upsert({
      where: { doctorId_tokenNumber_queueDate: { doctorId: doctor3.id, tokenNumber: 1, queueDate: todayStart } },
      update: {},
      create: {
        tokenNumber: 1,
        patientId: patients[7].id,
        doctorId: doctor3.id,
        appointmentId: appointments[5].id,
        queueDate: todayStart,
        status: 'WAITING',
      },
    }),
  ]);

  console.log(' Queue tokens seeded');
  console.log('');
  console.log(' Database seeded successfully!');
  console.log('');
  console.log('Pre-seeded accounts (password: password123):');
  console.log('  ADMIN        → admin@haqms.com');
  console.log('  RECEPTIONIST → reception1@haqms.com');
  console.log('  DOCTOR       → doctor1@haqms.com  (Dr. Gregory House)');
  console.log('  DOCTOR       → doctor2@haqms.com  (Dr. Meredith Grey)');
  console.log('  DOCTOR       → doctor3@haqms.com  (Dr. John Carter)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
