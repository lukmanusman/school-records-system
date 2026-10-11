import { createEnrollment } from "../services/enrollmentService.js";

export const enrollStudent = async (req, res) => {
  try {
    const {
      firstName,
      surname,
      otherName,
      gender,
      dateOfBirth,
      email,
      password,
      enrollmentType,
      academicSessionId,
      entryTermId,
      entryClassId,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !surname ||
      !gender ||
      !dateOfBirth ||
      !email ||
      !password ||
      !enrollmentType ||
      !academicSessionId ||
      !entryTermId ||
      !entryClassId
    ) {
      return res.status(400).json({
        message:
          "All enrollment fields, including email and password, are required",
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
    // Validate date of birth
    const parsedDateOfBirth = new Date(dateOfBirth);

    if (isNaN(parsedDateOfBirth.getTime())) {
      return res.status(400).json({
        message: "Invalid date of birth",
      });
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (parsedDateOfBirth > today) {
      return res.status(400).json({
        message: "Date of birth cannot be in the future",
      });
    }

    const result = await createEnrollment({
      firstName,
      surname,
      otherName,
      gender,
      dateOfBirth,
      email,
      password,
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
        "A user with this email already exists",
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
