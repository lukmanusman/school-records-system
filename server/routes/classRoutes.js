import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { getClasses, createClass } from "../controllers/classController.js";

const router = express.Router();

router.get("/", getClasses);
router.post("/", protect, authorize("ADMIN"), createClass);

export default router;
