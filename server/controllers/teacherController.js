import prisma from "../lib/prisma.js";
import { formatTitleCase } from "../utils/formatText.js";
import { hashPassword } from "../utils/password.js";

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
    const { firstName, surname, otherName, email, password } = req.body;

    if (!firstName || !surname || !email || !password) {
      return res.status(400).json({
        message: "First name, surname, email, and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    const formattedFirstName = formatTitleCase(firstName);
    const formattedSurname = formatTitleCase(surname);
    const formattedOtherName = otherName ? formatTitleCase(otherName) : null;

    const normalizedEmail = email.trim().toLowerCase();

    const existingTeacher = await prisma.teacher.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingTeacher) {
      return res.status(409).json({
        message: "A teacher with this email already exists",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "A user with this email already exists",
      });
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: "TEACHER",
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          firstName: formattedFirstName,
          surname: formattedSurname,
          otherName: formattedOtherName,
          email: normalizedEmail,
          userId: user.id,
        },
      });

      return {
        user,
        teacher,
      };
    });

    return res.status(201).json({
      message: "Teacher and user account created successfully",
      data: {
        teacher: result.teacher,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
      },
    });
  } catch (error) {
    console.error("Error creating teacher:", error);

    return res.status(500).json({
      message: "Failed to create teacher",
    });
  }
};

export const updateTeacher = async (req, res) => {
  try {
    const teacherId = Number(req.params.id);

    if (!Number.isInteger(teacherId)) {
      return res.status(400).json({
        message: "Invalid teacher ID",
      });
    }

    const { firstName, surname, otherName, email } = req.body;

    if (
      firstName === undefined &&
      surname === undefined &&
      otherName === undefined &&
      email === undefined
    ) {
      return res.status(400).json({
        message: "At least one field is required",
      });
    }

    const teacher = await prisma.teacher.findUnique({
      where: {
        id: teacherId,
      },
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    const normalizedEmail =
      email !== undefined ? email.trim().toLowerCase() : undefined;

    if (normalizedEmail !== undefined) {
      const existingTeacher = await prisma.teacher.findFirst({
        where: {
          email: normalizedEmail,
          NOT: {
            id: teacherId,
          },
        },
      });

      if (existingTeacher) {
        return res.status(409).json({
          message: "A teacher with this email already exists",
        });
      }
    }

    const updatedTeacher = await prisma.teacher.update({
      where: {
        id: teacherId,
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
        ...(normalizedEmail !== undefined && {
          email: normalizedEmail,
        }),
      },
    });

    return res.status(200).json({
      message: "Teacher updated successfully",
      data: updatedTeacher,
    });
  } catch (error) {
    console.error("Error updating teacher:", error);

    return res.status(500).json({
      message: "Failed to update teacher",
    });
  }
};
