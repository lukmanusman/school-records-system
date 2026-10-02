import prisma from "../lib/prisma.js";

export const getAcademicSessions = async (req, res) => {
  try {
    const academicSessions = await prisma.academicSession.findMany({
      orderBy: {
        name: "desc",
      },
    });

    return res.status(200).json(academicSessions);
  } catch (error) {
    console.error("Error fetching academic sessions:", error);

    return res.status(500).json({
      message: "Failed to fetch academic sessions",
    });
  }
};

export const startNewAcademicSession = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Academic session name is required",
      });
    }

    const sessionName = name.trim();

    const existingSession = await prisma.academicSession.findUnique({
      where: {
        name: sessionName,
      },
    });

    if (existingSession) {
      return res.status(409).json({
        message: "Academic session already exists",
      });
    }

    const academicSession = await prisma.$transaction(async (tx) => {
      const session = await tx.academicSession.create({
        data: {
          name: sessionName,
        },
      });

      await tx.term.createMany({
        data: [
          {
            name: "First Term",
            academicSessionId: session.id,
          },
          {
            name: "Second Term",
            academicSessionId: session.id,
          },
          {
            name: "Third Term",
            academicSessionId: session.id,
          },
        ],
      });

      return session;
    });

    return res.status(201).json({
      message: "New academic session started successfully",
      academicSession,
    });
  } catch (error) {
    console.error("Error starting new academic session:", error);

    return res.status(500).json({
      message: "Failed to start new academic session",
    });
  }
};
