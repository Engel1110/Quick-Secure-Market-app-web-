const fs = require("fs");
const path = require("path");
const multer = require("multer");

const PROFILE_UPLOAD_DIR =
  path.join(
    __dirname,
    "..",
    "..",
    "uploads",
    "profiles"
  );

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

const fileFilter = (
  _req,
  file,
  callback
) => {
  if (
    !allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    const error =
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE"
      );

    error.message =
      "La foto de perfil debe ser JPG, PNG o WEBP.";

    return callback(
      error,
      false
    );
  }

  return callback(
    null,
    true
  );
};

const profileImageUpload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        5 *
        1024 *
        1024,

      files: 1
    },

    fileFilter
  });

const removeUploadedFile = (
  filePath
) => {
  if (!filePath) {
    return;
  }

  try {
    if (
      fs.existsSync(filePath)
    ) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(
      "No se pudo eliminar el archivo local:",
      error.message
    );
  }
};

const handleProfileUploadError = (
  error,
  _req,
  res,
  next
) => {
  if (!error) {
    return next();
  }

  if (
    error instanceof
    multer.MulterError
  ) {
    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "La foto de perfil no puede superar los 5 MB."
        });
    }

    if (
      error.code ===
      "LIMIT_FILE_COUNT"
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Solo puedes subir una foto de perfil."
        });
    }

    return res
      .status(400)
      .json({
        success: false,
        message:
          error.message ||
          "No se pudo procesar la foto de perfil."
      });
  }

  return res
    .status(400)
    .json({
      success: false,
      message:
        error.message ||
        "Archivo de imagen no válido."
    });
};

const uploadProfileImage = [
  (
    req,
    res,
    next
  ) => {
    profileImageUpload.single(
      "profilePhoto"
    )(
      req,
      res,
      (error) => {
        if (error) {
          return handleProfileUploadError(
            error,
            req,
            res,
            next
          );
        }

        return next();
      }
    );
  }
];

module.exports = {
  uploadProfileImage,
  handleProfileUploadError,
  removeUploadedFile,
  PROFILE_UPLOAD_DIR
};
