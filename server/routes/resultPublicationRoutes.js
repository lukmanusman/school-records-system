import express from "express";

import { publishResults } from "../controllers/resultPublicationController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("ADMIN"), publishResults);

export default router;
