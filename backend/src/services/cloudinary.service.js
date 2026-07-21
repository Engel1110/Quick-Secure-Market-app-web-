/*
|--------------------------------------------------------------------------
| Quick Secure Market - Servicio de Cloudinary
|--------------------------------------------------------------------------
| Ruta:
| backend/src/services/cloudinary.service.js
|--------------------------------------------------------------------------
*/

const fs = require("fs/promises");
const path = require("path");

const {
  cloudinary,
  isCloudinaryConfigured
} = require("../config/cloudinary");

/*
|--------------------------------------------------------------------------
| Configuración general
|--------------------------------------------------------------------------
*/

const DEFAULT_FOLDER =
  "quick-secure-market";

const VERIFICATION_FOLDER =
  `${DEFAULT_FOLDER}/verification`;

const ALLOWED_IMAGE_FORMATS = [
  "jpg",
  "jpeg",
  "png",
  "webp"
];

const MAX_IMAGE_SIZE =
  8 * 1024 * 1024;

/*
|--------------------------------------------------------------------------
| Error personalizado
|--------------------------------------------------------------------------
*/

class CloudinaryServiceError extends Error {
  constructor(
    message,
    statusCode = 500,
    details = null
  ) {
    super(message);

    this.name =
      "CloudinaryServiceError";

    this.statusCode =
      statusCode;

    this.details =
      details;
  }
}

/*
|--------------------------------------------------------------------------
| Validar configuración
|--------------------------------------------------------------------------
*/

const ensureCloudinaryConfigured = () => {
  if (!isCloudinaryConfigured()) {
    throw new CloudinaryServiceError(
      "Cloudinary no está configurado. Revisa las variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.",
      500
    );
  }
};

/*
|--------------------------------------------------------------------------
| Normalizar texto para public_id
|--------------------------------------------------------------------------
*/

const sanitizePublicIdPart = (
  value = ""
) => {
  return String(value)
    .trim()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^-|-$|_/g,
      ""
    )
    .toLowerCase();
};

/*
|--------------------------------------------------------------------------
| Crear public_id único
|--------------------------------------------------------------------------
*/

const createPublicId = ({
  userId,
  category = "image"
} = {}) => {
  const safeUserId =
    sanitizePublicIdPart(
      userId || "anonymous"
    );

  const safeCategory =
    sanitizePublicIdPart(
      category || "image"
    );

  const timestamp =
    Date.now();

  const randomValue =
    Math.random()
      .toString(36)
      .slice(2, 10);

  return `${safeUserId}-${safeCategory}-${timestamp}-${randomValue}`;
};

/*
|--------------------------------------------------------------------------
| Detectar extensión
|--------------------------------------------------------------------------
*/

const getFileExtension = (
  file = {}
) => {
  const originalName =
    file.originalname ||
    file.path ||
    "";

  return path
    .extname(originalName)
    .replace(".", "")
    .toLowerCase();
};

/*
|--------------------------------------------------------------------------
| Validar imagen
|--------------------------------------------------------------------------
*/

const validateImageFile = (
  file
) => {
  if (!file) {
    throw new CloudinaryServiceError(
      "No se recibió ningún archivo.",
      400
    );
  }

  if (
    !file.path &&
    !file.buffer
  ) {
    throw new CloudinaryServiceError(
      "El archivo no contiene una ruta ni un buffer válido.",
      400
    );
  }

  if (
    file.size &&
    file.size > MAX_IMAGE_SIZE
  ) {
    throw new CloudinaryServiceError(
      "La imagen supera el tamaño máximo permitido de 8 MB.",
      400
    );
  }

  if (
    file.mimetype &&
    !file.mimetype.startsWith(
      "image/"
    )
  ) {
    throw new CloudinaryServiceError(
      "El archivo debe ser una imagen.",
      400
    );
  }

  const extension =
    getFileExtension(file);

  if (
    extension &&
    !ALLOWED_IMAGE_FORMATS.includes(
      extension
    )
  ) {
    throw new CloudinaryServiceError(
      "Solo se permiten imágenes JPG, JPEG, PNG o WEBP.",
      400
    );
  }
};

/*
|--------------------------------------------------------------------------
| Convertir buffer a Data URI
|--------------------------------------------------------------------------
*/

const bufferToDataUri = (
  file
) => {
  if (!file?.buffer) {
    return null;
  }

  const mimeType =
    file.mimetype ||
    "image/jpeg";

  const base64 =
    file.buffer.toString(
      "base64"
    );

  return `data:${mimeType};base64,${base64}`;
};

/*
|--------------------------------------------------------------------------
| Obtener fuente de subida
|--------------------------------------------------------------------------
*/

const getUploadSource = (
  file
) => {
  if (file?.path) {
    return file.path;
  }

  const dataUri =
    bufferToDataUri(file);

  if (dataUri) {
    return dataUri;
  }

  throw new CloudinaryServiceError(
    "No fue posible obtener el contenido del archivo.",
    400
  );
};

/*
|--------------------------------------------------------------------------
| Eliminar archivo temporal local
|--------------------------------------------------------------------------
*/

const removeTemporaryFile = async (
  filePath
) => {
  if (!filePath) {
    return false;
  }

  try {
    await fs.unlink(filePath);

    return true;
  } catch (error) {
    if (
      error?.code === "ENOENT"
    ) {
      return false;
    }

    console.error(
      "No se pudo eliminar el archivo temporal:",
      {
        filePath,
        message:
          error?.message
      }
    );

    return false;
  }
};

/*
|--------------------------------------------------------------------------
| Formatear resultado de Cloudinary
|--------------------------------------------------------------------------
*/

const formatCloudinaryResult = (
  result
) => {
  if (!result) {
    return null;
  }

  return {
    assetId:
      result.asset_id ||
      null,

    publicId:
      result.public_id ||
      null,

    url:
      result.secure_url ||
      result.url ||
      null,

    secureUrl:
      result.secure_url ||
      null,

    resourceType:
      result.resource_type ||
      null,

    format:
      result.format ||
      null,

    width:
      result.width ||
      null,

    height:
      result.height ||
      null,

    bytes:
      result.bytes ||
      null,

    folder:
      result.folder ||
      null,

    createdAt:
      result.created_at ||
      null,

    originalFilename:
      result.original_filename ||
      null
  };
};

/*
|--------------------------------------------------------------------------
| Subir imagen genérica
|--------------------------------------------------------------------------
*/

const uploadImage = async (
  file,
  options = {}
) => {
  ensureCloudinaryConfigured();
  validateImageFile(file);

  const {
    folder =
      DEFAULT_FOLDER,

    publicId,

    userId,

    category =
      "image",

    tags = [],

    transformation,

    deleteLocalFile = true
  } = options;

  const generatedPublicId =
    publicId ||
    createPublicId({
      userId,
      category
    });

  const uploadSource =
    getUploadSource(file);

  try {
    const uploadOptions = {
      folder,

      public_id:
        generatedPublicId,

      resource_type:
        "image",

      overwrite:
        false,

      unique_filename:
        false,

      use_filename:
        false,

      invalidate:
        true,

      type:
        "upload",

      tags: Array.isArray(tags)
        ? tags
        : [tags],

      context: {
        application:
          "quick-secure-market",

        category:
          String(category),

        userId:
          String(
            userId ||
            "unknown"
          )
      }
    };

    if (transformation) {
      uploadOptions.transformation =
        transformation;
    }

    const result =
      await cloudinary.uploader.upload(
        uploadSource,
        uploadOptions
      );

    return formatCloudinaryResult(
      result
    );
  } catch (error) {
    console.error(
      "Error subiendo imagen a Cloudinary:",
      {
        message:
          error?.message,

        httpCode:
          error?.http_code,

        folder,
        category,
        userId
      }
    );

    throw new CloudinaryServiceError(
      error?.message ||
        "No se pudo subir la imagen a Cloudinary.",
      error?.http_code ||
        500,
      error
    );
  } finally {
    if (
      deleteLocalFile &&
      file?.path
    ) {
      await removeTemporaryFile(
        file.path
      );
    }
  }
};

/*
|--------------------------------------------------------------------------
| Subir imagen de verificación
|--------------------------------------------------------------------------
*/

const uploadVerificationImage =
  async (
    file,
    {
      userId,
      category =
        "verification",

      tags = [],

      transformation
    } = {}
  ) => {
    const verificationTags = [
      "qsm",
      "verification",
      category,
      String(
        userId ||
        "unknown"
      ),
      ...tags
    ];

    return uploadImage(
      file,
      {
        folder:
          `${VERIFICATION_FOLDER}/${sanitizePublicIdPart(
            userId ||
              "anonymous"
          )}`,

        userId,

        category,

        tags:
          verificationTags,

        transformation:
          transformation || [
            {
              quality:
                "auto:good",

              fetch_format:
                "auto"
            }
          ]
      }
    );
  };

/*
|--------------------------------------------------------------------------
| Eliminar imagen
|--------------------------------------------------------------------------
*/

const deleteImage = async (
  publicId,
  options = {}
) => {
  ensureCloudinaryConfigured();

  if (
    !publicId ||
    !String(publicId).trim()
  ) {
    return {
      success: true,
      deleted: false,
      result:
        "not_found",
      message:
        "No se proporcionó un publicId."
    };
  }

  const {
    resourceType =
      "image",

    invalidate = true
  } = options;

  try {
    const result =
      await cloudinary.uploader.destroy(
        String(publicId).trim(),
        {
          resource_type:
            resourceType,

          invalidate
        }
      );

    const deleted =
      result?.result === "ok";

    return {
      success:
        deleted ||
        result?.result ===
          "not found",

      deleted,

      result:
        result?.result ||
        null,

      publicId:
        String(publicId).trim()
    };
  } catch (error) {
    console.error(
      "Error eliminando imagen de Cloudinary:",
      {
        publicId,
        message:
          error?.message,

        httpCode:
          error?.http_code
      }
    );

    throw new CloudinaryServiceError(
      error?.message ||
        "No se pudo eliminar la imagen de Cloudinary.",
      error?.http_code ||
        500,
      error
    );
  }
};

/*
|--------------------------------------------------------------------------
| Reemplazar imagen
|--------------------------------------------------------------------------
| Primero sube la nueva imagen.
| Después elimina la anterior.
| Así evitamos perder la imagen vieja si la subida falla.
|--------------------------------------------------------------------------
*/

const replaceImage = async (
  file,
  oldPublicId,
  options = {}
) => {
  const uploadedImage =
    await uploadImage(
      file,
      options
    );

  if (
    oldPublicId &&
    uploadedImage?.publicId !==
      oldPublicId
  ) {
    try {
      await deleteImage(
        oldPublicId
      );
    } catch (error) {
      console.error(
        "La nueva imagen fue subida, pero no se pudo eliminar la anterior:",
        {
          oldPublicId,
          newPublicId:
            uploadedImage?.publicId,

          message:
            error?.message
        }
      );
    }
  }

  return uploadedImage;
};

/*
|--------------------------------------------------------------------------
| Reemplazar imagen de verificación
|--------------------------------------------------------------------------
*/

const replaceVerificationImage =
  async (
    file,
    oldPublicId,
    {
      userId,
      category =
        "verification",

      tags = [],

      transformation
    } = {}
  ) => {
    const uploadedImage =
      await uploadVerificationImage(
        file,
        {
          userId,
          category,
          tags,
          transformation
        }
      );

    if (
      oldPublicId &&
      uploadedImage?.publicId !==
        oldPublicId
    ) {
      try {
        await deleteImage(
          oldPublicId
        );
      } catch (error) {
        console.error(
          "La nueva imagen de verificación fue subida, pero no se pudo eliminar la imagen anterior:",
          {
            oldPublicId,
            newPublicId:
              uploadedImage?.publicId,

            message:
              error?.message
          }
        );
      }
    }

    return uploadedImage;
  };

/*
|--------------------------------------------------------------------------
| Eliminar varias imágenes
|--------------------------------------------------------------------------
*/

const deleteImages = async (
  publicIds = []
) => {
  ensureCloudinaryConfigured();

  const validPublicIds = [
    ...new Set(
      publicIds
        .filter(Boolean)
        .map((publicId) =>
          String(
            publicId
          ).trim()
        )
        .filter(Boolean)
    )
  ];

  if (
    validPublicIds.length === 0
  ) {
    return {
      success: true,
      deleted: {},
      partial: false
    };
  }

  try {
    const result =
      await cloudinary.api.delete_resources(
        validPublicIds,
        {
          resource_type:
            "image",

          type:
            "upload",

          invalidate:
            true
        }
      );

    return {
      success: true,

      deleted:
        result?.deleted ||
        {},

      partial:
        Boolean(
          result?.partial
        ),

      rateLimitAllowed:
        result?.rate_limit_allowed,

      rateLimitRemaining:
        result?.rate_limit_remaining,

      rateLimitResetAt:
        result?.rate_limit_reset_at
    };
  } catch (error) {
    console.error(
      "Error eliminando varias imágenes de Cloudinary:",
      {
        publicIds:
          validPublicIds,

        message:
          error?.message,

        httpCode:
          error?.http_code
      }
    );

    throw new CloudinaryServiceError(
      error?.message ||
        "No se pudieron eliminar las imágenes de Cloudinary.",
      error?.http_code ||
        500,
      error
    );
  }
};

/*
|--------------------------------------------------------------------------
| Comprobar recurso
|--------------------------------------------------------------------------
*/

const getImageDetails = async (
  publicId
) => {
  ensureCloudinaryConfigured();

  if (
    !publicId ||
    !String(publicId).trim()
  ) {
    throw new CloudinaryServiceError(
      "Debes proporcionar un publicId.",
      400
    );
  }

  try {
    const result =
      await cloudinary.api.resource(
        String(publicId).trim(),
        {
          resource_type:
            "image",

          type:
            "upload"
        }
      );

    return formatCloudinaryResult(
      result
    );
  } catch (error) {
    if (
      error?.http_code === 404
    ) {
      return null;
    }

    throw new CloudinaryServiceError(
      error?.message ||
        "No se pudo obtener la imagen de Cloudinary.",
      error?.http_code ||
        500,
      error
    );
  }
};

/*
|--------------------------------------------------------------------------
| Exportaciones
|--------------------------------------------------------------------------
*/

module.exports = {
  CloudinaryServiceError,

  DEFAULT_FOLDER,
  VERIFICATION_FOLDER,
  MAX_IMAGE_SIZE,
  ALLOWED_IMAGE_FORMATS,

  sanitizePublicIdPart,
  createPublicId,
  validateImageFile,
  removeTemporaryFile,
  formatCloudinaryResult,

  uploadImage,
  uploadVerificationImage,

  deleteImage,
  deleteImages,

  replaceImage,
  replaceVerificationImage,

  getImageDetails
};