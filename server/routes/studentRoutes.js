import express from "express";

import {
  getStudents,
  getStudentById,
  updateStudent,
} from "../controllers/studentController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getStudents);

router.get("/:id", getStudentById);

router.patch("/:id", protect, authorize("ADMIN"), updateStudent);

export default router;
