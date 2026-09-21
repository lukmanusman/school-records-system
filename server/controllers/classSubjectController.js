import prisma from "../lib/prisma.js";

export const getClassSubjects = async (req, res) => {
  try {
    const classSubjects = await prisma.classSubject.findMany({
      include: {
        class: true,
        subject: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json(classSubjects);
  } catch (error) {
    console.error("Error fetching class-subject relationships:", error);

    return res.status(500).json({
      message: "Failed to fetch class-subject relationships",
    });
  }
};

export const createClassSubject = async (req, res) => {
  try {
    const { classId, subjectId } = req.body;

    const parsedClassId = Number(classId);
    const parsedSubjectId = Number(subjectId);

    if (
      !Number.isInteger(parsedClassId) ||
      !Number.isInteger(parsedSubjectId)
    ) {
      return res.status(400).json({
        message: "Valid class ID and subject ID are required",
      });
    }

    const [classRecord, subjectRecord] = await Promise.all([
      prisma.class.findUnique({
        where: {
          id: parsedClassId,
        },
      }),
      prisma.subject.findUnique({
        where: {
          id: parsedSubjectId,
        },
      }),
    ]);

    if (!classRecord) {
      return res.status(404).json({
        message: "Class not found",
      });
    }

    if (!subjectRecord) {
      return res.status(404).json({
        message: "Subject not found",
      });
    }

    const existingClassSubject = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId: parsedClassId,
          subjectId: parsedSubjectId,
        },
      },
    });

    if (existingClassSubject) {
      return res.status(409).json({
        message: "This subject is already assigned to this class",
      });
    }

    const classSubject = await prisma.classSubject.create({
      data: {
        classId: parsedClassId,
        subjectId: parsedSubjectId,
      },
      include: {
        class: true,
        subject: true,
      },
    });

    return res.status(201).json({
      message: "Subject assigned to class successfully",
      data: classSubject,
    });
  } catch (error) {
    console.error("Error creating class-subject relationship:", error);

    return res.status(500).json({
      message: "Failed to assign subject to class",
    });
  }
};

export const deleteClassSubject = async (req, res) => {
  try {
    const classSubjectId = Number(req.params.id);

    if (!Number.isInteger(classSubjectId)) {
      return res.status(400).json({
        message: "Invalid class-subject ID",
      });
    }

    const classSubject = await prisma.classSubject.findUnique({
      where: {
        id: classSubjectId,
      },
    });

    if (!classSubject) {
      return res.status(404).json({
        message: "Class-subject relationship not found",
      });
    }

    await prisma.classSubject.delete({
      where: {
        id: classSubjectId,
      },
    });

    return res.status(200).json({
      message: "Subject removed from class successfully",
    });
  } catch (error) {
    console.error("Error deleting class-subject relationship:", error);

    return res.status(500).json({
      message: "Failed to remove subject from class",
    });
  }
};
