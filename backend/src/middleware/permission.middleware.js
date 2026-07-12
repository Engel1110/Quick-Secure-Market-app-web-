const normalizePermission = (permission) => {
  if (typeof permission === "string") {
    return permission.trim().toUpperCase();
  }

  if (
    permission &&
    typeof permission === "object" &&
    permission.code
  ) {
    return String(permission.code)
      .trim()
      .toUpperCase();
  }

  return "";
};

const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Debes iniciar sesión para continuar."
        });
      }

      const role = String(user.role || "")
        .trim()
        .toUpperCase();

      /*
       * Solo el SUPER_ADMIN evita las comprobaciones.
       * El SENIOR_ADMIN debe tener permisos asignados.
       */
      if (role === "SUPER_ADMIN") {
        return next();
      }

      const userPermissions = Array.isArray(
        user.permissions
      )
        ? user.permissions
            .map(normalizePermission)
            .filter(Boolean)
        : [];

      if (userPermissions.includes("*")) {
        return next();
      }

      const normalizedRequiredPermissions =
        requiredPermissions
          .map(normalizePermission)
          .filter(Boolean);

      /*
       * Si una ruta no especificó permisos,
       * basta con estar autenticado.
       */
      if (
        normalizedRequiredPermissions.length === 0
      ) {
        return next();
      }

      const hasAllPermissions =
        normalizedRequiredPermissions.every(
          (requiredPermission) =>
            userPermissions.includes(
              requiredPermission
            )
        );

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message:
            "No tienes los permisos necesarios para realizar esta acción.",
          requiredPermissions:
            normalizedRequiredPermissions
        });
      }

      return next();
    } catch (error) {
      console.error(
        "Error verificando permisos:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "No se pudieron validar los permisos del usuario."
      });
    }
  };
};

module.exports = requirePermission;