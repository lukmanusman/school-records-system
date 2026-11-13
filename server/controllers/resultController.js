import prisma from "../lib/prisma.js";

const calculateTotalScore = (caScore, caStatus, examScore, examStatus) => {
  if (caStatus === "ABSENT" && examStatus === "ABSENT") {
    return "-";
  }

  const caTotal = caStatus === "ABSENT" ? 0 : caScore;
  const examTotal = examStatus === "ABSENT" ? 0 : examScore;

  return caTotal + examTotal;
};

export const createResult = async (req, res) => {
  try {
    const {
      studentId,
      subjectId,
      academicSessionId,
      termId,
      caScore,
      caStatus,
      examScore,
      examStatus,
    } = req.body;

    // Validate required fields
    if (
      studentId === undefined ||
      subjectId === undefined ||
      academicSessionId === undefined ||
      termId === undefined
    ) {
      return res.status(400).json({
        message: "Student, subject, session, and term are required",
      });
    }

    // At least one assessment must be supplied.
    if (caStatus === undefined && examStatus === undefined) {
      return res.status(400).json({
        message: "At least one assessment must be recorded",
      });
    }

    // Validate numeric IDs
    const ids = {
      studentId,
      subjectId,
      academicSessionId,
      termId,
    };

    for (const [field, value] of Object.entries(ids)) {
      if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
        return res.status(400).json({
          message: `${field} must be a valid positive integer`,
        });
      }
    }

    const studentIdNumber = Number(studentId);
    const subjectIdNumber = Number(subjectId);
    const academicSessionIdNumber = Number(academicSessionId);
    const termIdNumber = Number(termId);

    let teacherIdNumber = null;

    if (req.user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: {
          userId: req.user.userId,
        },
      });

      if (!teacher) {
        return res.status(404).json({
          message: "Teacher profile not found",
        });
      }

      teacherIdNumber = teacher.id;
    }

    // Validate CA only when CA is supplied.
    if (caStatus !== undefined) {
      if (!["PRESENT", "ABSENT"].includes(caStatus)) {
        return res.status(400).json({
          message: "CA status must be PRESENT or ABSENT",
        });
      }

      if (caStatus === "PRESENT") {
        if (typeof caScore !== "number") {
          return res.status(400).json({
            message: "CA score must be a number when CA status is PRESENT",
          });
        }

        if (caScore < 0 || caScore > 40) {
          return res.status(400).json({
            message: "CA score must be between 0 and 40",
          });
        }
      } else if (caScore !== null && caScore !== undefined) {
        return res.status(400).json({
          message: "CA score must be null when CA status is ABSENT",
        });
      }
    }

    // Validate Exam only when Exam is supplied.
    if (examStatus !== undefined) {
      if (!["PRESENT", "ABSENT"].includes(examStatus)) {
        return res.status(400).json({
          message: "Exam status must be PRESENT or ABSENT",
        });
      }

      if (examStatus === "PRESENT") {
        if (typeof examScore !== "number") {
          return res.status(400).json({
            message: "Exam score must be a number when exam status is PRESENT",
          });
        }

        if (examScore < 0 || examScore > 60) {
          return res.status(400).json({
            message: "Exam score must be between 0 and 60",
          });
        }
      } else if (examScore !== null && examScore !== undefined) {
        return res.status(400).json({
          message: "Exam score must be null when exam status is ABSENT",
        });
      }
    }

    // Check student
    const student = await prisma.student.findUnique({
      where: { id: studentIdNumber },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    // Resolve the student's class for the selected academic session.
    const studentPlacement = await prisma.studentClassPlacement.findUnique({
      where: {
        studentId_academicSessionId: {
          studentId: studentIdNumber,
          academicSessionId: academicSessionIdNumber,
        },
      },
    });

    if (!studentPlacement) {
      return res.status(400).json({
        message:
          "Student has no class placement in the selected academic session",
      });
    }

    const studentClassId = studentPlacement.classId;

    // Check subject
    const subject = await prisma.subject.findUnique({
      where: { id: subjectIdNumber },
    });

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found",
      });
    }

    // Check teacher
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherIdNumber },
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    // Check academic session
    const academicSession = await prisma.academicSession.findUnique({
      where: { id: academicSessionIdNumber },
    });

    if (!academicSession) {
      return res.status(404).json({
        message: "Academic session not found",
      });
    }

    // Check term and make sure it belongs to the selected session
    const term = await prisma.term.findUnique({
      where: { id: termIdNumber },
    });

    if (!term) {
      return res.status(404).json({
        message: "Term not found",
      });
    }

    if (term.academicSessionId !== academicSessionIdNumber) {
      return res.status(400).json({
        message: "Term does not belong to the selected academic session",
      });
    }

    // Check that the student's placement had started by the selected term.
    const startingTerm = await prisma.term.findUnique({
      where: {
        id: studentPlacement.startingTermId,
      },
    });

    if (!startingTerm) {
      return res.status(400).json({
        message: "Student's starting term could not be found",
      });
    }

    const termOrder = ["First Term", "Second Term", "Third Term"];

    const selectedTermIndex = termOrder.indexOf(term.name);
    const startingTermIndex = termOrder.indexOf(startingTerm.name);

    if (
      startingTerm.academicSessionId !== academicSessionIdNumber ||
      selectedTermIndex === -1 ||
      startingTermIndex === -1 ||
      selectedTermIndex < startingTermIndex
    ) {
      return res.status(400).json({
        message: "The student is not eligible to receive results for this term",
      });
    }

    // Only the active academic session accepts new results.
    if (academicSession.status !== "ACTIVE") {
      return res.status(409).json({
        message: "Results can only be entered for the active academic session",
      });
    }

    // Only the active term accepts new results.
    if (term.status !== "ACTIVE") {
      return res.status(409).json({
        message: "Results can only be entered for the active term",
      });
    }

    if (!term.resultEntryActivatedAt) {
      return res.status(409).json({
        message: "Result entry has not been activated for this term",
      });
    }

    // Prevent new results from being created after the report is published
    const publication = await prisma.resultPublication.findUnique({
      where: {
        classId_academicSessionId_termId: {
          classId: studentClassId,
          academicSessionId: academicSessionIdNumber,
          termId: termIdNumber,
        },
      },
    });

    if (publication?.publishedAt) {
      return res.status(409).json({
        message:
          "Results for this class, session, and term have already been published",
      });
    }

    // Check that the subject is offered in the student's current class
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId: studentClassId,
          subjectId: subjectIdNumber,
        },
      },
    });

    if (!classSubject) {
      return res.status(400).json({
        message: "This subject is not assigned to the student's class",
      });
    }

    // Check that the teacher teaches this subject in the student's class
    if (req.user.role === "TEACHER") {
      const teacherAssignment = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId: teacherIdNumber,
          subjectId: subjectIdNumber,
          classId: studentClassId,
          academicSessionId: academicSessionIdNumber,
        },
      });

      if (!teacherAssignment) {
        return res.status(400).json({
          message:
            "You are not assigned to this subject in the student's class",
        });
      }
    }

    // Check for duplicate result
    const existingResult = await prisma.result.findUnique({
      where: {
        studentId_subjectId_academicSessionId_termId: {
          studentId: studentIdNumber,
          subjectId: subjectIdNumber,
          academicSessionId: academicSessionIdNumber,
          termId: termIdNumber,
        },
      },
    });

    if (existingResult) {
      return res.status(409).json({
        message:
          "A result already exists for this student, subject, session, and term",
      });
    }

    // Create the class result sheet and score in one transaction.
    const result = await prisma.$transaction(async (tx) => {
      const classResultSheet = await tx.classResultSheet.upsert({
        where: {
          classId_academicSessionId_termId: {
            classId: studentClassId,
            academicSessionId: academicSessionIdNumber,
            termId: termIdNumber,
          },
        },
        update: {},
        create: {
          classId: studentClassId,
          academicSessionId: academicSessionIdNumber,
          termId: termIdNumber,
        },
      });

      // Scores may only be entered while the sheet is editable.
      if (!["DRAFT", "RETURNED"].includes(classResultSheet.status)) {
        const error = new Error("CLASS_RESULT_SHEET_LOCKED");
        throw error;
      }

      return tx.result.create({
        data: {
          studentId: studentIdNumber,
          subjectId: subjectIdNumber,
          teacherId: teacherIdNumber,
          classId: studentClassId,
          academicSessionId: academicSessionIdNumber,
          termId: termIdNumber,
          ...(caStatus !== undefined && {
            caScore: caStatus === "ABSENT" ? null : caScore,
            caStatus,
          }),

          ...(examStatus !== undefined && {
            examScore: examStatus === "ABSENT" ? null : examScore,
            examStatus,
          }),
        },
        include: {
          student: true,
          subject: true,
          teacher: true,
          academicSession: true,
          term: true,
        },
      });
    });

    return res.status(201).json({
      message: "Result created successfully",
      result: {
        ...result,
        totalScore: calculateTotalScore(
          result.caScore,
          result.caStatus,
          result.examScore,
          result.examStatus,
        ),
      },
    });
  } catch (error) {
    if (error.message === "CLASS_RESULT_SHEET_LOCKED") {
      return res.status(409).json({
        message:
          "This class's results are submitted or approved and cannot currently be edited",
      });
    }
    console.error("Error creating result:", error);

    return res.status(500).json({
      message: "Failed to create result",
    });
  }
};

export const getResults = async (req, res) => {
  try {
    const {
      studentId,
      subjectId,
      teacherId,
      academicSessionId,
      termId,
      classId,
    } = req.query;

    // Validate supplied query parameters.
    const filters = {
      studentId,
      subjectId,
      teacherId,
      academicSessionId,
      termId,
      classId,
    };

    for (const [field, value] of Object.entries(filters)) {
      if (
        value !== undefined &&
        (!Number.isInteger(Number(value)) || Number(value) <= 0)
      ) {
        return res.status(400).json({
          message: `${field} must be a valid positive integer`,
        });
      }
    }

    const where = {};

    // Students can only view their own published results
    if (req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: {
          userId: req.user.userId,
        },
      });

      if (!student) {
        return res.status(404).json({
          message: "Student profile not found",
        });
      }

      // Ignore any studentId supplied by the student.
      where.studentId = student.id;

      // Get the student's historical class placements.
      const studentPlacements = await prisma.studentClassPlacement.findMany({
        where: {
          studentId: student.id,
        },
        select: {
          classId: true,
          academicSessionId: true,
          startingTermId: true,
        },
      });

      // Find published reports that this student's results may belong to.
      const publishedReports = await prisma.resultPublication.findMany({
        where: {
          publishedAt: {
            not: null,
          },
          ...(academicSessionId !== undefined && {
            academicSessionId: Number(academicSessionId),
          }),
          ...(termId !== undefined && {
            termId: Number(termId),
          }),
        },
        select: {
          classId: true,
          academicSessionId: true,
          termId: true,
        },
      });

      // Retrieve the terms needed to verify placement eligibility.
      const relevantTermIds = [
        ...new Set([
          ...studentPlacements.map((placement) => placement.startingTermId),
          ...publishedReports.map((publication) => publication.termId),
        ]),
      ];

      const relevantTerms = await prisma.term.findMany({
        where: {
          id: {
            in: relevantTermIds,
          },
        },
        select: {
          id: true,
          name: true,
          academicSessionId: true,
        },
      });

      const termsById = new Map(relevantTerms.map((term) => [term.id, term]));

      const termOrder = ["First Term", "Second Term", "Third Term"];

      // Only return published results from terms on or after
      // the student's placement starting term.
      where.OR = publishedReports
        .filter((publication) => {
          const placement = studentPlacements.find(
            (item) =>
              item.classId === publication.classId &&
              item.academicSessionId === publication.academicSessionId,
          );

          if (!placement) {
            return false;
          }

          const startingTerm = termsById.get(placement.startingTermId);
          const publishedTerm = termsById.get(publication.termId);

          if (
            !startingTerm ||
            !publishedTerm ||
            startingTerm.academicSessionId !== publication.academicSessionId ||
            publishedTerm.academicSessionId !== publication.academicSessionId
          ) {
            return false;
          }

          const startingTermIndex = termOrder.indexOf(startingTerm.name);
          const publishedTermIndex = termOrder.indexOf(publishedTerm.name);

          return (
            startingTermIndex !== -1 &&
            publishedTermIndex !== -1 &&
            publishedTermIndex >= startingTermIndex
          );
        })
        .map((publication) => ({
          classId: publication.classId,
          academicSessionId: publication.academicSessionId,
          termId: publication.termId,
        }));
    } else if (req.user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: {
          userId: req.user.userId,
        },
      });

      if (!teacher) {
        return res.status(404).json({
          message: "Teacher profile not found",
        });
      }

      const assignments = await prisma.teacherAssignment.findMany({
        where: {
          teacherId: teacher.id,
          ...(academicSessionId !== undefined && {
            academicSessionId: Number(academicSessionId),
          }),
          ...(classId !== undefined && {
            classId: Number(classId),
          }),
          ...(subjectId !== undefined && {
            subjectId: Number(subjectId),
          }),
        },
        select: {
          academicSessionId: true,
          classId: true,
          subjectId: true,
        },
      });

      where.OR = assignments.map((assignment) => ({
        academicSessionId: assignment.academicSessionId,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        ...(termId !== undefined && {
          termId: Number(termId),
        }),
        ...(studentId !== undefined && {
          studentId: Number(studentId),
        }),
      }));
    } else {
      // Admins can use the existing filters
      const filters = {
        studentId,
        subjectId,
        teacherId,
        academicSessionId,
        termId,
        classId,
      };

      for (const [field, value] of Object.entries(filters)) {
        if (value !== undefined) {
          if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
            return res.status(400).json({
              message: `${field} must be a valid positive integer`,
            });
          }

          where[field] = Number(value);
        }
      }
    }

    const results = await prisma.result.findMany({
      where,
      include: {
        student: true,
        subject: true,
        teacher: true,
        academicSession: true,
        term: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedResults = results.map((result) => ({
      ...result,
      totalScore: calculateTotalScore(
        result.caScore,
        result.caStatus,
        result.examScore,
        result.examStatus,
      ),
    }));

    return res.status(200).json(formattedResults);
  } catch (error) {
    console.error("Error fetching results:", error);

    return res.status(500).json({
      message: "Failed to fetch results",
    });
  }
};

export const getResultById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        message: "Result ID must be a valid positive integer",
      });
    }

    const result = await prisma.result.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        student: true,
        subject: true,
        teacher: true,
        academicSession: true,
        term: true,
      },
    });

    if (!result) {
      return res.status(404).json({
        message: "Result not found",
      });
    }

    // Teachers can only view results for their assigned
    // subject, class, and academic session.
    if (req.user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: {
          userId: req.user.userId,
        },
      });

      if (!teacher) {
        return res.status(404).json({
          message: "Teacher profile not found",
        });
      }

      const teacherAssignment = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId: teacher.id,
          subjectId: result.subjectId,
          classId: result.classId,
          academicSessionId: result.academicSessionId,
        },
      });

      if (!teacherAssignment) {
        return res.status(403).json({
          message: "You are not authorized to view this result",
        });
      }
    }

    // Students can only view their own published results
    if (req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: {
          userId: req.user.userId,
        },
      });

      if (!student) {
        return res.status(404).json({
          message: "Student profile not found",
        });
      }

      // Prevent students from viewing another student's result
      if (result.studentId !== student.id) {
        return res.status(404).json({
          message: "Result not found",
        });
      }

      // Verify the student's historical class placement for this session.
      const studentPlacement = await prisma.studentClassPlacement.findUnique({
        where: {
          studentId_academicSessionId: {
            studentId: student.id,
            academicSessionId: result.academicSessionId,
          },
        },
      });

      if (!studentPlacement || studentPlacement.classId !== result.classId) {
        return res.status(403).json({
          message: "You are not authorized to view this result",
        });
      }

      // Verify that the result's term is on or after the placement starting term.
      const startingTerm = await prisma.term.findUnique({
        where: {
          id: studentPlacement.startingTermId,
        },
      });

      const termOrder = ["First Term", "Second Term", "Third Term"];

      const resultTermIndex = termOrder.indexOf(result.term.name);
      const startingTermIndex = startingTerm
        ? termOrder.indexOf(startingTerm.name)
        : -1;

      if (
        !startingTerm ||
        startingTerm.academicSessionId !== result.academicSessionId ||
        resultTermIndex === -1 ||
        startingTermIndex === -1 ||
        resultTermIndex < startingTermIndex
      ) {
        return res.status(403).json({
          message: "You are not authorized to view this result",
        });
      }

      // Check whether this exact class/session/term is published
      const publication = await prisma.resultPublication.findUnique({
        where: {
          classId_academicSessionId_termId: {
            classId: result.classId,
            academicSessionId: result.academicSessionId,
            termId: result.termId,
          },
        },
      });

      if (!publication || !publication.publishedAt) {
        return res.status(403).json({
          message: "This result has not been published",
        });
      }
    }

    return res.status(200).json({
      ...result,
      totalScore: calculateTotalScore(
        result.caScore,
        result.caStatus,
        result.examScore,
        result.examStatus,
      ),
    });
  } catch (error) {
    console.error("Error fetching result:", error);

    return res.status(500).json({
      message: "Failed to fetch result",
    });
  }
};

export const updateResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { caScore, caStatus, examScore, examStatus } = req.body;

    // Validate result ID
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        message: "Result ID must be a valid positive integer",
      });
    }

    const resultId = Number(id);

    // Check that the result exists
    const existingResult = await prisma.result.findUnique({
      where: {
        id: resultId,
      },
    });

    if (!existingResult) {
      return res.status(404).json({
        message: "Result not found",
      });
    }

    const academicSession = await prisma.academicSession.findUnique({
      where: {
        id: existingResult.academicSessionId,
      },
    });

    if (!academicSession || academicSession.status !== "ACTIVE") {
      return res.status(409).json({
        message: "Only results in the active academic session can be edited",
      });
    }

    const term = await prisma.term.findUnique({
      where: {
        id: existingResult.termId,
      },
    });

    if (
      !term ||
      term.academicSessionId !== existingResult.academicSessionId ||
      term.status !== "ACTIVE"
    ) {
      return res.status(409).json({
        message: "Only results in the active term can be edited",
      });
    }

    if (!term.resultEntryActivatedAt) {
      return res.status(409).json({
        message: "Result entry has not been activated for this term",
      });
    }

    const teacher = await prisma.teacher.findUnique({
      where: {
        userId: req.user.userId,
      },
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher profile not found",
      });
    }

    const teacherAssignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        subjectId: existingResult.subjectId,
        classId: existingResult.classId,
        academicSessionId: existingResult.academicSessionId,
      },
    });

    if (!teacherAssignment) {
      return res.status(403).json({
        message:
          "You can only edit results for subjects assigned to you in this class",
      });
    }

    // Verify the student's historical class placement for this session.
    const studentPlacement = await prisma.studentClassPlacement.findUnique({
      where: {
        studentId_academicSessionId: {
          studentId: existingResult.studentId,
          academicSessionId: existingResult.academicSessionId,
        },
      },
    });

    if (
      !studentPlacement ||
      studentPlacement.classId !== existingResult.classId
    ) {
      return res.status(400).json({
        message:
          "Student's class placement does not match this result's academic session",
      });
    }

    // Ensure the result's term is not before the student's placement starting term.
    const startingTerm = await prisma.term.findUnique({
      where: {
        id: studentPlacement.startingTermId,
      },
    });

    const termOrder = ["First Term", "Second Term", "Third Term"];

    const resultTermIndex = termOrder.indexOf(term.name);
    const startingTermIndex = startingTerm
      ? termOrder.indexOf(startingTerm.name)
      : -1;

    if (
      !startingTerm ||
      startingTerm.academicSessionId !== existingResult.academicSessionId ||
      resultTermIndex === -1 ||
      startingTermIndex === -1 ||
      resultTermIndex < startingTermIndex
    ) {
      return res.status(400).json({
        message: "The student is not eligible to receive results for this term",
      });
    }

    // Check whether the class result sheet allows score editing
    const classResultSheet = await prisma.classResultSheet.findUnique({
      where: {
        classId_academicSessionId_termId: {
          classId: existingResult.classId,
          academicSessionId: existingResult.academicSessionId,
          termId: existingResult.termId,
        },
      },
    });

    if (
      !classResultSheet ||
      !["DRAFT", "RETURNED"].includes(classResultSheet.status)
    ) {
      return res.status(409).json({
        message:
          "Scores can only be edited while the class result sheet is in DRAFT or RETURNED status",
      });
    }

    // Prevent results from being edited after the report is published
    const publication = await prisma.resultPublication.findUnique({
      where: {
        classId_academicSessionId_termId: {
          classId: existingResult.classId,
          academicSessionId: existingResult.academicSessionId,
          termId: existingResult.termId,
        },
      },
    });

    if (publication?.publishedAt) {
      return res.status(409).json({
        message:
          "Results for this class, session, and term have already been published",
      });
    }

    // Validate the resulting CA assessment
    const nextCaStatus =
      caStatus !== undefined ? caStatus : existingResult.caStatus;

    const nextCaScore =
      caScore !== undefined ? caScore : existingResult.caScore;

    if (!["PRESENT", "ABSENT"].includes(nextCaStatus)) {
      return res.status(400).json({
        message: "CA status must be PRESENT or ABSENT",
      });
    }

    if (nextCaStatus === "PRESENT") {
      if (typeof nextCaScore !== "number") {
        return res.status(400).json({
          message: "CA score must be a number when CA status is PRESENT",
        });
      }

      if (nextCaScore < 0 || nextCaScore > 40) {
        return res.status(400).json({
          message: "CA score must be between 0 and 40",
        });
      }
    } else if (nextCaScore !== null) {
      return res.status(400).json({
        message: "CA score must be null when CA status is ABSENT",
      });
    }

    // Validate the resulting Exam assessment
    const nextExamStatus =
      examStatus !== undefined ? examStatus : existingResult.examStatus;

    const nextExamScore =
      examScore !== undefined ? examScore : existingResult.examScore;

    if (!["PRESENT", "ABSENT"].includes(nextExamStatus)) {
      return res.status(400).json({
        message: "Exam status must be PRESENT or ABSENT",
      });
    }

    if (nextExamStatus === "PRESENT") {
      if (typeof nextExamScore !== "number") {
        return res.status(400).json({
          message: "Exam score must be a number when exam status is PRESENT",
        });
      }

      if (nextExamScore < 0 || nextExamScore > 60) {
        return res.status(400).json({
          message: "Exam score must be between 0 and 60",
        });
      }
    } else if (nextExamScore !== null) {
      return res.status(400).json({
        message: "Exam score must be null when exam status is ABSENT",
      });
    }

    const updatedResult = await prisma.result.update({
      where: {
        id: resultId,
      },
      data: {
        ...(caScore !== undefined && { caScore }),
        ...(caStatus !== undefined && {
          caStatus,
          ...(caStatus === "ABSENT" && { caScore: null }),
        }),
        ...(examScore !== undefined && { examScore }),
        ...(examStatus !== undefined && {
          examStatus,
          ...(examStatus === "ABSENT" && { examScore: null }),
        }),
      },
      include: {
        student: true,
        subject: true,
        teacher: true,
        academicSession: true,
        term: true,
      },
    });

    return res.status(200).json({
      message: "Result updated successfully",
      result: {
        ...updatedResult,
        totalScore: calculateTotalScore(
          updatedResult.caScore,
          updatedResult.caStatus,
          updatedResult.examScore,
          updatedResult.examStatus,
        ),
      },
    });
  } catch (error) {
    console.error("Error updating result:", error);

    return res.status(500).json({
      message: "Failed to update result",
    });
  }
};
