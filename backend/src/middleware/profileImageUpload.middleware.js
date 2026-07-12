const fs = require("fs");
const path = require("path");
const multer = require("multer");

const PROFILE_UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "profiles"
);

/*
|--------------------------------------------------------------------------
| Crear carpeta automáticamente
|--------------------------------------------------------------------------
*/

if (!fs.existsSync(PROFILE_UPLOAD_DIR)) {
  fs.mkdirSync(PROFILE_UPLOAD_DIR, {
    recursive: true
  });
}

/*
|--------------------------------------------------------------------------
| Generar nombre seguro
|--------------------------------------------------------------------------
*/

const sanitizeFileName = (value) => {
  return String(value || "profile")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
};

const storage = multer.diskStorage({
  destination: (
    req,
    file,
    callback
  ) => {
    callback(
      null,
      PROFILE_UPLOAD_DIR
    );
  },

  filename: (
    req,
    file,
    callback
  ) => {
    const extension =
      path.extname(
        file.originalname || ""
      ).toLowerCase();

    const userId =
      req.user?._id ||
      req.user?.id ||
      req.user?.userId ||
      "anonymous";

    const safeUserId =
      sanitizeFileName(userId);

    const uniqueSuffix =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}`;

    callback(
      null,
      `profile-${safeUserId}-${uniqueSuffix}${extension}`
    );
  }
});

/*
|--------------------------------------------------------------------------
| Tipos permitidos
|--------------------------------------------------------------------------
*/

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

const fileFilter = (
  req,
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

  callback(null, true);
};

/*
|--------------------------------------------------------------------------
| Middleware principal
|--------------------------------------------------------------------------
*/

const profileImageUpload = multer({
  storage,

  limits: {
    fileSize:
      5 * 1024 * 1024,

    files: 1
  },

  fileFilter
});

/*
|--------------------------------------------------------------------------
| Limpiar archivo temporal si algo falla
|--------------------------------------------------------------------------
*/

const removeUploadedFile = (
  filePath
) => {
  if (!filePath) {
    return;
  }

  try {
    if (
      fs.existsSync(
        filePath
      )
    ) {
      fs.unlinkSync(
        filePath
      );
    }
  } catch (error) {
    console.error(
      "No se pudo eliminar el archivo temporal:",
      error.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| Manejo de errores de Multer
|--------------------------------------------------------------------------
*/

const handleProfileUploadError = (
  error,
  req,
  res,
  next
) => {
  if (!error) {
    return next();
  }

  if (
    req.file?.path
  ) {
    removeUploadedFile(
      req.file.path
    );
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

/*
|--------------------------------------------------------------------------
| Middleware listo para usar en rutas
|--------------------------------------------------------------------------
*/

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

        next();
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