import prisma from "../lib/prisma.js";

export const preparePromotion = async (req, res) => {
  try {
    const { fromClassId, toClassId, fromSessionId } = req.body;

    const fromClassIdNumber = Number(fromClassId);
    const toClassIdNumber = Number(toClassId);
    const fromSessionIdNumber = Number(fromSessionId);

    if (
      !Number.isInteger(fromClassIdNumber) ||
      !Number.isInteger(toClassIdNumber) ||
      !Number.isInteger(fromSessionIdNumber)
    ) {
      return res.status(400).json({
        message: "Invalid source class, target class, or academic session ID",
      });
    }

    if (fromClassIdNumber === toClassIdNumber) {
      return res.status(400).json({
        message: "Source and target classes must be different",
      });
    }

    const [fromClass, toClass, fromSession] = await Promise.all([
      prisma.class.findUnique({
        where: { id: fromClassIdNumber },
      }),
      prisma.class.findUnique({
        where: { id: toClassIdNumber },
      }),
      prisma.academicSession.findUnique({
        where: { id: fromSessionIdNumber },
      }),
    ]);

    if (!fromClass) {
      return res.status(404).json({
        message: "Source class not found",
      });
    }

    if (!toClass) {
      return res.status(404).json({
        message: "Target class not found",
      });
    }

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

    const classNamePattern = /^(JSS[1-3]|SS[1-3])([A-Z])$/;

    const fromMatch = fromClass.name.match(classNamePattern);
    const toMatch = toClass.name.match(classNamePattern);

    if (!fromMatch || !toMatch) {
      return res.status(400).json({
        message:
          "Promotion requires stream-based class names such as JSS1A or SS2B",
      });
    }

    const expectedNextLevel = nextClassMap[fromMatch[1]];

    if (!expectedNextLevel) {
      return res.status(400).json({
        message: "SS3 students cannot be promoted to another class",
      });
    }

    if (toMatch[1] !== expectedNextLevel || toMatch[2] !== fromMatch[2]) {
      return res.status(400).json({
        message: `Invalid promotion target. ${fromClass.name} must promote to ${expectedNextLevel}${fromMatch[2]}`,
      });
    }

    const thirdTerm = await prisma.term.findFirst({
      where: {
        academicSessionId: fromSessionIdNumber,
        name: "Third Term",
      },
    });

    if (!thirdTerm) {
      return res.status(404).json({
        message: "Third Term not found for the academic session",
      });
    }

    const publication = await prisma.resultPublication.findUnique({
      where: {
        classId_academicSessionId_termId: {
          classId: fromClassIdNumber,
          academicSessionId: fromSessionIdNumber,
          termId: thirdTerm.id,
        },
      },
    });

    if (!publication || !publication.publishedAt) {
      return res.status(409).json({
        message:
          "Third Term results must be published before preparing promotion",
      });
    }

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

    const students = await prisma.student.findMany({
      where: {
        classId: fromClassIdNumber,
      },
      orderBy: {
        id: "asc",
      },
    });

    const { promotion, decisionsCreated } = await prisma.$transaction(
      async (tx) => {
        const promotion = await tx.promotion.create({
          data: {
            fromClassId: fromClassIdNumber,
            toClassId: toClassIdNumber,
            fromSessionId: fromSessionIdNumber,
          },
        });

        const decisions = await tx.promotionDecision.createMany({
          data: students.map((student) => ({
            promotionId: promotion.id,
            studentId: student.id,
            decision: "PROMOTE",
          })),
        });

        return {
          promotion,
          decisionsCreated: decisions.count,
        };
      },
    );

    return res.status(201).json({
      message: "Promotion prepared successfully",
      promotion,
      decisionsCreated,
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

export const applyPromotion = async (req, res) => {
  try {
    const { promotionId } = req.body;

    const promotionIdNumber = Number(promotionId);

    if (!Number.isInteger(promotionIdNumber)) {
      return res.status(400).json({
        message: "Invalid promotion ID",
      });
    }

    const promotion = await prisma.promotion.findUnique({
      where: {
        id: promotionIdNumber,
      },
      include: {
        decisions: true,
      },
    });

    if (!promotion) {
      return res.status(404).json({
        message: "Promotion not found",
      });
    }

    if (promotion.appliedAt) {
      return res.status(409).json({
        message: "Promotion has already been applied",
      });
    }

    if (!promotion.toClassId) {
      return res.status(400).json({
        message: "Promotion does not have a target class",
      });
    }

    if (promotion.decisions.length === 0) {
      return res.status(400).json({
        message: "Promotion has no student decisions",
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const promotionDecision of promotion.decisions) {
        if (promotionDecision.decision === "PROMOTE") {
          await tx.student.update({
            where: {
              id: promotionDecision.studentId,
            },
            data: {
              classId: promotion.toClassId,
            },
          });
        }
      }

      await tx.promotion.update({
        where: {
          id: promotion.id,
        },
        data: {
          appliedAt: new Date(),
        },
      });
    });

    return res.status(200).json({
      message: "Promotion applied successfully",
      promotionId: promotion.id,
    });
  } catch (error) {
    console.error("Error applying promotion:", error);

    return res.status(500).json({
      message: "Failed to apply promotion",
    });
  }
};
