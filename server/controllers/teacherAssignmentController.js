import prisma from "../lib/prisma.js";

export const getTeacherAssignments = async (req, res) => {
  try {
    const assignments = await prisma.teacherAssignment.findMany({
      include: {
        teacher: true,
        subject: true,
        class: true,
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
    const { teacherId, subjectId, classId } = req.body;

    const parsedTeacherId = Number(teacherId);
    const parsedSubjectId = Number(subjectId);
    const parsedClassId = Number(classId);

    if (
      !Number.isInteger(parsedTeacherId) ||
      !Number.isInteger(parsedSubjectId) ||
      !Number.isInteger(parsedClassId)
    ) {
      return res.status(400).json({
        message: "Valid teacher ID, subject ID, and class ID are required",
      });
    }

    const [teacher, subject, classRecord] = await Promise.all([
      prisma.teacher.findUnique({
        where: {
          id: parsedTeacherId,
        },
      }),
      prisma.subject.findUnique({
        where: {
          id: parsedSubjectId,
        },
      }),
      prisma.class.findUnique({
        where: {
          id: parsedClassId,
        },
      }),
    ]);

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found",
      });
    }

    if (!classRecord) {
      return res.status(404).json({
        message: "Class not found",
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
        teacherId_subjectId_classId: {
          teacherId: parsedTeacherId,
          subjectId: parsedSubjectId,
          classId: parsedClassId,
        },
      },
    });

    if (existingAssignment) {
      return res.status(409).json({
        message: "This teacher is already assigned to this subject and class",
      });
    }

    const assignment = await prisma.teacherAssignment.create({
      data: {
        teacherId: parsedTeacherId,
        subjectId: parsedSubjectId,
        classId: parsedClassId,
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

    return res.status(500).json({
      message: "Failed to create teacher assignment",
    });
  }
};

export const deleteTeacherAssignment = async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);

    if (!Number.isInteger(assignmentId)) {
      return res.status(400).json({
        message: "Invalid teacher assignment ID",
      });
    }

    const assignment = await prisma.teacherAssignment.findUnique({
      where: {
        id: assignmentId,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        message: "Teacher assignment not found",
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
