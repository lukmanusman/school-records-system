import prisma from "../lib/prisma.js";
import { formatTitleCase } from "../utils/formatText.js";

export const getSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);

    return res.status(500).json({
      message: "Failed to fetch subjects",
    });
  }
};

export const createSubject = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Subject name is required",
      });
    }

    const subjectName = formatTitleCase(name);

    const existingSubject = await prisma.subject.findUnique({
      where: {
        name: subjectName,
      },
    });

    if (existingSubject) {
      return res.status(409).json({
        message: "Subject already exists",
      });
    }

    const subject = await prisma.subject.create({
      data: {
        name: subjectName,
      },
    });

    return res.status(201).json({
      message: "Subject created successfully",
      data: subject,
    });
  } catch (error) {
    console.error("Error creating subject:", error);

    return res.status(500).json({
      message: "Failed to create subject",
    });
  }
};
