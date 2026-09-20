import express from "express";
import { getAcademicSessions } from "../controllers/academicSessionController.js";

const router = express.Router();

router.get("/", getAcademicSessions);

export default router;
