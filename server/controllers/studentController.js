import prisma from "../lib/prisma.js";

export const createStudent = async (req, res) => {
  try {
    const { admissionNumber, firstName, lastName, gender, dateOfBirth } =
      req.body;

    // Validate required fields
    if (
      !admissionNumber ||
      !firstName ||
      !lastName ||
      !gender ||
      !dateOfBirth
    ) {
      return res.status(400).json({
        message:
          "Admission number, first name, last name, gender and date of birth are required",
      });
    }

    // Validate date of birth
    if (dateOfBirth && isNaN(new Date(dateOfBirth).getTime())) {
      return res.status(400).json({
        message: "Invalid date of birth",
      });
    }

    const student = await prisma.student.create({
      data: {
        admissionNumber,
        firstName,
        lastName,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    });

    res.status(201).json(student);
  } catch (error) {
    console.error("Error creating student:", error);

    // Duplicate admission number
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Admission number already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create student",
    });
  }
};

export const getStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
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
