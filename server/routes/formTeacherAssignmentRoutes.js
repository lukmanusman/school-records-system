import express from "express";

import { createFormTeacherAssignment } from "../controllers/formTeacherAssignmentController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("ADMIN"), createFormTeacherAssignment);

export default router;
