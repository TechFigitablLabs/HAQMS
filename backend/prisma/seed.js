const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@haqms.com' },
    update: {
      password: defaultPasswordHash,
      name: 'Administrator',
      role: 'ADMIN',
    },
    create: {
      email: 'admin@haqms.com',
      password: defaultPasswordHash,
      name: 'Administrator',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'reception1@haqms.com' },
    update: {
      password: defaultPasswordHash,
      name: 'Receptionist One',
      role: 'RECEPTIONIST',
    },
    create: {
      email: 'reception1@haqms.com',
      password: defaultPasswordHash,
      name: 'Receptionist One',
      role: 'RECEPTIONIST',
    },
  });

  await prisma.user.upsert({
    where: { email: 'doctor1@haqms.com' },
    update: {
      password: defaultPasswordHash,
      name: 'Doctor One',
      role: 'DOCTOR',
    },
    create: {
      email: 'doctor1@haqms.com',
      password: defaultPasswordHash,
      name: 'Doctor One',
      role: 'DOCTOR',
    },
  });

  await prisma.doctor.createMany({
    data: [
      {
        name: 'Dr. Gregory House',
        specialization: 'Diagnostic Medicine',
        department: 'General Medicine',
        consultationFee: 1200,
        experience: 18,
      },
      {
        name: 'Dr. Meredith Grey',
        specialization: 'General Surgery',
        department: 'Surgery',
        consultationFee: 1000,
        experience: 12,
      },
      {
        name: 'Dr. Strange',
        specialization: 'Neurosurgery',
        department: 'Surgery',
        consultationFee: 1500,
        experience: 15,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.patient.createMany({
    data: [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '9876543210',
        age: 34,
        gender: 'Male',
        medicalHistory: 'Hypertension',
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phoneNumber: '9876501234',
        age: 28,
        gender: 'Female',
        medicalHistory: 'None',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
