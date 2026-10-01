import prisma from "../lib/prisma.js";

export const preparePromotion = async (req, res) => {
  try {
    const { fromClassId, fromSessionId } = req.body;

    const fromClassIdNumber = Number(fromClassId);
    const fromSessionIdNumber = Number(fromSessionId);

    if (
      !Number.isInteger(fromClassIdNumber) ||
      !Number.isInteger(fromSessionIdNumber)
    ) {
      return res.status(400).json({
        message: "Invalid class or academic session ID",
      });
    }

    const fromClass = await prisma.class.findUnique({
      where: {
        id: fromClassIdNumber,
      },
    });

    if (!fromClass) {
      return res.status(404).json({
        message: "Source class not found",
      });
    }

    const fromSession = await prisma.academicSession.findUnique({
      where: {
        id: fromSessionIdNumber,
      },
    });

    if (!fromSession) {
      return res.status(404).json({
        message: "Source academic session not found",
      });
    }

    const nextClassMap = {
      JSS1: "JSS2",
      JSS2: "JSS3",
      JSS3: "SS1",
      SS1: "SS2",
      SS2: "SS3",
    };

    const nextClassName = nextClassMap[fromClass.name];

    if (!nextClassName) {
      return res.status(400).json({
        message: "This class does not have a promotion target",
      });
    }

    const toClass = await prisma.class.findUnique({
      where: {
        name: nextClassName,
      },
    });

    if (!toClass) {
      return res.status(500).json({
        message: "Promotion target class not found",
      });
    }

    const students = await prisma.student.findMany({
      where: {
        classId: fromClassIdNumber,
      },
      orderBy: {
        id: "asc",
      },
    });

    const existingPromotion = await prisma.promotion.findUnique({
      where: {
        fromClassId_fromSessionId: {
          fromClassId: fromClassIdNumber,
          fromSessionId: fromSessionIdNumber,
        },
      },
    });

    if (existingPromotion) {
      return res.status(409).json({
        message:
          "Promotion has already been prepared for this class and academic session",
      });
    }

    const promotion = await prisma.promotion.create({
      data: {
        fromClassId: fromClassIdNumber,
        fromSessionId: fromSessionIdNumber,
        toClassId: toClass.id,
      },
    });

    const decisions = await prisma.promotionDecision.createMany({
      data: students.map((student) => ({
        promotionId: promotion.id,
        studentId: student.id,
        decision: "PROMOTE",
      })),
    });

    return res.status(201).json({
      message: "Promotion prepared successfully",
      promotion,
      decisionsCreated: decisions.count,
      fromClass,
      fromSession,
      toClass,
      students,
    });
  } catch (error) {
    console.error("Error preparing promotion:", error);

    return res.status(500).json({
      message: "Failed to prepare promotion",
    });
  }
};

export const updatePromotionDecision = async (req, res) => {
  try {
    const { promotionId, studentId, decision } = req.body;

    const promotionIdNumber = Number(promotionId);
    const studentIdNumber = Number(studentId);

    if (
      !Number.isInteger(promotionIdNumber) ||
      !Number.isInteger(studentIdNumber)
    ) {
      return res.status(400).json({
        message: "Invalid promotion or student ID",
      });
    }

    if (!["PROMOTE", "REPEAT"].includes(decision)) {
      return res.status(400).json({
        message: "Decision must be PROMOTE or REPEAT",
      });
    }

    const promotion = await prisma.promotion.findUnique({
      where: {
        id: promotionIdNumber,
      },
    });

    if (!promotion) {
      return res.status(404).json({
        message: "Promotion not found",
      });
    }

    const promotionDecision = await prisma.promotionDecision.findUnique({
      where: {
        promotionId_studentId: {
          promotionId: promotionIdNumber,
          studentId: studentIdNumber,
        },
      },
    });

    if (!promotionDecision) {
      return res.status(404).json({
        message: "Promotion decision not found",
      });
    }

    const updatedDecision = await prisma.promotionDecision.update({
      where: {
        promotionId_studentId: {
          promotionId: promotionIdNumber,
          studentId: studentIdNumber,
        },
      },
      data: {
        decision,
      },
    });

    return res.status(200).json({
      message: "Promotion decision updated successfully",
      decision: updatedDecision,
    });
  } catch (error) {
    console.error("Error updating promotion decision:", error);

    return res.status(500).json({
      message: "Failed to update promotion decision",
    });
  }
};
