const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.queueToken.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding roles & user credentials...');
  
  // Hashed password for users
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // 1. Admin User
  const adminUser = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@haqms.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // 2. Receptionist User
  const receptionistUser = await prisma.user.create({
    data: {
      name: 'Receptionist Sarah',
      email: 'reception1@haqms.com',
      password: hashedPassword,
      role: 'RECEPTIONIST',
    },
  });

  // 3. Doctor User
  const doctorUser = await prisma.user.create({
    data: {
      name: 'Dr. Gregory House',
      email: 'doctor1@haqms.com',
      password: hashedPassword,
      role: 'DOCTOR',
    },
  });

  console.log('Seeding doctors registry...');
  // Primary Doctor linked to Doctor User
  const docHouse = await prisma.doctor.create({
    data: {
      name: 'Dr. Gregory House',
      specialization: 'Diagnostic Medicine',
      department: 'Diagnostics',
      consultationFee: 150,
      experience: 20,
      availableFrom: '09:00',
      availableTo: '17:00',
      userId: doctorUser.id,
    },
  });

  // Additional mock doctor
  const doctorUser2 = await prisma.user.create({
    data: {
      name: 'Dr. John Watson',
      email: 'doctor2@haqms.com',
      password: hashedPassword,
      role: 'DOCTOR',
    },
  });

  const docWatson = await prisma.doctor.create({
    data: {
      name: 'Dr. John Watson',
      specialization: 'General Surgery',
      department: 'Surgery',
      consultationFee: 120,
      experience: 12,
      availableFrom: '10:00',
      availableTo: '18:00',
      userId: doctorUser2.id,
    },
  });

  console.log('Seeding patient directory...');
  // Seed patients
  const patient1 = await prisma.patient.create({
    data: {
      name: 'Bruce Wayne',
      email: 'bruce@wayne.com',
      phoneNumber: '555-0199',
      age: 38,
      gender: 'Male',
      medicalHistory: 'Cardiovascular risk, fracture history.',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      name: 'Clark Kent',
      email: 'clark@dailyplanet.com',
      phoneNumber: '555-0144',
      age: 35,
      gender: 'Male',
      medicalHistory: null, // Test nullable medical history
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      name: 'Selina Kyle',
      email: 'selina@gmail.com',
      phoneNumber: '555-0177',
      age: 30,
      gender: 'Female',
      medicalHistory: 'Asthma.',
    },
  });

  const patient4 = await prisma.patient.create({
    data: {
      name: 'Diana Prince',
      email: null, // Nullable email
      phoneNumber: '555-0122',
      age: 28,
      gender: 'Female',
      medicalHistory: null, // Nullable history
    },
  });

  console.log('Seeding appointment schedule...');
  // Add appointments
  const dateToday = new Date();
  dateToday.setHours(10, 0, 0, 0);

  const app1 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: docHouse.id,
      appointmentDate: dateToday,
      reason: 'Chronic chest discomfort',
      status: 'PENDING',
    },
  });

  const dateTomorrow = new Date();
  dateTomorrow.setDate(dateTomorrow.getDate() + 1);
  dateTomorrow.setHours(11, 0, 0, 0);

  const app2 = await prisma.appointment.create({
    data: {
      patientId: patient3.id,
      doctorId: docWatson.id,
      appointmentDate: dateTomorrow,
      reason: 'Suture removal post surgery',
      status: 'PENDING',
    },
  });

  console.log('Seeding live queue tokens...');
  // Seed queue tokens for the dashboard
  await prisma.queueToken.create({
    data: {
      tokenNumber: 1,
      patientId: patient1.id,
      doctorId: docHouse.id,
      appointmentId: app1.id,
      status: 'CALLING',
    },
  });

  await prisma.queueToken.create({
    data: {
      tokenNumber: 2,
      patientId: patient2.id,
      doctorId: docHouse.id,
      appointmentId: null,
      status: 'WAITING',
    },
  });

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
