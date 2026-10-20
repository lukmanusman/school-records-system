-- CreateEnum
CREATE TYPE "AcademicSessionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TermStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "AcademicSession" ADD COLUMN     "status" "AcademicSessionStatus" NOT NULL DEFAULT 'PLANNED';

-- AlterTable
ALTER TABLE "Term" ADD COLUMN     "status" "TermStatus" NOT NULL DEFAULT 'UPCOMING';

-- CreateTable
CREATE TABLE "StudentClassPlacement" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "academicSessionId" INTEGER NOT NULL,
    "startingTermId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentClassPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentClassPlacement_classId_academicSessionId_idx" ON "StudentClassPlacement"("classId", "academicSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentClassPlacement_studentId_academicSessionId_key" ON "StudentClassPlacement"("studentId", "academicSessionId");

-- AddForeignKey
ALTER TABLE "StudentClassPlacement" ADD CONSTRAINT "StudentClassPlacement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassPlacement" ADD CONSTRAINT "StudentClassPlacement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassPlacement" ADD CONSTRAINT "StudentClassPlacement_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassPlacement" ADD CONSTRAINT "StudentClassPlacement_startingTermId_fkey" FOREIGN KEY ("startingTermId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ensure only one academic session is active at a time.
CREATE UNIQUE INDEX "AcademicSession_one_active_idx"
ON "AcademicSession" ("status")
WHERE "status" = 'ACTIVE';

-- Ensure only one term is active within an academic session.
CREATE UNIQUE INDEX "Term_one_active_per_session_idx"
ON "Term" ("academicSessionId")
WHERE "status" = 'ACTIVE';