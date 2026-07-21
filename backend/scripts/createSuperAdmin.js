const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Role = require("../src/models/Role");
const Permission = require("../src/models/Permission");

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const validateEnvironment = () => {
  const requiredVariables = [
    "MONGODB_URI",
    "SUPER_ADMIN_EMAIL",
    "SUPER_ADMIN_PASSWORD"
  ];

  const missingVariables = requiredVariables.filter(
    (variableName) => !process.env[variableName]
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Faltan variables en .env: ${missingVariables.join(", ")}`
    );
  }

  if (process.env.SUPER_ADMIN_PASSWORD.length < 12) {
    throw new Error(
      "SUPER_ADMIN_PASSWORD debe tener al menos 12 caracteres."
    );
  }
};

const getSuperAdminPermissions = async () => {
  const role = await Role.findOne({
    name: "SUPER_ADMIN"
  }).populate("permissions");

  if (!role) {
    console.warn(
      "⚠️ No existe el rol SUPER_ADMIN en la colección roles."
    );

    console.warn(
      "⚠️ La cuenta se creará con permissions: ['*']."
    );

    return ["*"];
  }

  const permissions = Array.isArray(role.permissions)
    ? role.permissions
        .map((permission) => permission?.code)
        .filter(Boolean)
    : [];

  return permissions.length > 0
    ? permissions
    : ["*"];
};

const createOrUpdateSuperAdmin = async () => {
  validateEnvironment();

  const email = normalizeEmail(
    process.env.SUPER_ADMIN_EMAIL
  );

  const password =
    process.env.SUPER_ADMIN_PASSWORD;

  const firstName =
    process.env.SUPER_ADMIN_FIRST_NAME ||
    "Engel";

  const lastName =
    process.env.SUPER_ADMIN_LAST_NAME ||
    "Feliz";

  const hashedPassword = await bcrypt.hash(
    password,
    12
  );

  const permissions =
    await getSuperAdminPermissions();

  const existingUser = await User.findOne({
    email
  }).select("+password");

  if (existingUser) {
    existingUser.firstName = firstName;
    existingUser.lastName = lastName;
    existingUser.password = hashedPassword;

    existingUser.accountType = "INTERNAL";
    existingUser.role = "SUPER_ADMIN";
    existingUser.department =
      "ADMINISTRATION";

    existingUser.permissions = permissions;

    existingUser.status = "ACTIVE";
    existingUser.securityLevel =
      "ELEVATED";

    existingUser.buyerEnabled = false;
    existingUser.sellerEnabled = false;

    existingUser.mustChangePassword =
      false;

    existingUser.failedLoginAttempts = 0;
    existingUser.accountLockedUntil = null;
    existingUser.suspensionReason = "";
    existingUser.suspendedAt = null;
    existingUser.suspendedBy = null;
    existingUser.bannedAt = null;
    existingUser.bannedBy = null;

    if (!existingUser.employeeCode) {
      existingUser.employeeCode =
        "QSM-SA-0001";
    }

    await existingUser.save();

    return {
      user: existingUser,
      action: "actualizada"
    };
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,

    accountType: "INTERNAL",
    role: "SUPER_ADMIN",
    department: "ADMINISTRATION",

    employeeCode: "QSM-SA-0001",

    permissions,

    status: "ACTIVE",
    securityLevel: "ELEVATED",

    buyerEnabled: false,
    sellerEnabled: false,

    mustChangePassword: false,

    isVerified: true,
    verificationStatus: "APPROVED",
    identityLevel: "BUSINESS",

    trustScore: 100,

    passwordChangedAt: new Date()
  });

  return {
    user,
    action: "creada"
  };
};

const run = async () => {
  try {
    console.log(
      "🔌 Conectando con MongoDB..."
    );

await connectDB();

    const result =
      await createOrUpdateSuperAdmin();

    console.log("");
    console.log(
      `✅ Cuenta SUPER_ADMIN ${result.action} correctamente.`
    );

    console.log(
      `📧 Correo: ${result.user.email}`
    );

    console.log(
      `👤 Rol: ${result.user.role}`
    );

    console.log(
      `🏢 Departamento: ${result.user.department}`
    );

    console.log(
      `🔑 Permisos: ${
        result.user.permissions.includes("*")
          ? "ACCESO TOTAL"
          : result.user.permissions.length
      }`
    );

    console.log(
      "🛡️ Estado: ACTIVO"
    );

    console.log("");
  } catch (error) {
    console.error("");
    console.error(
      "❌ No se pudo crear el Super Admin:"
    );

    console.error(error.message);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log(
      "🔌 Conexión MongoDB cerrada."
    );
  }
};

run();