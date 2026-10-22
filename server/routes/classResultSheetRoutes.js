import express from "express";

import {
  submitClassResultSheet,
  returnClassResultSheet,
  approveClassResultSheet,
} from "../controllers/classResultSheetController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/submit", protect, authorize("TEACHER"), submitClassResultSheet);

router.patch(
  "/:id/return",
  protect,
  authorize("ADMIN"),
  returnClassResultSheet,
);

router.patch(
  "/:id/approve",
  protect,
  authorize("ADMIN"),
  approveClassResultSheet,
);

export default router;
