import express from "express";

import {
  getStudents,
  getStudentById,
  updateStudent,
} from "../controllers/studentController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("ADMIN", "TEACHER"), getStudents);

router.get(
  "/:id",
  protect,
  authorize("ADMIN", "TEACHER", "STUDENT"),
  getStudentById,
);

router.patch("/:id", protect, authorize("ADMIN"), updateStudent);

export default router;
