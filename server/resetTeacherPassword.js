import prisma from "./lib/prisma.js";
import { hashPassword } from "./utils/password.js";

// const newPassword = "DavidTemp123!";
const newPassword = "MaryTemp123!";

const passwordHash = await hashPassword(newPassword);

await prisma.user.update({
  where: {
    // id: 3,
    id: 1,
  },
  data: {
    passwordHash: passwordHash,
  },
});

// console.log("David's password has been reset successfully.");
console.log("Mary's password has been reset successfully.");

await prisma.$disconnect();
