import prisma from "../lib/prisma.js";

const calculateTotalScore = (caScore, caStatus, examScore, examStatus) => {
  if (caStatus === "ABSENT" && examStatus === "ABSENT") {
    return "ABS";
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
      termId === undefined ||
      caStatus === undefined ||
      examStatus === undefined
    ) {
      return res.status(400).json({
        message:
          "Student, subject, session, term, CA status, and exam status are required",
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

    // Validate scores
    // Validate assessment statuses
    if (!["PRESENT", "ABSENT"].includes(caStatus)) {
      return res.status(400).json({
        message: "CA status must be PRESENT or ABSENT",
      });
    }

    if (!["PRESENT", "ABSENT"].includes(examStatus)) {
      return res.status(400).json({
        message: "Exam status must be PRESENT or ABSENT",
      });
    }

    // Validate CA score
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

    // Validate exam score
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

    // Check student
    const student = await prisma.student.findUnique({
      where: { id: studentIdNumber },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    // A result requires a current class
    if (!student.classId) {
      return res.status(400).json({
        message: "Student is not assigned to a class",
      });
    }

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

    // Prevent new results from being created after the report is published
    const publication = await prisma.resultPublication.findUnique({
      where: {
        classId_academicSessionId_termId: {
          classId: student.classId,
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
          classId: student.classId,
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
      const teacherAssignment = await prisma.teacherAssignment.findUnique({
        where: {
          teacherId_subjectId_classId: {
            teacherId: teacherIdNumber,
            subjectId: subjectIdNumber,
            classId: student.classId,
          },
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

    // Create result
    const result = await prisma.result.create({
      data: {
        studentId: studentIdNumber,
        subjectId: subjectIdNumber,
        teacherId: teacherIdNumber,
        academicSessionId: academicSessionIdNumber,
        termId: termIdNumber,
        caScore: caStatus === "ABSENT" ? null : caScore,
        caStatus,
        examScore: examStatus === "ABSENT" ? null : examScore,
        examStatus,
      },
      include: {
        student: true,
        subject: true,
        teacher: true,
        academicSession: true,
        term: true,
      },
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
    console.error("Error creating result:", error);

    return res.status(500).json({
      message: "Failed to create result",
    });
  }
};

export const getResults = async (req, res) => {
  try {
    const { studentId, subjectId, teacherId, academicSessionId, termId } =
      req.query;

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

      if (!student.classId) {
        return res.status(400).json({
          message: "Student is not assigned to a class",
        });
      }

      // Ignore any studentId supplied by the student.
      where.studentId = student.id;

      // Only return results belonging to a published report
      where.academicSession = {
        resultPublications: {
          some: {
            classId: student.classId,
            termId: termId !== undefined ? Number(termId) : undefined,
          },
        },
      };
    } else {
      // Admins and teachers can use the existing filters
      const filters = {
        studentId,
        subjectId,
        teacherId,
        academicSessionId,
        termId,
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

      if (!student.classId) {
        return res.status(400).json({
          message: "Student is not assigned to a class",
        });
      }

      // Check whether this exact class/session/term is published
      const publication = await prisma.resultPublication.findUnique({
        where: {
          classId_academicSessionId_termId: {
            classId: student.classId,
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

    if (existingResult.teacherId !== teacher.id) {
      return res.status(403).json({
        message: "You can only edit results assigned to you",
      });
    }

    if (existingResult.status === "APPROVED") {
      return res.status(403).json({
        message: "Approved results cannot be edited",
      });
    }

    // Get the student's current class
    const student = await prisma.student.findUnique({
      where: {
        id: existingResult.studentId,
      },
      select: {
        classId: true,
      },
    });

    if (!student || !student.classId) {
      return res.status(400).json({
        message: "Student is not assigned to a class",
      });
    }

    // Prevent results from being edited after the report is published
    const publication = await prisma.resultPublication.findUnique({
      where: {
        classId_academicSessionId_termId: {
          classId: student.classId,
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

    // Validate CA assessment if provided
    if (caStatus !== undefined) {
      if (!["PRESENT", "ABSENT"].includes(caStatus)) {
        return res.status(400).json({
          message: "CA status must be PRESENT or ABSENT",
        });
      }

      if (caStatus === "PRESENT") {
        if (caScore === undefined) {
          return res.status(400).json({
            message: "CA score is required when CA status is PRESENT",
          });
        }

        if (typeof caScore !== "number") {
          return res.status(400).json({
            message: "CA score must be a number",
          });
        }

        if (caScore < 0 || caScore > 40) {
          return res.status(400).json({
            message: "CA score must be between 0 and 40",
          });
        }
      } else if (caScore !== undefined && caScore !== null) {
        return res.status(400).json({
          message: "CA score must be null when CA status is ABSENT",
        });
      }
    }

    // Validate exam assessment if provided
    if (examStatus !== undefined) {
      if (!["PRESENT", "ABSENT"].includes(examStatus)) {
        return res.status(400).json({
          message: "Exam status must be PRESENT or ABSENT",
        });
      }

      if (examStatus === "PRESENT") {
        if (examScore === undefined) {
          return res.status(400).json({
            message: "Exam score is required when exam status is PRESENT",
          });
        }

        if (typeof examScore !== "number") {
          return res.status(400).json({
            message: "Exam score must be a number",
          });
        }

        if (examScore < 0 || examScore > 60) {
          return res.status(400).json({
            message: "Exam score must be between 0 and 60",
          });
        }
      } else if (examScore !== undefined && examScore !== null) {
        return res.status(400).json({
          message: "Exam score must be null when exam status is ABSENT",
        });
      }
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

export const approveResult = async (req, res) => {
  try {
    const { id } = req.params;

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

    // Prevent an already approved result from being approved again
    if (existingResult.status === "APPROVED") {
      return res.status(409).json({
        message: "Result is already approved",
      });
    }

    const approvedResult = await prisma.result.update({
      where: {
        id: resultId,
      },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
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
      message: "Result approved successfully",
      result: {
        ...approvedResult,
        totalScore: approvedResult.caScore + approvedResult.examScore,
      },
    });
  } catch (error) {
    console.error("Error approving result:", error);

    return res.status(500).json({
      message: "Failed to approve result",
    });
  }
};
