const path = require("path");

const {
  prisma,
  getRequestUserId,
  sanitizeUser,
  isPrismaError
} = require("../utils/prismaCompat");

const {
  removeUploadedFile
} = require(
  "../middleware/profileImageUpload.middleware"
);

const {
  uploadPublicFile,
  deletePublicFileByUrl,
  deletePublicObjectPath
} = require(
  "../services/storage.service"
);

const normalizeText = (
  value,
  maxLength = 500
) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);

const normalizePersonName = (
  value
) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-DO")
    .replace(
      /(^|[\s'-])\p{L}/gu,
      (letter) =>
        letter.toLocaleUpperCase(
          "es-DO"
        )
    );

const normalizePhone = (
  value
) =>
  String(value || "")
    .trim()
    .replace(
      /[^\d+\-()\s]/g,
      ""
    )
    .slice(0, 30);

function getStoredProfilePhotoPath(
  profilePhoto
) {
  const cleanValue =
    String(profilePhoto || "")
      .trim()
      .replace(/\\/g, "/");

  if (
    !cleanValue.startsWith(
      "/uploads/profiles/"
    )
  ) {
    return "";
  }

  return path.join(
    __dirname,
    "..",
    "..",
    "uploads",
    "profiles",
    path.basename(cleanValue)
  );
}

async function deletePreviousProfilePhoto(
  profilePhoto
) {
  if (!profilePhoto) {
    return;
  }

  try {
    const removedFromSupabase =
      await deletePublicFileByUrl(
        profilePhoto
      );

    if (removedFromSupabase) {
      return;
    }
  } catch (error) {
    console.error(
      "No se pudo eliminar la foto anterior de Supabase:",
      error.message
    );
  }

  const filePath =
    getStoredProfilePhotoPath(
      profilePhoto
    );

  if (filePath) {
    removeUploadedFile(
      filePath
    );
  }
}

async function getMe(
  req,
  res
) {
  try {
    const userId =
      await getRequestUserId(req);

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
      await prisma.user.findUnique({
        where: {
          id: userId
        }
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
        user:
          sanitizeUser(user)
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
}

async function updateMe(
  req,
  res
) {
  try {
    const userId =
      await getRequestUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Debes iniciar sesión para actualizar tu perfil."
        });
    }

    const current =
      await prisma.user.findUnique({
        where: {
          id: userId
        }
      });

    if (!current) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Usuario no encontrado."
        });
    }

    const body =
      req.body || {};

    const data = {};

    if (
      body.firstName !==
      undefined
    ) {
      const value =
        normalizePersonName(
          body.firstName
        );

      if (value.length < 2) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "El nombre debe tener al menos 2 caracteres."
          });
      }

      data.firstName =
        value;
    }

    if (
      body.lastName !==
      undefined
    ) {
      const value =
        normalizePersonName(
          body.lastName
        );

      if (value.length < 2) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "El apellido debe tener al menos 2 caracteres."
          });
      }

      data.lastName =
        value;
    }

    if (
      body.phone !==
      undefined
    ) {
      data.phone =
        normalizePhone(
          body.phone
        );
    }

    if (
      body.documentId !==
      undefined
    ) {
      data.documentId =
        normalizeText(
          body.documentId,
          50
        ) || null;
    }

    if (
      body.dateOfBirth !==
      undefined
    ) {
      if (!body.dateOfBirth) {
        data.dateOfBirth =
          null;
      } else {
        const parsed =
          new Date(
            body.dateOfBirth
          );

        if (
          Number.isNaN(
            parsed.getTime()
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

        data.dateOfBirth =
          parsed;
      }
    }

    if (
      body.gender !==
      undefined
    ) {
      const value =
        String(
          body.gender || ""
        ).toUpperCase();

      if (
        ![
          "MALE",
          "FEMALE",
          "OTHER",
          "PREFER_NOT_TO_SAY"
        ].includes(value)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "El género seleccionado no es válido."
          });
      }

      data.gender =
        value;
    }

    for (
      const [
        field,
        maxLength
      ] of [
        ["country", 100],
        ["province", 100],
        ["city", 100],
        ["address", 500],
        ["timezone", 100]
      ]
    ) {
      if (
        body[field] !==
        undefined
      ) {
        data[field] =
          normalizeText(
            body[field],
            maxLength
          );
      }
    }

    if (
      body.language !==
      undefined
    ) {
      const value =
        String(
          body.language || ""
        ).toLowerCase();

      if (
        !["es", "en"].includes(
          value
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

      data.language =
        value;
    }

    if (
      body.notificationsEnabled !==
      undefined
    ) {
      data.notificationsEnabled =
        Boolean(
          body.notificationsEnabled
        );
    }

    if (
      body.emailNotificationsEnabled !==
      undefined
    ) {
      data.emailNotificationsEnabled =
        Boolean(
          body.emailNotificationsEnabled
        );
    }

    const user =
      await prisma.user.update({
        where: {
          id: userId
        },
        data
      });

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Perfil actualizado correctamente.",
        user:
          sanitizeUser(user)
      });
  } catch (error) {
    console.error(
      "Error actualizando perfil:",
      error
    );

    if (
      isPrismaError(
        error,
        "P2002"
      )
    ) {
      return res
        .status(409)
        .json({
          success: false,
          message:
            "Uno de los datos ya está registrado en otra cuenta."
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
}

async function updateProfilePhoto(
  req,
  res
) {
  let uploadedObjectPath = "";

  try {
    const userId =
      await getRequestUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Debes iniciar sesión para cambiar tu foto de perfil."
        });
    }

    if (
      !req.file?.buffer
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "No se recibió ninguna foto de perfil."
        });
    }

    const current =
      await prisma.user.findUnique({
        where: {
          id: userId
        }
      });

    if (!current) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Usuario no encontrado."
        });
    }

    const uploaded =
      await uploadPublicFile(
        req.file,
        {
          folder:
            `profiles/${userId}`
        }
      );

    uploadedObjectPath =
      uploaded.objectPath;

    const profilePhoto =
      uploaded.url;

    const user =
      await prisma.user.update({
        where: {
          id: userId
        },
        data: {
          profilePhoto,
          profilePhotoUploadedAt:
            new Date()
        }
      });

    uploadedObjectPath =
      "";

    if (
      current.profilePhoto &&
      current.profilePhoto !==
        profilePhoto
    ) {
      await deletePreviousProfilePhoto(
        current.profilePhoto
      );
    }

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Foto de perfil actualizada correctamente.",
        profilePhoto,
        user:
          sanitizeUser(user)
      });
  } catch (error) {
    if (uploadedObjectPath) {
      try {
        await deletePublicObjectPath(
          uploadedObjectPath
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "No se pudo limpiar la foto nueva:",
          cleanupError.message
        );
      }
    }

    console.error(
      "Error actualizando foto de perfil:",
      error
    );

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
}

async function deleteProfilePhoto(
  req,
  res
) {
  try {
    const userId =
      await getRequestUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Debes iniciar sesión para eliminar tu foto de perfil."
        });
    }

    const current =
      await prisma.user.findUnique({
        where: {
          id: userId
        }
      });

    if (!current) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Usuario no encontrado."
        });
    }

    const user =
      await prisma.user.update({
        where: {
          id: userId
        },
        data: {
          profilePhoto:
            "",
          profilePhotoUploadedAt:
            null
        }
      });

    if (
      current.profilePhoto
    ) {
      await deletePreviousProfilePhoto(
        current.profilePhoto
      );
    }

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Foto de perfil eliminada correctamente.",
        profilePhoto:
          "",
        user:
          sanitizeUser(user)
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
}

async function getPublicProfile(
  req,
  res
) {
  try {
    const requesterId =
      await getRequestUserId(req);

    if (!requesterId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Debes iniciar sesión para consultar este perfil."
        });
    }

    const userId =
      Number(req.params.userId);

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "El identificador del usuario no es válido."
        });
    }

    const user =
      await prisma.user.findFirst({
        where: {
          id: userId,
          status: "ACTIVE",
          deletedAt: null
        },

        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          isVerified: true,
          verificationStatus: true,
          identityLevel: true,
          trustScore: true,
          completedPurchases: true,
          completedSales: true,
          sellerEnabled: true,
          buyerEnabled: true,
          city: true,
          province: true,
          country: true,
          createdAt: true,

          products: {
            where: {
              deletedAt: null,
              status: {
                notIn: [
                  "DELETED",
                  "REJECTED"
                ]
              }
            },

            select: {
              id: true,
              title: true,
              price: true,
              category: true,
              condition: true,
              imageUrl: true,
              images: true,
              status: true,
              createdAt: true
            },

            orderBy: {
              createdAt: "desc"
            },

            take: 8
          },

          reviewsReceived: {
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true,

              reviewer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                  isVerified: true,
                  trustScore: true
                }
              },

              product: {
                select: {
                  id: true,
                  title: true
                }
              }
            },

            orderBy: {
              createdAt: "desc"
            },

            take: 10
          },

          _count: {
            select: {
              products: true,
              reviewsReceived: true
            }
          }
        }
      });

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "El perfil solicitado no está disponible."
        });
    }

    const ratings =
      user.reviewsReceived
        .map((review) =>
          Number(review.rating)
        )
        .filter(
          (rating) =>
            Number.isFinite(rating)
        );

    const ratingAverage =
      ratings.length > 0
        ? Number(
            (
              ratings.reduce(
                (total, rating) =>
                  total + rating,
                0
              ) / ratings.length
            ).toFixed(1)
          )
        : 0;

    const {
      _count,
      ...safeProfile
    } = user;

    return res
      .status(200)
      .json({
        success: true,

        profile: {
          ...safeProfile,

          stats: {
            products:
              Number(
                _count?.products || 0
              ),

            reviews:
              Number(
                _count
                  ?.reviewsReceived ||
                  0
              ),

            ratingAverage,

            completedPurchases:
              Number(
                user
                  .completedPurchases ||
                  0
              ),

            completedSales:
              Number(
                user
                  .completedSales ||
                  0
              )
          }
        }
      });
  } catch (error) {
    console.error(
      "Error obteniendo perfil público:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo obtener el perfil público.",
        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message
      });
  }
}

module.exports = {
  getMe,
  getPublicProfile,
  updateMe,
  updateProfilePhoto,
  deleteProfilePhoto
};
