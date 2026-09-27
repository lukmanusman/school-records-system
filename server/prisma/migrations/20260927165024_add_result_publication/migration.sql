-- CreateTable
CREATE TABLE "ResultPublication" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "academicSessionId" INTEGER NOT NULL,
    "termId" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultPublication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResultPublication_classId_academicSessionId_termId_key" ON "ResultPublication"("classId", "academicSessionId", "termId");

-- AddForeignKey
ALTER TABLE "ResultPublication" ADD CONSTRAINT "ResultPublication_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultPublication" ADD CONSTRAINT "ResultPublication_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultPublication" ADD CONSTRAINT "ResultPublication_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultPublication" ADD CONSTRAINT "ResultPublication_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
