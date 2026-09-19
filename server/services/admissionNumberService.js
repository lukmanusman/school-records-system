export const generateAdmissionNumber = async (tx, enrollmentType) => {
  const year = new Date().getFullYear();

  const prefix = enrollmentType === "FRESHER" ? "F" : "T";

  const counter = await tx.admissionNumberCounter.upsert({
    where: {
      year_enrollmentType: {
        year,
        enrollmentType,
      },
    },
    update: {
      nextNumber: {
        increment: 1,
      },
    },
    create: {
      year,
      enrollmentType,
      nextNumber: 2,
    },
  });

  const number = counter.nextNumber - 1;

  return `${year}${prefix}-${String(number).padStart(3, "0")}`;
};
