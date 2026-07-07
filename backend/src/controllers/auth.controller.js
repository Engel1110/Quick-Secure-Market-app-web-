const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

const User = require("../models/User");
const SecurityAlert = require("../models/SecurityAlert");
const SessionLog = require("../models/SessionLog");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../services/email.service");

const FACE_CHECK_INTERVAL_HOURS = 72;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 30;

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    }
  );
};

const isStrongPassword = (password) => {
  return validator.isStrongPassword(password || "", {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  });
};

const sanitizeText = (value) => {
  return validator.escape(String(value || "").trim());
};

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return forwarded.toString().split(",")[0].trim();
  }

  return (req.socket.remoteAddress || req.ip || "").toString();
};

const getDeviceInfo = (req) => {
  return String(req.headers["user-agent"] || "Dispositivo desconocido").slice(
    0,
    300
  );
};

const createSessionLogSafe = (data) => {
  SessionLog.create(data).catch((error) => {
    console.error("Error creando SessionLog:", error.message);
  });
};

const createSecurityAlertSafe = (data) => {
  SecurityAlert.create(data).catch((error) => {
    console.error("Error creando SecurityAlert:", error.message);
  });
};

const shouldRequirePeriodicFaceCheck = (user) => {
  if (!user.isVerified) {
    return false;
  }

  if (!user.lastFaceVerification) {
    return true;
  }

  const lastFaceTime = new Date(user.lastFaceVerification).getTime();
  const now = Date.now();
  const hoursSinceLastFaceCheck = (now - lastFaceTime) / (1000 * 60 * 60);

  return hoursSinceLastFaceCheck >= FACE_CHECK_INTERVAL_HOURS;
};

const buildSafeUserResponse = (user) => {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.status,
    isVerified: user.isVerified,
    verificationStatus: user.verificationStatus,
    identityLevel: user.identityLevel,
    trustScore: user.trustScore,
    securityLevel: user.securityLevel,
    requireFaceCheck: user.requireFaceCheck,
    lastFaceVerification: user.lastFaceVerification || null
  };
};

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, documentId } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nombre, apellido, email y contraseña son obligatorios"
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "El formato del correo no es válido"
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo"
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Este correo ya está registrado"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      firstName: sanitizeText(firstName),
      lastName: sanitizeText(lastName),
      email: cleanEmail,
      password: hashedPassword,
      phone: phone ? sanitizeText(phone) : "",
      documentId: documentId ? sanitizeText(documentId) : "",
      role: "USER",
      status: "PENDING",
      isVerified: false,
      verificationStatus: "NOT_STARTED",
      identityLevel: "LEVEL_0",
      trustScore: 50,
      securityLevel: "NORMAL",
      requireFaceCheck: false,
      failedLoginAttempts: 0,
      suspiciousLoginCount: 0,
      lastLoginIp: getClientIp(req),
      lastLoginDevice: getDeviceInfo(req)
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "Usuario registrado correctamente",
      token,
      requireFaceCheck: user.requireFaceCheck,
      user: buildSafeUserResponse(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Este correo o documento ya está registrado"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error registrando usuario",
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email y contraseña son obligatorios"
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "El formato del correo no es válido"
      });
    }

    const user = await User.findOne({ email: cleanEmail }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas"
      });
    }

    if (user.status === "BANNED" || user.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        message: "Esta cuenta está suspendida o bloqueada"
      });
    }

    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      return res.status(423).json({
        success: false,
        message: "Cuenta bloqueada temporalmente por seguridad",
        accountLockedUntil: user.accountLockedUntil
      });
    }

    const currentIp = getClientIp(req);
    const currentDevice = getDeviceInfo(req);

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      user.failedLoginAttempts += 1;

      createSessionLogSafe({
        user: user._id,
        ipAddress: currentIp,
        deviceInfo: currentDevice,
        loginStatus: "FAILED",
        riskLevel: "HIGH",
        notes: "Intento de login fallido"
      });

      if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        user.securityLevel = "LOCKED";
        user.accountLockedUntil = new Date(
          Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000
        );

        createSecurityAlertSafe({
          user: user._id,
          type: "ACCOUNT_LOCKED",
          riskLevel: "CRITICAL",
          message:
            "Cuenta bloqueada por múltiples intentos fallidos de contraseña.",
          ipAddress: currentIp,
          deviceInfo: currentDevice
        });
      }

      await user.save();

      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas"
      });
    }

    let requireFaceCheck = Boolean(user.requireFaceCheck);
    let securityLevel = user.securityLevel || "NORMAL";

    if (user.lastLoginIp && user.lastLoginIp !== currentIp) {
      requireFaceCheck = true;
      securityLevel = "ELEVATED";
      user.suspiciousLoginCount += 1;

      createSecurityAlertSafe({
        user: user._id,
        type: "NEW_IP",
        riskLevel: "HIGH",
        message: "Se detectó inicio de sesión desde una IP diferente.",
        ipAddress: currentIp,
        deviceInfo: currentDevice
      });
    }

    if (user.lastLoginDevice && user.lastLoginDevice !== currentDevice) {
      requireFaceCheck = true;
      securityLevel = "ELEVATED";
      user.suspiciousLoginCount += 1;

      createSecurityAlertSafe({
        user: user._id,
        type: "NEW_DEVICE",
        riskLevel: "HIGH",
        message: "Se detectó inicio de sesión desde un dispositivo diferente.",
        ipAddress: currentIp,
        deviceInfo: currentDevice
      });
    }

    if (shouldRequirePeriodicFaceCheck(user)) {
      requireFaceCheck = true;
      securityLevel = "ELEVATED";
    }

    user.failedLoginAttempts = 0;
    user.lastLoginIp = currentIp;
    user.lastLoginDevice = currentDevice;
    user.requireFaceCheck = requireFaceCheck;
    user.securityLevel = securityLevel;
    user.accountLockedUntil = null;

    await user.save();

    createSessionLogSafe({
      user: user._id,
      ipAddress: currentIp,
      deviceInfo: currentDevice,
      loginStatus: requireFaceCheck ? "FACE_REQUIRED" : "SUCCESS",
      riskLevel: requireFaceCheck ? "HIGH" : "LOW",
      notes: requireFaceCheck
        ? "Login correcto, pero requiere Face ID por seguridad"
        : "Login correcto"
    });

    const token = generateToken(user);

    return res.json({
      success: true,
      message: requireFaceCheck
        ? "Login correcto. Se requiere Face ID para completar la segunda barrera."
        : "Login correcto",
      token,
      requireFaceCheck,
      user: buildSafeUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error interno iniciando sesión",
      error: error.message
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    return res.json({
      success: true,
      user: buildSafeUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo usuario",
      error: error.message
    });
  }
};
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = String(email || "").toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.json({
        success: true,
        message: "Si existe una cuenta asociada, recibirás un correo de recuperación."
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15;

    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail({
      to: user.email,
      resetLink
    });

    res.json({
      success: true,
      message: "Si existe una cuenta asociada, recibirás un correo de recuperación."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error enviando correo de recuperación.",
      error: error.message
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token inválido o expirado."
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo."
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.securityLevel = "NORMAL";

    await user.save();

    res.json({
      success: true,
      message: "Contraseña actualizada correctamente."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error restableciendo contraseña.",
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword
};