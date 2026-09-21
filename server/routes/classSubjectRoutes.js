import express from "express";

import {
  getClassSubjects,
  createClassSubject,
  deleteClassSubject,
} from "../controllers/classSubjectController.js";

const router = express.Router();

router.get("/", getClassSubjects);
router.post("/", createClassSubject);
router.delete("/:id", deleteClassSubject);

export default router;
