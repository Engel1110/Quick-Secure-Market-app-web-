const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");

const {
  normalizeUpper,
  resolveUserFromDecoded,
  shouldRequirePeriodicFaceCheck,
  toRequestUser
} = require(
  "../services/auth/prisma-auth.helpers"
);

const authMiddleware = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Acceso denegado. Token no enviado."
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET no está definido."
      );
    }

    const token =
      authHeader.slice(7).trim();

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    let user =
      await resolveUserFromDecoded(
        decoded
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Usuario no encontrado."
      });
    }

    if (
      Number(
        decoded.passwordVersion || 0
      ) !==
      Number(
        user.passwordVersion || 0
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Tu contraseña fue modificada. Debes iniciar sesión nuevamente."
      });
    }

    const status =
      normalizeUpper(user.status);

    if (
      [
        "SUSPENDED",
        "BANNED",
        "DELETED"
      ].includes(status)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Cuenta suspendida o bloqueada."
      });
    }

    if (
      user.accountLockedUntil &&
      new Date(
        user.accountLockedUntil
      ) > new Date()
    ) {
      return res.status(423).json({
        success: false,
        message:
          "Cuenta bloqueada temporalmente por seguridad.",
        accountLockedUntil:
          user.accountLockedUntil
      });
    }

    if (
      shouldRequirePeriodicFaceCheck(
        user
      ) &&
      !user.requireFaceCheck
    ) {
      user =
        await prisma.user.update({
          where: {
            id: user.id
          },
          data: {
            requireFaceCheck: true,
            securityLevel:
              "ELEVATED"
          }
        });
    }

    req.user =
      toRequestUser(user);

    req.prismaUser = user;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Token inválido o expirado."
    });
  }
};

module.exports = authMiddleware;