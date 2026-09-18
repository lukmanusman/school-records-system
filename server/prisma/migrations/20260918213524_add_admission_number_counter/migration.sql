-- CreateTable
CREATE TABLE "AdmissionNumberCounter" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "enrollmentType" "EnrollmentType" NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionNumberCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionNumberCounter_year_enrollmentType_key" ON "AdmissionNumberCounter"("year", "enrollmentType");
