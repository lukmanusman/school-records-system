/*
  Warnings:

  - You are about to drop the column `toSessionId` on the `Promotion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fromClassId,fromSessionId]` on the table `Promotion` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Promotion" DROP CONSTRAINT "Promotion_toSessionId_fkey";

-- DropIndex
DROP INDEX "Promotion_fromClassId_fromSessionId_toSessionId_key";

-- AlterTable
ALTER TABLE "Promotion" DROP COLUMN "toSessionId";

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_fromClassId_fromSessionId_key" ON "Promotion"("fromClassId", "fromSessionId");
