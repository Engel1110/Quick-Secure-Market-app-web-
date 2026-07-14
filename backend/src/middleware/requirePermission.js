const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const extractPermissionCode = (
  permission
) => {
  if (!permission) {
    return "";
  }

  if (
    typeof permission === "string"
  ) {
    return normalizeValue(permission);
  }

  if (
    typeof permission.code === "string"
  ) {
    return normalizeValue(
      permission.code
    );
  }

  if (
    typeof permission.name === "string"
  ) {
    return normalizeValue(
      permission.name
    );
  }

  return "";
};

const getUserPermissions = (
  user
) => {
  if (
    !Array.isArray(
      user?.permissions
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      user.permissions
        .map(
          extractPermissionCode
        )
        .filter(Boolean)
    )
  ];
};

/**
 * Requiere que el usuario tenga todos los permisos indicados.
 *
 * Ejemplo:
 *
 * requirePermission(
 *   "INTERNAL_USERS_VIEW",
 *   "INTERNAL_USERS_UPDATE"
 * )
 */
const requirePermission = (
  ...requiredPermissions
) => {
  const normalizedRequiredPermissions =
    requiredPermissions
      .flat()
      .map(normalizeValue)
      .filter(Boolean);

  return (
    req,
    res,
    next
  ) => {
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Debes iniciar sesión para continuar."
        });
    }

    const role =
      normalizeValue(
        user.role
      );

    const accountType =
      normalizeValue(
        user.accountType
      );

    const status =
      normalizeValue(
        user.status ||
          "ACTIVE"
      );

    const userPermissions =
      getUserPermissions(user);

    const isSuperAdmin =
      role ===
        "SUPER_ADMIN" ||
      userPermissions.includes(
        "*"
      );

    const isInternalUser =
      accountType ===
        "INTERNAL" ||
      accountType ===
        "SYSTEM" ||
      role ===
        "SUPER_ADMIN";

    if (!isInternalUser) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Esta función está disponible únicamente para usuarios internos autorizados."
        });
    }

    if (
      status !== "ACTIVE"
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Tu cuenta administrativa no se encuentra activa.",
          status
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Super Admin
    |--------------------------------------------------------------------------
    | El Super Admin pasa cualquier validación de permisos.
    |--------------------------------------------------------------------------
    */

    if (isSuperAdmin) {
      return next();
    }

    /*
    |--------------------------------------------------------------------------
    | Ruta sin permisos específicos
    |--------------------------------------------------------------------------
    */

    if (
      normalizedRequiredPermissions.length ===
      0
    ) {
      return next();
    }

    /*
    |--------------------------------------------------------------------------
    | Verificación de permisos
    |--------------------------------------------------------------------------
    | Se exige que el usuario tenga todos los permisos solicitados.
    |--------------------------------------------------------------------------
    */

    const missingPermissions =
      normalizedRequiredPermissions.filter(
        (permission) =>
          !userPermissions.includes(
            permission
          )
      );

    if (
      missingPermissions.length >
      0
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "No tienes los permisos necesarios para realizar esta acción.",
          requiredPermissions:
            normalizedRequiredPermissions,
          missingPermissions
        });
    }

    return next();
  };
};

module.exports =
  requirePermission;