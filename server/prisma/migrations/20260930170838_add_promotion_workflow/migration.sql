-- CreateEnum
CREATE TYPE "PromotionDecisionType" AS ENUM ('PROMOTE', 'REPEAT');

-- CreateTable
CREATE TABLE "Promotion" (
    "id" SERIAL NOT NULL,
    "fromClassId" INTEGER NOT NULL,
    "fromSessionId" INTEGER NOT NULL,
    "toClassId" INTEGER,
    "toSessionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionDecision" (
    "id" SERIAL NOT NULL,
    "promotionId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "decision" "PromotionDecisionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_fromClassId_fromSessionId_toSessionId_key" ON "Promotion"("fromClassId", "fromSessionId", "toSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionDecision_promotionId_studentId_key" ON "PromotionDecision"("promotionId", "studentId");

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_fromClassId_fkey" FOREIGN KEY ("fromClassId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_toClassId_fkey" FOREIGN KEY ("toClassId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_fromSessionId_fkey" FOREIGN KEY ("fromSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_toSessionId_fkey" FOREIGN KEY ("toSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionDecision" ADD CONSTRAINT "PromotionDecision_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionDecision" ADD CONSTRAINT "PromotionDecision_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
