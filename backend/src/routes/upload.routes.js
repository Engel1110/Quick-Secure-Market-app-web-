const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Carpetas
|--------------------------------------------------------------------------
*/

const uploadsRootFolder = path.join(
  __dirname,
  "../../uploads"
);

const productImageFolder = path.join(
  uploadsRootFolder,
  "products",
  "images"
);

const productVideoFolder = path.join(
  uploadsRootFolder,
  "products",
  "videos"
);

const chatFolder = path.join(
  uploadsRootFolder,
  "chat"
);

[
  uploadsRootFolder,
  productImageFolder,
  productVideoFolder,
  chatFolder
].forEach((folder) => {
  fs.mkdirSync(folder, {
    recursive: true
  });
});

/*
|--------------------------------------------------------------------------
| Utilidades
|--------------------------------------------------------------------------
*/

const sanitizeFileName = (fileName = "") => {
  const extension = path
    .extname(fileName)
    .toLowerCase();

  const baseName = path
    .basename(fileName, extension)
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);

  return {
    baseName:
      baseName || "qsm-file",
    extension
  };
};

const generateFileName = (
  originalName
) => {
  const {
    baseName,
    extension
  } = sanitizeFileName(
    originalName
  );

  const uniqueSuffix = [
    Date.now(),
    Math.round(
      Math.random() * 1000000
    )
  ].join("-");

  return `${uniqueSuffix}-${baseName}${extension}`;
};

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
  file
) => {
  if (!file) {
    return null;
  }

  let url = "";

  if (isImageFile(file)) {
    url =
      `/uploads/products/images/${file.filename}`;
  } else if (
    isVideoFile(file)
  ) {
    url =
      `/uploads/products/videos/${file.filename}`;
  }

  return {
    originalName:
      file.originalname,

    filename:
      file.filename,

    mimeType:
      file.mimetype,

    mimetype:
      file.mimetype,

    size:
      file.size,

    url,

    path:
      url,

    fileUrl:
      url
  };
};

/*
|--------------------------------------------------------------------------
| Almacenamiento de productos
|--------------------------------------------------------------------------
*/

const productStorage =
  multer.diskStorage({
    destination(
      req,
      file,
      callback
    ) {
      if (
        isImageFile(file)
      ) {
        return callback(
          null,
          productImageFolder
        );
      }

      if (
        isVideoFile(file)
      ) {
        return callback(
          null,
          productVideoFolder
        );
      }

      return callback(
        new Error(
          "Tipo de archivo no soportado."
        )
      );
    },

    filename(
      req,
      file,
      callback
    ) {
      return callback(
        null,
        generateFileName(
          file.originalname
        )
      );
    }
  });

/*
|--------------------------------------------------------------------------
| Almacenamiento del chat
|--------------------------------------------------------------------------
*/

const chatStorage =
  multer.diskStorage({
    destination(
      req,
      file,
      callback
    ) {
      return callback(
        null,
        chatFolder
      );
    },

    filename(
      req,
      file,
      callback
    ) {
      return callback(
        null,
        generateFileName(
          file.originalname
        )
      );
    }
  });

/*
|--------------------------------------------------------------------------
| Multer para productos
|--------------------------------------------------------------------------
*/

const productUpload =
  multer({
    storage:
      productStorage,

    limits: {
      fileSize:
        100 *
        1024 *
        1024,

      files: 9
    },

    fileFilter(
      req,
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

/*
|--------------------------------------------------------------------------
| Multer para chat
|--------------------------------------------------------------------------
*/

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
      chatStorage,

    limits: {
      fileSize:
        25 *
        1024 *
        1024
    },

    fileFilter(
      req,
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

/*
|--------------------------------------------------------------------------
| Middleware de archivos de productos
|--------------------------------------------------------------------------
|
| images = subida múltiple principal
| video  = video principal
| file   = subida individual de respaldo utilizada por NewProduct.jsx
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Subir multimedia de productos
|--------------------------------------------------------------------------
*/

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
                messages[
                  error.code
                ] ||
                error.message
            });
        }

        return res
          .status(400)
          .json({
            success: false,

            message:
              error.message ||
              "No se pudieron procesar los archivos."
          });
      }
    );
  },
  (req, res) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Nunca asumir que req.files existe
      |--------------------------------------------------------------------------
      */

      const uploadedFields =
        req.files &&
        typeof req.files ===
          "object"
          ? req.files
          : {};

      const imageFiles =
        Array.isArray(
          uploadedFields.images
        )
          ? uploadedFields.images
          : [];

      const videoFiles =
        Array.isArray(
          uploadedFields.video
        )
          ? uploadedFields.video
          : [];

      const fallbackFiles =
        Array.isArray(
          uploadedFields.file
        )
          ? uploadedFields.file
          : [];

      const fallbackFile =
        fallbackFiles[0] ||
        null;

      /*
      |--------------------------------------------------------------------------
      | Subida combinada
      |--------------------------------------------------------------------------
      */

      const images =
        imageFiles.map(
          (file) =>
            `/uploads/products/images/${file.filename}`
        );

      const mainVideo =
        videoFiles[0] ||
        null;

      const video =
        mainVideo
          ? {
              url:
                `/uploads/products/videos/${mainVideo.filename}`,

              thumbnail:
                "",

              duration:
                0
            }
          : null;

      /*
      |--------------------------------------------------------------------------
      | Subida individual de respaldo
      |--------------------------------------------------------------------------
      */

      const normalizedFallbackFile =
        buildUploadedFile(
          fallbackFile
        );

      if (
        images.length === 0 &&
        !video &&
        !normalizedFallbackFile
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "No se recibió ninguna imagen o video."
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Respuesta compatible con NewProduct.jsx
      |--------------------------------------------------------------------------
      */

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Archivos subidos correctamente.",

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
        "Error procesando multimedia del producto:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Error procesando los archivos del producto.",

          error:
            process.env
              .NODE_ENV ===
            "development"
              ? error.message
              : undefined
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Subir archivo de chat
|--------------------------------------------------------------------------
*/

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

        if (
          error instanceof
          multer.MulterError
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                error.code ===
                "LIMIT_FILE_SIZE"
                  ? "El archivo supera el límite de 25 MB."
                  : error.message
            });
        }

        return res
          .status(400)
          .json({
            success: false,

            message:
              error.message ||
              "No se pudo procesar el archivo."
          });
      }
    );
  },
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "No se recibió ningún archivo."
        });
    }

    const fileUrl =
      `/uploads/chat/${req.file.filename}`;

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Archivo subido correctamente.",

        file: {
          originalName:
            req.file.originalname,

          filename:
            req.file.filename,

          mimeType:
            req.file.mimetype,

          mimetype:
            req.file.mimetype,

          size:
            req.file.size,

          url:
            fileUrl,

          path:
            fileUrl,

          fileUrl
        }
      });
  }
);

module.exports = router;