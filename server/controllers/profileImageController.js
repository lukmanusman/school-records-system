import prisma from "../lib/prisma.js";
import cloudinary from "../config/cloudinary.js";

const isValidImage = (buffer, mimeType) => {
  if (mimeType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }

  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  return false;
};

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "school-records/profile-images",
        resource_type: "image",
        transformation: [
          {
            width: 256,
            height: 256,
            crop: "fill",
            gravity: "auto",
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });

export const uploadProfileImage = async (req, res) => {
  let uploadedImage;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a profile image to upload.",
      });
    }

    if (!isValidImage(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({
        message: "The uploaded file is not a valid JPEG, PNG, or WebP image.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        profileImagePublicId: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    uploadedImage = await uploadToCloudinary(req.file.buffer);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        profileImageUrl: uploadedImage.secure_url,
        profileImagePublicId: uploadedImage.public_id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        profileImageUrl: true,
        profileImagePublicId: true,
      },
    });

    if (
      user.profileImagePublicId &&
      user.profileImagePublicId !== uploadedImage.public_id
    ) {
      try {
        await cloudinary.uploader.destroy(user.profileImagePublicId);
      } catch (cleanupError) {
        console.error(
          "Could not delete previous profile image:",
          cleanupError.message,
        );
      }
    }

    return res.status(200).json({
      message: "Profile image updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error uploading profile image:", error.message);

    // Avoid leaving a newly uploaded image behind if saving to PostgreSQL fails.
    if (uploadedImage?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.public_id);
      } catch (cleanupError) {
        console.error(
          "Could not clean up uploaded image:",
          cleanupError.message,
        );
      }
    }

    return res.status(500).json({
      message: "Failed to update profile image.",
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        profileImageUrl: true,
        profileImagePublicId: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "Profile retrieved successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Error retrieving profile:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve profile.",
    });
  }
};
