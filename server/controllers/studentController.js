import prisma from "../lib/prisma.js";
import { formatTitleCase } from "../utils/formatText.js";

export const getStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        class: true,
        enrollment: {
          include: {
            academicSession: true,
            entryTerm: true,
            entryClass: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);

    return res.status(500).json({
      message: "Failed to fetch students",
    });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const studentId = Number(req.params.id);

    if (!Number.isInteger(studentId)) {
      return res.status(400).json({
        message: "Invalid student ID",
      });
    }

    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
      },
      include: {
        class: true,
        enrollment: {
          include: {
            academicSession: true,
            entryTerm: true,
            entryClass: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    return res.status(200).json(student);
  } catch (error) {
    console.error("Error fetching student:", error);

    return res.status(500).json({
      message: "Failed to fetch student",
    });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const studentId = Number(req.params.id);

    if (!Number.isInteger(studentId)) {
      return res.status(400).json({
        message: "Invalid student ID",
      });
    }

    const { firstName, surname, otherName, gender, dateOfBirth } = req.body;

    // Make sure at least one field is provided
    if (
      firstName === undefined &&
      surname === undefined &&
      otherName === undefined &&
      gender === undefined &&
      dateOfBirth === undefined
    ) {
      return res.status(400).json({
        message: "At least one field is required",
      });
    }

    // Validate date of birth if provided
    if (dateOfBirth !== undefined && isNaN(new Date(dateOfBirth).getTime())) {
      return res.status(400).json({
        message: "Invalid date of birth",
      });
    }

    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
      },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    const updatedStudent = await prisma.student.update({
      where: {
        id: studentId,
      },
      data: {
        ...(firstName !== undefined && {
          firstName: formatTitleCase(firstName),
        }),
        ...(surname !== undefined && {
          surname: formatTitleCase(surname),
        }),
        ...(otherName !== undefined && {
          otherName: otherName ? formatTitleCase(otherName) : null,
        }),
        ...(gender !== undefined && { gender }),
        ...(dateOfBirth !== undefined && {
          dateOfBirth: new Date(dateOfBirth),
        }),
      },
    });

    return res.status(200).json({
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student:", error);

    return res.status(500).json({
      message: "Failed to update student",
    });
  }
};
