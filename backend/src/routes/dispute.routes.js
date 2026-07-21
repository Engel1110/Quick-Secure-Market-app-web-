const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const {
  createDispute,
  getMyDisputes,
  getDisputeById,
  getDisputesSummary,
  getAllDisputes,
  addDisputeMessage,
  updateDisputeStatus,
  resolveDispute
} = require("../controllers/dispute.controller");

/*
|--------------------------------------------------------------------------
| Crear y consultar disputas del usuario
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authMiddleware,
  createDispute
);

router.get(
  "/",
  authMiddleware,
  getMyDisputes
);

/*
|--------------------------------------------------------------------------
| Alias compatible con la ruta anterior
|--------------------------------------------------------------------------
*/

router.get(
  "/my-disputes",
  authMiddleware,
  getMyDisputes
);

/*
|--------------------------------------------------------------------------
| Resumen para Dashboard
|--------------------------------------------------------------------------
| Esta ruta debe estar antes de /:disputeId.
|--------------------------------------------------------------------------
*/

router.get(
  "/summary",
  authMiddleware,
  getDisputesSummary
);

/*
|--------------------------------------------------------------------------
| Administración
|--------------------------------------------------------------------------
| Estas rutas también deben estar antes de /:disputeId.
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/all",
  authMiddleware,
  requireRole(
    "SUPER_ADMIN",
    "SENIOR_ADMIN",
    "ADMIN",
    "AUDITOR"
  ),
  getAllDisputes
);

router.put(
  "/admin/:disputeId/resolve",
  authMiddleware,
  requireRole(
    "SUPER_ADMIN",
    "SENIOR_ADMIN",
    "ADMIN"
  ),
  resolveDispute
);

/*
|--------------------------------------------------------------------------
| Detalle, mensajes y estados
|--------------------------------------------------------------------------
*/

router.get(
  "/:disputeId",
  authMiddleware,
  getDisputeById
);

router.post(
  "/:disputeId/messages",
  authMiddleware,
  addDisputeMessage
);

router.patch(
  "/:disputeId/status",
  authMiddleware,
  updateDisputeStatus
);

module.exports = router;