"use strict";

const prisma = require("../utils/prisma");
const {
  createNotification
} = require("../services/notification.service");

const ADMIN_ROLES = new Set([
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SUPERVISOR",
  "VERIFICATION_MANAGER",
  "VERIFICATION_AGENT"
]);

const MANAGER_ROLES = new Set([
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "VERIFICATION_MANAGER"
]);

const REVIEW_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "documentType",
  "documentNumber",
  "birthDate",
  "gender",
  "address",
  "city",
  "province",
  "profilePhoto",
  "documentFront",
  "documentBack",
  "selfie"
];

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  department: true,
  accountType: true,
  status: true,
  buyerEnabled: true,
  sellerEnabled: true,
  isVerified: true,
  verificationStatus: true,
  trustScore: true,
  profilePhoto: true,
  pendingProfilePhoto: true,
  registrationCompleted: true,
  registrationCompletedAt: true
};

const REVIEWER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  department: true
};

const normalizeUpper = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const getActor = (req) =>
  req.prismaUser ||
  req.user ||
  {};

const getActorId = (req) => {
  const id = Number(
    getActor(req).id
  );

  return Number.isSafeInteger(id) &&
    id > 0
    ? id
    : null;
};

const hasAccess = (
  req,
  managerOnly = false
) => {
  const actor =
    getActor(req);

  const role =
    normalizeUpper(
      actor.role
    );

  const permissions =
    Array.isArray(
      actor.permissions
    )
      ? actor.permissions.map(
          normalizeUpper
        )
      : [];

  if (
    permissions.includes("*")
  ) {
    return true;
  }

  return managerOnly
    ? MANAGER_ROLES.has(role)
    : ADMIN_ROLES.has(role);
};

const parseId = (value) => {
  const id = Number(value);

  return Number.isSafeInteger(id) &&
    id > 0
    ? id
    : null;
};

const asObject = (value) => {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return {
      ...value
    };
  }

  return {};
};

const getReason = (req) =>
  String(
    req.body?.reason ||
    req.body?.rejectionReason ||
    req.body?.message ||
    req.body?.issues?.[0]?.message ||
    ""
  ).trim();

const findVerification = async (
  rawId,
  res
) => {
  const id =
    parseId(rawId);

  if (!id) {
    res.status(400).json({
      success: false,
      message:
        "Identificador de verificación inválido."
    });

    return null;
  }

  const verification =
    await prisma.kycVerification.findUnique({
      where: {
        id
      },

      include: {
        user: {
          select:
            USER_SELECT
        },

        reviewedBy: {
          select:
            REVIEWER_SELECT
        }
      }
    });

  if (!verification) {
    res.status(404).json({
      success: false,
      message:
        "Verificación no encontrada."
    });

    return null;
  }

  return verification;
};

const notifyUser = async (
  userId,
  type,
  title,
  message
) => {
  try {
    await createNotification(
      userId,
      type,
      title,
      message
    );
  } catch (error) {
    console.warn(
      "Notificación KYC omitida:",
      error.message
    );
  }
};

const getAllVerifications = async (
  req,
  res
) => {
  try {
    if (!hasAccess(req)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para consultar verificaciones."
      });
    }

    const page =
      Math.max(
        Number(req.query.page) || 1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(req.query.limit) || 20,
          1
        ),
        100
      );

    const status =
      normalizeUpper(
        req.query.status
      );

    const documentType =
      normalizeUpper(
        req.query.documentType
      );

    const search =
      String(
        req.query.search || ""
      ).trim();

    const where = {};

    if (status) {
      where.status =
        status;
    }

    if (documentType) {
      where.documentType =
        documentType;
    }

    if (search) {
      where.OR = [
        {
          reference: {
            contains:
              search,
            mode:
              "insensitive"
          }
        },
        {
          firstName: {
            contains:
              search,
            mode:
              "insensitive"
          }
        },
        {
          lastName: {
            contains:
              search,
            mode:
              "insensitive"
          }
        },
        {
          phone: {
            contains:
              search,
            mode:
              "insensitive"
          }
        },
        {
          documentNumber: {
            contains:
              search,
            mode:
              "insensitive"
          }
        },
        {
          user: {
            is: {
              email: {
                contains:
                  search,
                mode:
                  "insensitive"
              }
            }
          }
        }
      ];
    }

    const [
      verifications,
      total
    ] =
      await Promise.all([
        prisma.kycVerification.findMany({
          where,

          include: {
            user: {
              select:
                USER_SELECT
            },

            reviewedBy: {
              select:
                REVIEWER_SELECT
            }
          },

          orderBy: [
            {
              submittedAt:
                "desc"
            },
            {
              createdAt:
                "desc"
            }
          ],

          skip:
            (
              page - 1
            ) * limit,

          take:
            limit
        }),

        prisma.kycVerification.count({
          where
        })
      ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages:
        Math.ceil(
          total / limit
        ),
      data:
        verifications,
      verifications
    });
  } catch (error) {
    console.error(
      "getAllVerifications Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudieron obtener las verificaciones."
    });
  }
};

const getVerificationStats = async (
  req,
  res
) => {
  try {
    if (!hasAccess(req)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para consultar estadísticas."
      });
    }

    const startOfToday =
      new Date();

    startOfToday.setHours(
      0,
      0,
      0,
      0
    );

    const [
      grouped,
      approvedToday,
      rejectedToday
    ] =
      await Promise.all([
        prisma.kycVerification.groupBy({
          by: [
            "status"
          ],

          _count: {
            _all:
              true
          }
        }),

        prisma.kycVerification.count({
          where: {
            status:
              "APPROVED",

            approvedAt: {
              gte:
                startOfToday
            }
          }
        }),

        prisma.kycVerification.count({
          where: {
            status:
              "REJECTED",

            rejectedAt: {
              gte:
                startOfToday
            }
          }
        })
      ]);

    const totals = {};

    grouped.forEach((item) => {
      totals[item.status] =
        item._count._all;
    });

    const approved =
      totals.APPROVED || 0;

    const rejected =
      totals.REJECTED || 0;

    const decided =
      approved + rejected;

    const stats = {
      pending:
        (
          totals.PENDING_REVIEW ||
          0
        ) +
        (
          totals.PENDING ||
          0
        ),

      underReview:
        totals.UNDER_REVIEW ||
        0,

      resubmissionRequired:
        totals.RESUBMISSION_REQUIRED ||
        0,

      approvedToday,

      rejectedToday,

      expiredDocuments:
        totals.EXPIRED ||
        0,

      sellerRequests:
        (
          totals.PENDING_REVIEW ||
          0
        ) +
        (
          totals.UNDER_REVIEW ||
          0
        ),

      approvalRate:
        decided > 0
          ? Math.round(
              approved /
              decided *
              100
            )
          : 0
    };

    return res.status(200).json({
      success: true,
      data:
        stats,
      stats,
      ...stats
    });
  } catch (error) {
    console.error(
      "getVerificationStats Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudieron obtener las estadísticas."
    });
  }
};

const getVerificationById = async (
  req,
  res
) => {
  try {
    if (!hasAccess(req)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para consultar esta verificación."
      });
    }

    const verification =
      await findVerification(
        req.params.id,
        res
      );

    if (!verification) {
      return;
    }

    return res.status(200).json({
      success: true,
      data:
        verification,
      verification
    });
  } catch (error) {
    console.error(
      "getVerificationById Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo obtener la verificación."
    });
  }
};

const startVerificationReview = async (
  req,
  res
) => {
  try {
    if (!hasAccess(req)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para iniciar revisiones."
      });
    }

    const reviewerId =
      getActorId(req);

    const current =
      await findVerification(
        req.params.id,
        res
      );

    if (!current) {
      return;
    }

    if (
      current.status ===
      "UNDER_REVIEW"
    ) {
      return res.status(200).json({
        success: true,
        alreadyUnderReview:
          true,
        message:
          "La verificaci\u00f3n ya se encuentra en revisi\u00f3n.",
        verification:
          current
      });
    }

    if (
      current.status ===
      "APPROVED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La verificación aprobada debe reabrirse primero."
      });
    }

    const now =
      new Date();

    const verification =
      await prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.kycVerification.update({
              where: {
                id:
                  current.id
              },

              data: {
                status:
                  "UNDER_REVIEW",

                reviewedById:
                  reviewerId,

                reviewStartedAt:
                  now,

                reviewedAt:
                  null
              },

              include: {
                user: {
                  select:
                    USER_SELECT
                },

                reviewedBy: {
                  select:
                    REVIEWER_SELECT
                }
              }
            });

          await tx.user.update({
            where: {
              id:
                current.userId
            },

            data: {
              verificationStatus:
                "UNDER_REVIEW",

              onboardingStatus:
                "VERIFICATION_PENDING",

              identityReviewStartedAt:
                now,

              identityReviewedById:
                reviewerId,

              isVerified:
                false,

              sellerEnabled:
                false
            }
          });

          return updated;
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Revisión iniciada correctamente.",
      verification
    });
  } catch (error) {
    console.error(
      "startVerificationReview Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo iniciar la revisión."
    });
  }
};

const approveVerificationField = async (
  req,
  res
) => {
  try {
    if (!hasAccess(req)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para aprobar campos."
      });
    }

    const field =
      String(
        req.params.field || ""
      ).trim();

    if (
      !REVIEW_FIELDS.includes(
        field
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Campo de verificación inválido."
      });
    }

    const current =
      await findVerification(
        req.params.id,
        res
      );

    if (!current) {
      return;
    }

    const fieldStatuses =
      asObject(
        current.fieldStatuses
      );

    const fieldReasons =
      asObject(
        current.fieldReasons
      );

    fieldStatuses[field] =
      "APPROVED";

    delete fieldReasons[field];

    const verification =
      await prisma.kycVerification.update({
        where: {
          id:
            current.id
        },

        data: {
          fieldStatuses,
          fieldReasons,

          status:
            current.status ===
            "PENDING_REVIEW"
              ? "UNDER_REVIEW"
              : current.status,

          reviewedById:
            getActorId(req),

          reviewStartedAt:
            current.reviewStartedAt ||
            new Date()
        },

        include: {
          user: {
            select:
              USER_SELECT
          },

          reviewedBy: {
            select:
              REVIEWER_SELECT
          }
        }
      });

    return res.status(200).json({
      success: true,
      message:
        "Campo aprobado correctamente.",
      field,
      verification
    });
  } catch (error) {
    console.error(
      "approveVerificationField Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo aprobar el campo."
    });
  }
};

const rejectVerificationField = async (
  req,
  res
) => {
  try {
    if (!hasAccess(req)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para rechazar campos."
      });
    }

    const field =
      String(
        req.params.field || ""
      ).trim();

    const reason =
      getReason(req);

    if (
      !REVIEW_FIELDS.includes(
        field
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Campo de verificación inválido."
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar el motivo de la corrección."
      });
    }

    const current =
      await findVerification(
        req.params.id,
        res
      );

    if (!current) {
      return;
    }

    const fieldStatuses =
      asObject(
        current.fieldStatuses
      );

    const fieldReasons =
      asObject(
        current.fieldReasons
      );

    fieldStatuses[field] =
      "REJECTED";

    fieldReasons[field] =
      reason;

    const now =
      new Date();

    const verification =
      await prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.kycVerification.update({
              where: {
                id:
                  current.id
              },

              data: {
                status:
                  "RESUBMISSION_REQUIRED",

                fieldStatuses,
                fieldReasons,

                rejectionReason:
                  reason,

                reviewedById:
                  getActorId(req),

                reviewedAt:
                  now
              },

              include: {
                user: {
                  select:
                    USER_SELECT
                },

                reviewedBy: {
                  select:
                    REVIEWER_SELECT
                }
              }
            });

          const userData = {
            verificationStatus:
              "RESUBMISSION_REQUIRED",

            onboardingStatus:
              "CORRECTION_REQUIRED",

            identityRejectionReason:
              reason,

            identityReviewedAt:
              now,

            identityReviewedById:
              getActorId(req),

            isVerified:
              false,

            sellerEnabled:
              false
          };

          if (
            field ===
            "profilePhoto"
          ) {
            userData.profilePhotoStatus =
              "RESUBMISSION_REQUIRED";

            userData.profilePhotoRejectedReason =
              reason;

            userData.profilePhotoApprovedAt =
              null;

            userData.profilePhotoApprovedById =
              null;
          }

          await tx.user.update({
            where: {
              id:
                current.userId
            },

            data:
              userData
          });

          return updated;
        }
      );

    await notifyUser(
      current.userId,
      "VERIFICATION_CORRECTION_REQUIRED",
      "Corrección requerida",
      "Debes corregir " +
        field +
        ": " +
        reason
    );

    return res.status(200).json({
      success: true,
      message:
        "Campo rechazado. El usuario deberá corregirlo.",
      field,
      verification
    });
  } catch (error) {
    console.error(
      "rejectVerificationField Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo rechazar el campo."
    });
  }
};

const approveVerification = async (
  req,
  res
) => {
  try {
    if (!hasAccess(req)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para aprobar verificaciones."
      });
    }

    const current =
      await findVerification(
        req.params.id,
        res
      );

    if (!current) {
      return;
    }

    if (
      current.status ===
      "APPROVED"
    ) {
      return res.status(200).json({
        success: true,
        alreadyApproved:
          true,
        message:
          "La verificaci\u00f3n ya estaba aprobada.",
        verification:
          current,
        user:
          current.user
      });
    }

    const requiredValues = [
      current.firstName,
      current.lastName,
      current.phone,
      current.documentType,
      current.documentNumber,
      current.birthDate,
      current.address,
      current.city,
      current.province,
      current.profilePhotoUrl,
      current.documentFrontUrl,
      current.documentBackUrl,
      current.selfieUrl
    ];

    if (
      requiredValues.some(
        (value) => !value
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Existen datos o documentos faltantes."
      });
    }

    const reviewerId =
      getActorId(req);

    const notes =
      String(
        req.body?.notes || ""
      ).trim();

    const now =
      new Date();

    const trustScore =
      Math.max(
        Number(
          current.trustScore || 50
        ),
        85
      );

    const fieldStatuses = {};

    REVIEW_FIELDS.forEach(
      (field) => {
        fieldStatuses[field] =
          "APPROVED";
      }
    );

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
                  "APPROVED",

                fieldStatuses,

                fieldReasons:
                  {},

                rejectionReason:
                  "",

                reviewNotes:
                  notes,

                trustScore,

                reviewedById:
                  reviewerId,

                reviewedAt:
                  now,

                approvedAt:
                  now,

                rejectedAt:
                  null
              },

              include: {
                user: {
                  select:
                    USER_SELECT
                },

                reviewedBy: {
                  select:
                    REVIEWER_SELECT
                }
              }
            });

          const user =
            await tx.user.update({
              where: {
                id:
                  current.userId
              },

              data: {
                firstName:
                  current.firstName,

                lastName:
                  current.lastName,

                phone:
                  current.phone,

                documentType:
                  current.documentType,

                documentId:
                  current.documentNumber,

                dateOfBirth:
                  current.birthDate,

                gender:
                  current.gender,

                address:
                  current.address,

                city:
                  current.city,

                province:
                  current.province,

                country:
                  current.country,

                profilePhoto:
                  current.profilePhotoUrl,

                pendingProfilePhoto:
                  "",

                profilePhotoStatus:
                  "APPROVED",

                profilePhotoRejectedReason:
                  "",

                profilePhotoApprovedAt:
                  now,

                profilePhotoApprovedById:
                  reviewerId,

                verificationStatus:
                  "APPROVED",

                onboardingStatus:
                  "VERIFIED",

                registrationCompleted:
                  true,

                registrationCompletedAt:
                  current.user
                    .registrationCompletedAt ||
                  now,

                isVerified:
                  true,

                identityLevel:
                  "VERIFIED",

                identityReviewedAt:
                  now,

                identityReviewedById:
                  reviewerId,

                identityRejectionReason:
                  "",

                verifiedAt:
                  now,

                verifiedById:
                  reviewerId,

                verificationNotes:
                  notes,

                buyerEnabled:
                  true,

                sellerEnabled:
                  true,

                trustScore,

                status:
                  "ACTIVE"
              }
            });

          return {
            verification,
            user
          };
        }
      );

    await notifyUser(
      current.userId,
      "VERIFICATION_APPROVED",
      "Verificación aprobada",
      "Tu identidad fue aprobada. Ya puedes publicar y vender productos."
    );

    return res.status(200).json({
      success: true,
      message:
        "Verificación aprobada. El usuario ya puede vender.",
      verification:
        result.verification,
      user:
        result.user
    });
  } catch (error) {
    console.error(
      "approveVerification Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo aprobar la verificación."
    });
  }
};

const rejectVerification = async (
  req,
  res
) => {
  try {
    if (!hasAccess(req)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para rechazar verificaciones."
      });
    }

    const reason =
      getReason(req);

    if (!reason) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar el motivo del rechazo."
      });
    }

    const current =
      await findVerification(
        req.params.id,
        res
      );

    if (!current) {
      return;
    }

    if (
      current.status ===
      "REJECTED"
    ) {
      return res.status(200).json({
        success: true,
        alreadyRejected:
          true,
        message:
          "La verificaci\u00f3n ya estaba rechazada.",
        verification:
          current
      });
    }

    const now =
      new Date();

    const fieldReasons =
      asObject(
        current.fieldReasons
      );

    fieldReasons.GENERAL =
      reason;

    const verification =
      await prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.kycVerification.update({
              where: {
                id:
                  current.id
              },

              data: {
                status:
                  "REJECTED",

                fieldReasons,

                rejectionReason:
                  reason,

                reviewedById:
                  getActorId(req),

                reviewedAt:
                  now,

                rejectedAt:
                  now,

                approvedAt:
                  null
              },

              include: {
                user: {
                  select:
                    USER_SELECT
                },

                reviewedBy: {
                  select:
                    REVIEWER_SELECT
                }
              }
            });

          await tx.user.update({
            where: {
              id:
                current.userId
            },

            data: {
              verificationStatus:
                "REJECTED",

              onboardingStatus:
                "CORRECTION_REQUIRED",

              identityRejectionReason:
                reason,

              identityReviewedAt:
                now,

              identityReviewedById:
                getActorId(req),

              isVerified:
                false,

              sellerEnabled:
                false,

              buyerEnabled:
                true
            }
          });

          return updated;
        }
      );

    await notifyUser(
      current.userId,
      "VERIFICATION_REJECTED",
      "Verificación rechazada",
      reason
    );

    return res.status(200).json({
      success: true,
      message:
        "Verificación rechazada correctamente.",
      verification
    });
  } catch (error) {
    console.error(
      "rejectVerification Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo rechazar la verificación."
    });
  }
};

const requestVerificationResubmission = async (
  req,
  res
) => {
  try {
    if (!hasAccess(req)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para solicitar correcciones."
      });
    }

    const reason =
      getReason(req);

    if (!reason) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar qué debe corregir el usuario."
      });
    }

    const current =
      await findVerification(
        req.params.id,
        res
      );

    if (!current) {
      return;
    }

    if (
      current.status ===
      "RESUBMISSION_REQUIRED"
    ) {
      return res.status(200).json({
        success: true,
        alreadyRequiresResubmission:
          true,
        message:
          "La correcci\u00f3n ya fue solicitada.",
        verification:
          current
      });
    }

    const now =
      new Date();

    const fieldReasons =
      asObject(
        current.fieldReasons
      );

    fieldReasons.GENERAL =
      reason;

    const verification =
      await prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.kycVerification.update({
              where: {
                id:
                  current.id
              },

              data: {
                status:
                  "RESUBMISSION_REQUIRED",

                fieldReasons,

                rejectionReason:
                  reason,

                reviewedById:
                  getActorId(req),

                reviewedAt:
                  now
              },

              include: {
                user: {
                  select:
                    USER_SELECT
                },

                reviewedBy: {
                  select:
                    REVIEWER_SELECT
                }
              }
            });

          await tx.user.update({
            where: {
              id:
                current.userId
            },

            data: {
              verificationStatus:
                "RESUBMISSION_REQUIRED",

              onboardingStatus:
                "CORRECTION_REQUIRED",

              identityRejectionReason:
                reason,

              identityReviewedAt:
                now,

              identityReviewedById:
                getActorId(req),

              isVerified:
                false,

              sellerEnabled:
                false,

              buyerEnabled:
                true
            }
          });

          return updated;
        }
      );

    await notifyUser(
      current.userId,
      "VERIFICATION_CORRECTION_REQUIRED",
      "Correcciones requeridas",
      reason
    );

    return res.status(200).json({
      success: true,
      message:
        "Se solicitó una corrección al usuario.",
      verification
    });
  } catch (error) {
    console.error(
      "requestVerificationResubmission Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo solicitar la corrección."
    });
  }
};

const reopenVerification = async (
  req,
  res
) => {
  try {
    if (
      !hasAccess(
        req,
        true
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo un administrador superior puede reabrir verificaciones."
      });
    }

    const reason =
      getReason(req);

    if (!reason) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar el motivo para reabrir."
      });
    }

    const current =
      await findVerification(
        req.params.id,
        res
      );

    if (!current) {
      return;
    }

    const now =
      new Date();

    const verification =
      await prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.kycVerification.update({
              where: {
                id:
                  current.id
              },

              data: {
                status:
                  "UNDER_REVIEW",

                rejectionReason:
                  reason,

                reviewedById:
                  getActorId(req),

                reviewStartedAt:
                  now,

                reviewedAt:
                  null,

                approvedAt:
                  null,

                rejectedAt:
                  null
              },

              include: {
                user: {
                  select:
                    USER_SELECT
                },

                reviewedBy: {
                  select:
                    REVIEWER_SELECT
                }
              }
            });

          await tx.user.update({
            where: {
              id:
                current.userId
            },

            data: {
              verificationStatus:
                "UNDER_REVIEW",

              onboardingStatus:
                "VERIFICATION_PENDING",

              isVerified:
                false,

              sellerEnabled:
                false,

              identityReviewStartedAt:
                now,

              identityReviewedById:
                getActorId(req)
            }
          });

          return updated;
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Verificación reabierta correctamente.",
      verification
    });
  } catch (error) {
    console.error(
      "reopenVerification Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo reabrir la verificación."
    });
  }
};

const reviewVerification = async (
  req,
  res
) => {
  const status =
    normalizeUpper(
      req.body?.status
    );

  if (
    status ===
    "APPROVED"
  ) {
    return approveVerification(
      req,
      res
    );
  }

  if (
    status ===
    "REJECTED"
  ) {
    return rejectVerification(
      req,
      res
    );
  }

  if (
    status ===
    "UNDER_REVIEW"
  ) {
    return startVerificationReview(
      req,
      res
    );
  }

  if (
    [
      "RESUBMISSION_REQUIRED",
      "NEEDS_REVIEW"
    ].includes(status)
  ) {
    return requestVerificationResubmission(
      req,
      res
    );
  }

  return res.status(400).json({
    success: false,
    message:
      "Estado de revisión inválido."
  });
};

module.exports = {
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
};
