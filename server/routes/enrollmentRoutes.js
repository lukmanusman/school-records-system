import express from "express";

import { enrollStudent } from "../controllers/enrollmentController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("ADMIN"), enrollStudent);

export default router;
