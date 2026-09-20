/*
  Warnings:

  - You are about to drop the column `lastName` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Teacher` table. All the data in the column will be lost.
  - Added the required column `surname` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surname` to the `Teacher` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "lastName",
ADD COLUMN     "otherName" TEXT,
ADD COLUMN     "surname" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "lastName",
ADD COLUMN     "otherName" TEXT,
ADD COLUMN     "surname" TEXT NOT NULL;
