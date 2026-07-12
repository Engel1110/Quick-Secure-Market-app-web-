const fs = require("fs");
const path = require("path");

const User = require(
  "../models/User"
);

const {
  removeUploadedFile
} = require(
  "../middleware/profileImageUpload.middleware"
);

/*
|--------------------------------------------------------------------------
| Utilidades internas
|--------------------------------------------------------------------------
*/

const getAuthenticatedUserId = (
  req
) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    req.userId ||
    ""
  );
};

const normalizeText = (
  value,
  maxLength = 500
) => {
  return String(
    value || ""
  )
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
};

const normalizePersonName = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase(
      "es-DO"
    )
    .replace(
      /(^|[\s'-])\p{L}/gu,
      (letter) =>
        letter.toLocaleUpperCase(
          "es-DO"
        )
    );
};

const normalizePhone = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .replace(
      /[^\d+\-()\s]/g,
      ""
    )
    .slice(0, 30);
};

const normalizeProfilePhotoUrl = (
  req,
  filename
) => {
  if (!filename) {
    return "";
  }

  return `/uploads/profiles/${filename}`;
};

const getStoredProfilePhotoPath = (
  profilePhoto
) => {
  if (!profilePhoto) {
    return "";
  }

  const cleanValue =
    String(profilePhoto)
      .trim()
      .replace(/\\/g, "/");

  if (
    !cleanValue.startsWith(
      "/uploads/profiles/"
    )
  ) {
    return "";
  }

  const filename =
    path.basename(
      cleanValue
    );

  return path.join(
    __dirname,
    "..",
    "..",
    "uploads",
    "profiles",
    filename
  );
};

const deletePreviousProfilePhoto = (
  profilePhoto
) => {
  const filePath =
    getStoredProfilePhotoPath(
      profilePhoto
    );

  if (!filePath) {
    return;
  }

  removeUploadedFile(
    filePath
  );
};

const sanitizeUser = (
  user
) => {
  if (!user) {
    return null;
  }

  const safeUser =
    typeof user.toJSON ===
    "function"
      ? user.toJSON()
      : {
          ...user
        };

  delete safeUser.password;
  delete safeUser.resetPasswordToken;
  delete safeUser.resetPasswordExpires;
  delete safeUser.twoFactorSecret;
  delete safeUser.profilePhotoPublicId;

  return safeUser;
};

/*
|--------------------------------------------------------------------------
| GET /api/users/me
|--------------------------------------------------------------------------
| Devuelve el perfil completo del usuario autenticado.
|--------------------------------------------------------------------------
*/

const getMe = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Debes iniciar sesión para consultar tu perfil."
        });
    }

    const user =
      await User.findById(
        userId
      )
        .select(
          "-password -resetPasswordToken -resetPasswordExpires -twoFactorSecret -profilePhotoPublicId"
        )
        .lean({
          virtuals: true
        });

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "No se encontró el usuario autenticado."
        });
    }

    return res
      .status(200)
      .json({
        success: true,
        user
      });
  } catch (error) {
    console.error(
      "Error obteniendo perfil:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo obtener el perfil.",
        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message
      });
  }
};

/*
|--------------------------------------------------------------------------
| PATCH /api/users/me
|--------------------------------------------------------------------------
| Permite actualizar únicamente información personal segura.
|
| El usuario NO puede cambiar desde aquí:
| - role
| - permissions
| - department
| - status
| - trustScore
| - securityLevel
| - isVerified
| - verificationStatus
|--------------------------------------------------------------------------
*/

const updateMe = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Debes iniciar sesión para actualizar tu perfil."
        });
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Usuario no encontrado."
        });
    }

    const {
      firstName,
      lastName,
      phone,
      documentId,
      dateOfBirth,
      gender,
      country,
      province,
      city,
      address,
      language,
      timezone,
      notificationsEnabled,
      emailNotificationsEnabled
    } = req.body || {};

    if (
      firstName !==
      undefined
    ) {
      const normalizedFirstName =
        normalizePersonName(
          firstName
        );

      if (
        normalizedFirstName.length <
        2
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "El nombre debe tener al menos 2 caracteres."
          });
      }

      user.firstName =
        normalizedFirstName;
    }

    if (
      lastName !==
      undefined
    ) {
      const normalizedLastName =
        normalizePersonName(
          lastName
        );

      if (
        normalizedLastName.length <
        2
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "El apellido debe tener al menos 2 caracteres."
          });
      }

      user.lastName =
        normalizedLastName;
    }

    if (
      phone !== undefined
    ) {
      user.phone =
        normalizePhone(
          phone
        );
    }

    if (
      documentId !==
      undefined
    ) {
      user.documentId =
        normalizeText(
          documentId,
          50
        );
    }

    if (
      dateOfBirth !==
      undefined
    ) {
      if (
        !dateOfBirth
      ) {
        user.dateOfBirth =
          null;
      } else {
        const parsedDate =
          new Date(
            dateOfBirth
          );

        if (
          Number.isNaN(
            parsedDate.getTime()
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "La fecha de nacimiento no es válida."
            });
        }

        user.dateOfBirth =
          parsedDate;
      }
    }

    if (
      gender !== undefined
    ) {
      const allowedGenders = [
        "MALE",
        "FEMALE",
        "OTHER",
        "PREFER_NOT_TO_SAY"
      ];

      const normalizedGender =
        String(
          gender || ""
        ).toUpperCase();

      if (
        !allowedGenders.includes(
          normalizedGender
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "El género seleccionado no es válido."
          });
      }

      user.gender =
        normalizedGender;
    }

    if (
      country !==
      undefined
    ) {
      user.country =
        normalizeText(
          country,
          100
        );
    }

    if (
      province !==
      undefined
    ) {
      user.province =
        normalizeText(
          province,
          100
        );
    }

    if (
      city !== undefined
    ) {
      user.city =
        normalizeText(
          city,
          100
        );
    }

    if (
      address !==
      undefined
    ) {
      user.address =
        normalizeText(
          address,
          500
        );
    }

    if (
      language !==
      undefined
    ) {
      const normalizedLanguage =
        String(
          language || ""
        ).toLowerCase();

      if (
        ![
          "es",
          "en"
        ].includes(
          normalizedLanguage
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "El idioma seleccionado no es válido."
          });
      }

      user.language =
        normalizedLanguage;
    }

    if (
      timezone !==
      undefined
    ) {
      user.timezone =
        normalizeText(
          timezone,
          100
        );
    }

    if (
      notificationsEnabled !==
      undefined
    ) {
      user.notificationsEnabled =
        Boolean(
          notificationsEnabled
        );
    }

    if (
      emailNotificationsEnabled !==
      undefined
    ) {
      user.emailNotificationsEnabled =
        Boolean(
          emailNotificationsEnabled
        );
    }

    await user.save();

    const safeUser =
      sanitizeUser(
        user
      );

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Perfil actualizado correctamente.",
        user:
          safeUser
      });
  } catch (error) {
    console.error(
      "Error actualizando perfil:",
      error
    );

    if (
      error.code === 11000
    ) {
      const duplicatedField =
        Object.keys(
          error.keyPattern ||
            {}
        )[0] ||
        "dato";

      return res
        .status(409)
        .json({
          success: false,
          message:
            duplicatedField ===
            "documentId"
              ? "Este documento ya está registrado en otra cuenta."
              : `El ${duplicatedField} ya está registrado.`
        });
    }

    if (
      error.name ===
      "ValidationError"
    ) {
      const firstError =
        Object.values(
          error.errors ||
            {}
        )[0];

      return res
        .status(400)
        .json({
          success: false,
          message:
            firstError?.message ||
            "Los datos del perfil no son válidos."
        });
    }

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo actualizar el perfil.",
        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message
      });
  }
};

/*
|--------------------------------------------------------------------------
| PATCH /api/users/me/avatar
|--------------------------------------------------------------------------
| Guarda la imagen en /uploads/profiles y registra la URL en MongoDB.
|--------------------------------------------------------------------------
*/

const updateProfilePhoto = async (
  req,
  res
) => {
  let uploadedFilePath =
    req.file?.path ||
    "";

  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      if (
        uploadedFilePath
      ) {
        removeUploadedFile(
          uploadedFilePath
        );
      }

      return res
        .status(401)
        .json({
          success: false,
          message:
            "Debes iniciar sesión para cambiar tu foto de perfil."
        });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "No se recibió ninguna foto de perfil."
        });
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      removeUploadedFile(
        uploadedFilePath
      );

      return res
        .status(404)
        .json({
          success: false,
          message:
            "Usuario no encontrado."
        });
    }

    const previousPhoto =
      user.profilePhoto ||
      "";

    const profilePhotoUrl =
      normalizeProfilePhotoUrl(
        req,
        req.file.filename
      );

    user.profilePhoto =
      profilePhotoUrl;

    user.profilePhotoUploadedAt =
      new Date();

    await user.save();

    if (
      previousPhoto &&
      previousPhoto !==
        profilePhotoUrl
    ) {
      deletePreviousProfilePhoto(
        previousPhoto
      );
    }

    uploadedFilePath = "";

    const safeUser =
      sanitizeUser(
        user
      );

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Foto de perfil actualizada correctamente.",
        profilePhoto:
          profilePhotoUrl,
        user:
          safeUser
      });
  } catch (error) {
    console.error(
      "Error actualizando foto de perfil:",
      error
    );

    if (
      uploadedFilePath
    ) {
      removeUploadedFile(
        uploadedFilePath
      );
    }

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo actualizar la foto de perfil.",
        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message
      });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE /api/users/me/avatar
|--------------------------------------------------------------------------
*/

const deleteProfilePhoto = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Debes iniciar sesión para eliminar tu foto de perfil."
        });
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Usuario no encontrado."
        });
    }

    const previousPhoto =
      user.profilePhoto ||
      "";

    user.profilePhoto =
      "";

    user.profilePhotoUploadedAt =
      null;

    await user.save();

    if (
      previousPhoto
    ) {
      deletePreviousProfilePhoto(
        previousPhoto
      );
    }

    const safeUser =
      sanitizeUser(
        user
      );

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Foto de perfil eliminada correctamente.",
        profilePhoto: "",
        user:
          safeUser
      });
  } catch (error) {
    console.error(
      "Error eliminando foto de perfil:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo eliminar la foto de perfil.",
        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message
      });
  }
};

module.exports = {
  getMe,
  updateMe,
  updateProfilePhoto,
  deleteProfilePhoto
};