require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = [
    {
      email: 'admin@haqms.com',
      name: 'Admin User',
      role: 'ADMIN'
    },
    {
      email: 'reception1@haqms.com',
      name: 'Reception User',
      role: 'RECEPTIONIST'
    },
    {
      email: 'doctor1@haqms.com',
      name: 'Doctor User',
      role: 'DOCTOR'
    }
  ];

  for (const userData of users) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (!existing) {
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword
        }
      });

      console.log(`Created: ${user.email}`);
    } else {
      console.log(`Already exists: ${userData.email}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });