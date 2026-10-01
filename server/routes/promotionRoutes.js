import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  preparePromotion,
  updatePromotionDecision,
} from "../controllers/promotionController.js";

const router = express.Router();

router.post("/", protect, authorize("ADMIN"), preparePromotion);
router.patch("/decision", protect, authorize("ADMIN"), updatePromotionDecision);

export default router;
