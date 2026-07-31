"use strict";

const express = require("express");
const multer = require("multer");

const {
  getMyVerification,
  submitVerification,
  dailyCheckUnavailable
} = require(
  "../controllers/verification-prisma.controller"
);

const {
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
} = require(
  "../controllers/verification-admin-prisma.controller"
);

const protect = require(
  "../middleware/auth.middleware"
);

const {
  uploadPublicFile,
  uploadPrivateFile,
  deletePublicObjectPaths,
  deletePrivateObjectPaths,
  privateResponseSigningMiddleware
} = require(
  "../services/storage.service"
);

const router = express.Router();

router.use(
  privateResponseSigningMiddleware
);

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

const upload = multer({
  storage:
    multer.memoryStorage(),

  limits: {
    fileSize:
      8 *
      1024 *
      1024,
    files: 4
  },

  fileFilter(
    _req,
    file,
    callback
  ) {
    if (
      !allowedMimeTypes.includes(
        file.mimetype
      )
    ) {
      return callback(
        new Error(
          "Solo se permiten imágenes JPG, JPEG, PNG o WEBP."
        )
      );
    }

    return callback(
      null,
      true
    );
  }
});

const uploadFields =
  upload.fields([
    {
      name:
        "profilePhoto",
      maxCount: 1
    },
    {
      name:
        "documentFront",
      maxCount: 1
    },
    {
      name:
        "documentBack",
      maxCount: 1
    },
    {
      name:
        "selfie",
      maxCount: 1
    }
  ]);

function handleUploadErrors(
  req,
  res,
  next
) {
  uploadFields(
    req,
    res,
    (error) => {
      if (!error) {
        return next();
      }

      if (
        error instanceof
        multer.MulterError
      ) {
        const messages = {
          LIMIT_FILE_SIZE:
            "La imagen supera el tamaño máximo permitido de 8 MB.",
          LIMIT_UNEXPECTED_FILE:
            "Se recibió un archivo o campo no permitido.",
          LIMIT_FILE_COUNT:
            "Se superó la cantidad máxima de archivos permitidos."
        };

        return res
          .status(400)
          .json({
            success: false,
            message:
              messages[error.code] ||
              error.message
          });
      }

      return res
        .status(400)
        .json({
          success: false,
          message:
            error?.message ||
            "No se pudo procesar la imagen."
        });
    }
  );
}

async function uploadVerificationFiles(
  req,
  res,
  next
) {
  const publicObjectPaths = [];
  const privateObjectPaths = [];

  req.publicUploadedObjectPaths =
    publicObjectPaths;

  req.privateUploadedObjectPaths =
    privateObjectPaths;

  try {
    const userId =
      Number(
        req.prismaUser?.id ??
        req.user?.id ??
        0
      );

    const fields =
      req.files || {};

    for (
      const [
        fieldName,
        fieldFiles
      ] of Object.entries(fields)
    ) {
      if (
        !Array.isArray(fieldFiles) ||
        !fieldFiles[0]
      ) {
        continue;
      }

      const file =
        fieldFiles[0];

      if (
        fieldName ===
        "profilePhoto"
      ) {
        const uploaded =
          await uploadPublicFile(
            file,
            {
              folder:
                `profiles/verification/${userId || "user"}`
            }
          );

        publicObjectPaths.push(
          uploaded.objectPath
        );

        fields[fieldName][0] = {
          ...file,
          url:
            uploaded.url,
          path:
            uploaded.url,
          storagePath:
            uploaded.objectPath,
          bucket:
            uploaded.bucket,
          filename:
            uploaded.filename
        };

        continue;
      }

      const uploaded =
        await uploadPrivateFile(
          file,
          {
            folder:
              `verification/${userId || "user"}/${fieldName}`
          }
        );

      privateObjectPaths.push(
        uploaded.objectPath
      );

      fields[fieldName][0] = {
        ...file,
        url:
          uploaded.storageRef,
        path:
          uploaded.storageRef,
        storageRef:
          uploaded.storageRef,
        signedUrl:
          uploaded.signedUrl,
        storagePath:
          uploaded.objectPath,
        bucket:
          uploaded.bucket,
        filename:
          uploaded.filename
      };
    }

    req.files = fields;

    return next();
  } catch (error) {
    console.error(
      "Error subiendo documentos de verificación:",
      error
    );

    await Promise.allSettled([
      deletePublicObjectPaths(
        publicObjectPaths
      ),
      deletePrivateObjectPaths(
        privateObjectPaths
      )
    ]);

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudieron guardar los documentos de verificación.",
        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message
      });
  }
}

const verificationFilesUpload = [
  handleUploadErrors,
  uploadVerificationFiles
];

router.get(
  "/me",
  protect,
  getMyVerification
);

router.post(
  "/me/submit",
  protect,
  ...verificationFilesUpload,
  submitVerification
);

router.post(
  "/me/resubmit",
  protect,
  ...verificationFilesUpload,
  submitVerification
);

router.post(
  "/me/daily-check",
  protect,
  dailyCheckUnavailable
);

router.post(
  "/submit",
  protect,
  ...verificationFilesUpload,
  submitVerification
);

router.post(
  "/daily-check",
  protect,
  dailyCheckUnavailable
);

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

router.patch(
  "/:id/review",
  protect,
  reviewVerification
);

module.exports = router;