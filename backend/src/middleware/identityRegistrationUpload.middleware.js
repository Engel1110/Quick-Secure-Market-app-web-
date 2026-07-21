const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");

/*
|--------------------------------------------------------------------------
| Directorios
|--------------------------------------------------------------------------
*/

const uploadsRoot = path.resolve(
  process.cwd(),
  "uploads"
);

const identityRoot = path.join(
  uploadsRoot,
  "identity"
);

const profileDirectory = path.join(
  identityRoot,
  "profiles"
);

const cedulaFrontDirectory = path.join(
  identityRoot,
  "cedulas",
  "front"
);

const cedulaBackDirectory = path.join(
  identityRoot,
  "cedulas",
  "back"
);

/*
|--------------------------------------------------------------------------
| Crear directorios automáticamente
|--------------------------------------------------------------------------
*/

[
  uploadsRoot,
  identityRoot,
  profileDirectory,
  cedulaFrontDirectory,
  cedulaBackDirectory
].forEach((directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {
      recursive: true
    });
  }
});

/*
|--------------------------------------------------------------------------
| Tipos permitidos
|--------------------------------------------------------------------------
*/

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp"
]);

/*
|--------------------------------------------------------------------------
| Límites
|--------------------------------------------------------------------------
*/

const MAX_FILE_SIZE =
  8 * 1024 * 1024;

const MAX_FILES = 3;

/*
|--------------------------------------------------------------------------
| Normalizar nombre de archivo
|--------------------------------------------------------------------------
*/

const sanitizeBaseName = (value) =>
  String(value || "document")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "document";

/*
|--------------------------------------------------------------------------
| Determinar directorio según campo
|--------------------------------------------------------------------------
*/

const getDestinationByField = (
  fieldName
) => {
  if (fieldName === "profilePhoto") {
    return profileDirectory;
  }

  if (fieldName === "cedulaFront") {
    return cedulaFrontDirectory;
  }

  if (fieldName === "cedulaBack") {
    return cedulaBackDirectory;
  }

  return identityRoot;
};

/*
|--------------------------------------------------------------------------
| Almacenamiento
|--------------------------------------------------------------------------
*/

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback
    ) => {
      callback(
        null,
        getDestinationByField(
          file.fieldname
        )
      );
    },

    filename: (
      req,
      file,
      callback
    ) => {
      const extension =
        path
          .extname(
            file.originalname || ""
          )
          .toLowerCase();

      const safeExtension =
        ALLOWED_EXTENSIONS.has(
          extension
        )
          ? extension
          : ".jpg";

      const originalName =
        sanitizeBaseName(
          path.basename(
            file.originalname ||
              "document",
            extension
          )
        );

      const randomId =
        crypto
          .randomBytes(12)
          .toString("hex");

      const timestamp =
        Date.now();

      const finalName =
        `${file.fieldname}-${originalName}-${timestamp}-${randomId}${safeExtension}`;

      callback(
        null,
        finalName
      );
    }
  });

/*
|--------------------------------------------------------------------------
| Validar archivo
|--------------------------------------------------------------------------
*/

const fileFilter = (
  req,
  file,
  callback
) => {
  const extension =
    path
      .extname(
        file.originalname || ""
      )
      .toLowerCase();

  const validMimeType =
    ALLOWED_MIME_TYPES.has(
      String(
        file.mimetype || ""
      ).toLowerCase()
    );

  const validExtension =
    ALLOWED_EXTENSIONS.has(
      extension
    );

  if (
    !validMimeType ||
    !validExtension
  ) {
    const error =
      new Error(
        "Solo se permiten imágenes JPG, JPEG, PNG o WEBP."
      );

    error.status = 400;
    error.code =
      "INVALID_IDENTITY_FILE_TYPE";

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

/*
|--------------------------------------------------------------------------
| Configuración Multer
|--------------------------------------------------------------------------
*/

const identityUpload =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        MAX_FILE_SIZE,

      files:
        MAX_FILES,

      fields:
        30,

      fieldNameSize:
        100,

      fieldSize:
        2 * 1024 * 1024
    }
  });

/*
|--------------------------------------------------------------------------
| Campos esperados en el registro
|--------------------------------------------------------------------------
*/

const identityRegistrationFields =
  identityUpload.fields([
    {
      name: "profilePhoto",
      maxCount: 1
    },
    {
      name: "cedulaFront",
      maxCount: 1
    },
    {
      name: "cedulaBack",
      maxCount: 1
    }
  ]);

/*
|--------------------------------------------------------------------------
| Construir ruta pública
|--------------------------------------------------------------------------
*/

const toPublicUploadPath = (
  file
) => {
  if (!file?.path) {
    return "";
  }

  const relativePath =
    path
      .relative(
        uploadsRoot,
        file.path
      )
      .replace(/\\/g, "/");

  return `/uploads/${relativePath}`;
};

/*
|--------------------------------------------------------------------------
| Obtener archivo individual
|--------------------------------------------------------------------------
*/

const getUploadedFile = (
  req,
  fieldName
) => {
  const files =
    req.files?.[fieldName];

  if (
    !Array.isArray(files) ||
    files.length === 0
  ) {
    return null;
  }

  return files[0];
};

/*
|--------------------------------------------------------------------------
| Eliminar archivo
|--------------------------------------------------------------------------
*/

const removeUploadedFile = async (
  file
) => {
  if (!file?.path) {
    return;
  }

  try {
    await fs.promises.unlink(
      file.path
    );
  } catch (error) {
    if (
      error.code !== "ENOENT"
    ) {
      console.error(
        "No se pudo eliminar archivo temporal:",
        error.message
      );
    }
  }
};

/*
|--------------------------------------------------------------------------
| Limpiar todos los archivos de una solicitud
|--------------------------------------------------------------------------
*/

const cleanupIdentityUploads =
  async (req) => {
    const files = Object.values(
      req.files || {}
    ).flat();

    await Promise.all(
      files.map(
        removeUploadedFile
      )
    );
  };

/*
|--------------------------------------------------------------------------
| Validar archivos obligatorios
|--------------------------------------------------------------------------
*/

const requireIdentityRegistrationFiles =
  async (
    req,
    res,
    next
  ) => {
    const profilePhoto =
      getUploadedFile(
        req,
        "profilePhoto"
      );

    const cedulaFront =
      getUploadedFile(
        req,
        "cedulaFront"
      );

    const cedulaBack =
      getUploadedFile(
        req,
        "cedulaBack"
      );

    const missingFields = [];

    if (!profilePhoto) {
      missingFields.push(
        "foto de perfil"
      );
    }

    if (!cedulaFront) {
      missingFields.push(
        "cédula frontal"
      );
    }

    if (!cedulaBack) {
      missingFields.push(
        "cédula trasera"
      );
    }

    if (
      missingFields.length > 0
    ) {
      await cleanupIdentityUploads(
        req
      );

      return res
        .status(400)
        .json({
          success: false,
          message:
            `Faltan archivos obligatorios: ${missingFields.join(
              ", "
            )}.`,
          code:
            "MISSING_IDENTITY_FILES"
        });
    }

    req.identityUploads = {
      profilePhoto: {
        file:
          profilePhoto,

        url:
          toPublicUploadPath(
            profilePhoto
          )
      },

      cedulaFront: {
        file:
          cedulaFront,

        url:
          toPublicUploadPath(
            cedulaFront
          )
      },

      cedulaBack: {
        file:
          cedulaBack,

        url:
          toPublicUploadPath(
            cedulaBack
          )
      }
    };

    return next();
  };

/*
|--------------------------------------------------------------------------
| Manejar errores Multer localmente
|--------------------------------------------------------------------------
*/

const handleIdentityUploadErrors = (
  error,
  req,
  res,
  next
) => {
  if (!error) {
    return next();
  }

  cleanupIdentityUploads(
    req
  ).catch(() => {});

  if (
    error instanceof
    multer.MulterError
  ) {
    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return res
        .status(413)
        .json({
          success: false,
          message:
            "Cada imagen debe pesar como máximo 8 MB.",
          code:
            "IDENTITY_FILE_TOO_LARGE"
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
            "Se enviaron demasiados archivos.",
          code:
            "TOO_MANY_IDENTITY_FILES"
        });
    }

    if (
      error.code ===
      "LIMIT_UNEXPECTED_FILE"
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Se recibió un campo de archivo no permitido.",
          code:
            "UNEXPECTED_IDENTITY_FILE"
        });
    }

    return res
      .status(400)
      .json({
        success: false,
        message:
          error.message ||
          "No se pudieron procesar las imágenes.",
        code:
          error.code ||
          "IDENTITY_UPLOAD_ERROR"
      });
  }

  if (
    error.code ===
    "INVALID_IDENTITY_FILE_TYPE"
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message:
          error.message,
        code:
          error.code
      });
  }

  return next(error);
};

/*
|--------------------------------------------------------------------------
| Middleware combinado para Express
|--------------------------------------------------------------------------
*/

const uploadIdentityRegistration =
  [
    (
      req,
      res,
      next
    ) => {
      identityRegistrationFields(
        req,
        res,
        (error) => {
          if (error) {
            return handleIdentityUploadErrors(
              error,
              req,
              res,
              next
            );
          }

          return next();
        }
      );
    },

    requireIdentityRegistrationFiles
  ];

module.exports = {
  uploadIdentityRegistration,
  identityRegistrationFields,
  requireIdentityRegistrationFiles,
  handleIdentityUploadErrors,
  cleanupIdentityUploads,
  getUploadedFile,
  toPublicUploadPath
};