const { getFrontendUrl } = require("../config/runtime.config");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const crypto = require("crypto");

const prisma = require("../utils/prisma");

const {
  sendPasswordResetEmail,
  sendPasswordChangedEmail
} = require("../services/email.service");

const {
  INTERNAL_ADMIN_ROLES,
  normalizeUpper,
  normalizeEmail,
  generateToken,
  shouldRequirePeriodicFaceCheck,
  buildSafeUserResponse,
  buildSafeAdminResponse
} = require(
  "../services/auth/prisma-auth.helpers"
);

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 30;
const RESET_TOKEN_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

const getClientIp = (req) => {
  const forwarded =
    req.headers["x-forwarded-for"];

  if (forwarded) {
    return String(forwarded)
      .split(",")[0]
      .trim()
      .slice(0, 100);
  }

  return String(
    req.socket?.remoteAddress ||
      req.ip ||
      ""
  ).slice(0, 100);
};

const getDeviceInfo = (req) =>
  String(
    req.headers["user-agent"] ||
      "Dispositivo desconocido"
  ).slice(0, 300);

const validateCredentials = (
  email,
  password
) => {
  if (!email || !password) {
    return {
      valid: false,
      status: 400,
      message:
        "Correo y contraseña son obligatorios."
    };
  }

  const cleanEmail =
    normalizeEmail(email);

  if (
    !validator.isEmail(
      cleanEmail
    )
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "El formato del correo no es válido."
    };
  }

  return {
    valid: true,
    cleanEmail
  };
};

const registerFailedAttempt = async (
  user
) => {
  const failedLoginAttempts =
    Number(
      user.failedLoginAttempts || 0
    ) + 1;

  const locked =
    failedLoginAttempts >=
    MAX_FAILED_LOGIN_ATTEMPTS;

  const accountLockedUntil =
    locked
      ? new Date(
          Date.now() +
            ACCOUNT_LOCK_MINUTES *
              60 *
              1000
        )
      : user.accountLockedUntil;

  const updatedUser =
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        failedLoginAttempts,
        accountLockedUntil,
        securityLevel:
          locked
            ? "LOCKED"
            : user.securityLevel
      }
    });

  return {
    user: updatedUser,
    locked,
    remainingAttempts:
      Math.max(
        MAX_FAILED_LOGIN_ATTEMPTS -
          failedLoginAttempts,
        0
      )
  };
};

const registerSuccessfulLogin = async (
  user,
  req,
  {
    detectNewEnvironment = true
  } = {}
) => {
  const currentIp =
    getClientIp(req);

  const currentDevice =
    getDeviceInfo(req);

  const newIpDetected =
    detectNewEnvironment &&
    Boolean(user.lastLoginIp) &&
    user.lastLoginIp !== currentIp;

  const newDeviceDetected =
    detectNewEnvironment &&
    Boolean(user.lastLoginDevice) &&
    user.lastLoginDevice !==
      currentDevice;

  const periodicFaceCheck =
    shouldRequirePeriodicFaceCheck(
      user
    );

  const requireFaceCheck =
    Boolean(
      user.requireFaceCheck ||
      newIpDetected ||
      newDeviceDetected ||
      periodicFaceCheck
    );

  const suspiciousIncrease =
    Number(newIpDetected) +
    Number(newDeviceDetected);

  const updatedUser =
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: currentIp,
        lastLoginDevice:
          currentDevice,
        requireFaceCheck,
        securityLevel:
          requireFaceCheck
            ? "ELEVATED"
            : "NORMAL",
        suspiciousLoginCount: {
          increment:
            suspiciousIncrease
        },
        activeSessions: {
          increment: 1
        }
      }
    });

  return {
    user: updatedUser,
    requireFaceCheck,
    newIpDetected,
    newDeviceDetected
  };
};

const getAccountRestriction = (
  user
) => {
  const status =
    normalizeUpper(user.status);

  if (status === "BANNED") {
    return {
      status: 403,
      message:
        "Esta cuenta ha sido bloqueada permanentemente."
    };
  }

  if (status === "SUSPENDED") {
    return {
      status: 403,
      message:
        "Esta cuenta se encuentra suspendida."
    };
  }

  if (status === "DELETED") {
    return {
      status: 403,
      message:
        "Esta cuenta ya no está disponible."
    };
  }

  if (status !== "ACTIVE") {
    return {
      status: 403,
      message:
        "Esta cuenta todavía no está activa."
    };
  }

  if (
    user.accountLockedUntil &&
    new Date(
      user.accountLockedUntil
    ) > new Date()
  ) {
    return {
      status: 423,
      message:
        "Cuenta bloqueada temporalmente por seguridad.",
      accountLockedUntil:
        user.accountLockedUntil
    };
  }

  return null;
};


const normalizeRegistrationName = (
  value
) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeRegistrationPhone = (
  value
) =>
  String(value || "")
    .trim()
    .replace(/[^\d+]/g, "")
    .slice(0, 20);

const register = async (
  req,
  res
) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword
    } = req.body || {};

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nombre, apellido, correo, tel\u00e9fono y contrase\u00f1a son obligatorios."
      });
    }

    if (
      confirmPassword !== undefined &&
      password !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Las contrase\u00f1as no coinciden."
      });
    }

    const cleanFirstName =
      normalizeRegistrationName(
        firstName
      );

    const cleanLastName =
      normalizeRegistrationName(
        lastName
      );

    const cleanEmail =
      normalizeEmail(email);

    const cleanPhone =
      normalizeRegistrationPhone(
        phone
      );

    if (
      cleanFirstName.length < 2 ||
      cleanFirstName.length > 50
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El nombre debe contener entre 2 y 50 caracteres."
      });
    }

    if (
      cleanLastName.length < 2 ||
      cleanLastName.length > 50
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El apellido debe contener entre 2 y 50 caracteres."
      });
    }

    if (
      !validator.isEmail(
        cleanEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El formato del correo no es v\u00e1lido."
      });
    }

    if (cleanPhone.length < 7) {
      return res.status(400).json({
        success: false,
        message:
          "El n\u00famero de tel\u00e9fono no es v\u00e1lido."
      });
    }

    if (
      !validator.isStrongPassword(
        String(password),
        {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1
        }
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La contrase\u00f1a debe tener al menos 8 caracteres, una may\u00fascula, una min\u00fascula, un n\u00famero y un s\u00edmbolo."
      });
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email: cleanEmail
        },
        select: {
          id: true
        }
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Este correo ya est\u00e1 registrado."
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        String(password),
        BCRYPT_ROUNDS
      );

    const user =
      await prisma.user.create({
        data: {
          firstName:
            cleanFirstName,

          lastName:
            cleanLastName,

          email:
            cleanEmail,

          phone:
            cleanPhone,

          password:
            hashedPassword,

          accountType:
            "CUSTOMER",

          role:
            "USER",

          department:
            "CUSTOMER",

          departments:
            [],

          permissions:
            [],

          status:
            "ACTIVE",

          registrationCompleted:
            false,

          registrationCompletedAt:
            null,

          onboardingStatus:
            "KYC_REQUIRED",

          buyerEnabled:
            false,

          sellerEnabled:
            false,

          isVerified:
            false,

          verificationStatus:
            "NOT_STARTED",

          identityLevel:
            "LEVEL_0",

          trustScore:
            50,

          securityLevel:
            "NORMAL",

          requireFaceCheck:
            false,

          failedLoginAttempts:
            0,

          suspiciousLoginCount:
            0,

          activeSessions:
            0,

          passwordVersion:
            0,

          passwordChangedAt:
            new Date(),

          mustChangePassword:
            false,

          lastLoginIp:
            getClientIp(req),

          lastLoginDevice:
            getDeviceInfo(req),

          lastLoginAt:
            null
        }
      });

    const token =
      generateToken(user);

    return res.status(201).json({
      success: true,

      message:
        "Cuenta inicial creada. Completa obligatoriamente tu identidad para activar la plataforma.",

      token,

      registrationCompleted:
        false,

      nextStep:
        "/complete-profile",

      onboarding: {
        status:
          "KYC_REQUIRED",

        required:
          true
      },

      capabilities: {
        canBuy:
          false,

        canSell:
          false
      },

      user:
        buildSafeUserResponse(
          user
        )
    });
  } catch (error) {
    console.error(
      "Error register Prisma:",
      error
    );

    if (
      error?.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Este correo ya est\u00e1 registrado."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Error interno registrando el usuario.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};

const login = async (
  req,
  res
) => {
  try {
    const {
      email,
      password
    } = req.body || {};

    const validation =
      validateCredentials(
        email,
        password
      );

    if (!validation.valid) {
      return res
        .status(validation.status)
        .json({
          success: false,
          message:
            validation.message
        });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email:
            validation.cleanEmail
        }
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Credenciales inválidas."
      });
    }

    const accountType =
      normalizeUpper(
        user.accountType
      );

    if (
      [
        "INTERNAL",
        "ADMIN",
        "STAFF"
      ].includes(accountType)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Las cuentas internas deben iniciar sesión desde el BackOffice."
      });
    }

    const restriction =
      getAccountRestriction(user);

    if (restriction) {
      return res
        .status(restriction.status)
        .json({
          success: false,
          message:
            restriction.message,
          accountLockedUntil:
            restriction
              .accountLockedUntil ||
            null
        });
    }

    const passwordMatch =
      await bcrypt.compare(
        String(password),
        user.password
      );

    if (!passwordMatch) {
      const failed =
        await registerFailedAttempt(
          user
        );

      return res.status(401).json({
        success: false,
        message:
          failed.locked
            ? `Cuenta bloqueada por ${ACCOUNT_LOCK_MINUTES} minutos debido a múltiples intentos fallidos.`
            : "Credenciales inválidas.",
        remainingAttempts:
          failed.remainingAttempts,
        accountLockedUntil:
          failed.user
            .accountLockedUntil ||
          null
      });
    }

    const loginResult =
      await registerSuccessfulLogin(
        user,
        req
      );

    const authenticatedUser =
      loginResult.user;

    const token =
      generateToken(
        authenticatedUser
      );

    const verificationStatus =
      normalizeUpper(
        authenticatedUser
          .verificationStatus ||
          "NOT_STARTED"
      );

    let verificationMessage = "";

    if (
      verificationStatus ===
      "PENDING_REVIEW"
    ) {
      verificationMessage =
        "Tu identidad está siendo revisada. Puedes comprar, pero todavía no puedes vender.";
    }

    if (
      verificationStatus ===
      "REJECTED"
    ) {
      verificationMessage =
        "Tu verificación de identidad fue rechazada. Debes corregir y reenviar los documentos.";
    }

    if (
      verificationStatus ===
      "APPROVED"
    ) {
      verificationMessage =
        "Tu identidad está verificada y tu cuenta está habilitada.";
    }

    return res.status(200).json({
      success: true,
      message:
        loginResult
          .requireFaceCheck
          ? "Credenciales correctas. Debes completar la verificación facial."
          : "Inicio de sesión correcto.",
      token,
      requireFaceCheck:
        loginResult
          .requireFaceCheck,
      security: {
        level:
          authenticatedUser
            .securityLevel,
        newIpDetected:
          loginResult
            .newIpDetected,
        newDeviceDetected:
          loginResult
            .newDeviceDetected
      },
      capabilities: {
        canBuy:
          authenticatedUser
            .status === "ACTIVE" &&
          authenticatedUser
            .buyerEnabled === true,
        canSell:
          authenticatedUser
            .status === "ACTIVE" &&
          authenticatedUser
            .sellerEnabled === true &&
          verificationStatus ===
            "APPROVED"
      },
      verification: {
        status:
          verificationStatus,
        identityLevel:
          authenticatedUser
            .identityLevel,
        message:
          verificationMessage
      },
      user:
        buildSafeUserResponse(
          authenticatedUser
        )
    });
  } catch (error) {
    console.error(
      "Error login Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error interno iniciando sesión.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};

const adminLogin = async (
  req,
  res
) => {
  try {
    const {
      email,
      password
    } = req.body || {};

    const validation =
      validateCredentials(
        email,
        password
      );

    if (!validation.valid) {
      return res
        .status(validation.status)
        .json({
          success: false,
          message:
            validation.message
        });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email:
            validation.cleanEmail
        }
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Correo o contraseña incorrectos."
      });
    }

    const accountType =
      normalizeUpper(
        user.accountType
      );

    const role =
      normalizeUpper(
        user.role
      );

    const isInternal =
      accountType === "INTERNAL";

    if (
      !isInternal ||
      !INTERNAL_ADMIN_ROLES.includes(
        role
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Esta cuenta no tiene acceso al BackOffice."
      });
    }

    const restriction =
      getAccountRestriction(user);

    if (restriction) {
      return res
        .status(restriction.status)
        .json({
          success: false,
          message:
            restriction.message,
          accountLockedUntil:
            restriction
              .accountLockedUntil ||
            null
        });
    }

    const passwordMatch =
      await bcrypt.compare(
        String(password),
        user.password
      );

    if (!passwordMatch) {
      const failed =
        await registerFailedAttempt(
          user
        );

      return res.status(401).json({
        success: false,
        message:
          failed.locked
            ? "Cuenta administrativa bloqueada temporalmente."
            : "Correo o contraseña incorrectos.",
        remainingAttempts:
          failed.remainingAttempts,
        accountLockedUntil:
          failed.user
            .accountLockedUntil ||
          null
      });
    }

    const loginResult =
      await registerSuccessfulLogin(
        user,
        req,
        {
          detectNewEnvironment:
            false
        }
      );

    const authenticatedUser =
      loginResult.user;

    const token =
      generateToken(
        authenticatedUser
      );

    return res.status(200).json({
      success: true,
      message:
        "Bienvenido al BackOffice.",
      token,
      user:
        buildSafeAdminResponse(
          authenticatedUser
        )
    });
  } catch (error) {
    console.error(
      "Error admin login Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error interno iniciando sesión administrativa.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};

const getMe = async (
  req,
  res
) => {
  try {
    const user =
      req.prismaUser ||
      (req.user?.id
        ? await prisma.user.findUnique({
            where: {
              id: Number(
                req.user.id
              )
            }
          })
        : null);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Usuario no encontrado."
      });
    }

    const accountType =
      normalizeUpper(
        user.accountType
      );

    const isInternal =
      accountType === "INTERNAL";

    return res.status(200).json({
      success: true,
      user:
        isInternal
          ? buildSafeAdminResponse(
              user
            )
          : buildSafeUserResponse(
              user
            ),
      permissions:
        user.role ===
        "SUPER_ADMIN"
          ? ["*"]
          : user.permissions || [],
      buyerEnabled:
        Boolean(
          user.buyerEnabled
        ),
      sellerEnabled:
        Boolean(
          user.sellerEnabled
        ),
      verificationStatus:
        user.verificationStatus,
      identityLevel:
        user.identityLevel,
      canBuy:
        user.status === "ACTIVE" &&
        user.buyerEnabled === true,
      canSell:
        user.status === "ACTIVE" &&
        user.sellerEnabled === true &&
        user.verificationStatus ===
          "APPROVED"
    });
  } catch (error) {
    console.error(
      "Error getMe Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error obteniendo el usuario.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};


const hashResetToken = (token) =>
  crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");

const isStrongPassword = (password) =>
  validator.isStrongPassword(
    String(password || ""),
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    }
  );

const forgotPassword = async (
  req,
  res
) => {
  try {
    const cleanEmail =
      normalizeEmail(
        req.body?.email
      );

    const genericMessage =
      "Si existe una cuenta asociada, recibir\u00e1s un correo de recuperaci\u00f3n.";

    if (
      !cleanEmail ||
      !validator.isEmail(
        cleanEmail
      )
    ) {
      return res.status(200).json({
        success: true,
        message: genericMessage
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email: cleanEmail
        }
      });

    if (
      !user ||
      [
        "BANNED",
        "DELETED"
      ].includes(
        normalizeUpper(
          user?.status
        )
      )
    ) {
      return res.status(200).json({
        success: true,
        message: genericMessage
      });
    }

    const resetToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    const resetPasswordToken =
      hashResetToken(
        resetToken
      );

    const resetPasswordExpires =
      new Date(
        Date.now() +
          RESET_TOKEN_MINUTES *
            60 *
            1000
      );

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        resetPasswordToken,
        resetPasswordExpires
      }
    });

    const configuredFrontendUrl =
      process.env.FRONTEND_URL ||
      getFrontendUrl();

    const frontendUrl =
      String(
        configuredFrontendUrl || ""
      )
        .trim()
        .replace(/\/+$/, "");

    if (!frontendUrl) {
      await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      });

      throw new Error(
        "FRONTEND_URL no est\u00e1 configurado."
      );
    }

    const resetLink =
      frontendUrl +
      "/reset-password?token=" +
      encodeURIComponent(
        resetToken
      );

    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetLink,
        ip: getClientIp(req),
        device:
          getDeviceInfo(req)
      });
    } catch (emailError) {
      await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      });

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: genericMessage
    });
  } catch (error) {
    console.error(
      "Error forgotPassword Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo enviar el correo de recuperaci\u00f3n.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};

const resetPassword = async (
  req,
  res
) => {
  try {
    const token =
      String(
        req.body?.token || ""
      ).trim();

    const password =
      String(
        req.body?.password || ""
      );

    const confirmPassword =
      req.body?.confirmPassword;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Token y nueva contrase\u00f1a son obligatorios."
      });
    }

    if (
      confirmPassword !==
        undefined &&
      password !==
        confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Las contrase\u00f1as no coinciden."
      });
    }

    if (
      !isStrongPassword(
        password
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La contrase\u00f1a debe tener al menos 8 caracteres, una may\u00fascula, una min\u00fascula, un n\u00famero y un s\u00edmbolo."
      });
    }

    const user =
      await prisma.user.findFirst({
        where: {
          resetPasswordToken:
            hashResetToken(token),

          resetPasswordExpires: {
            gt: new Date()
          }
        }
      });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "El enlace es inv\u00e1lido, ya fue utilizado o expir\u00f3."
      });
    }

    if (
      [
        "BANNED",
        "DELETED"
      ].includes(
        normalizeUpper(
          user.status
        )
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No es posible restablecer la contrase\u00f1a de esta cuenta."
      });
    }

    const samePassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          "La nueva contrase\u00f1a no puede ser igual a la contrase\u00f1a anterior."
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        BCRYPT_ROUNDS
      );

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        password:
          hashedPassword,

        resetPasswordToken:
          null,

        resetPasswordExpires:
          null,

        failedLoginAttempts:
          0,

        accountLockedUntil:
          null,

        securityLevel:
          "NORMAL",

        requireFaceCheck:
          true,

        passwordChangedAt:
          new Date(),

        passwordVersion: {
          increment: 1
        },

        mustChangePassword:
          false,

        activeSessions:
          0
      }
    });

    try {
      await sendPasswordChangedEmail({
        to: user.email,
        ip: getClientIp(req),
        device:
          getDeviceInfo(req)
      });
    } catch (emailError) {
      console.error(
        "No se pudo enviar el aviso de contrase\u00f1a:",
        emailError.message
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Contrase\u00f1a actualizada correctamente. Por seguridad, inicia sesi\u00f3n nuevamente.",
      requireFaceCheck: true
    });
  } catch (error) {
    console.error(
      "Error resetPassword Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo restablecer la contrase\u00f1a.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};

const changePassword = async (
  req,
  res
) => {
  try {
    const user =
      req.prismaUser ||
      null;

    const {
      currentPassword,
      newPassword,
      confirmPassword
    } = req.body || {};

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "No autorizado."
      });
    }

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La contrase?a actual y la nueva contrase?a son obligatorias."
      });
    }

    if (
      confirmPassword !==
        undefined &&
      newPassword !==
        confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Las contrase?as no coinciden."
      });
    }

    if (
      !isStrongPassword(
        newPassword
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La contrase?a debe tener al menos 8 caracteres, una may?scula, una min?scula, un n?mero y un s?mbolo."
      });
    }

    const currentMatches =
      await bcrypt.compare(
        String(currentPassword),
        user.password
      );

    if (!currentMatches) {
      return res.status(401).json({
        success: false,
        message:
          "La contrase?a actual es incorrecta."
      });
    }

    const samePassword =
      await bcrypt.compare(
        String(newPassword),
        user.password
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          "La nueva contrase?a no puede ser igual a la contrase?a actual."
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        String(newPassword),
        BCRYPT_ROUNDS
      );

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        password:
          hashedPassword,

        passwordChangedAt:
          new Date(),

        passwordVersion: {
          increment: 1
        },

        failedLoginAttempts:
          0,

        accountLockedUntil:
          null,

        securityLevel:
          "NORMAL",

        requireFaceCheck:
          true,

        resetPasswordToken:
          null,

        resetPasswordExpires:
          null,

        mustChangePassword:
          false,

        activeSessions:
          0
      }
    });

    try {
      await sendPasswordChangedEmail({
        to: user.email,
        ip: getClientIp(req),
        device:
          getDeviceInfo(req)
      });
    } catch (emailError) {
      console.error(
        "No se pudo enviar aviso de contrase?a:",
        emailError.message
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Contrase?a cambiada correctamente. Por seguridad, vuelve a iniciar sesi?n.",
      requireFaceCheck: true
    });
  } catch (error) {
    console.error(
      "Error changePassword Prisma:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error cambiando contrase?a.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};

module.exports = {
  register,
  login,
  adminLogin,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword
};
