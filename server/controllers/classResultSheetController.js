import prisma from "../lib/prisma.js";

const TERM_ORDER = {
  "First Term": 1,
  "Second Term": 2,
  "Third Term": 3,
};

export const submitClassResultSheet = async (req, res) => {
  try {
    const { classId, academicSessionId, termId } = req.body;

    // Validate required IDs.
    const ids = { classId, academicSessionId, termId };

    for (const [field, value] of Object.entries(ids)) {
      if (
        value === undefined ||
        !Number.isInteger(Number(value)) ||
        Number(value) <= 0
      ) {
        return res.status(400).json({
          message: `${field} must be a valid positive integer`,
        });
      }
    }

    const classIdNumber = Number(classId);
    const sessionIdNumber = Number(academicSessionId);
    const termIdNumber = Number(termId);

    const result = await prisma.$transaction(async (tx) => {
      // Find the logged-in teacher's profile.
      const teacher = await tx.teacher.findUnique({
        where: { userId: req.user.userId },
      });

      if (!teacher) {
        return {
          status: 403,
          body: {
            message: "Your user account is not linked to a teacher record",
          },
        };
      }

      // Verify this teacher is the form teacher for the class/session.
      const assignment = await tx.formTeacherAssignment.findUnique({
        where: {
          classId_academicSessionId: {
            classId: classIdNumber,
            academicSessionId: sessionIdNumber,
          },
        },
      });

      if (!assignment || assignment.teacherId !== teacher.id) {
        return {
          status: 403,
          body: {
            message:
              "Only the assigned form teacher can submit this class result sheet",
          },
        };
      }

      // Verify the academic session is active.
      const session = await tx.academicSession.findUnique({
        where: { id: sessionIdNumber },
      });

      if (!session) {
        return {
          status: 404,
          body: { message: "Academic session not found" },
        };
      }

      if (session.status !== "ACTIVE") {
        return {
          status: 409,
          body: {
            message:
              "Results can only be submitted in an active academic session",
          },
        };
      }

      // Verify the term belongs to the selected session and is active.
      const term = await tx.term.findFirst({
        where: {
          id: termIdNumber,
          academicSessionId: sessionIdNumber,
        },
      });

      if (!term) {
        return {
          status: 400,
          body: {
            message:
              "The selected term does not belong to this academic session",
          },
        };
      }

      if (term.status !== "ACTIVE") {
        return {
          status: 409,
          body: {
            message: "Results can only be submitted for an active term",
          },
        };
      }

      const termOrder = TERM_ORDER[term.name];

      if (!termOrder) {
        return {
          status: 400,
          body: {
            message: "The term name is not recognized",
          },
        };
      }

      // Find the class result sheet.
      const sheet = await tx.classResultSheet.findUnique({
        where: {
          classId_academicSessionId_termId: {
            classId: classIdNumber,
            academicSessionId: sessionIdNumber,
            termId: termIdNumber,
          },
        },
      });

      if (!sheet) {
        return {
          status: 404,
          body: {
            message:
              "Class result sheet not found. Enter results before submitting.",
          },
        };
      }

      if (!["DRAFT", "RETURNED"].includes(sheet.status)) {
        return {
          status: 409,
          body: {
            message: "Only DRAFT or RETURNED result sheets can be submitted",
          },
        };
      }

      // Published results cannot be resubmitted.
      const publication = await tx.resultPublication.findUnique({
        where: {
          classId_academicSessionId_termId: {
            classId: classIdNumber,
            academicSessionId: sessionIdNumber,
            termId: termIdNumber,
          },
        },
      });

      if (publication?.publishedAt) {
        return {
          status: 409,
          body: {
            message: "Published results cannot be resubmitted",
          },
        };
      }

      // ClassSubject defines which subjects the class offers.
      const classSubjects = await tx.classSubject.findMany({
        where: { classId: classIdNumber },
        select: { subjectId: true },
      });

      if (classSubjects.length === 0) {
        return {
          status: 409,
          body: {
            message: "This class has no subjects configured",
          },
        };
      }

      // Use the historical class roster, not Student.classId.
      const placements = await tx.studentClassPlacement.findMany({
        where: {
          classId: classIdNumber,
          academicSessionId: sessionIdNumber,
        },
        include: {
          startingTerm: {
            select: { name: true },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              admissionNumber: true,
            },
          },
        },
      });

      // Include only students who had joined by this term.
      const applicablePlacements = placements.filter((placement) => {
        const startingOrder = TERM_ORDER[placement.startingTerm.name];

        return startingOrder && startingOrder <= termOrder;
      });

      if (applicablePlacements.length === 0) {
        return {
          status: 409,
          body: {
            message:
              "There are no applicable students in this class for this term",
          },
        };
      }

      const studentIds = applicablePlacements.map(
        (placement) => placement.studentId,
      );

      const subjectIds = classSubjects.map(
        (classSubject) => classSubject.subjectId,
      );

      // Fetch existing results for the expected student/subject combinations.
      const results = await tx.result.findMany({
        where: {
          studentId: { in: studentIds },
          subjectId: { in: subjectIds },
          academicSessionId: sessionIdNumber,
          termId: termIdNumber,
        },
        select: {
          studentId: true,
          subjectId: true,
          caScore: true,
          caStatus: true,
          examScore: true,
          examStatus: true,
        },
      });

      const resultLookup = new Map(
        results.map((item) => [`${item.studentId}:${item.subjectId}`, item]),
      );

      const incomplete = [];

      for (const placement of applicablePlacements) {
        for (const subjectId of subjectIds) {
          const item = resultLookup.get(`${placement.studentId}:${subjectId}`);

          const caComplete =
            item && (item.caStatus === "ABSENT" || item.caScore !== null);

          const examComplete =
            item && (item.examStatus === "ABSENT" || item.examScore !== null);

          if (!caComplete || !examComplete) {
            incomplete.push({
              studentId: placement.student.id,
              admissionNumber: placement.student.admissionNumber,
              studentName: `${placement.student.firstName} ${placement.student.surname}`,
              subjectId,
              reason: !item
                ? "Result not entered"
                : !caComplete && !examComplete
                  ? "CA and exam incomplete"
                  : !caComplete
                    ? "CA incomplete"
                    : "Exam incomplete",
            });
          }
        }
      }

      if (incomplete.length > 0) {
        return {
          status: 409,
          body: {
            message:
              "The class result sheet has incomplete student assessments",
            incompleteCount: incomplete.length,
            incomplete,
          },
        };
      }

      // Submit the complete sheet for administrative review.
      const updatedSheet = await tx.classResultSheet.update({
        where: { id: sheet.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          submittedByTeacherId: teacher.id,
          reviewedAt: null,
          reviewedById: null,
          approvedAt: null,
          returnReason: null,
        },
      });

      return {
        status: 200,
        body: {
          message: "Class result sheet submitted successfully",
          classResultSheet: updatedSheet,
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Error submitting class result sheet:", error);

    return res.status(500).json({
      message: "Failed to submit class result sheet",
    });
  }
};
