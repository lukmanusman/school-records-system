import express from "express";
import prisma from "./lib/prisma.js";
import studentRoutes from "./routes/studentRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import academicSessionRoutes from "./routes/academicSessionRoutes.js";
import termRoutes from "./routes/termRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import classSubjectRoutes from "./routes/classSubjectRoutes.js";
import teacherAssignmentRoutes from "./routes/teacherAssignmentRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { protect } from "./middleware/authMiddleware.js";
import { authorize } from "./middleware/roleMiddleware.js";

// const express = require("express");
const app = express();

app.use(express.json());

app.use("/api/students", studentRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/academic-sessions", academicSessionRoutes);
app.use("/api/terms", termRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/class-subjects", classSubjectRoutes);
app.use("/api/teacher-assignments", teacherAssignmentRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/auth", authRoutes);

// const port = process.env.PORT || 3000;
const PORT = 5000;

app.get("/", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      message: "School Records System API",
      database: "Connected",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
