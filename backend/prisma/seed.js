const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  await prisma.user.deleteMany(); // optional reset

  await prisma.user.createMany({
    data: [
      {
        name: "Admin",
        email: "admin@haqms.com",
        password: hashedPassword,
        role: "ADMIN",
      },
      {
        name: "Doctor One",
        email: "doctor1@haqms.com",
        password: hashedPassword,
        role: "DOCTOR",
      },
      {
        name: "Reception One",
        email: "reception1@haqms.com",
        password: hashedPassword,
        role: "RECEPTIONIST",
      },
    ],
  });

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });