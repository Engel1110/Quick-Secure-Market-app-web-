import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getMyVerification,
  submitVerification,
  dailyCheck,
  getAllVerifications,
  reviewVerification
} from "../controllers/verification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads", "verification");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const cleanName = file.originalname.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${cleanName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten imágenes."));
    }

    cb(null, true);
  }
});

router.get("/me", protect, getMyVerification);

router.post(
  "/submit",
  protect,
  upload.fields([
    { name: "documentFront", maxCount: 1 },
    { name: "documentBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 }
  ]),
  submitVerification
);

router.post("/daily-check", protect, dailyCheck);

router.get("/admin", protect, getAllVerifications);
router.patch("/:id/review", protect, reviewVerification);

export default router;
