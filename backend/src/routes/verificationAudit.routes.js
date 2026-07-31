const express = require("express");

const verificationAuditController = require(
  "../controllers/verificationAudit.controller"
);

const protect = require(
  "../middleware/auth.middleware"
);

const router = express.Router();

const ADMIN_ROLES = Object.freeze([
  "SUPER_ADMIN",
  "ADMIN",
  "KYC_ADMIN",
  "VERIFICATION_AGENT",
  "AUDITOR"
]);

let externalRoleMiddleware = null;

try {
  externalRoleMiddleware = require(
    "../middleware/role.middleware"
  );
} catch (error) {
  externalRoleMiddleware = null;
}

/**
 * Obtiene el rol del usuario autenticado.
 */
function getAuthenticatedRole(req) {
  return String(
    req.user?.role ||
      req.admin?.role ||
      req.auth?.role ||
      ""
  )
    .trim()
    .toUpperCase();
}

/**
 * Middleware interno de autorización por roles.
 * Se utiliza como respaldo cuando el proyecto no posee
 * un middleware de roles compatible.
 */
function authorizeRoles(...allowedRoles) {
  const normalizedRoles = allowedRoles.map((role) =>
    String(role).toUpperCase()
  );

  return (req, res, next) => {
    const role = getAuthenticatedRole(req);

    if (!role) {
      return res.status(401).json({
        success: false,
        message:
          "No fue posible identificar el rol del usuario autenticado.",
        data: null
      });
    }

    if (!normalizedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para realizar esta acción.",
        data: null
      });
    }

    return next();
  };
}

/**
 * Intenta utilizar el middleware de roles existente
 * del proyecto y, si no es compatible, utiliza
 * el middleware interno.
 */
function resolveRoleMiddleware(...roles) {
  if (!externalRoleMiddleware) {
    return authorizeRoles(...roles);
  }

  if (
    typeof externalRoleMiddleware === "function"
  ) {
    try {
      return externalRoleMiddleware(...roles);
    } catch (error) {
      return authorizeRoles(...roles);
    }
  }

  const candidate =
    externalRoleMiddleware.authorizeRoles ||
    externalRoleMiddleware.requireRole ||
    externalRoleMiddleware.allowRoles ||
    externalRoleMiddleware.checkRole ||
    externalRoleMiddleware.restrictTo;

  if (typeof candidate === "function") {
    try {
      return candidate(...roles);
    } catch (error) {
      return authorizeRoles(...roles);
    }
  }

  return authorizeRoles(...roles);
}

const allowAuditAccess =
  resolveRoleMiddleware(...ADMIN_ROLES);

const allowSuperAdmin =
  resolveRoleMiddleware("SUPER_ADMIN");

/**
 * Todas las rutas de auditoría requieren autenticación.
 */
router.use(protect);

/**
 * Obtiene estadísticas generales de auditoría KYC.
 *
 * GET /api/verifications/admin/audit/statistics
 */
router.get(
  "/admin/audit/statistics",
  allowAuditAccess,
  verificationAuditController.getAuditStatistics
);

/**
 * Obtiene el historial KYC completo de un usuario.
 *
 * GET /api/verifications/admin/users/:userId/history
 */
router.get(
  "/admin/users/:userId/history",
  allowAuditAccess,
  verificationAuditController.getUserVerificationHistory
);

/**
 * Elimina un registro de auditoría.
 * Disponible exclusivamente para SUPER_ADMIN.
 *
 * DELETE /api/verifications/admin/audit/:auditId
 */
router.delete(
  "/admin/audit/:auditId",
  allowSuperAdmin,
  verificationAuditController.deleteAuditEntry
);

/**
 * Obtiene el historial de una verificación específica.
 *
 * GET /api/verifications/admin/:verificationId/history
 */
router.get(
  "/admin/:verificationId/history",
  allowAuditAccess,
  verificationAuditController.getVerificationHistory
);

/**
 * Crea un registro manual de auditoría
 * para una verificación específica.
 *
 * POST /api/verifications/admin/:verificationId/history
 */
router.post(
  "/admin/:verificationId/history",
  allowAuditAccess,
  verificationAuditController.createAuditEntry
);

module.exports = router;