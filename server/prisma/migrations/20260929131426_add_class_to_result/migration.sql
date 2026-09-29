-- Add classId as an optional column first
ALTER TABLE "Result"
ADD COLUMN "classId" INTEGER;

-- Add the foreign key
ALTER TABLE "Result"
ADD CONSTRAINT "Result_classId_fkey"
FOREIGN KEY ("classId")
REFERENCES "Class"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;