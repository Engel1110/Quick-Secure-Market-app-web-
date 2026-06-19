const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");

const JWT_SECRET = process.env.JWT_SECRET || "quicksecure_secret_demo";

const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      documentId
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "Nombre, apellido, correo y contraseña son obligatorios"
      });
    }

    const userExists = await prisma.user.findUnique({
      where: { email }
    });

    if (userExists) {
      return res.status(400).json({
        message: "Este correo ya está registrado"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        documentId,
        role: "USER",
        buyerEnabled: true,
        sellerEnabled: true,
        isVerified: false,
        trustScore: 50,
        status: "PENDING"
      },
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
        status: true,
        createdAt: true
      }
    });

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      user
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error interno registrando usuario"
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Correo y contraseña son obligatorios"
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        message: "Credenciales incorrectas"
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return res.status(401).json({
        message: "Credenciales incorrectas"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login correcto",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        buyerEnabled: user.buyerEnabled,
        sellerEnabled: user.sellerEnabled,
        isVerified: user.isVerified,
        trustScore: user.trustScore,
        status: user.status
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error interno iniciando sesión"
    });
  }
};

const me = async (req, res) => {
  return res.json({
    user: req.user
  });
};

module.exports = {
  register,
  login,
  me
};