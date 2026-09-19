import express from "express";
import { enrollStudent } from "../controllers/enrollmentController.js";

const router = express.Router();

router.post("/", enrollStudent);

export default router;
