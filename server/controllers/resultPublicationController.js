import prisma from "../lib/prisma.js";

export const publishResults = async (req, res) => {
  try {
    const { classId, academicSessionId, termId } = req.body;

    // Validate required fields
    if (
      classId === undefined ||
      academicSessionId === undefined ||
      termId === undefined
    ) {
      return res.status(400).json({
        message: "Class, academic session, and term are required",
      });
    }

    // Validate numeric IDs
    const ids = {
      classId,
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

    const classIdNumber = Number(classId);
    const academicSessionIdNumber = Number(academicSessionId);
    const termIdNumber = Number(termId);

    // Check class
    const schoolClass = await prisma.class.findUnique({
      where: {
        id: classIdNumber,
      },
    });

    if (!schoolClass) {
      return res.status(404).json({
        message: "Class not found",
      });
    }

    // Check academic session
    const academicSession = await prisma.academicSession.findUnique({
      where: {
        id: academicSessionIdNumber,
      },
    });

    if (!academicSession) {
      return res.status(404).json({
        message: "Academic session not found",
      });
    }

    // Check term
    const term = await prisma.term.findUnique({
      where: {
        id: termIdNumber,
      },
    });

    if (!term) {
      return res.status(404).json({
        message: "Term not found",
      });
    }

    // Make sure the term belongs to the selected academic session
    if (term.academicSessionId !== academicSessionIdNumber) {
      return res.status(400).json({
        message: "Term does not belong to the selected academic session",
      });
    }

    // Check whether this report has already been published
    const existingPublication = await prisma.resultPublication.findUnique({
      where: {
        classId_academicSessionId_termId: {
          classId: classIdNumber,
          academicSessionId: academicSessionIdNumber,
          termId: termIdNumber,
        },
      },
    });

    if (existingPublication?.publishedAt) {
      return res.status(409).json({
        message:
          "Results for this class, session, and term are already published",
      });
    }

    // Get students currently in the class
    const students = await prisma.student.findMany({
      where: {
        classId: classIdNumber,
      },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        surname: true,
      },
    });

    // Get subjects that actually have at least one teacher assigned
    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        classId: classIdNumber,
      },
      select: {
        subjectId: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      distinct: ["subjectId"],
    });

    const requiredSubjects = assignments.map(
      (assignment) => assignment.subject,
    );

    // No students means there is nothing to publish
    if (students.length === 0) {
      return res.status(400).json({
        message: "This class has no students",
      });
    }

    // No assigned subjects means there are no required results
    if (requiredSubjects.length === 0) {
      return res.status(400).json({
        message: "No subjects with assigned teachers were found for this class",
      });
    }

    // Get all existing results for this class/session/term
    const results = await prisma.result.findMany({
      where: {
        academicSessionId: academicSessionIdNumber,
        termId: termIdNumber,
        student: {
          classId: classIdNumber,
        },
        subjectId: {
          in: requiredSubjects.map((subject) => subject.id),
        },
      },
      select: {
        studentId: true,
        subjectId: true,
      },
    });

    // Build a lookup set for existing results
    const existingResultKeys = new Set(
      results.map((result) => `${result.studentId}-${result.subjectId}`),
    );

    // Find missing results
    const missingResults = [];

    for (const student of students) {
      for (const subject of requiredSubjects) {
        const key = `${student.id}-${subject.id}`;

        if (!existingResultKeys.has(key)) {
          missingResults.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.surname}`,
            admissionNumber: student.admissionNumber,
            subjectId: subject.id,
            subjectName: subject.name,
          });
        }
      }
    }

    if (missingResults.length > 0) {
      return res.status(400).json({
        message: "Results are incomplete. Some required results are missing.",
        missingResults,
      });
    }

    // Create or update the publication record
    const publication = await prisma.resultPublication.upsert({
      where: {
        classId_academicSessionId_termId: {
          classId: classIdNumber,
          academicSessionId: academicSessionIdNumber,
          termId: termIdNumber,
        },
      },
      create: {
        classId: classIdNumber,
        academicSessionId: academicSessionIdNumber,
        termId: termIdNumber,
        publishedAt: new Date(),
        publishedById: req.user.userId,
      },
      update: {
        publishedAt: new Date(),
        publishedById: req.user.userId,
      },
      include: {
        class: true,
        academicSession: true,
        term: true,
        publishedBy: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Results published successfully",
      publication,
    });
  } catch (error) {
    console.error("Error publishing results:", error);

    return res.status(500).json({
      message: "Failed to publish results",
    });
  }
};
