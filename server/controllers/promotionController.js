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

    if (promotion.appliedAt) {
      return res.status(409).json({
        message:
          "Promotion decisions cannot be changed after promotion has been applied",
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
    const promotionId = Number(req.body.promotionId);

    if (!Number.isInteger(promotionId) || promotionId < 1) {
      return res.status(400).json({
        message: "Invalid promotion ID",
      });
    }

    const promotion = await prisma.promotion.findUnique({
      where: {
        id: promotionId,
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

    // Find the source academic session.
    const fromSession = await prisma.academicSession.findUnique({
      where: {
        id: promotion.fromSessionId,
      },
    });

    if (!fromSession) {
      return res.status(404).json({
        message: "Source academic session not found",
      });
    }

    if (fromSession.status !== "ACTIVE") {
      return res.status(409).json({
        message:
          "Promotion can only be applied during an active academic session",
      });
    }

    // The next session must have the immediately following sequence.
    const nextSession = await prisma.academicSession.findUnique({
      where: {
        sequence: fromSession.sequence + 1,
      },
    });

    if (!nextSession) {
      return res.status(409).json({
        message:
          "The next academic session has not been created. Create it before applying promotion.",
      });
    }

    if (nextSession.status !== "PLANNED") {
      return res.status(409).json({
        message: "The next academic session must be in PLANNED status",
      });
    }

    // Find the next session's First Term.
    const firstTerm = await prisma.term.findUnique({
      where: {
        academicSessionId_name: {
          academicSessionId: nextSession.id,
          name: "First Term",
        },
      },
    });

    if (!firstTerm) {
      return res.status(409).json({
        message: "First Term is missing from the next academic session",
      });
    }

    if (firstTerm.status !== "UPCOMING") {
      return res.status(409).json({
        message: "First Term of the next session must be UPCOMING",
      });
    }

    // Confirm that Third Term results have been published for this class.
    const thirdTerm = await prisma.term.findUnique({
      where: {
        academicSessionId_name: {
          academicSessionId: fromSession.id,
          name: "Third Term",
        },
      },
    });

    if (!thirdTerm) {
      return res.status(409).json({
        message: "Third Term is missing from the source academic session",
      });
    }

    const publication = await prisma.resultPublication.findUnique({
      where: {
        classId_academicSessionId_termId: {
          classId: promotion.fromClassId,
          academicSessionId: fromSession.id,
          termId: thirdTerm.id,
        },
      },
    });

    if (!publication || !publication.publishedAt) {
      return res.status(409).json({
        message:
          "Third Term results must be published before applying promotion",
      });
    }

    // Verify that every current student in the source class has a decision,
    // and that no decision belongs to a student outside that class.
    const currentStudents = await prisma.student.findMany({
      where: {
        classId: promotion.fromClassId,
      },
      select: {
        id: true,
      },
    });

    const currentStudentIds = new Set(
      currentStudents.map((student) => student.id),
    );

    const decisionStudentIds = new Set(
      promotion.decisions.map((decision) => decision.studentId),
    );

    const hasMissingDecision = [...currentStudentIds].some(
      (studentId) => !decisionStudentIds.has(studentId),
    );

    const hasUnexpectedDecision = [...decisionStudentIds].some(
      (studentId) => !currentStudentIds.has(studentId),
    );

    if (hasMissingDecision || hasUnexpectedDecision) {
      return res.status(409).json({
        message:
          "Promotion decisions must match the current student roster. Review and prepare the promotion again.",
      });
    }

    // Update students, create next-session placements, and mark the
    // promotion applied as one atomic operation.
    await prisma.$transaction(async (tx) => {
      for (const decision of promotion.decisions) {
        const classId =
          decision.decision === "PROMOTE"
            ? promotion.toClassId
            : promotion.fromClassId;

        if (decision.decision === "PROMOTE") {
          await tx.student.update({
            where: {
              id: decision.studentId,
            },
            data: {
              classId,
            },
          });
        }

        // PROMOTE students enter the target class.
        // REPEAT students remain in their existing class.
        await tx.studentClassPlacement.create({
          data: {
            studentId: decision.studentId,
            classId,
            academicSessionId: nextSession.id,
            startingTermId: firstTerm.id,
          },
        });
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
      fromSession: fromSession.name,
      nextSession: nextSession.name,
      studentsProcessed: promotion.decisions.length,
      placementsCreated: promotion.decisions.length,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message:
          "A placement or other unique record already exists for this promotion. No changes were committed.",
      });
    }

    console.error("Error applying promotion:", error);

    return res.status(500).json({
      message: "Failed to apply promotion",
    });
  }
};
