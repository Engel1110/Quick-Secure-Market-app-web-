import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import {
  getMyVerification,
  saveVerificationDraft,
  submitVerification,
  resubmitVerification,

  uploadProfilePhoto,
  uploadDocumentFront,
  uploadDocumentBack,
  uploadSelfie,

  dailyCheck,

  getAllVerifications,
  getVerificationStats,
  getVerificationById,
  startVerificationReview,

  approveVerificationField,
  rejectVerificationField,

  approveVerification,
  rejectVerification,
  requestVerificationResubmission,
  reviewVerification,
  reopenVerification
} from "../controllers/verification.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/* =========================================================
   CONFIGURACIÓN DE MULTER
========================================================= */

const uploadDir = path.join(
  process.cwd(),
  "uploads",
  "verification"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);

    const originalName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}`;

    cb(
      null,
      `${uniqueName}-${originalName}${extension.toLowerCase()}`
    );
  }
});

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

const upload = multer({
  storage,

  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 4
  },

  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Solo se permiten imágenes JPG, JPEG, PNG o WEBP."
        )
      );
    }

    cb(null, true);
  }
});

/* =========================================================
   MIDDLEWARE PARA ERRORES DE MULTER
========================================================= */

const handleUploadErrors = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message:
              "La imagen supera el tamaño máximo permitido de 8 MB."
          });
        }

        if (error.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message:
              "Se recibió un archivo o campo no permitido."
          });
        }

        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "No se pudo procesar la imagen."
      });
    });
  };
};

/* =========================================================
   CAMPOS DE SUBIDA
========================================================= */

const verificationFilesUpload = handleUploadErrors(
  upload.fields([
    {
      name: "profilePhoto",
      maxCount: 1
    },
    {
      name: "documentFront",
      maxCount: 1
    },
    {
      name: "documentBack",
      maxCount: 1
    },
    {
      name: "selfie",
      maxCount: 1
    }
  ])
);

const profilePhotoUpload = handleUploadErrors(
  upload.single("profilePhoto")
);

const documentFrontUpload = handleUploadErrors(
  upload.single("documentFront")
);

const documentBackUpload = handleUploadErrors(
  upload.single("documentBack")
);

const selfieUpload = handleUploadErrors(
  upload.single("selfie")
);

/* =========================================================
   RUTAS DEL USUARIO
========================================================= */

router.get(
  "/me",
  protect,
  getMyVerification
);

router.put(
  "/me/draft",
  protect,
  saveVerificationDraft
);

router.post(
  "/me/submit",
  protect,
  verificationFilesUpload,
  submitVerification
);

router.post(
  "/me/resubmit",
  protect,
  verificationFilesUpload,
  resubmitVerification
);

/* =========================================================
   SUBIDAS INDIVIDUALES
========================================================= */

router.post(
  "/me/profile-photo",
  protect,
  profilePhotoUpload,
  uploadProfilePhoto
);

router.post(
  "/me/document-front",
  protect,
  documentFrontUpload,
  uploadDocumentFront
);

router.post(
  "/me/document-back",
  protect,
  documentBackUpload,
  uploadDocumentBack
);

router.post(
  "/me/selfie",
  protect,
  selfieUpload,
  uploadSelfie
);

/* =========================================================
   VALIDACIÓN FACIAL PERIÓDICA
========================================================= */

router.post(
  "/me/daily-check",
  protect,
  selfieUpload,
  dailyCheck
);

/* =========================================================
   COMPATIBILIDAD CON RUTAS ANTERIORES
========================================================= */

router.post(
  "/submit",
  protect,
  verificationFilesUpload,
  submitVerification
);

router.post(
  "/daily-check",
  protect,
  selfieUpload,
  dailyCheck
);

/* =========================================================
   BACKOFFICE
   Las rutas específicas deben ir antes de /:id
========================================================= */

router.get(
  "/admin/stats",
  protect,
  getVerificationStats
);

router.get(
  "/admin",
  protect,
  getAllVerifications
);

router.get(
  "/admin/:id",
  protect,
  getVerificationById
);

router.put(
  "/admin/:id/start-review",
  protect,
  startVerificationReview
);

/* =========================================================
   REVISIÓN INDIVIDUAL DE CAMPOS
========================================================= */

router.put(
  "/admin/:id/fields/:field/approve",
  protect,
  approveVerificationField
);

router.put(
  "/admin/:id/fields/:field/reject",
  protect,
  rejectVerificationField
);

/* =========================================================
   DECISIÓN GENERAL
========================================================= */

router.put(
  "/admin/:id/approve",
  protect,
  approveVerification
);

router.put(
  "/admin/:id/reject",
  protect,
  rejectVerification
);

router.put(
  "/admin/:id/request-resubmission",
  protect,
  requestVerificationResubmission
);

router.put(
  "/admin/:id/reopen",
  protect,
  reopenVerification
);

/* =========================================================
   COMPATIBILIDAD CON EL ENDPOINT ANTERIOR
========================================================= */

router.patch(
  "/:id/review",
  protect,
  reviewVerification
);

export default router;