const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const {
  register,
  login,
  adminLogin,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword
} = require(
  "../controllers/auth.controller"
);

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const forgotPasswordLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message:
        "Demasiadas solicitudes de recuperación. Intenta nuevamente en 15 minutos."
    }
  });

const adminLoginLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message:
        "Demasiados intentos de acceso administrativo. Espera 15 minutos."
    }
  });

router.post(
  "/register",
  register
);

router.post(
  "/login",
  login
);

router.post(
  "/admin/login",
  adminLoginLimiter,
  adminLogin
);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPassword
);

router.post(
  "/reset-password",
  resetPassword
);

router.post(
  "/change-password",
  authMiddleware,
  changePassword
);

router.get(
  "/me",
  authMiddleware,
  getMe
);

module.exports = router;