/*
  Warnings:

  - You are about to drop the column `approvedAt` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `approvedById` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Result` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[academicSessionId,classId,subjectId]` on the table `TeacherAssignment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `academicSessionId` to the `TeacherAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "PromotionDecisionType" ADD VALUE 'GRADUATE';

-- DropForeignKey
ALTER TABLE "Result" DROP CONSTRAINT "Result_approvedById_fkey";

-- DropIndex
DROP INDEX "TeacherAssignment_teacherId_subjectId_classId_key";

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "finalizedById" INTEGER;

-- AlterTable
ALTER TABLE "Result" DROP COLUMN "approvedAt",
DROP COLUMN "approvedById",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "TeacherAssignment" ADD COLUMN     "academicSessionId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Term" ADD COLUMN     "resultEntryActivatedAt" TIMESTAMP(3),
ADD COLUMN     "resultEntryActivatedById" INTEGER;

-- DropEnum
DROP TYPE "ResultStatus";

-- CreateTable
CREATE TABLE "SessionMigration" (
    "id" SERIAL NOT NULL,
    "fromSessionId" INTEGER NOT NULL,
    "toSessionId" INTEGER NOT NULL,
    "performedById" INTEGER NOT NULL,
    "migratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionMigration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraduateClass" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "graduationSessionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GraduateClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Graduation" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "graduateClassId" INTEGER NOT NULL,
    "fromClassId" INTEGER NOT NULL,
    "promotionDecisionId" INTEGER NOT NULL,
    "graduatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Graduation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionMigration_fromSessionId_key" ON "SessionMigration"("fromSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionMigration_toSessionId_key" ON "SessionMigration"("toSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GraduateClass_name_key" ON "GraduateClass"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GraduateClass_graduationSessionId_key" ON "GraduateClass"("graduationSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Graduation_studentId_key" ON "Graduation"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Graduation_promotionDecisionId_key" ON "Graduation"("promotionDecisionId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_academicSessionId_classId_subjectId_key" ON "TeacherAssignment"("academicSessionId", "classId", "subjectId");

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_resultEntryActivatedById_fkey" FOREIGN KEY ("resultEntryActivatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMigration" ADD CONSTRAINT "SessionMigration_fromSessionId_fkey" FOREIGN KEY ("fromSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMigration" ADD CONSTRAINT "SessionMigration_toSessionId_fkey" FOREIGN KEY ("toSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMigration" ADD CONSTRAINT "SessionMigration_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraduateClass" ADD CONSTRAINT "GraduateClass_graduationSessionId_fkey" FOREIGN KEY ("graduationSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Graduation" ADD CONSTRAINT "Graduation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Graduation" ADD CONSTRAINT "Graduation_graduateClassId_fkey" FOREIGN KEY ("graduateClassId") REFERENCES "GraduateClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Graduation" ADD CONSTRAINT "Graduation_fromClassId_fkey" FOREIGN KEY ("fromClassId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Graduation" ADD CONSTRAINT "Graduation_promotionDecisionId_fkey" FOREIGN KEY ("promotionDecisionId") REFERENCES "PromotionDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
