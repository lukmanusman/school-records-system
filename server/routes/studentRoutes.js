import express from "express";
import {
  getStudents,
  getStudentById,
  updateStudent,
} from "../controllers/studentController.js";

const router = express.Router();

router.get("/", getStudents);
router.get("/:id", getStudentById);
router.patch("/:id", updateStudent);

export default router;
