const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const password = await bcrypt.hash('admin123', 12);

  // Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@haqms.com' },
    update: {},
    create: { email: 'admin@haqms.com', password, name: 'System Admin', role: 'ADMIN' },
  });

  const reception1 = await prisma.user.upsert({
    where: { email: 'reception1@haqms.com' },
    update: {},
    create: { email: 'reception1@haqms.com', password, name: 'Alice Reception', role: 'RECEPTIONIST' },
  });

  const doc1User = await prisma.user.upsert({
    where: { email: 'doctor1@haqms.com' },
    update: {},
    create: { email: 'doctor1@haqms.com', password, name: 'Dr. John Smith', role: 'DOCTOR' },
  });

  const doc2User = await prisma.user.upsert({
    where: { email: 'doctor2@haqms.com' },
    update: {},
    create: { email: 'doctor2@haqms.com', password, name: 'Dr. Sarah Lee', role: 'DOCTOR' },
  });

  const doc3User = await prisma.user.upsert({
    where: { email: 'doctor3@haqms.com' },
    update: {},
    create: { email: 'doctor3@haqms.com', password, name: 'Dr. Raj Patel', role: 'DOCTOR' },
  });

  // Doctors
  const doctor1 = await prisma.doctor.upsert({
    where: { userId: doc1User.id },
    update: {},
    create: {
      name: 'Dr. John Smith', specialization: 'Cardiology', department: 'Cardiology',
      experience: 12, consultationFee: 150, userId: doc1User.id,
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { userId: doc2User.id },
    update: {},
    create: {
      name: 'Dr. Sarah Lee', specialization: 'Neurology', department: 'Neurology',
      experience: 8, consultationFee: 180, userId: doc2User.id,
    },
  });

  const doctor3 = await prisma.doctor.upsert({
    where: { userId: doc3User.id },
    update: {},
    create: {
      name: 'Dr. Raj Patel', specialization: 'General Surgery', department: 'Surgery',
      experience: 15, consultationFee: 120, userId: doc3User.id,
    },
  });

  // Patients
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { id: 'patient-bruce-wayne' },
      update: {},
      create: {
        id: 'patient-bruce-wayne', name: 'Bruce Wayne', phoneNumber: '555-0101',
        age: 35, gender: 'Male', medicalHistory: null, email: 'bruce@wayne.com',
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-clark-kent' },
      update: {},
      create: {
        id: 'patient-clark-kent', name: 'Clark Kent', phoneNumber: '555-0102',
        age: 30, gender: 'Male', medicalHistory: null, email: 'clark@dailyplanet.com',
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-diana-prince' },
      update: {},
      create: {
        id: 'patient-diana-prince', name: 'Diana Prince', phoneNumber: '555-0103',
        age: 28, gender: 'Female',
        medicalHistory: 'No known allergies. Regular cardiovascular checkups recommended.',
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-tony-stark' },
      update: {},
      create: {
        id: 'patient-tony-stark', name: 'Tony Stark', phoneNumber: '555-0104',
        age: 45, gender: 'Male',
        medicalHistory: 'History of chest trauma. Arc reactor implant. Anxiety disorder managed.',
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-natasha-romanoff' },
      update: {},
      create: {
        id: 'patient-natasha-romanoff', name: 'Natasha Romanoff', phoneNumber: '555-0105',
        age: 32, gender: 'Female',
        medicalHistory: 'Enhanced healing factor. No standard medications effective.',
      },
    }),
  ]);

  // Appointments
  const now = new Date();
  await prisma.appointment.createMany({
    skipDuplicates: true,
    data: [
      {
        patientId: patients[0].id, doctorId: doctor1.id,
        appointmentDate: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        reason: 'Cardiac evaluation', status: 'PENDING',
      },
      {
        patientId: patients[1].id, doctorId: doctor1.id,
        appointmentDate: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        reason: 'Annual checkup', status: 'PENDING',
      },
      {
        patientId: patients[2].id, doctorId: doctor2.id,
        appointmentDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        reason: 'Migraine follow-up', status: 'COMPLETED',
      },
      {
        patientId: patients[3].id, doctorId: doctor3.id,
        appointmentDate: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        reason: 'Post-op review', status: 'COMPLETED',
      },
      {
        patientId: patients[4].id, doctorId: doctor2.id,
        appointmentDate: new Date(now.getTime() + 6 * 60 * 60 * 1000),
        reason: 'Neurological assessment', status: 'PENDING',
      },
    ],
  });

  // Queue tokens
  await prisma.queueToken.createMany({
    skipDuplicates: true,
    data: [
      { tokenNumber: 1, patientId: patients[0].id, doctorId: doctor1.id, status: 'CALLING' },
      { tokenNumber: 2, patientId: patients[1].id, doctorId: doctor1.id, status: 'WAITING' },
      { tokenNumber: 1, patientId: patients[4].id, doctorId: doctor2.id, status: 'WAITING' },
    ],
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })