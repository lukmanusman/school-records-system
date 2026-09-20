import express from "express";
import { getTerms } from "../controllers/termController.js";

const router = express.Router();

router.get("/", getTerms);

export default router;
