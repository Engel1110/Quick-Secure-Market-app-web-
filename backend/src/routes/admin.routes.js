const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const {
  getAdminDashboard,
  getAllUsers,
  getAllProducts,
  suspendUser,
  activateUser,
  disableProduct,
  getAuditLogs,
  updateUserRole
} = require("../controllers/admin.controller");

router.get(
  "/dashboard",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN", "AUDITOR"),
  getAdminDashboard
);

router.get(
  "/users",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN", "AUDITOR"),
  getAllUsers
);

router.get(
  "/products",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN", "AUDITOR"),
  getAllProducts
);

router.get(
  "/audit-logs",
  authMiddleware,
  requireRole("SENIOR_ADMIN", "AUDITOR"),
  getAuditLogs
);

router.put(
  "/users/:userId/role",
  authMiddleware,
  requireRole("SENIOR_ADMIN"),
  updateUserRole
);

router.put(
  "/users/:userId/suspend",
  authMiddleware,
  requireRole("SENIOR_ADMIN"),
  suspendUser
);

router.put(
  "/users/:userId/activate",
  authMiddleware,
  requireRole("SENIOR_ADMIN"),
  activateUser
);

router.put(
  "/products/:productId/disable",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN"),
  disableProduct
);

module.exports = router;