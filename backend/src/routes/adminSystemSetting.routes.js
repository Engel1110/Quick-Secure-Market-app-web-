const express = require(
  "express"
);

const rateLimit = require(
  "express-rate-limit"
);

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const requirePermission = require(
  "../middleware/requirePermission"
);

const {
  getSystemSettings,
  updateSystemSettings,
  resetSystemSettings,
  getSystemStatus
} = require(
  "../controllers/adminSystemSetting.controller"
);

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Límites de seguridad
|--------------------------------------------------------------------------
*/

const updateSystemSettingsLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max:
      process.env.NODE_ENV ===
      "production"
        ? 50
        : 300,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      success: false,
      message:
        "Demasiadas actualizaciones de configuración. Intenta nuevamente más tarde."
    }
  });

const resetSystemSettingsLimiter =
  rateLimit({
    windowMs:
      60 * 60 * 1000,

    max:
      process.env.NODE_ENV ===
      "production"
        ? 3
        : 30,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      success: false,
      message:
        "Has intentado restaurar la configuración demasiadas veces."
    }
  });

/*
|--------------------------------------------------------------------------
| Todas las rutas requieren autenticación administrativa
|--------------------------------------------------------------------------
*/

router.use(
  authMiddleware
);

/*
|--------------------------------------------------------------------------
| GET /api/admin/system-settings/status
|--------------------------------------------------------------------------
*/

router.get(
  "/status",

  requirePermission(
    "SYSTEM_SETTINGS_VIEW"
  ),

  getSystemStatus
);

/*
|--------------------------------------------------------------------------
| GET /api/admin/system-settings
|--------------------------------------------------------------------------
*/

router.get(
  "/",

  requirePermission(
    "SYSTEM_SETTINGS_VIEW"
  ),

  getSystemSettings
);

/*
|--------------------------------------------------------------------------
| PATCH /api/admin/system-settings
|--------------------------------------------------------------------------
*/

router.patch(
  "/",

  updateSystemSettingsLimiter,

  requirePermission(
    "SYSTEM_SETTINGS_UPDATE"
  ),

  updateSystemSettings
);

/*
|--------------------------------------------------------------------------
| POST /api/admin/system-settings/reset
|--------------------------------------------------------------------------
*/

router.post(
  "/reset",

  resetSystemSettingsLimiter,

  requirePermission(
    "SYSTEM_SETTINGS_RESET"
  ),

  resetSystemSettings
);

module.exports = router;