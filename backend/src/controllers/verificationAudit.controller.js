const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ALLOWED_ACTIONS = Object.freeze([
  "SUBMITTED",
  "REVIEW_STARTED",
  "FIELD_APPROVED",
  "FIELD_REJECTED",
  "RESUBMISSION_REQUESTED",
  "APPROVED",
  "REJECTED",
  "REOPENED"
]);

const VERIFICATION_STATUSES = Object.freeze([
  "NOT_STARTED",
  "PENDING",
  "PENDING_REVIEW",
  "UNDER_REVIEW",
  "RESUBMISSION_REQUIRED",
  "APPROVED",
  "REJECTED",
  "EXPIRED"
]);

function sendResponse(
  res,
  statusCode,
  success,
  message,
  data = null,
  extra = {}
) {
  return res.status(statusCode).json({
    success,
    message,
    data,
    ...extra
  });
}

function serializePrismaValue(value) {
  return JSON.parse(
    JSON.stringify(value, (_, currentValue) =>
      typeof currentValue === "bigint"
        ? currentValue.toString()
        : currentValue
    )
  );
}

function normalizeId(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numericValue = Number(value);

  if (
    Number.isInteger(numericValue) &&
    numericValue > 0
  ) {
    return numericValue;
  }

  return String(value).trim();
}

function getAuthenticatedUser(req) {
  return (
    req.user ||
    req.admin ||
    req.auth ||
    null
  );
}

function getAuthenticatedUserId(req) {
  const authenticatedUser =
    getAuthenticatedUser(req);

  return normalizeId(
    authenticatedUser?.id ||
      authenticatedUser?.userId ||
      authenticatedUser?.adminId
  );
}

function getAuthenticatedUserRole(req) {
  const authenticatedUser =
    getAuthenticatedUser(req);

  return String(
    authenticatedUser?.role || ""
  ).toUpperCase();
}

function getRequestIp(req) {
  const forwardedFor =
    req.headers["x-forwarded-for"];

  if (forwardedFor) {
    return String(forwardedFor)
      .split(",")[0]
      .trim();
  }

  return (
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    null
  );
}

function getUserAgent(req) {
  return (
    req.headers["user-agent"] ||
    null
  );
}

function validateAction(action) {
  return ALLOWED_ACTIONS.includes(
    String(action || "").toUpperCase()
  );
}

function validateStatus(status) {
  if (
    status === undefined ||
    status === null ||
    status === ""
  ) {
    return true;
  }

  return VERIFICATION_STATUSES.includes(
    String(status).toUpperCase()
  );
}

function buildPagination(query = {}) {
  const requestedPage =
    Number(query.page) || 1;

  const requestedLimit =
    Number(query.limit) || 20;

  const page = Math.max(
    1,
    requestedPage
  );

  const limit = Math.min(
    100,
    Math.max(1, requestedLimit)
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

async function verificationExists(
  verificationId
) {
  const verification =
    await prisma.verification.findUnique({
      where: {
        id: verificationId
      },
      select: {
        id: true,
        userId: true
      }
    });

  return verification;
}

async function userExists(userId) {
  return prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true
    }
  });
}

async function createAuditRecord({
  verificationId,
  userId,
  adminId = null,
  action,
  previousStatus = null,
  newStatus = null,
  reason = null,
  comments = null,
  ipAddress = null,
  userAgent = null
}) {
  const normalizedAction =
    String(action).toUpperCase();

  const normalizedPreviousStatus =
    previousStatus
      ? String(previousStatus).toUpperCase()
      : null;

  const normalizedNewStatus =
    newStatus
      ? String(newStatus).toUpperCase()
      : null;

  return prisma.verificationAudit.create({
    data: {
      verificationId,
      userId,
      adminId,
      action: normalizedAction,
      previousStatus:
        normalizedPreviousStatus,
      newStatus: normalizedNewStatus,
      reason:
        reason?.trim() || null,
      comments:
        comments?.trim() || null,
      ipAddress:
        ipAddress?.trim() || null,
      userAgent:
        userAgent?.trim() || null
    }
  });
}

/**
 * Obtiene el historial completo de una verificación KYC.
 *
 * GET /api/verifications/admin/:verificationId/history
 */
const getVerificationHistory =
  async (req, res) => {
    try {
      const verificationId =
        normalizeId(
          req.params.verificationId ||
            req.params.id
        );

      if (!verificationId) {
        return sendResponse(
          res,
          400,
          false,
          "El identificador de la verificación es obligatorio."
        );
      }

      const verification =
        await verificationExists(
          verificationId
        );

      if (!verification) {
        return sendResponse(
          res,
          404,
          false,
          "La verificación solicitada no existe."
        );
      }

      const {
        page,
        limit,
        skip
      } = buildPagination(req.query);

      const where = {
        verificationId
      };

      const [
        history,
        total
      ] = await Promise.all([
        prisma.verificationAudit.findMany({
          where,
          orderBy: {
            createdAt: "desc"
          },
          skip,
          take: limit
        }),

        prisma.verificationAudit.count({
          where
        })
      ]);

      return sendResponse(
        res,
        200,
        true,
        "Historial de verificación obtenido correctamente.",
        serializePrismaValue(history),
        {
          pagination: {
            page,
            limit,
            total,
            totalPages:
              Math.ceil(total / limit)
          }
        }
      );
    } catch (error) {
      console.error(
        "Error obteniendo historial de verificación:",
        error
      );

      return sendResponse(
        res,
        500,
        false,
        "Ocurrió un error al obtener el historial de verificación."
      );
    }
  };

/**
 * Crea manualmente un registro de auditoría KYC.
 *
 * POST /api/verifications/admin/:verificationId/history
 */
const createAuditEntry =
  async (req, res) => {
    try {
      const verificationId =
        normalizeId(
          req.params.verificationId ||
            req.params.id ||
            req.body.verificationId
        );

      const authenticatedAdminId =
        getAuthenticatedUserId(req);

      const {
        userId: requestedUserId,
        adminId: requestedAdminId,
        action,
        previousStatus,
        newStatus,
        reason,
        comments
      } = req.body || {};

      if (!verificationId) {
        return sendResponse(
          res,
          400,
          false,
          "El identificador de la verificación es obligatorio."
        );
      }

      if (!action) {
        return sendResponse(
          res,
          400,
          false,
          "La acción de auditoría es obligatoria."
        );
      }

      if (!validateAction(action)) {
        return sendResponse(
          res,
          400,
          false,
          "La acción de auditoría no es válida.",
          null,
          {
            allowedActions:
              ALLOWED_ACTIONS
          }
        );
      }

      if (
        !validateStatus(previousStatus) ||
        !validateStatus(newStatus)
      ) {
        return sendResponse(
          res,
          400,
          false,
          "El estado anterior o el estado nuevo no es válido.",
          null,
          {
            allowedStatuses:
              VERIFICATION_STATUSES
          }
        );
      }

      const verification =
        await verificationExists(
          verificationId
        );

      if (!verification) {
        return sendResponse(
          res,
          404,
          false,
          "La verificación indicada no existe."
        );
      }

      const userId =
        normalizeId(requestedUserId) ||
        verification.userId;

      if (!userId) {
        return sendResponse(
          res,
          400,
          false,
          "No fue posible determinar el usuario asociado a la verificación."
        );
      }

      const existingUser =
        await userExists(userId);

      if (!existingUser) {
        return sendResponse(
          res,
          404,
          false,
          "El usuario asociado no existe."
        );
      }

      const requestRole =
        getAuthenticatedUserRole(req);

      const adminId =
        requestRole === "SUPER_ADMIN" &&
        requestedAdminId
          ? normalizeId(
              requestedAdminId
            )
          : authenticatedAdminId;

      const auditEntry =
        await createAuditRecord({
          verificationId,
          userId,
          adminId,
          action,
          previousStatus,
          newStatus,
          reason,
          comments,
          ipAddress:
            getRequestIp(req),
          userAgent:
            getUserAgent(req)
        });

      return sendResponse(
        res,
        201,
        true,
        "Registro de auditoría creado correctamente.",
        serializePrismaValue(
          auditEntry
        )
      );
    } catch (error) {
      console.error(
        "Error creando registro de auditoría:",
        error
      );

      if (
        error.code === "P2003"
      ) {
        return sendResponse(
          res,
          400,
          false,
          "Uno de los registros relacionados no existe."
        );
      }

      return sendResponse(
        res,
        500,
        false,
        "Ocurrió un error al crear el registro de auditoría."
      );
    }
  };

/**
 * Obtiene estadísticas generales de la auditoría KYC.
 *
 * GET /api/verifications/admin/audit/stats
 */
const getAuditStatistics =
  async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        adminId,
        userId,
        verificationId
      } = req.query;

      const where = {};

      if (adminId) {
        where.adminId =
          normalizeId(adminId);
      }

      if (userId) {
        where.userId =
          normalizeId(userId);
      }

      if (verificationId) {
        where.verificationId =
          normalizeId(
            verificationId
          );
      }

      if (
        startDate ||
        endDate
      ) {
        where.createdAt = {};

        if (startDate) {
          const parsedStartDate =
            new Date(startDate);

          if (
            Number.isNaN(
              parsedStartDate.getTime()
            )
          ) {
            return sendResponse(
              res,
              400,
              false,
              "La fecha inicial no es válida."
            );
          }

          where.createdAt.gte =
            parsedStartDate;
        }

        if (endDate) {
          const parsedEndDate =
            new Date(endDate);

          if (
            Number.isNaN(
              parsedEndDate.getTime()
            )
          ) {
            return sendResponse(
              res,
              400,
              false,
              "La fecha final no es válida."
            );
          }

          where.createdAt.lte =
            parsedEndDate;
        }
      }

      const [
        totalEntries,
        groupedByAction,
        recentEntries,
        uniqueAdministrators,
        uniqueUsers
      ] = await Promise.all([
        prisma.verificationAudit.count({
          where
        }),

        prisma.verificationAudit.groupBy({
          by: ["action"],
          where,
          _count: {
            action: true
          },
          orderBy: {
            _count: {
              action: "desc"
            }
          }
        }),

        prisma.verificationAudit.findMany({
          where,
          orderBy: {
            createdAt: "desc"
          },
          take: 10
        }),

        prisma.verificationAudit.findMany({
          where: {
            ...where,
            adminId: {
              not: null
            }
          },
          distinct: ["adminId"],
          select: {
            adminId: true
          }
        }),

        prisma.verificationAudit.findMany({
          where,
          distinct: ["userId"],
          select: {
            userId: true
          }
        })
      ]);

      const actionTotals =
        ALLOWED_ACTIONS.reduce(
          (accumulator, action) => {
            accumulator[action] = 0;
            return accumulator;
          },
          {}
        );

      groupedByAction.forEach(
        (group) => {
          actionTotals[group.action] =
            group._count.action;
        }
      );

      return sendResponse(
        res,
        200,
        true,
        "Estadísticas de auditoría obtenidas correctamente.",
        serializePrismaValue({
          totalEntries,
          totalAdministrators:
            uniqueAdministrators.length,
          totalUsers:
            uniqueUsers.length,
          actions: actionTotals,
          recentEntries
        })
      );
    } catch (error) {
      console.error(
        "Error obteniendo estadísticas de auditoría:",
        error
      );

      return sendResponse(
        res,
        500,
        false,
        "Ocurrió un error al obtener las estadísticas de auditoría."
      );
    }
  };

/**
 * Obtiene el historial KYC de un usuario.
 *
 * GET /api/verifications/admin/users/:userId/history
 */
const getUserVerificationHistory =
  async (req, res) => {
    try {
      const authenticatedUser =
        getAuthenticatedUser(req);

      const authenticatedUserId =
        getAuthenticatedUserId(req);

      const authenticatedRole =
        getAuthenticatedUserRole(req);

      const requestedUserId =
        normalizeId(
          req.params.userId ||
            req.query.userId ||
            authenticatedUserId
        );

      if (!requestedUserId) {
        return sendResponse(
          res,
          400,
          false,
          "El identificador del usuario es obligatorio."
        );
      }

      const privilegedRoles = [
        "SUPER_ADMIN",
        "ADMIN",
        "KYC_ADMIN",
        "VERIFICATION_AGENT",
        "AUDITOR"
      ];

      const isPrivileged =
        privilegedRoles.includes(
          authenticatedRole
        );

      if (
        authenticatedUser &&
        !isPrivileged &&
        String(
          authenticatedUserId
        ) !== String(
          requestedUserId
        )
      ) {
        return sendResponse(
          res,
          403,
          false,
          "No tienes permisos para consultar el historial de otro usuario."
        );
      }

      const existingUser =
        await userExists(
          requestedUserId
        );

      if (!existingUser) {
        return sendResponse(
          res,
          404,
          false,
          "El usuario solicitado no existe."
        );
      }

      const {
        page,
        limit,
        skip
      } = buildPagination(req.query);

      const where = {
        userId: requestedUserId
      };

      const [
        history,
        total
      ] = await Promise.all([
        prisma.verificationAudit.findMany({
          where,
          orderBy: {
            createdAt: "desc"
          },
          skip,
          take: limit
        }),

        prisma.verificationAudit.count({
          where
        })
      ]);

      return sendResponse(
        res,
        200,
        true,
        "Historial de verificación del usuario obtenido correctamente.",
        serializePrismaValue(history),
        {
          pagination: {
            page,
            limit,
            total,
            totalPages:
              Math.ceil(total / limit)
          }
        }
      );
    } catch (error) {
      console.error(
        "Error obteniendo historial KYC del usuario:",
        error
      );

      return sendResponse(
        res,
        500,
        false,
        "Ocurrió un error al obtener el historial de verificación del usuario."
      );
    }
  };

/**
 * Elimina un registro de auditoría.
 * Exclusivo para usuarios SUPER_ADMIN.
 *
 * DELETE /api/verifications/admin/audit/:auditId
 */
const deleteAuditEntry =
  async (req, res) => {
    try {
      const role =
        getAuthenticatedUserRole(req);

      if (
        role !== "SUPER_ADMIN"
      ) {
        return sendResponse(
          res,
          403,
          false,
          "Solo un SUPER_ADMIN puede eliminar registros de auditoría."
        );
      }

      const auditId =
        normalizeId(
          req.params.auditId ||
            req.params.id
        );

      if (!auditId) {
        return sendResponse(
          res,
          400,
          false,
          "El identificador del registro de auditoría es obligatorio."
        );
      }

      const existingEntry =
        await prisma.verificationAudit.findUnique({
          where: {
            id: auditId
          }
        });

      if (!existingEntry) {
        return sendResponse(
          res,
          404,
          false,
          "El registro de auditoría no existe."
        );
      }

      const deletedEntry =
        await prisma.verificationAudit.delete({
          where: {
            id: auditId
          }
        });

      return sendResponse(
        res,
        200,
        true,
        "Registro de auditoría eliminado correctamente.",
        serializePrismaValue(
          deletedEntry
        )
      );
    } catch (error) {
      console.error(
        "Error eliminando registro de auditoría:",
        error
      );

      if (
        error.code === "P2025"
      ) {
        return sendResponse(
          res,
          404,
          false,
          "El registro de auditoría no existe."
        );
      }

      return sendResponse(
        res,
        500,
        false,
        "Ocurrió un error al eliminar el registro de auditoría."
      );
    }
  };

module.exports = {
  getVerificationHistory,
  createAuditEntry,
  getAuditStatistics,
  getUserVerificationHistory,
  deleteAuditEntry,
  createAuditRecord,
  ALLOWED_ACTIONS,
  VERIFICATION_STATUSES
};