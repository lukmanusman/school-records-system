import prisma from "../lib/prisma.js";

export const createFormTeacherAssignment = async (req, res) => {
  try {
    const { teacherId, classId, academicSessionId } = req.body;

    // Validate required fields.
    if (
      teacherId === undefined ||
      classId === undefined ||
      academicSessionId === undefined
    ) {
      return res.status(400).json({
        message: "Teacher, class, and academic session are required",
      });
    }

    // Validate IDs.
    const ids = { teacherId, classId, academicSessionId };

    for (const [field, value] of Object.entries(ids)) {
      if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
        return res.status(400).json({
          message: `${field} must be a valid positive integer`,
        });
      }
    }

    const teacherIdNumber = Number(teacherId);
    const classIdNumber = Number(classId);
    const academicSessionIdNumber = Number(academicSessionId);

    // Confirm that the teacher exists.
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherIdNumber },
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    // Confirm that the class exists.
    const schoolClass = await prisma.class.findUnique({
      where: { id: classIdNumber },
    });

    if (!schoolClass) {
      return res.status(404).json({
        message: "Class not found",
      });
    }

    // Confirm that the academic session exists.
    const academicSession = await prisma.academicSession.findUnique({
      where: { id: academicSessionIdNumber },
    });

    if (!academicSession) {
      return res.status(404).json({
        message: "Academic session not found",
      });
    }

    // Prevent duplicate assignments for the same class and session.
    const existingAssignment = await prisma.formTeacherAssignment.findUnique({
      where: {
        classId_academicSessionId: {
          classId: classIdNumber,
          academicSessionId: academicSessionIdNumber,
        },
      },
    });

    if (existingAssignment) {
      return res.status(409).json({
        message:
          "A form teacher has already been assigned to this class for this academic session",
      });
    }

    const assignment = await prisma.formTeacherAssignment.create({
      data: {
        teacherId: teacherIdNumber,
        classId: classIdNumber,
        academicSessionId: academicSessionIdNumber,
      },
      include: {
        teacher: true,
        class: true,
        academicSession: true,
      },
    });

    return res.status(201).json({
      message: "Form teacher assigned successfully",
      assignment,
    });
  } catch (error) {
    console.error("Error assigning form teacher:", error);

    return res.status(500).json({
      message: "Failed to assign form teacher",
    });
  }
};

export const checkMyFormTeacherAssignment = async (req, res) => {
  try {
    const { classId, academicSessionId } = req.query;

    // Validate required IDs.
    if (
      !Number.isInteger(Number(classId)) ||
      Number(classId) <= 0 ||
      !Number.isInteger(Number(academicSessionId)) ||
      Number(academicSessionId) <= 0
    ) {
      return res.status(400).json({
        message: "Valid classId and academicSessionId are required",
      });
    }

    // Find the teacher profile linked to the logged-in user.
    const teacher = await prisma.teacher.findUnique({
      where: {
        userId: req.user.userId,
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      return res.json({
        isFormTeacher: false,
      });
    }

    // Check whether this teacher is assigned to the selected class.
    const assignment = await prisma.formTeacherAssignment.findUnique({
      where: {
        classId_academicSessionId: {
          classId: Number(classId),
          academicSessionId: Number(academicSessionId),
        },
      },
      select: {
        teacherId: true,
      },
    });

    return res.json({
      isFormTeacher: assignment?.teacherId === teacher.id,
    });
  } catch (error) {
    console.error("Error checking form teacher assignment:", error);

    return res.status(500).json({
      message: "Failed to check form teacher assignment",
    });
  }
};
