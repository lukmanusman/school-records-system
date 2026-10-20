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

    // Enforce term progression across all classes with students.
    const termOrder = ["First Term", "Second Term", "Third Term"];
    const currentTermIndex = termOrder.indexOf(term.name);

    if (currentTermIndex === -1) {
      return res.status(400).json({
        message: "Invalid academic term",
      });
    }

    if (currentTermIndex > 0) {
      const previousTermName = termOrder[currentTermIndex - 1];

      const previousTerm = await prisma.term.findUnique({
        where: {
          academicSessionId_name: {
            academicSessionId: academicSessionIdNumber,
            name: previousTermName,
          },
        },
      });

      if (!previousTerm) {
        return res.status(409).json({
          message: `Cannot publish results because ${previousTermName} is not configured for this session`,
        });
      }

      // Only classes with students are required to publish results.
      const relevantClasses = await prisma.class.findMany({
        where: {
          students: {
            some: {},
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      const previousPublications = await prisma.resultPublication.findMany({
        where: {
          academicSessionId: academicSessionIdNumber,
          termId: previousTerm.id,
          classId: {
            in: relevantClasses.map((schoolClass) => schoolClass.id),
          },
          publishedAt: {
            not: null,
          },
        },
        select: {
          classId: true,
        },
      });

      const publishedClassIds = new Set(
        previousPublications.map((publication) => publication.classId),
      );

      const classesMissingPublication = relevantClasses.filter(
        (schoolClass) => !publishedClassIds.has(schoolClass.id),
      );

      if (classesMissingPublication.length > 0) {
        return res.status(409).json({
          message: `Cannot publish ${term.name} until ${previousTermName} results have been published for every class with students`,
          classesMissingPublication: classesMissingPublication.map(
            (schoolClass) => schoolClass.name,
          ),
        });
      }
    }

    // Require the class result sheet to be approved before publication.
    const classResultSheet = await prisma.classResultSheet.findUnique({
      where: {
        classId_academicSessionId_termId: {
          classId: classIdNumber,
          academicSessionId: academicSessionIdNumber,
          termId: termIdNumber,
        },
      },
    });

    if (!classResultSheet || classResultSheet.status !== "APPROVED") {
      return res.status(409).json({
        message:
          "The class result sheet must be approved before results can be published",
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

    // Get all subjects offered to this class.
    // A subject is required even if no teacher has been assigned to it.
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId: classIdNumber,
      },
      select: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const requiredSubjects = classSubjects.map(
      (classSubject) => classSubject.subject,
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
        message: "No subjects have been configured for this class",
      });
    }

    // Get all existing results for this class/session/term
    const results = await prisma.result.findMany({
      where: {
        academicSessionId: academicSessionIdNumber,
        termId: termIdNumber,
        classId: classIdNumber,
        subjectId: {
          in: requiredSubjects.map((subject) => subject.id),
        },
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

    // Build a lookup map for existing results.
    const existingResults = new Map(
      results.map((result) => [
        `${result.studentId}-${result.subjectId}`,
        result,
      ]),
    );

    // Find missing or incomplete results.
    const incompleteResults = [];

    for (const student of students) {
      for (const subject of requiredSubjects) {
        const key = `${student.id}-${subject.id}`;
        const result = existingResults.get(key);

        const caComplete =
          result &&
          ((result.caStatus === "PRESENT" &&
            result.caScore !== null &&
            result.caScore !== undefined) ||
            (result.caStatus === "ABSENT" && result.caScore === null));

        const examComplete =
          result &&
          ((result.examStatus === "PRESENT" &&
            result.examScore !== null &&
            result.examScore !== undefined) ||
            (result.examStatus === "ABSENT" && result.examScore === null));

        if (!result || !caComplete || !examComplete) {
          incompleteResults.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.surname}`,
            admissionNumber: student.admissionNumber,
            subjectId: subject.id,
            subjectName: subject.name,
            missingCA: !result || !caComplete,
            missingExam: !result || !examComplete,
          });
        }
      }
    }

    if (incompleteResults.length > 0) {
      return res.status(400).json({
        message:
          "Results are incomplete. Some required assessments are missing or invalid.",
        incompleteResults,
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
