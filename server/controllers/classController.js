import prisma from "../lib/prisma.js";

export const getClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);

    return res.status(500).json({
      message: "Failed to fetch classes",
    });
  }
};
