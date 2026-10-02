import express from "express";
import {
  getAcademicSessions,
  startNewAcademicSession,
} from "../controllers/academicSessionController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getAcademicSessions);
router.post("/start", protect, authorize("ADMIN"), startNewAcademicSession);

export default router;
