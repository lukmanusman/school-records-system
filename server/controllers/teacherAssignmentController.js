import prisma from "../lib/prisma.js";

export const getTeacherAssignments = async (req, res) => {
  try {
    const academicSessionId = req.query.academicSessionId
      ? Number(req.query.academicSessionId)
      : undefined;

    if (
      academicSessionId !== undefined &&
      (!Number.isInteger(academicSessionId) || academicSessionId < 1)
    ) {
      return res.status(400).json({
        message: "Invalid academic session ID",
      });
    }

    const assignments = await prisma.teacherAssignment.findMany({
      where: academicSessionId ? { academicSessionId } : undefined,
      include: {
        teacher: true,
        subject: true,
        class: true,
        academicSession: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json(assignments);
  } catch (error) {
    console.error("Error fetching teacher assignments:", error);

    return res.status(500).json({
      message: "Failed to fetch teacher assignments",
    });
  }
};

export const createTeacherAssignment = async (req, res) => {
  try {
    const { teacherId, subjectId, classId, academicSessionId } = req.body;

    const parsedTeacherId = Number(teacherId);
    const parsedSubjectId = Number(subjectId);
    const parsedClassId = Number(classId);
    const parsedSessionId = Number(academicSessionId);

    if (
      !Number.isInteger(parsedTeacherId) ||
      !Number.isInteger(parsedSubjectId) ||
      !Number.isInteger(parsedClassId) ||
      !Number.isInteger(parsedSessionId)
    ) {
      return res.status(400).json({
        message:
          "Valid teacher, subject, class, and academic session IDs are required",
      });
    }

    const [teacher, subject, classRecord, academicSession] = await Promise.all([
      prisma.teacher.findUnique({
        where: { id: parsedTeacherId },
      }),
      prisma.subject.findUnique({
        where: { id: parsedSubjectId },
      }),
      prisma.class.findUnique({
        where: { id: parsedClassId },
      }),
      prisma.academicSession.findUnique({
        where: { id: parsedSessionId },
      }),
    ]);

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    if (!classRecord) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (!academicSession) {
      return res.status(404).json({ message: "Academic session not found" });
    }

    if (academicSession.status !== "ACTIVE") {
      return res.status(400).json({
        message:
          "Teacher assignments can only be created for the active academic session",
      });
    }

    const classSubject = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId: parsedClassId,
          subjectId: parsedSubjectId,
        },
      },
    });

    if (!classSubject) {
      return res.status(400).json({
        message: "This subject is not assigned to this class",
      });
    }

    const existingAssignment = await prisma.teacherAssignment.findUnique({
      where: {
        academicSessionId_classId_subjectId: {
          academicSessionId: parsedSessionId,
          classId: parsedClassId,
          subjectId: parsedSubjectId,
        },
      },
    });

    if (existingAssignment) {
      return res.status(409).json({
        message:
          "A teacher is already assigned to this subject and class for this academic session",
      });
    }

    const assignment = await prisma.teacherAssignment.create({
      data: {
        teacherId: parsedTeacherId,
        subjectId: parsedSubjectId,
        classId: parsedClassId,
        academicSessionId: parsedSessionId,
      },
      include: {
        teacher: true,
        subject: true,
        class: true,
      },
    });

    return res.status(201).json({
      message: "Teacher assigned successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Error creating teacher assignment:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message:
          "A teacher is already assigned to this subject and class for this academic session",
      });
    }

    return res.status(500).json({
      message: "Failed to create teacher assignment",
    });
  }
};

export const deleteTeacherAssignment = async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);

    if (!Number.isInteger(assignmentId) || assignmentId < 1) {
      return res.status(400).json({
        message: "Invalid teacher assignment ID",
      });
    }

    const assignment = await prisma.teacherAssignment.findUnique({
      where: {
        id: assignmentId,
      },
      include: {
        academicSession: true,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        message: "Teacher assignment not found",
      });
    }

    if (assignment.academicSession.status !== "ACTIVE") {
      return res.status(400).json({
        message:
          "Assignments from inactive academic sessions cannot be deleted",
      });
    }

    const [resultSheet, existingResult] = await Promise.all([
      prisma.classResultSheet.findFirst({
        where: {
          classId: assignment.classId,
          academicSessionId: assignment.academicSessionId,
        },
        select: {
          id: true,
        },
      }),

      prisma.result.findFirst({
        where: {
          teacherId: assignment.teacherId,
          subjectId: assignment.subjectId,
          classId: assignment.classId,
          academicSessionId: assignment.academicSessionId,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (resultSheet || existingResult) {
      return res.status(409).json({
        message:
          "This assignment cannot be deleted because result records already exist for this class and academic session",
      });
    }

    await prisma.teacherAssignment.delete({
      where: {
        id: assignmentId,
      },
    });

    return res.status(200).json({
      message: "Teacher assignment removed successfully",
    });
  } catch (error) {
    console.error("Error deleting teacher assignment:", error);

    return res.status(500).json({
      message: "Failed to remove teacher assignment",
    });
  }
};
