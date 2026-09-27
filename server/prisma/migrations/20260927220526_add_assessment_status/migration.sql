-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PRESENT', 'ABSENT');

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "caStatus" "AssessmentStatus" NOT NULL DEFAULT 'PRESENT',
ADD COLUMN     "examStatus" "AssessmentStatus" NOT NULL DEFAULT 'PRESENT',
ALTER COLUMN "caScore" DROP NOT NULL,
ALTER COLUMN "examScore" DROP NOT NULL;
