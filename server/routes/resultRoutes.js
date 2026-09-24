import express from "express";
import {
  createResult,
  getResults,
  getResultById,
  updateResult,
  approveResult,
} from "../controllers/resultController.js";

const router = express.Router();

router.get("/", getResults);
router.get("/:id", getResultById);
router.post("/", createResult);
router.patch("/:id", updateResult);
router.patch("/:id/approve", approveResult);

export default router;
