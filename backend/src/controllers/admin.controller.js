const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Dispute = require("../models/Dispute");
const FraudAlert = require("../models/FraudAlert");
const SecurityAlert = require("../models/SecurityAlert");
const Payment = require("../models/Payment");
const AuditLog = require("../models/AuditLog");

const { createAuditLog } = require("../services/audit.service");

const getAdminDashboard = async (req, res) => {
  try {
    const users = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const products = await Product.countDocuments();
    const orders = await Order.countDocuments();
    const disputes = await Dispute.countDocuments();
    const fraudAlerts = await FraudAlert.countDocuments();
    const securityAlerts = await SecurityAlert.countDocuments();
    const paymentsHeld = await Payment.countDocuments({ status: "HELD" });

    res.json({
      message: "Dashboard administrativo obtenido correctamente",
      resumen: {
        usuariosTotales: users,
        usuariosVerificados: verifiedUsers,
        productosTotales: products,
        ordenesTotales: orders,
        disputasTotales: disputes,
        alertasAntifraude: fraudAlerts,
        alertasSeguridad: securityAlerts,
        pagosRetenidosEscrow: paymentsHeld
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo dashboard administrativo",
      error: error.message
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      message: "Usuarios obtenidos correctamente",
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo usuarios",
      error: error.message
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("seller", "firstName lastName email trustScore isVerified")
      .sort({ createdAt: -1 });

    res.json({
      message: "Productos obtenidos correctamente",
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo productos",
      error: error.message
    });
  }
};

const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    user.status = "SUSPENDED";
    user.securityLevel = "LOCKED";
    user.accountLockedUntil = null;

    await user.save();

    await createAuditLog({
      req,
      action: "SUSPEND_USER",
      targetType: "USER",
      targetId: user._id.toString(),
      description: `Usuario suspendido. Motivo: ${reason || "No especificado"}`
    });

    res.json({
      message: "Usuario suspendido correctamente",
      reason: reason || "No especificado",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Error suspendiendo usuario",
      error: error.message
    });
  }
};

const activateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    user.status = "ACTIVE";
    user.securityLevel = "NORMAL";
    user.accountLockedUntil = null;

    await user.save();

    await createAuditLog({
      req,
      action: "ACTIVATE_USER",
      targetType: "USER",
      targetId: user._id.toString(),
      description: "Usuario activado nuevamente"
    });

    res.json({
      message: "Usuario activado correctamente",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Error activando usuario",
      error: error.message
    });
  }
};

const disableProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { reason } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    product.status = "DISABLED";

    await product.save();

    await createAuditLog({
      req,
      action: "DISABLE_PRODUCT",
      targetType: "PRODUCT",
      targetId: product._id.toString(),
      description: `Producto deshabilitado. Motivo: ${reason || "No especificado"}`
    });

    res.json({
      message: "Producto deshabilitado correctamente",
      reason: reason || "No especificado",
      product
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deshabilitando producto",
      error: error.message
    });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("actor", "firstName lastName email role")
      .sort({ createdAt: -1 });

    res.json({
      message: "Logs de auditoría obtenidos correctamente",
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo logs de auditoría",
      error: error.message
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const allowedRoles = [
      "USER",
      "ADMIN",
      "SENIOR_ADMIN",
      "AUDITOR",
      "VERIFICATION_AGENT"
    ];

    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Rol no válido"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    user.role = role;
    await user.save();

    await createAuditLog({
      req,
      action: "UPDATE_USER_ROLE",
      targetType: "USER",
      targetId: user._id.toString(),
      description: `Rol actualizado a ${role}`
    });

    res.json({
      message: "Rol de usuario actualizado correctamente",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Error actualizando rol de usuario",
      error: error.message
    });
  }
};

module.exports = {
  getAdminDashboard,
  getAllUsers,
  getAllProducts,
  suspendUser,
  activateUser,
  disableProduct,
  getAuditLogs,
  updateUserRole
};