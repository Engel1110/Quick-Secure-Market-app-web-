const User = require("../models/User");
const SecurityAlert = require("../models/SecurityAlert");
const SessionLog = require("../models/SessionLog");

const { createNotification } = require("../services/notification.service");

const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    req.ip ||
    ""
  ).toString();
};

const getDeviceInfo = (req) => {
  return req.headers["user-agent"] || "Dispositivo desconocido";
};

const faceCheck = async (req, res) => {
  try {
    const { selfie, faceScore } = req.body;

    if (!selfie) {
      return res.status(400).json({
        message: "La selfie es obligatoria para validar Face ID"
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    const score = Number(faceScore || 0);

    if (score < 75) {
      user.requireFaceCheck = true;
      user.securityLevel = "ELEVATED";
      user.suspiciousLoginCount += 1;

      await SecurityAlert.create({
        user: user._id,
        type: "FAILED_FACE_CHECK",
        riskLevel: "HIGH",
        message: "Face ID falló. Se requiere revisión adicional.",
        ipAddress: getClientIp(req),
        deviceInfo: getDeviceInfo(req)
      });

      await createNotification(
        user._id,
        "SECURITY_ALERT",
        "Face ID fallido",
        "La verificación facial no coincidió correctamente."
      );

      if (user.suspiciousLoginCount >= 3) {
        user.securityLevel = "LOCKED";
        user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);

        await SecurityAlert.create({
          user: user._id,
          type: "ACCOUNT_LOCKED",
          riskLevel: "CRITICAL",
          message:
            "Cuenta bloqueada temporalmente por múltiples fallos de Face ID.",
          ipAddress: getClientIp(req),
          deviceInfo: getDeviceInfo(req)
        });

        await createNotification(
          user._id,
          "SECURITY_ALERT",
          "Cuenta bloqueada",
          "Tu cuenta fue bloqueada temporalmente por seguridad."
        );
      }

      await user.save();

      return res.status(401).json({
        message:
          "Face ID no coincide. La cuenta requiere verificación adicional.",
        resultado: {
          faceScore: score,
          securityLevel: user.securityLevel,
          requireFaceCheck: user.requireFaceCheck,
          accountLockedUntil: user.accountLockedUntil
        }
      });
    }

    user.requireFaceCheck = false;
    user.securityLevel = "NORMAL";
    user.suspiciousLoginCount = 0;
    user.dailyVerificationPhoto = selfie;
    user.faceMatchScore = score;
    user.lastFaceVerification = new Date();

    await user.save();

    res.json({
      message: "Face ID verificado correctamente",
      resultado: {
        faceScore: score,
        securityLevel: user.securityLevel,
        requireFaceCheck: user.requireFaceCheck
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Error verificando Face ID",
      error: error.message
    });
  }
};

const registerSession = async (req, res) => {
  try {
    const { ipAddress, deviceInfo } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    const currentIp = ipAddress || getClientIp(req);
    const currentDevice = deviceInfo || getDeviceInfo(req);

    let riskLevel = "LOW";
    let notes = "Sesión registrada correctamente.";

    if (user.lastLoginIp && user.lastLoginIp !== currentIp) {
      riskLevel = "HIGH";
      notes = "Inicio de sesión desde una IP diferente.";

      user.requireFaceCheck = true;
      user.securityLevel = "ELEVATED";

      await SecurityAlert.create({
        user: user._id,
        type: "NEW_IP",
        riskLevel: "HIGH",
        message: "Se detectó acceso desde una IP nueva.",
        ipAddress: currentIp,
        deviceInfo: currentDevice
      });

      await createNotification(
        user._id,
        "NEW_DEVICE",
        "Nuevo acceso detectado",
        "Detectamos una nueva dirección IP en tu cuenta."
      );
    }

    if (
      user.lastLoginDevice &&
      user.lastLoginDevice !== currentDevice
    ) {
      riskLevel = "HIGH";
      notes = "Inicio de sesión desde un dispositivo diferente.";

      user.requireFaceCheck = true;
      user.securityLevel = "ELEVATED";

      await SecurityAlert.create({
        user: user._id,
        type: "NEW_DEVICE",
        riskLevel: "HIGH",
        message: "Se detectó acceso desde un dispositivo nuevo.",
        ipAddress: currentIp,
        deviceInfo: currentDevice
      });

      await createNotification(
        user._id,
        "NEW_DEVICE",
        "Nuevo dispositivo detectado",
        "Quick Secure Market detectó un dispositivo nuevo."
      );
    }

    user.lastLoginIp = currentIp;
    user.lastLoginDevice = currentDevice;

    await user.save();

    const session = await SessionLog.create({
      user: user._id,
      ipAddress: currentIp,
      deviceInfo: currentDevice,
      loginStatus: user.requireFaceCheck ? "FACE_REQUIRED" : "SUCCESS",
      riskLevel,
      notes
    });

    res.json({
      message: "Sesión registrada correctamente",
      resultado: {
        riskLevel,
        notes,
        requireFaceCheck: user.requireFaceCheck,
        securityLevel: user.securityLevel
      },
      session
    });
  } catch (error) {
    res.status(500).json({
      message: "Error registrando sesión",
      error: error.message
    });
  }
};

const getSecurityAlerts = async (req, res) => {
  try {
    const alerts = await SecurityAlert.find({
      user: req.user._id
    }).sort({
      createdAt: -1
    });

    res.json({
      message: "Alertas de seguridad obtenidas correctamente",
      count: alerts.length,
      alerts
    });
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo alertas de seguridad",
      error: error.message
    });
  }
};

module.exports = {
  faceCheck,
  registerSession,
  getSecurityAlerts
};