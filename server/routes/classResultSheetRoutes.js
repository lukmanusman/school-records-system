import express from "express";

import { submitClassResultSheet } from "../controllers/classResultSheetController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/submit", protect, authorize("TEACHER"), submitClassResultSheet);

export default router;
