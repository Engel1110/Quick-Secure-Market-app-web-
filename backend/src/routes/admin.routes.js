const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const adminUserRoutes = require(
  "./adminUser.routes"
);

router.use(
  "/internal-users",
  adminUserRoutes
);

const {
  getAdminDashboard,
  getAllUsers,
  getAllProducts,
  suspendUser,
  activateUser,
  disableProduct,
  getAuditLogs,
  updateUserRole,
  resetUserPassword
} = require("../controllers/admin.controller");

router.get(
  "/dashboard",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN", "AUDITOR", "SUPER_ADMIN"),
  getAdminDashboard
);

router.get(
  "/users",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN", "AUDITOR", "SUPER_ADMIN"),
  getAllUsers
);

router.get(
  "/products",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN", "AUDITOR", "SUPER_ADMIN"),
  getAllProducts
);

router.get(
  "/audit-logs",
  authMiddleware,
  requireRole("SENIOR_ADMIN", "AUDITOR", "SUPER_ADMIN"),
  getAuditLogs
);

router.put(
  "/users/:userId/role",
  authMiddleware,
  requireRole("SENIOR_ADMIN", "SUPER_ADMIN"),
  updateUserRole
);

router.put(
  "/users/:userId/reset-password",
  authMiddleware,
  requireRole("SENIOR_ADMIN", "SUPER_ADMIN"),
  resetUserPassword
);

router.put(
  "/users/:userId/suspend",
  authMiddleware,
  requireRole("SENIOR_ADMIN", "SUPER_ADMIN"),
  suspendUser
);

router.put(
  "/users/:userId/activate",
  authMiddleware,
  requireRole("SENIOR_ADMIN", "SUPER_ADMIN"),
  activateUser
);

router.put(
  "/products/:productId/disable",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN", "SUPER_ADMIN"),
  disableProduct
);

module.exports = router;