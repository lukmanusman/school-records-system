import prisma from "../lib/prisma.js";

export const getAcademicSessions = async (req, res) => {
  try {
    const academicSessions = await prisma.academicSession.findMany({
      orderBy: {
        sequence: "desc",
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
    const { name, sequence } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Academic session name is required",
      });
    }

    if (!Number.isInteger(sequence) || sequence < 1) {
      return res.status(400).json({
        message: "Sequence must be a positive integer",
      });
    }

    const sessionName = name.trim();

    const academicSession = await prisma.$transaction(async (tx) => {
      const session = await tx.academicSession.create({
        data: {
          name: sessionName,
          sequence,
          status: "PLANNED",
        },
      });

      await tx.term.createMany({
        data: [
          {
            name: "First Term",
            academicSessionId: session.id,
            status: "UPCOMING",
          },
          {
            name: "Second Term",
            academicSessionId: session.id,
            status: "UPCOMING",
          },
          {
            name: "Third Term",
            academicSessionId: session.id,
            status: "UPCOMING",
          },
        ],
      });

      return session;
    });

    return res.status(201).json({
      message: "Academic session created successfully",
      academicSession,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message:
          "An academic session with this name or sequence already exists",
      });
    }

    console.error("Error creating academic session:", error);

    return res.status(500).json({
      message: "Failed to create academic session",
    });
  }
};
