import express from "express";

import {
  createResult,
  getResults,
  getResultById,
  updateResult,
} from "../controllers/resultController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", protect, getResults);
router.get("/:id", protect, getResultById);
router.post("/", protect, authorize("TEACHER"), createResult);
router.patch("/:id", protect, authorize("TEACHER"), updateResult);

export default router;
