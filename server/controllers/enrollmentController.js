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

    const sessionId = Number(academicSessionId);
    const termId = Number(entryTermId);
    const classId = Number(entryClassId);

    if (
      !Number.isInteger(sessionId) ||
      !Number.isInteger(termId) ||
      !Number.isInteger(classId)
    ) {
      return res.status(400).json({
        message:
          "Academic session, entry term, and entry class must be valid IDs",
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
      academicSessionId: sessionId,
      entryTermId: termId,
      entryClassId: classId,
    });

    return res.status(201).json({
      message: "Student enrolled successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error enrolling student:", error);

    if (
      [
        "Invalid enrollment type",
        "Academic session not found",
        "Entry term not found",
        "Entry class not found",
        "Entry term does not belong to the academic session",
        "JSS1 students must be enrolled as FRESHER",
        "Students entering above JSS1 must be enrolled as TRANSFER",
      ].includes(error.message)
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to enroll student",
    });
  }
};
