import prisma from "../lib/prisma.js";
import { generateAdmissionNumber } from "./admissionNumberService.js";
import { formatTitleCase } from "../utils/formatText.js";
import { hashPassword } from "../utils/password.js";

export const createEnrollment = async ({
  firstName,
  surname,
  otherName,
  gender,
  dateOfBirth,
  email,
  password,
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
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await tx.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    const passwordHash = await hashPassword(password);

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

    const termOrder = ["First Term", "Second Term", "Third Term"];

    const entryTermIndex = termOrder.indexOf(entryTerm.name);

    if (entryTermIndex === -1) {
      throw new Error("The selected entry term has an unsupported name");
    }

    // Get all terms in the selected academic session.
    const sessionTerms = await tx.term.findMany({
      where: {
        academicSessionId,
        name: {
          in: termOrder,
        },
      },
    });

    // Sort by academic term order, not database ID.
    sessionTerms.sort(
      (a, b) => termOrder.indexOf(a.name) - termOrder.indexOf(b.name),
    );

    // Find existing result sheets for this class and session.
    const existingResultSheets = await tx.classResultSheet.findMany({
      where: {
        classId: entryClassId,
        academicSessionId,
      },
      select: {
        termId: true,
      },
    });

    const existingSheetTermIds = new Set(
      existingResultSheets.map((sheet) => sheet.termId),
    );

    // Find the first eligible term from the selected entry term onward.
    const effectivePlacementTerm = sessionTerms
      .filter((term) => termOrder.indexOf(term.name) >= entryTermIndex)
      .find((term) => !existingSheetTermIds.has(term.id));

    if (!effectivePlacementTerm) {
      throw new Error(
        "No eligible term remains for this class in the selected academic session. Please select another academic session.",
      );
    }

    const effectiveStartingTermId = effectivePlacementTerm.id;

    const admissionNumber = await generateAdmissionNumber(tx, enrollmentType);

    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "STUDENT",
      },
    });

    const student = await tx.student.create({
      data: {
        admissionNumber,
        firstName: formattedFirstName,
        surname: formattedSurname,
        otherName: formattedOtherName,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        classId: entryClassId,
        userId: user.id,
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

    const classPlacement = await tx.studentClassPlacement.create({
      data: {
        studentId: student.id,
        classId: entryClassId,
        academicSessionId,
        startingTermId: effectiveStartingTermId,
      },
    });

    return {
      student,
      enrollment,
      classPlacement,
    };
  });
};
