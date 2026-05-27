require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      email: 'admin@haqms.com',
      password: 'password123',
      name: 'Admin User',
      role: 'ADMIN'
    },
    {
      email: 'reception1@haqms.com',
      password: 'password123',
      name: 'Reception User',
      role: 'RECEPTIONIST'
    },
    {
      email: 'doctor1@haqms.com',
      password: 'password123',
      name: 'Doctor User',
      role: 'DOCTOR'
    }
  ];

  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 10);

    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashedPassword
      },
      create: {
        email: u.email,
        password: hashedPassword,
        name: u.name,
        role: u.role
      }
    });

    console.log(`Updated: ${u.email}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });