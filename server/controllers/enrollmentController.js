import { createEnrollment } from "../services/enrollmentService.js";

export const enrollStudent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      enrollmentType,
      academicSessionId,
      entryTermId,
      entryClassId,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !gender ||
      !dateOfBirth ||
      !enrollmentType ||
      !academicSessionId ||
      !entryTermId ||
      !entryClassId
    ) {
      return res.status(400).json({
        message: "All enrollment fields are required",
      });
    }

    // Validate date of birth
    if (isNaN(new Date(dateOfBirth).getTime())) {
      return res.status(400).json({
        message: "Invalid date of birth",
      });
    }

    const result = await createEnrollment({
      firstName,
      lastName,
      gender,
      dateOfBirth,
      enrollmentType,
      academicSessionId: Number(academicSessionId),
      entryTermId: Number(entryTermId),
      entryClassId: Number(entryClassId),
    });

    return res.status(201).json({
      message: "Student enrolled successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error enrolling student:", error);

    if (error.message === "Invalid enrollment type") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to enroll student",
    });
  }
};
