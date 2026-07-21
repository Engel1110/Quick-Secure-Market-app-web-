const express = require(
  "express"
);

const rateLimit = require(
  "express-rate-limit"
);

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  getMySettings,
  updateMySettings,
  resetMySettings
} = require(
  "../controllers/settings.controller"
);

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Límites de seguridad
|--------------------------------------------------------------------------
*/

const updateSettingsLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 100,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Demasiadas actualizaciones de configuración. Intenta nuevamente más tarde."
    }
  });

const resetSettingsLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 10,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Has restaurado la configuración demasiadas veces. Intenta nuevamente más tarde."
    }
  });

/*
|--------------------------------------------------------------------------
| GET /api/settings/me
|--------------------------------------------------------------------------
*/

router.get(
  "/me",
  authMiddleware,
  getMySettings
);

/*
|--------------------------------------------------------------------------
| PUT /api/settings/me
|--------------------------------------------------------------------------
*/

router.put(
  "/me",
  authMiddleware,
  updateSettingsLimiter,
  updateMySettings
);

/*
|--------------------------------------------------------------------------
| POST /api/settings/me/reset
|--------------------------------------------------------------------------
*/

router.post(
  "/me/reset",
  authMiddleware,
  resetSettingsLimiter,
  resetMySettings
);

module.exports = router;