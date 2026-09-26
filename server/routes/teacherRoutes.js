import express from "express";

import {
  getTeachers,
  createTeacher,
  updateTeacher,
} from "../controllers/teacherController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getTeachers);
router.post("/", protect, authorize("ADMIN"), createTeacher);
router.patch("/:id", updateTeacher);

export default router;
