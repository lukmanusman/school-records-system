import prisma from "../lib/prisma.js";

export const getClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: {
        id: "asc",
      },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
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

export const createClass = async (req, res) => {
  try {
    const { name } = req.body;

    if (typeof name !== "string") {
      return res.status(400).json({
        message: "Class name is required",
      });
    }

    const normalizedName = name.trim().toUpperCase();

    const validClassName = /^(JSS[1-3]|SS[1-3])[A-Z]$/;

    if (!validClassName.test(normalizedName)) {
      return res.status(400).json({
        message:
          "Invalid class name. Use formats such as JSS1A, JSS2B, or SS3C",
      });
    }

    const existingClass = await prisma.class.findUnique({
      where: {
        name: normalizedName,
      },
    });

    if (existingClass) {
      return res.status(409).json({
        message: "This class already exists",
      });
    }

    const schoolClass = await prisma.class.create({
      data: {
        name: normalizedName,
      },
    });

    return res.status(201).json({
      message: "Class created successfully",
      class: schoolClass,
    });
  } catch (error) {
    console.error("Error creating class:", error);

    return res.status(500).json({
      message: "Failed to create class",
    });
  }
};
