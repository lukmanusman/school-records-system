import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Seeding database...");

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

  const classes = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];

  for (const name of classes) {
    await prisma.class.upsert({
      where: {
        name,
      },
      update: {},
      create: {
        name,
      },
    });
  }

  console.log("Database seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
