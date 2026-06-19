const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");

const JWT_SECRET = process.env.JWT_SECRET || "quicksecure_secret_demo";

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No autorizado, token no enviado"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        buyerEnabled: true,
        sellerEnabled: true,
        isVerified: true,
        trustScore: true,
        status: true
      }
    });

    if (!user) {
      return res.status(401).json({
        message: "Usuario no encontrado"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado"
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({
      message: "Acceso solo para administradores"
    });
  }

  next();
};

module.exports = {
  protect,
  adminOnly
};