import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("ADMIN"), async (req, res) => {
  return res.status(200).json({
    message: "Promotion preparation endpoint reached",
  });
});

export default router;
