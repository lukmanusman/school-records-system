import express from "express";
import multer from "multer";
import upload from "../middleware/profileImageUpload.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  getMyProfile,
  uploadProfileImage,
} from "../controllers/profileImageController.js";

const router = express.Router();
router.get("/me", protect, getMyProfile);

const handleProfileImageUpload = (req, res, next) => {
  upload.single("profileImage")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: "Profile images must not exceed 200 KB.",
        });
      }

      return res.status(400).json({
        message: "The uploaded file could not be accepted.",
      });
    }

    return res.status(400).json({
      message: error.message || "Invalid profile image upload.",
    });
  });
};

router.post("/", protect, handleProfileImageUpload, uploadProfileImage);

export default router;
