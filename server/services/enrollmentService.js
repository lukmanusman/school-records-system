import prisma from "../lib/prisma.js";
import { generateAdmissionNumber } from "./admissionNumberService.js";

export const createEnrollment = async ({
  firstName,
  lastName,
  gender,
  dateOfBirth,
  enrollmentType,
  academicSessionId,
  entryTermId,
  entryClassId,
}) => {
  if (!["FRESHER", "TRANSFER"].includes(enrollmentType)) {
    throw new Error("Invalid enrollment type");
  }

  return prisma.$transaction(async (tx) => {
    const admissionNumber = await generateAdmissionNumber(tx, enrollmentType);

    const student = await tx.student.create({
      data: {
        admissionNumber,
        firstName,
        lastName,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        classId: entryClassId,
      },
    });

    const enrollment = await tx.enrollment.create({
      data: {
        studentId: student.id,
        academicSessionId,
        entryTermId,
        entryClassId,
        enrollmentType,
      },
    });

    return {
      student,
      enrollment,
    };
  });
};
