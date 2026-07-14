const express = require("express");

const router = express.Router();

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const requirePermission = require(
  "../middleware/requirePermission"
);

const {
  getInternalUsers,
  getInternalUserById,
  createInternalUser,
  updateInternalUser,
  changeInternalUserStatus,
  changeInternalUserRole,
  assignInternalUserPermissions,
  resetInternalUserPassword,
  getInternalUserActivity
} = require(
  "../controllers/adminUser.controller"
);

/*
|--------------------------------------------------------------------------
| Todas las rutas requieren sesión administrativa
|--------------------------------------------------------------------------
*/

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| Listar usuarios internos
|--------------------------------------------------------------------------
| GET /api/admin/internal-users
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  requirePermission(
    "INTERNAL_USERS_VIEW"
  ),
  getInternalUsers
);

/*
|--------------------------------------------------------------------------
| Crear usuario interno
|--------------------------------------------------------------------------
| POST /api/admin/internal-users
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  requirePermission(
    "INTERNAL_USERS_CREATE"
  ),
  createInternalUser
);

/*
|--------------------------------------------------------------------------
| Obtener actividad de un empleado
|--------------------------------------------------------------------------
| Debe ir antes de /:userId para evitar conflictos.
|--------------------------------------------------------------------------
| GET /api/admin/internal-users/:userId/activity
|--------------------------------------------------------------------------
*/

router.get(
  "/:userId/activity",
  requirePermission(
    "INTERNAL_USERS_VIEW_ACTIVITY"
  ),
  getInternalUserActivity
);

/*
|--------------------------------------------------------------------------
| Restablecer contraseña
|--------------------------------------------------------------------------
| POST /api/admin/internal-users/:userId/reset-password
|--------------------------------------------------------------------------
*/

router.post(
  "/:userId/reset-password",
  requirePermission(
    "INTERNAL_USERS_RESET_PASSWORD"
  ),
  resetInternalUserPassword
);

/*
|--------------------------------------------------------------------------
| Cambiar estado
|--------------------------------------------------------------------------
| PATCH /api/admin/internal-users/:userId/status
|--------------------------------------------------------------------------
*/

router.patch(
  "/:userId/suspend",
  requirePermission(
    "INTERNAL_USERS_SUSPEND"
  ),
  (req, res, next) => {
    req.body.status = "SUSPENDED";
    next();
  },
  changeInternalUserStatus
);

router.patch(
  "/:userId/activate",
  requirePermission(
    "INTERNAL_USERS_ACTIVATE"
  ),
  (req, res, next) => {
    req.body.status = "ACTIVE";
    next();
  },
  changeInternalUserStatus
);
router.patch(
  "/:userId/deactivate",
  requirePermission(
    "INTERNAL_USERS_SUSPEND"
  ),
  (req, res, next) => {
    req.body.status = "PENDING";
    next();
  },
  changeInternalUserStatus
);

/*
|--------------------------------------------------------------------------
| Cambiar rol y departamento
|--------------------------------------------------------------------------
| PATCH /api/admin/internal-users/:userId/role
|--------------------------------------------------------------------------
*/

router.patch(
  "/:userId/role",
  requirePermission(
    "INTERNAL_USERS_CHANGE_ROLE"
  ),
  changeInternalUserRole
);

/*
|--------------------------------------------------------------------------
| Asignar permisos específicos
|--------------------------------------------------------------------------
| PATCH /api/admin/internal-users/:userId/permissions
|--------------------------------------------------------------------------
*/

router.patch(
  "/:userId/permissions",
  requirePermission(
    "INTERNAL_USERS_ASSIGN_PERMISSIONS"
  ),
  assignInternalUserPermissions
);

/*
|--------------------------------------------------------------------------
| Obtener usuario interno específico
|--------------------------------------------------------------------------
| GET /api/admin/internal-users/:userId
|--------------------------------------------------------------------------
*/

router.get(
  "/:userId",
  requirePermission(
    "INTERNAL_USERS_VIEW"
  ),
  getInternalUserById
);

/*
|--------------------------------------------------------------------------
| Editar información del usuario
|--------------------------------------------------------------------------
| PATCH /api/admin/internal-users/:userId
|--------------------------------------------------------------------------
*/

router.patch(
  "/:userId",
  requirePermission(
    "INTERNAL_USERS_UPDATE"
  ),
  updateInternalUser
);

module.exports = router;