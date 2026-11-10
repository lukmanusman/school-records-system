import express from "express";
import {
  getSubjects,
  createSubject,
} from "../controllers/subjectController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("ADMIN", "TEACHER"), getSubjects);

router.post("/", protect, authorize("ADMIN"), createSubject);

export default router;
