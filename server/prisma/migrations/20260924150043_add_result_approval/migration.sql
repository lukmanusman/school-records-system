-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'APPROVED');

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" INTEGER,
ADD COLUMN     "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT';

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
