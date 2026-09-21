import express from "express";

import {
  getTeacherAssignments,
  createTeacherAssignment,
  deleteTeacherAssignment,
} from "../controllers/teacherAssignmentController.js";

const router = express.Router();

router.get("/", getTeacherAssignments);
router.post("/", createTeacherAssignment);
router.delete("/:id", deleteTeacherAssignment);

export default router;
