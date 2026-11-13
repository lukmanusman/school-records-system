import express from "express";

import {
  getFormTeacherAssignments,
  createFormTeacherAssignment,
  checkMyFormTeacherAssignment,
  deleteFormTeacherAssignment,
} from "../controllers/formTeacherAssignmentController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("ADMIN"), getFormTeacherAssignments);

router.get(
  "/my-assignment",
  protect,
  authorize("TEACHER"),
  checkMyFormTeacherAssignment,
);
router.post("/", protect, authorize("ADMIN"), createFormTeacherAssignment);

router.delete("/:id", protect, authorize("ADMIN"), deleteFormTeacherAssignment);

export default router;
