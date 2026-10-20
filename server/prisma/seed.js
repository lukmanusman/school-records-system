import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../utils/password.js";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Seeding database...");

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be defined in the environment",
    );
  }

  const passwordHash = await hashPassword(adminPassword);

  await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Admin account seeded successfully.");

  const academicSession = await prisma.academicSession.upsert({
    where: {
      name: "2026/2027",
    },
    update: {},
    create: {
      name: "2026/2027",
    },
  });

  const terms = ["First Term", "Second Term", "Third Term"];

  for (const name of terms) {
    await prisma.term.upsert({
      where: {
        academicSessionId_name: {
          academicSessionId: academicSession.id,
          name,
        },
      },
      update: {},
      create: {
        name,
        academicSessionId: academicSession.id,
      },
    });
  }

  console.log("Initial academic session and terms seeded successfully.");
  console.log("Database seeding completed.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
