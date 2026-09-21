import express from "express";
import {
  getTeachers,
  createTeacher,
  updateTeacher,
} from "../controllers/teacherController.js";

const router = express.Router();

router.get("/", getTeachers);
router.post("/", createTeacher);
router.patch("/:id", updateTeacher);

export default router;
