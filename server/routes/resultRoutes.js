import express from "express";
import {
  createResult,
  getResults,
  getResultById,
} from "../controllers/resultController.js";

const router = express.Router();

router.get("/", getResults);
router.get("/:id", getResultById);
router.post("/", createResult);

export default router;
