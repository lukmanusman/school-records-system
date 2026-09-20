import prisma from "../lib/prisma.js";
import { generateAdmissionNumber } from "./admissionNumberService.js";
import { formatTitleCase } from "../utils/formatText.js";

export const createEnrollment = async ({
  firstName,
  surname,
  otherName,
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

  const formattedFirstName = formatTitleCase(firstName);
  const formattedSurname = formatTitleCase(surname);
  const formattedOtherName = otherName ? formatTitleCase(otherName) : null;

  return prisma.$transaction(async (tx) => {
    const [academicSession, entryTerm, entryClass] = await Promise.all([
      tx.academicSession.findUnique({
        where: {
          id: academicSessionId,
        },
      }),

      tx.term.findUnique({
        where: {
          id: entryTermId,
        },
      }),

      tx.class.findUnique({
        where: {
          id: entryClassId,
        },
      }),
    ]);

    if (!academicSession) {
      throw new Error("Academic session not found");
    }

    if (!entryTerm) {
      throw new Error("Entry term not found");
    }

    if (!entryClass) {
      throw new Error("Entry class not found");
    }

    if (entryTerm.academicSessionId !== academicSessionId) {
      throw new Error("Entry term does not belong to the academic session");
    }

    const isJSS1 = entryClass.name === "JSS1";

    if (isJSS1 && enrollmentType !== "FRESHER") {
      throw new Error("JSS1 students must be enrolled as FRESHER");
    }

    if (!isJSS1 && enrollmentType !== "TRANSFER") {
      throw new Error(
        "Students entering above JSS1 must be enrolled as TRANSFER",
      );
    }

    const admissionNumber = await generateAdmissionNumber(tx, enrollmentType);

    const student = await tx.student.create({
      data: {
        admissionNumber,
        firstName: formattedFirstName,
        surname: formattedSurname,
        otherName: formattedOtherName,
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
