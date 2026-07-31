const prisma = require("../utils/prisma");

const {
  createNotification
} = require(
  "../services/notification.service"
);

const getAuthenticatedUser = async (
  req
) => {
  if (req.prismaUser?.id) {
    return req.prismaUser;
  }

  const rawId =
    req.user?.id ??
    req.user?._id;

  const userId =
    Number(rawId);

  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0
  ) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      id: userId
    }
  });
};

const getClientIp = (
  req
) => {
  const forwarded =
    String(
      req.headers[
        "x-forwarded-for"
      ] || ""
    )
      .split(",")[0]
      .trim();

  return (
    forwarded ||
    req.socket?.remoteAddress ||
    req.ip ||
    ""
  ).toString();
};

const getDeviceInfo = (
  req
) => {
  return String(
    req.headers["user-agent"] ||
      "Dispositivo desconocido"
  ).trim();
};

const normalizeFaceScore = (
  value
) => {
  const score =
    Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
};

const faceCheck = async (
  req,
  res
) => {
  try {
    const {
      selfie,
      faceScore
    } = req.body || {};

    const normalizedSelfie =
      String(
        selfie || ""
      ).trim();

    if (!normalizedSelfie) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "La selfie es obligatoria para validar Face ID."
        });
    }

    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Usuario no encontrado."
        });
    }

    const score =
      normalizeFaceScore(
        faceScore
      );

    const ipAddress =
      getClientIp(req);

    const deviceInfo =
      getDeviceInfo(req);

    if (score < 75) {
      const suspiciousLoginCount =
        Number(
          user.suspiciousLoginCount ||
            0
        ) + 1;

      const shouldLock =
        suspiciousLoginCount >= 3;

      const accountLockedUntil =
        shouldLock
          ? new Date(
              Date.now() +
                30 * 60 * 1000
            )
          : null;

      const updatedUser =
        await prisma.$transaction(
          async (tx) => {
            const savedUser =
              await tx.user.update({
                where: {
                  id: user.id
                },

                data: {
                  requireFaceCheck:
                    true,

                  securityLevel:
                    shouldLock
                      ? "LOCKED"
                      : "ELEVATED",

                  suspiciousLoginCount,

                  accountLockedUntil
                }
              });

            await tx.securityAlert.create({
              data: {
                userId:
                  user.id,

                type:
                  "FAILED_FACE_CHECK",

                riskLevel:
                  "HIGH",

                message:
                  "Face ID falló. Se requiere revisión adicional.",

                ipAddress,

                deviceInfo
              }
            });

            if (shouldLock) {
              await tx.securityAlert.create({
                data: {
                  userId:
                    user.id,

                  type:
                    "ACCOUNT_LOCKED",

                  riskLevel:
                    "CRITICAL",

                  message:
                    "Cuenta bloqueada temporalmente por múltiples fallos de Face ID.",

                  ipAddress,

                  deviceInfo
                }
              });
            }

            return savedUser;
          }
        );

      await createNotification(
        user.id,
        "SECURITY_ALERT",
        "Face ID fallido",
        "La verificación facial no coincidió correctamente."
      );

      if (shouldLock) {
        await createNotification(
          user.id,
          "SECURITY_ALERT",
          "Cuenta bloqueada",
          "Tu cuenta fue bloqueada temporalmente por seguridad."
        );
      }

      return res
        .status(401)
        .json({
          success: false,

          message:
            "Face ID no coincide. La cuenta requiere verificación adicional.",

          resultado: {
            faceScore:
              score,

            securityLevel:
              updatedUser.securityLevel,

            requireFaceCheck:
              updatedUser.requireFaceCheck,

            accountLockedUntil:
              updatedUser.accountLockedUntil
          }
        });
    }

    const updatedUser =
      await prisma.user.update({
        where: {
          id: user.id
        },

        data: {
          requireFaceCheck:
            false,

          securityLevel:
            "NORMAL",

          suspiciousLoginCount:
            0,

          accountLockedUntil:
            null,

          dailyVerificationPhoto:
            normalizedSelfie,

          faceMatchScore:
            score,

          lastFaceVerification:
            new Date()
        }
      });

    return res.json({
      success: true,

      message:
        "Face ID verificado correctamente.",

      resultado: {
        faceScore:
          updatedUser.faceMatchScore,

        securityLevel:
          updatedUser.securityLevel,

        requireFaceCheck:
          updatedUser.requireFaceCheck
      }
    });
  } catch (error) {
    console.error(
      "Error verificando Face ID:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Error verificando Face ID.",
        error:
          error.message
      });
  }
};

const registerSession = async (
  req,
  res
) => {
  try {
    const {
      ipAddress,
      deviceInfo
    } = req.body || {};

    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Usuario no encontrado."
        });
    }

    const currentIp =
      String(
        ipAddress ||
          getClientIp(req)
      ).trim();

    const currentDevice =
      String(
        deviceInfo ||
          getDeviceInfo(req)
      ).trim();

    const newIpDetected =
      Boolean(
        user.lastLoginIp &&
          user.lastLoginIp !==
            currentIp
      );

    const newDeviceDetected =
      Boolean(
        user.lastLoginDevice &&
          user.lastLoginDevice !==
            currentDevice
      );

    const requiresFaceCheck =
      Boolean(
        user.requireFaceCheck ||
          newIpDetected ||
          newDeviceDetected
      );

    const riskLevel =
      newIpDetected ||
      newDeviceDetected
        ? "HIGH"
        : "LOW";

    const notes = [];

    if (newIpDetected) {
      notes.push(
        "Inicio de sesión desde una IP diferente."
      );
    }

    if (newDeviceDetected) {
      notes.push(
        "Inicio de sesión desde un dispositivo diferente."
      );
    }

    if (notes.length === 0) {
      notes.push(
        "Sesión registrada correctamente."
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          if (newIpDetected) {
            await tx.securityAlert.create({
              data: {
                userId:
                  user.id,

                type:
                  "NEW_IP",

                riskLevel:
                  "HIGH",

                message:
                  "Se detectó acceso desde una IP nueva.",

                ipAddress:
                  currentIp,

                deviceInfo:
                  currentDevice
              }
            });
          }

          if (newDeviceDetected) {
            await tx.securityAlert.create({
              data: {
                userId:
                  user.id,

                type:
                  "NEW_DEVICE",

                riskLevel:
                  "HIGH",

                message:
                  "Se detectó acceso desde un dispositivo nuevo.",

                ipAddress:
                  currentIp,

                deviceInfo:
                  currentDevice
              }
            });
          }

          const session =
            await tx.sessionLog.create({
              data: {
                userId:
                  user.id,

                ipAddress:
                  currentIp,

                deviceInfo:
                  currentDevice,

                loginStatus:
                  requiresFaceCheck
                    ? "FACE_REQUIRED"
                    : "SUCCESS",

                riskLevel,

                notes:
                  notes.join(" ")
              }
            });

          const activeSessions =
            await tx.sessionLog.count({
              where: {
                userId:
                  user.id,

                isActive:
                  true
              }
            });

          const updateData = {
            lastLoginIp:
              currentIp,

            lastLoginDevice:
              currentDevice,

            lastLoginAt:
              new Date(),

            activeSessions
          };

          if (
            newIpDetected ||
            newDeviceDetected
          ) {
            updateData.requireFaceCheck =
              true;

            updateData.securityLevel =
              "ELEVATED";
          }

          const updatedUser =
            await tx.user.update({
              where: {
                id:
                  user.id
              },

              data:
                updateData
            });

          return {
            session,
            updatedUser
          };
        }
      );

    if (newIpDetected) {
      await createNotification(
        user.id,
        "NEW_DEVICE",
        "Nuevo acceso detectado",
        "Detectamos una nueva dirección IP en tu cuenta."
      );
    }

    if (newDeviceDetected) {
      await createNotification(
        user.id,
        "NEW_DEVICE",
        "Nuevo dispositivo detectado",
        "Quick Secure Market detectó un dispositivo nuevo."
      );
    }

    return res.json({
      success: true,

      message:
        "Sesión registrada correctamente.",

      resultado: {
        riskLevel,

        notes:
          notes.join(" "),

        requireFaceCheck:
          result.updatedUser
            .requireFaceCheck,

        securityLevel:
          result.updatedUser
            .securityLevel
      },

      session:
        result.session
    });
  } catch (error) {
    console.error(
      "Error registrando sesión:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Error registrando sesión.",
        error:
          error.message
      });
  }
};

const getSecurityAlerts = async (
  req,
  res
) => {
  try {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Usuario no encontrado."
        });
    }

    const alerts =
      await prisma.securityAlert.findMany({
        where: {
          userId:
            user.id
        },

        orderBy: {
          createdAt:
            "desc"
        },

        take:
          200
      });

    return res.json({
      success: true,

      message:
        "Alertas de seguridad obtenidas correctamente.",

      count:
        alerts.length,

      alerts
    });
  } catch (error) {
    console.error(
      "Error obteniendo alertas:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Error obteniendo alertas de seguridad.",
        error:
          error.message
      });
  }
};

module.exports = {
  faceCheck,
  registerSession,
  getSecurityAlerts
};