import prisma from "../lib/prisma.js";

export const createResult = async (req, res) => {
  try {
    const {
      studentId,
      subjectId,
      teacherId,
      academicSessionId,
      termId,
      caScore,
      examScore,
    } = req.body;

    // Validate required fields
    if (
      studentId === undefined ||
      subjectId === undefined ||
      teacherId === undefined ||
      academicSessionId === undefined ||
      termId === undefined ||
      caScore === undefined ||
      examScore === undefined
    ) {
      return res.status(400).json({
        message: "All result fields are required",
      });
    }

    // Validate numeric IDs
    const ids = {
      studentId,
      subjectId,
      teacherId,
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
    const teacherIdNumber = Number(teacherId);
    const academicSessionIdNumber = Number(academicSessionId);
    const termIdNumber = Number(termId);

    // Validate scores
    if (typeof caScore !== "number" || typeof examScore !== "number") {
      return res.status(400).json({
        message: "CA score and exam score must be numbers",
      });
    }

    if (caScore < 0 || caScore > 40) {
      return res.status(400).json({
        message: "CA score must be between 0 and 40",
      });
    }

    if (examScore < 0 || examScore > 60) {
      return res.status(400).json({
        message: "Exam score must be between 0 and 60",
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
          "This teacher is not assigned to this subject in the student's class",
      });
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
        caScore,
        examScore,
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
        totalScore: caScore + examScore,
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

    // Validate and apply optional filters
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
      totalScore: result.caScore + result.examScore,
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

    return res.status(200).json({
      ...result,
      totalScore: result.caScore + result.examScore,
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
    const { caScore, examScore } = req.body;

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

    // Approved results cannot be edited
    if (existingResult.status === "APPROVED") {
      return res.status(403).json({
        message: "Approved results cannot be edited",
      });
    }

    // At least one score must be provided
    if (caScore === undefined && examScore === undefined) {
      return res.status(400).json({
        message: "At least one score must be provided",
      });
    }

    // Validate CA score if provided
    if (caScore !== undefined) {
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
    }

    // Validate exam score if provided
    if (examScore !== undefined) {
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
    }

    const updatedResult = await prisma.result.update({
      where: {
        id: resultId,
      },
      data: {
        ...(caScore !== undefined && { caScore }),
        ...(examScore !== undefined && { examScore }),
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
        totalScore: updatedResult.caScore + updatedResult.examScore,
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
