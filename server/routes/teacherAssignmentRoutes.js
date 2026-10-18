import express from "express";

import {
  getTeacherAssignments,
  createTeacherAssignment,
  deleteTeacherAssignment,
} from "../controllers/teacherAssignmentController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Authenticated users can view teacher assignments.
router.get("/", protect, getTeacherAssignments);

// Only administrators can manage teacher assignments.
router.post("/", protect, authorize("ADMIN"), createTeacherAssignment);
router.delete("/:id", protect, authorize("ADMIN"), deleteTeacherAssignment);

export default router;
