import prisma from "../lib/prisma.js";

export const getTerms = async (req, res) => {
  try {
    const academicSessionId = Number(req.query.academicSessionId);

    if (!Number.isInteger(academicSessionId)) {
      return res.status(400).json({
        message: "A valid academic session ID is required",
      });
    }

    const terms = await prisma.term.findMany({
      where: {
        academicSessionId,
      },
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json(terms);
  } catch (error) {
    console.error("Error fetching terms:", error);

    return res.status(500).json({
      message: "Failed to fetch terms",
    });
  }
};
