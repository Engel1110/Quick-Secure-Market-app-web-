"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");

const {
  deletePublicObjectPaths,
  deletePrivateObjectPaths
} = require("../services/storage.service");

const prisma = require("../utils/prisma");
const {
  createNotification
} = require("../services/notification.service");

const UPLOAD_URL =
  "/uploads/verification";

const getUserId = (req) => {
  const value =
    req.prismaUser?.id ??
    req.user?.id;

  const id = Number(value);

  return Number.isSafeInteger(id) &&
    id > 0
    ? id
    : null;
};

const cleanText = (
  value,
  maxLength = 200
) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);

const cleanDocumentNumber = (
  value
) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .slice(0, 40);

const parseBirthDate = (
  value
) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    ) ||
    date >= new Date()
  ) {
    return null;
  }

  return date;
};

const fileUrl = (
  file
) => {
  if (!file) {
    return "";
  }

  if (file.storageRef) {
    return String(
      file.storageRef
    );
  }

  if (file.url) {
    return String(
      file.url
    );
  }

  if (
    file.path &&
    (
      String(file.path).startsWith("http://") ||
      String(file.path).startsWith("https://") ||
      String(file.path).startsWith("qsm-private://")
    )
  ) {
    return String(
      file.path
    );
  }

  if (!file.filename) {
    return "";
  }

  return (
    UPLOAD_URL +
    "/" +
    file.filename
  );
};

const removeNewUploads = async (
  req
) => {
  const publicPaths =
    Array.isArray(
      req.publicUploadedObjectPaths
    )
      ? req.publicUploadedObjectPaths
      : [];

  const privatePaths =
    Array.isArray(
      req.privateUploadedObjectPaths
    )
      ? req.privateUploadedObjectPaths
      : [];

  const cleanupResults =
    await Promise.allSettled([
      deletePublicObjectPaths(
        publicPaths
      ),
      deletePrivateObjectPaths(
        privatePaths
      )
    ]);

  cleanupResults.forEach(
    (result) => {
      if (
        result.status ===
        "rejected"
      ) {
        console.error(
          "No se pudo limpiar archivo de Storage:",
          result.reason?.message ||
          result.reason
        );
      }
    }
  );

  const files = Object.values(
    req.files || {}
  ).flat();

  await Promise.all(
    files.map(
      async (file) => {
        const localPath =
          String(
            file?.path || ""
          );

        if (
          !localPath ||
          localPath.startsWith(
            "http://"
          ) ||
          localPath.startsWith(
            "https://"
          ) ||
          localPath.startsWith(
            "qsm-private://"
          )
        ) {
          return;
        }

        try {
          await fs.promises.unlink(
            localPath
          );
        } catch (error) {
          if (
            error.code !==
            "ENOENT"
          ) {
            console.error(
              "No se pudo limpiar archivo KYC:",
              error.message
            );
          }
        }
      }
    )
  );
};

const createReference = () =>
  "KYC-" +
  Date.now() +
  "-" +
  crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();

const getUserOrFail = async (
  userId,
  res
) => {
  const user =
    await prisma.user.findUnique({
      where: {
        id: userId
      }
    });

  if (!user) {
    res.status(404).json({
      success: false,
      message:
        "El usuario no existe."
    });

    return null;
  }

  return user;
};

const getVerificationOrCreate =
  async (
    user
  ) => {
    const existing =
      await prisma.kycVerification.findUnique({
        where: {
          userId: user.id
        }
      });

    if (existing) {
      return existing;
    }

    return prisma.kycVerification.create({
      data: {
        reference:
          createReference(),

        userId:
          user.id,

        status:
          user.verificationStatus ||
          "NOT_STARTED",

        firstName:
          user.firstName || "",

        lastName:
          user.lastName || "",

        phone:
          user.phone || "",

        documentType:
          user.documentType ||
          "CEDULA",

        documentNumber:
          user.documentId || "",

        address:
          user.address || "",

        city:
          user.city || "",

        province:
          user.province || "",

        country:
          user.country ||
          "Rep?blica Dominicana",

        gender:
          user.gender ||
          "PREFER_NOT_TO_SAY",

        birthDate:
          user.dateOfBirth || null,

        profilePhotoUrl:
          user.pendingProfilePhoto ||
          user.profilePhoto ||
          "",

        documentFrontUrl:
          user.cedulaFront || "",

        documentBackUrl:
          user.cedulaBack || "",

        selfieUrl:
          user.selfie || "",

        fieldStatuses:
          {},

        fieldReasons:
          {},

        trustScore:
          user.trustScore || 50
      }
    });
  };

const getMyVerification = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Sesi?n de usuario inv?lida."
      });
    }

    const user =
      await getUserOrFail(
        userId,
        res
      );

    if (!user) {
      return;
    }

    const verification =
      await getVerificationOrCreate(
        user
      );

    return res.status(200).json({
      success: true,
      verification
    });
  } catch (error) {
    console.error(
      "getMyVerification Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo obtener la verificaci?n."
    });
  }
};

const submitVerification = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      await removeNewUploads(req);

      return res.status(401).json({
        success: false,
        message:
          "Sesi?n de usuario inv?lida."
      });
    }

    const user =
      await getUserOrFail(
        userId,
        res
      );

    if (!user) {
      await removeNewUploads(req);
      return;
    }

    const current =
      await getVerificationOrCreate(
        user
      );

    const blockedStatuses = [
      "PENDING_REVIEW",
      "UNDER_REVIEW",
      "APPROVED"
    ];

    if (
      blockedStatuses.includes(
        current.status
      )
    ) {
      await removeNewUploads(req);

      return res.status(400).json({
        success: false,
        message:
          "Tu verificaci?n ya est? siendo revisada y no puede enviarse nuevamente."
      });
    }

    const firstName =
      cleanText(
        req.body.firstName,
        50
      );

    const lastName =
      cleanText(
        req.body.lastName,
        50
      );

    const phone =
      cleanText(
        req.body.phone,
        20
      );

    const documentType =
      cleanText(
        req.body.documentType,
        30
      ).toUpperCase();

    const documentNumber =
      cleanDocumentNumber(
        req.body.documentNumber
      );

    const address =
      cleanText(
        req.body.address,
        250
      );

    const city =
      cleanText(
        req.body.city,
        100
      );

    const province =
      cleanText(
        req.body.province,
        100
      );

    const country =
      cleanText(
        req.body.country ||
          "Rep?blica Dominicana",
        100
      );

    const gender =
      cleanText(
        req.body.gender,
        30
      ).toUpperCase();

    const birthDate =
      parseBirthDate(
        req.body.birthDate
      );

    const files =
      req.files || {};

    const profilePhotoUrl =
      fileUrl(
        files.profilePhoto?.[0]
      ) ||
      current.profilePhotoUrl;

    const documentFrontUrl =
      fileUrl(
        files.documentFront?.[0]
      ) ||
      current.documentFrontUrl;

    const documentBackUrl =
      fileUrl(
        files.documentBack?.[0]
      ) ||
      current.documentBackUrl;

    const selfieUrl =
      fileUrl(
        files.selfie?.[0]
      ) ||
      current.selfieUrl;

    const missing = [];

    if (!firstName) missing.push("nombre");
    if (!lastName) missing.push("apellido");
    if (!phone) missing.push("tel?fono");
    if (!documentType) {
      missing.push("tipo de documento");
    }
    if (!documentNumber) {
      missing.push("n?mero de documento");
    }
    if (!birthDate) {
      missing.push("fecha de nacimiento");
    }
    if (!gender) missing.push("g?nero");
    if (!address) missing.push("direcci?n");
    if (!city) missing.push("ciudad");
    if (!province) missing.push("provincia");
    if (!profilePhotoUrl) {
      missing.push("foto de perfil");
    }
    if (!documentFrontUrl) {
      missing.push("documento frontal");
    }
    if (!documentBackUrl) {
      missing.push("documento trasero");
    }
    if (!selfieUrl) {
      missing.push("selfie");
    }

    if (missing.length > 0) {
      await removeNewUploads(req);

      return res.status(400).json({
        success: false,
        message:
          "Debes completar: " +
          missing.join(", ") +
          "."
      });
    }

    const duplicateDocument =
      await prisma.user.findFirst({
        where: {
          documentId:
            documentNumber,

          id: {
            not:
              userId
          }
        },

        select: {
          id: true
        }
      });

    if (duplicateDocument) {
      await removeNewUploads(req);

      return res.status(409).json({
        success: false,
        message:
          "Este documento ya est? registrado en otra cuenta."
      });
    }

    const now =
      new Date();

    const isResubmission = [
      "REJECTED",
      "RESUBMISSION_REQUIRED"
    ].includes(
      current.status
    );

    const fieldStatuses = {
      firstName:
        "PENDING",

      lastName:
        "PENDING",

      phone:
        "PENDING",

      documentType:
        "PENDING",

      documentNumber:
        "PENDING",

      birthDate:
        "PENDING",

      gender:
        "PENDING",

      address:
        "PENDING",

      profilePhoto:
        "PENDING",

      documentFront:
        "PENDING",

      documentBack:
        "PENDING",

      selfie:
        "PENDING"
    };

    const result =
      await prisma.$transaction(
        async (tx) => {
          const verification =
            await tx.kycVerification.update({
              where: {
                id:
                  current.id
              },

              data: {
                status:
                  "PENDING_REVIEW",

                firstName,
                lastName,
                phone,
                documentType,
                documentNumber,
                address,
                city,
                province,
                country,
                gender,
                birthDate,

                profilePhotoUrl,
                documentFrontUrl,
                documentBackUrl,
                selfieUrl,

                fieldStatuses,
                fieldReasons:
                  {},

                rejectionReason:
                  "",

                reviewNotes:
                  "",

                trustScore:
                  Math.max(
                    user.trustScore || 50,
                    70
                  ),

                resubmissionCount:
                  current.resubmissionCount +
                  (
                    isResubmission
                      ? 1
                      : 0
                  ),

                submittedAt:
                  now,

                resubmittedAt:
                  isResubmission
                    ? now
                    : current.resubmittedAt,

                reviewStartedAt:
                  null,

                reviewedAt:
                  null,

                reviewedById:
                  null,

                approvedAt:
                  null,

                rejectedAt:
                  null
              }
            });

          const updatedUser =
            await tx.user.update({
              where: {
                id:
                  userId
              },

              data: {
                firstName,
                lastName,
                phone,

                documentType,
                documentId:
                  documentNumber,

                dateOfBirth:
                  birthDate,

                gender,
                address,
                city,
                province,
                country,

                pendingProfilePhoto:
                  profilePhotoUrl,

                profilePhotoStatus:
                  "PENDING",

                profilePhotoRejectedReason:
                  "",

                cedulaFront:
                  documentFrontUrl,

                cedulaBack:
                  documentBackUrl,

                selfie:
                  selfieUrl,

                registrationCompleted:
                  true,

                registrationCompletedAt:
                  user.registrationCompletedAt ||
                  now,

                onboardingStatus:
                  "VERIFICATION_PENDING",

                verificationStatus:
                  "PENDING_REVIEW",

                identitySubmittedAt:
                  now,

                identityReviewStartedAt:
                  null,

                identityReviewedAt:
                  null,

                identityReviewedById:
                  null,

                identityRejectionReason:
                  "",

                isVerified:
                  false,

                buyerEnabled:
                  true,

                sellerEnabled:
                  false,

                trustScore:
                  Math.max(
                    user.trustScore || 50,
                    70
                  ),

                status:
                  "ACTIVE"
              }
            });

          return {
            verification,
            updatedUser
          };
        }
      );

    try {
      await createNotification(
        userId,
        "VERIFICATION_SUBMITTED",
        "Verificaci?n enviada",
        "Recibimos tu informaci?n. El equipo QSM revisar? tus documentos."
      );
    } catch (notificationError) {
      console.warn(
        "No se pudo crear la notificaci?n KYC:",
        notificationError.message
      );
    }

    return res.status(201).json({
      success: true,

      message:
        "Verificaci?n enviada correctamente. Ya puedes acceder como comprador mientras revisamos tu identidad.",

      verification:
        result.verification,

      onboarding: {
        status:
          "VERIFICATION_PENDING",

        registrationCompleted:
          true
      },

      capabilities: {
        canBuy:
          true,

        canSell:
          false
      }
    });
  } catch (error) {
    console.error(
      "submitVerification Prisma:",
      error
    );

    await removeNewUploads(req);

    return res.status(500).json({
      success: false,
      message:
        "No se pudo enviar la verificaci?n."
    });
  }
};

const dailyCheckUnavailable = async (
  _req,
  res
) => {
  return res.status(501).json({
    success: false,
    code:
      "FACE_CHECK_NOT_IMPLEMENTED",
    message:
      "La validaci\u00f3n facial autom\u00e1tica todav\u00eda no est\u00e1 implementada. No se registr\u00f3 ning\u00fan resultado biom\u00e9trico."
  });
};

module.exports = {
  getMyVerification,
  submitVerification,
  dailyCheckUnavailable
};
