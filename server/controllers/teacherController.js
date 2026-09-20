import prisma from "../lib/prisma.js";
import { formatTitleCase } from "../utils/formatText.js";

export const getTeachers = async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json(teachers);
  } catch (error) {
    console.error("Error fetching teachers:", error);

    return res.status(500).json({
      message: "Failed to fetch teachers",
    });
  }
};

export const createTeacher = async (req, res) => {
  try {
    const { firstName, surname, otherName, email } = req.body;

    if (!firstName || !surname || !email) {
      return res.status(400).json({
        message: "First name, surname, and email are required",
      });
    }

    const formattedFirstName = formatTitleCase(firstName);
    const formattedSurname = formatTitleCase(surname);
    const formattedOtherName = otherName ? formatTitleCase(otherName) : null;

    const existingTeacher = await prisma.teacher.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
    });

    if (existingTeacher) {
      return res.status(409).json({
        message: "A teacher with this email already exists",
      });
    }

    const teacher = await prisma.teacher.create({
      data: {
        firstName: formattedFirstName,
        surname: formattedSurname,
        otherName: formattedOtherName,
        email: email.trim().toLowerCase(),
      },
    });

    return res.status(201).json({
      message: "Teacher created successfully",
      data: teacher,
    });
  } catch (error) {
    console.error("Error creating teacher:", error);

    return res.status(500).json({
      message: "Failed to create teacher",
    });
  }
};
