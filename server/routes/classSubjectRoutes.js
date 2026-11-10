import express from "express";

import {
  getClassSubjects,
  createClassSubject,
  deleteClassSubject,
} from "../controllers/classSubjectController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("ADMIN", "TEACHER"), getClassSubjects);

router.post("/", protect, authorize("ADMIN"), createClassSubject);

router.delete("/:id", protect, authorize("ADMIN"), deleteClassSubject);

export default router;
