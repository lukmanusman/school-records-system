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
