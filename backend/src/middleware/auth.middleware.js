const jwt = require("jsonwebtoken");
const User = require("../models/User");

const FACE_CHECK_INTERVAL_HOURS = 72;

const shouldRequirePeriodicFaceCheck = (user) => {
  if (!user.isVerified) {
    return false;
  }

  if (!user.lastFaceVerification) {
    return true;
  }

  const lastFaceTime = new Date(user.lastFaceVerification).getTime();
  const now = Date.now();

  const hoursSinceLastFaceCheck =
    (now - lastFaceTime) / (1000 * 60 * 60);

  return hoursSinceLastFaceCheck >= FACE_CHECK_INTERVAL_HOURS;
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Acceso denegado. Token no enviado."
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado."
      });
    }

    /*
    =====================================================
    INVALIDAR TOKENS ANTIGUOS
    =====================================================
    */

    if ((decoded.passwordVersion || 0) !== (user.passwordVersion || 0)) {
      return res.status(401).json({
        success: false,
        message:
          "Tu contraseña fue modificada. Debes iniciar sesión nuevamente."
      });
    }

    /*
    =====================================================
    CUENTA SUSPENDIDA
    =====================================================
    */

    if (
      user.status === "BANNED" ||
      user.status === "SUSPENDED"
    ) {
      return res.status(403).json({
        success: false,
        message: "Cuenta suspendida o bloqueada."
      });
    }

    /*
    =====================================================
    CUENTA BLOQUEADA
    =====================================================
    */

    if (
      user.accountLockedUntil &&
      user.accountLockedUntil > new Date()
    ) {
      return res.status(423).json({
        success: false,
        message:
          "Cuenta bloqueada temporalmente por seguridad.",
        accountLockedUntil: user.accountLockedUntil
      });
    }

    /*
    =====================================================
    FACE CHECK
    =====================================================
    */

    if (
      shouldRequirePeriodicFaceCheck(user) &&
      !user.requireFaceCheck
    ) {
      user.requireFaceCheck = true;
      user.securityLevel = "ELEVATED";

      await user.save();
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado."
    });
  }
};

module.exports = authMiddleware;