
-- Add the sequence column as nullable first.
ALTER TABLE "AcademicSession"
ADD COLUMN "sequence" INTEGER;

-- Assign sequence 1 to the existing 2026/2027 session.
UPDATE "AcademicSession"
SET "sequence" = 1
WHERE "name" = '2026/2027';

-- Make sequence mandatory after existing data has been populated.
ALTER TABLE "AcademicSession"
ALTER COLUMN "sequence" SET NOT NULL;

-- Ensure every academic session has a unique sequence number.
CREATE UNIQUE INDEX "AcademicSession_sequence_key"
ON "AcademicSession"("sequence");
