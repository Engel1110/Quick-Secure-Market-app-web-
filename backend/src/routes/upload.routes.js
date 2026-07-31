"use strict";

const express = require("express");
const multer = require("multer");

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  uploadPublicFile,
  uploadPrivateFile,
  deletePublicObjectPaths,
  deletePrivateObjectPaths
} = require(
  "../services/storage.service"
);

const router = express.Router();

const isImageFile = (file) =>
  Boolean(
    file?.mimetype?.startsWith(
      "image/"
    )
  );

const isVideoFile = (file) =>
  Boolean(
    file?.mimetype?.startsWith(
      "video/"
    )
  );

const buildUploadedFile = (
  uploaded,
  {
    privateFile = false
  } = {}
) => {
  if (!uploaded) {
    return null;
  }

  const persistedUrl =
    privateFile
      ? uploaded.storageRef
      : uploaded.url;

  return {
    originalName:
      uploaded.originalName,
    filename:
      uploaded.filename,
    mimeType:
      uploaded.mimeType,
    mimetype:
      uploaded.mimetype,
    size:
      uploaded.size,
    url:
      persistedUrl,
    path:
      persistedUrl,
    fileUrl:
      persistedUrl,
    previewUrl:
      privateFile
        ? uploaded.signedUrl
        : uploaded.url,
    signedUrl:
      privateFile
        ? uploaded.signedUrl
        : undefined,
    storageRef:
      privateFile
        ? uploaded.storageRef
        : undefined,
    storagePath:
      uploaded.objectPath,
    bucket:
      uploaded.bucket
  };
};

const productUpload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        100 *
        1024 *
        1024,
      files: 9
    },

    fileFilter(
      _req,
      file,
      callback
    ) {
      if (
        isImageFile(file) ||
        isVideoFile(file)
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          "Solo se permiten imágenes y videos."
        )
      );
    }
  });

const productUploadMiddleware =
  productUpload.fields([
    {
      name: "images",
      maxCount: 8
    },
    {
      name: "video",
      maxCount: 1
    },
    {
      name: "file",
      maxCount: 1
    }
  ]);

const allowedChatTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/webm",
  "application/pdf"
];

const chatUpload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        25 *
        1024 *
        1024
    },

    fileFilter(
      _req,
      file,
      callback
    ) {
      if (
        allowedChatTypes.includes(
          file.mimetype
        )
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          "Tipo de archivo no permitido para chat."
        )
      );
    }
  });

function handleMulterError(
  error,
  res,
  fallbackMessage
) {
  if (
    error instanceof
    multer.MulterError
  ) {
    const messages = {
      LIMIT_FILE_SIZE:
        "Uno de los archivos supera el tamaño permitido.",
      LIMIT_FILE_COUNT:
        "Se enviaron demasiados archivos.",
      LIMIT_UNEXPECTED_FILE:
        "Se recibió un campo de archivo no permitido."
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
        fallbackMessage
    });
}

router.post(
  "/",
  authMiddleware,
  (
    req,
    res,
    next
  ) => {
    productUploadMiddleware(
      req,
      res,
      (error) => {
        if (!error) {
          return next();
        }

        return handleMulterError(
          error,
          res,
          "No se pudieron procesar los archivos."
        );
      }
    );
  },
  async (
    req,
    res
  ) => {
    const uploadedObjectPaths = [];

    try {
      const fields =
        req.files &&
        typeof req.files ===
          "object"
          ? req.files
          : {};

      const imageFiles =
        Array.isArray(
          fields.images
        )
          ? fields.images
          : [];

      const videoFiles =
        Array.isArray(
          fields.video
        )
          ? fields.video
          : [];

      const fallbackFile =
        Array.isArray(
          fields.file
        )
          ? fields.file[0] ||
            null
          : null;

      if (
        imageFiles.length === 0 &&
        videoFiles.length === 0 &&
        !fallbackFile
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "No se recibió ninguna imagen o video."
          });
      }

      const uploadedImages = [];

      for (const file of imageFiles) {
        const uploaded =
          await uploadPublicFile(
            file,
            {
              folder:
                "products/images"
            }
          );

        uploadedObjectPaths.push(
          uploaded.objectPath
        );

        uploadedImages.push(
          uploaded
        );
      }

      let uploadedVideo = null;

      if (videoFiles[0]) {
        uploadedVideo =
          await uploadPublicFile(
            videoFiles[0],
            {
              folder:
                "products/videos"
            }
          );

        uploadedObjectPaths.push(
          uploadedVideo.objectPath
        );
      }

      let uploadedFallback = null;

      if (fallbackFile) {
        uploadedFallback =
          await uploadPublicFile(
            fallbackFile,
            {
              folder:
                isVideoFile(
                  fallbackFile
                )
                  ? "products/videos"
                  : "products/images"
            }
          );

        uploadedObjectPaths.push(
          uploadedFallback.objectPath
        );
      }

      const images =
        uploadedImages.map(
          (file) =>
            file.url
        );

      const video =
        uploadedVideo
          ? {
              url:
                uploadedVideo.url,
              thumbnail:
                "",
              duration:
                0,
              storagePath:
                uploadedVideo.objectPath
            }
          : null;

      const normalizedFallbackFile =
        buildUploadedFile(
          uploadedFallback
        );

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Archivos subidos correctamente a Supabase Storage.",
          images,
          video,
          file:
            normalizedFallbackFile,
          data: {
            images,
            video,
            file:
              normalizedFallbackFile
          }
        });
    } catch (error) {
      console.error(
        "Error subiendo multimedia del producto:",
        error
      );

      try {
        await deletePublicObjectPaths(
          uploadedObjectPaths
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "No se pudo limpiar la subida parcial:",
          cleanupError.message
        );
      }

      return res
        .status(500)
        .json({
          success: false,
          message:
            "No se pudieron subir los archivos del producto a Supabase Storage.",
          error:
            process.env.NODE_ENV ===
            "production"
              ? undefined
              : error.message
        });
    }
  }
);

router.post(
  "/chat",
  authMiddleware,
  (
    req,
    res,
    next
  ) => {
    chatUpload.single(
      "file"
    )(
      req,
      res,
      (error) => {
        if (!error) {
          return next();
        }

        return handleMulterError(
          error,
          res,
          "No se pudo procesar el archivo."
        );
      }
    );
  },
  async (
    req,
    res
  ) => {
    let uploaded = null;

    try {
      if (!req.file) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "No se recibió ningún archivo."
          });
      }

      const userId =
        Number(
          req.prismaUser?.id ??
          req.user?.id ??
          0
        );

      uploaded =
        await uploadPrivateFile(
          req.file,
          {
            folder:
              `chat/${userId || "user"}`
          }
        );

      const file =
        buildUploadedFile(
          uploaded,
          {
            privateFile: true
          }
        );

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Archivo privado subido correctamente.",
          file,
          data:
            file
        });
    } catch (error) {
      console.error(
        "Error subiendo archivo privado del chat:",
        error
      );

      if (uploaded?.objectPath) {
        try {
          await deletePrivateObjectPaths([
            uploaded.objectPath
          ]);
        } catch (
          cleanupError
        ) {
          console.error(
            "No se pudo limpiar la subida privada:",
            cleanupError.message
          );
        }
      }

      return res
        .status(500)
        .json({
          success: false,
          message:
            "No se pudo subir el archivo privado del chat.",
          error:
            process.env.NODE_ENV ===
            "production"
              ? undefined
              : error.message
        });
    }
  }
);

module.exports = router;