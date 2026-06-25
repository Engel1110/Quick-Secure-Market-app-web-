const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado"
        });
      }

      if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Roles permitidos no configurados"
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "No tienes permisos para acceder a esta área"
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error validando permisos",
        error: error.message
      });
    }
  };
};

module.exports = requireRole;