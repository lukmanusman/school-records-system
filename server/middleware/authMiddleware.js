import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized, no token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "STUDENT") {
      const user = await prisma.user.findUnique({
        where: {
          id: decoded.userId,
        },
        select: {
          student: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!user || !user.student) {
        return res.status(401).json({
          message: "Student account not found",
        });
      }

      const graduation = await prisma.graduation.findUnique({
        where: {
          studentId: user.student.id,
        },
        select: {
          id: true,
        },
      });

      if (graduation) {
        return res.status(403).json({
          message: "Graduated students cannot access the portal",
        });
      }
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      message: "Not authorized, token is invalid or expired",
    });
  }
};
