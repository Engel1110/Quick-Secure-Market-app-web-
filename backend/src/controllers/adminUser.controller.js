const bcrypt = require("bcryptjs");
const {
  prisma,
  parsePositiveInt,
  normalizeEmail,
  getRequestUserId,
  sanitizeUser,
  getClientIp,
  getDeviceInfo,
  isPrismaError
} = require("../utils/prismaCompat");

const INTERNAL_ROLES = [
  "SUPER_ADMIN", "SENIOR_ADMIN", "ADMIN", "SUPERVISOR", "AUDITOR",
  "DISPUTE_MANAGER", "DISPUTE_AGENT", "VERIFICATION_MANAGER", "VERIFICATION_AGENT",
  "WAREHOUSE_MANAGER", "WAREHOUSE_SUPERVISOR", "WAREHOUSE_STAFF",
  "DELIVERY_MANAGER", "DELIVERY_SUPERVISOR", "DELIVERY_AGENT",
  "FINANCE_MANAGER", "FINANCE_AGENT", "SECURITY_MANAGER", "SECURITY_ANALYST",
  "SUPPORT_MANAGER", "SUPPORT_AGENT", "MODERATION_MANAGER", "MODERATOR"
];

const INTERNAL_DEPARTMENTS = [
  "ADMINISTRATION", "WAREHOUSE", "DELIVERY", "FINANCE", "AUDIT",
  "DISPUTES", "SECURITY", "SUPPORT", "VERIFICATION", "MODERATION"
];

const ACCOUNT_STATUSES = ["ACTIVE", "PENDING", "SUSPENDED", "BANNED", "DELETED"];
const DEPARTMENT_PREFIXES = { ADMINISTRATION: "AD", WAREHOUSE: "WH", DELIVERY: "DL", FINANCE: "FN", AUDIT: "AU", DISPUTES: "DS", SECURITY: "SC", SUPPORT: "SP", VERIFICATION: "VR", MODERATION: "MD" };

const COMMON_VIEW_PERMISSIONS = [
  "INTERNAL_USERS_VIEW", "INTERNAL_USERS_VIEW_ACTIVITY", "SYSTEM_SETTINGS_VIEW", "SYSTEM_STATUS_VIEW"
];

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ["*"],
  SENIOR_ADMIN: [
    ...COMMON_VIEW_PERMISSIONS,
    "INTERNAL_USERS_CREATE",
    "INTERNAL_USERS_UPDATE",
    "INTERNAL_USERS_SUSPEND",
    "INTERNAL_USERS_ACTIVATE",
    "INTERNAL_USERS_CHANGE_ROLE",
    "INTERNAL_USERS_ASSIGN_PERMISSIONS",
    "INTERNAL_USERS_RESET_PASSWORD",
    "SYSTEM_SETTINGS_UPDATE",
    "SYSTEM_SETTINGS_RESET"
  ],
  ADMIN: [
    ...COMMON_VIEW_PERMISSIONS,
    "INTERNAL_USERS_CREATE",
    "INTERNAL_USERS_UPDATE",
    "INTERNAL_USERS_SUSPEND",
    "INTERNAL_USERS_ACTIVATE",
    "INTERNAL_USERS_RESET_PASSWORD",
    "SYSTEM_SETTINGS_UPDATE"
  ],
  SUPERVISOR: COMMON_VIEW_PERMISSIONS,
  AUDITOR: [
    "INTERNAL_USERS_VIEW",
    "INTERNAL_USERS_VIEW_ACTIVITY",
    "SYSTEM_SETTINGS_VIEW",
    "SYSTEM_STATUS_VIEW"
  ]
};

const normalizeValue = (value) => String(value || "").trim().toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
const normalizeStatus = (value) => normalizeValue(value) === "INACTIVE" ? "PENDING" : normalizeValue(value);
const hasOwn = (object, field) => Object.prototype.hasOwnProperty.call(object || {}, field);

function getSecurityLevelForRole(role) {
  const value = normalizeValue(role);
  return value === "SUPER_ADMIN" || value === "SENIOR_ADMIN" || value.includes("SECURITY") || value.includes("FINANCE") ? "ELEVATED" : "NORMAL";
}

function generateTemporaryPassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "@#$%!?" ];
  const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];
  const chars = sets.map(pick);
  const all = sets.join("");
  while (chars.length < 16) chars.push(pick(all));
  return chars.sort(() => Math.random() - 0.5).join("");
}

function validatePasswordComplexity(password) {
  const value = String(password || "");
  if (value.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
  if (!/[A-Z]/.test(value)) return "La contraseña debe incluir una letra mayúscula.";
  if (!/[a-z]/.test(value)) return "La contraseña debe incluir una letra minúscula.";
  if (!/[0-9]/.test(value)) return "La contraseña debe incluir un número.";
  if (!/[^A-Za-z0-9]/.test(value)) return "La contraseña debe incluir un símbolo.";
  return "";
}

function rolePermissions(role) {
  return [...new Set(ROLE_PERMISSIONS[role] || COMMON_VIEW_PERMISSIONS)];
}

function serializeInternalUser(user) {
  return sanitizeUser(user);
}

function actorIsSuperAdmin(req) {
  return normalizeValue(req.user?.role) === "SUPER_ADMIN" || (Array.isArray(req.user?.permissions) && req.user.permissions.map(normalizeValue).includes("*"));
}

async function audit(req, action, targetId, description) {
  try {
    const actorId = await getRequestUserId(req);
    await prisma.auditLog.create({
      data: {
        actorId,
        actorName: [req.user?.firstName, req.user?.lastName].filter(Boolean).join(" "),
        actorRole: normalizeValue(req.user?.role),
        module: "ADMINISTRATION",
        action,
        description,
        entityType: "USER",
        entityId: String(targetId || ""),
        method: String(req.method || ""),
        endpoint: String(req.originalUrl || ""),
        ipAddress: getClientIp(req),
        deviceInfo: getDeviceInfo(req),
        severity: "MEDIUM",
        status: "SUCCESS",
        metadata: {}
      }
    });
  } catch (error) {
    console.error("No se pudo registrar la auditoría:", error.message);
  }
}

async function generateEmployeeCode(department) {
  const prefix = DEPARTMENT_PREFIXES[department] || "IN";
  const codePrefix = `QSM-${prefix}-`;
  const users = await prisma.user.findMany({ where: { accountType: "INTERNAL", employeeCode: { startsWith: codePrefix } }, select: { employeeCode: true } });
  const used = users.map((user) => Number(String(user.employeeCode || "").match(/(\d+)$/)?.[1] || 0));
  let number = used.length ? Math.max(...used) + 1 : 1;
  while (true) {
    const code = `${codePrefix}${String(number).padStart(4, "0")}`;
    const exists = await prisma.user.findFirst({ where: { employeeCode: code }, select: { id: true } });
    if (!exists) return code;
    number += 1;
  }
}

async function protectSuperAdmin(req, target, requestedRole, requestedStatus) {
  if (target.role === "SUPER_ADMIN" && !actorIsSuperAdmin(req)) return "Solo un Super Admin puede modificar otra cuenta Super Admin.";
  const removing = target.role === "SUPER_ADMIN" && ((requestedRole && requestedRole !== "SUPER_ADMIN") || (requestedStatus && requestedStatus !== "ACTIVE"));
  if (removing && target.status === "ACTIVE") {
    const count = await prisma.user.count({ where: { accountType: "INTERNAL", role: "SUPER_ADMIN", status: "ACTIVE" } });
    if (count <= 1) return "No puedes modificar al último Super Admin activo del sistema.";
  }
  return "";
}

async function getInternalUsers(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const search = String(req.query.search || "").trim();
    const department = normalizeValue(req.query.department);
    const role = normalizeValue(req.query.role);
    const status = normalizeStatus(req.query.status);
    const sortBy = ["createdAt", "updatedAt", "firstName", "lastName", "email", "employeeCode", "lastLoginAt"].includes(req.query.sortBy) ? req.query.sortBy : "createdAt";
    const sortOrder = String(req.query.sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

    const where = {
      accountType: "INTERNAL",
      ...(department && department !== "ALL" ? { department } : {}),
      ...(role && role !== "ALL" ? { role } : {}),
      ...(status && status !== "ALL" ? { status } : {}),
      ...(search ? { OR: ["firstName", "lastName", "email", "employeeCode"].map((field) => ({ [field]: { contains: search, mode: "insensitive" } })) } : {})
    };

    const [users, total, active, suspended, pending, banned] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { accountType: "INTERNAL", status: "ACTIVE" } }),
      prisma.user.count({ where: { accountType: "INTERNAL", status: "SUSPENDED" } }),
      prisma.user.count({ where: { accountType: "INTERNAL", status: "PENDING" } }),
      prisma.user.count({ where: { accountType: "INTERNAL", status: "BANNED" } })
    ]);

    return res.status(200).json({
      success: true,
      users: users.map(serializeInternalUser),
      statistics: { total, active, suspended, inactive: pending, pending, banned },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 }
    });
  } catch (error) {
    console.error("Error obteniendo usuarios internos:", error);
    return res.status(500).json({ success: false, message: "No se pudieron obtener los usuarios internos." });
  }
}

async function getInternalUserById(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    if (!id) return res.status(400).json({ success: false, message: "El identificador del usuario no es válido." });
    const user = await prisma.user.findFirst({ where: { id, accountType: "INTERNAL" } });
    if (!user) return res.status(404).json({ success: false, message: "Usuario interno no encontrado." });
    return res.status(200).json({ success: true, user: serializeInternalUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "No se pudo obtener el usuario interno." });
  }
}

async function createInternalUser(req, res) {
  try {
    const firstName = String(req.body?.firstName || "").trim();
    const lastName = String(req.body?.lastName || "").trim();
    const email = normalizeEmail(req.body?.email);
    const department = normalizeValue(req.body?.department);
    const role = normalizeValue(req.body?.role);
    const status = normalizeStatus(req.body?.status || "ACTIVE");
    if (!firstName || !lastName || !email || !department || !role) return res.status(400).json({ success: false, message: "Nombre, apellido, correo, departamento y rol son obligatorios." });
    if (!INTERNAL_DEPARTMENTS.includes(department)) return res.status(400).json({ success: false, message: "El departamento indicado no es válido." });
    if (!INTERNAL_ROLES.includes(role)) return res.status(400).json({ success: false, message: "El rol administrativo indicado no es válido." });
    if (!ACCOUNT_STATUSES.includes(status)) return res.status(400).json({ success: false, message: "El estado inicial no es válido." });
    if (role === "SUPER_ADMIN" && !actorIsSuperAdmin(req)) return res.status(403).json({ success: false, message: "Solo un Super Admin puede crear otra cuenta Super Admin." });

    const employeeCode = normalizeValue(req.body?.employeeCode) || await generateEmployeeCode(department);
    const duplicate = await prisma.user.findFirst({ where: { OR: [{ email }, { employeeCode }] } });
    if (duplicate) return res.status(409).json({ success: false, message: duplicate.email === email ? "Ya existe un usuario con ese correo electrónico." : "El código de empleado ya está registrado." });

    const temporaryPassword = String(req.body?.temporaryPassword || req.body?.password || "") || generateTemporaryPassword();
    const passwordError = validatePasswordComplexity(temporaryPassword);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });
    const actorId = await getRequestUserId(req);
    const created = await prisma.user.create({
      data: {
        firstName, lastName, email, password: await bcrypt.hash(temporaryPassword, 12),
        accountType: "INTERNAL", role, department, departments: [department], employeeCode,
        permissions: rolePermissions(role), status, securityLevel: getSecurityLevelForRole(role),
        buyerEnabled: false, sellerEnabled: false, mustChangePassword: req.body?.mustChangePassword !== false,
        createdById: actorId, lastModifiedById: actorId, isVerified: true, verificationStatus: "APPROVED",
        identityLevel: role === "SUPER_ADMIN" ? "BUSINESS" : "LEVEL_1", trustScore: 100,
        passwordChangedAt: new Date(), passwordVersion: 0, registrationCompleted: true, registrationCompletedAt: new Date(), onboardingStatus: "COMPLETED"
      }
    });
    await audit(req, "INTERNAL_USER_CREATED", created.id, `Usuario interno ${created.email} creado con rol ${created.role} y departamento ${created.department}.`);
    return res.status(201).json({ success: true, message: "Usuario interno creado correctamente.", user: serializeInternalUser(created), credentials: { email: created.email, temporaryPassword, mustChangePassword: created.mustChangePassword } });
  } catch (error) {
    console.error("Error creando usuario interno:", error);
    if (isPrismaError(error, "P2002")) return res.status(409).json({ success: false, message: "Ya existe un registro con esos datos." });
    return res.status(500).json({ success: false, message: "No se pudo crear el usuario interno." });
  }
}

async function updateInternalUser(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    if (!id) return res.status(400).json({ success: false, message: "El identificador del usuario no es válido." });
    const current = await prisma.user.findFirst({ where: { id, accountType: "INTERNAL" } });
    if (!current) return res.status(404).json({ success: false, message: "Usuario interno no encontrado." });
    const data = {};
    for (const field of ["firstName", "lastName", "phone", "country", "province", "city", "address", "language", "timezone", "notificationsEnabled", "emailNotificationsEnabled", "mustChangePassword"]) {
      if (hasOwn(req.body, field)) data[field] = req.body[field];
    }
    if (hasOwn(req.body, "email")) data.email = normalizeEmail(req.body.email);
    if (hasOwn(req.body, "employeeCode")) data.employeeCode = normalizeValue(req.body.employeeCode);
    data.lastModifiedById = await getRequestUserId(req);
    const user = await prisma.user.update({ where: { id }, data });
    await audit(req, "INTERNAL_USER_UPDATED", id, `Información del usuario interno ${user.email} actualizada.`);
    return res.status(200).json({ success: true, message: "Usuario interno actualizado correctamente.", user: serializeInternalUser(user) });
  } catch (error) {
    if (isPrismaError(error, "P2002")) return res.status(409).json({ success: false, message: "Ya existe otro usuario con ese correo o código de empleado." });
    return res.status(500).json({ success: false, message: "No se pudo actualizar el usuario interno." });
  }
}

async function changeInternalUserStatus(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    const status = normalizeStatus(req.body?.status);
    if (!id) return res.status(400).json({ success: false, message: "El identificador del usuario no es válido." });
    if (!ACCOUNT_STATUSES.includes(status)) return res.status(400).json({ success: false, message: "El estado solicitado no es válido." });
    const current = await prisma.user.findFirst({ where: { id, accountType: "INTERNAL" } });
    if (!current) return res.status(404).json({ success: false, message: "Usuario interno no encontrado." });
    const actorId = await getRequestUserId(req);
    if (id === actorId && status !== "ACTIVE") return res.status(409).json({ success: false, message: "No puedes suspender, bloquear o desactivar tu propia cuenta." });
    const protection = await protectSuperAdmin(req, current, null, status);
    if (protection) return res.status(protection.includes("último") ? 409 : 403).json({ success: false, message: protection });
    const now = new Date();
    const data = {
      status,
      lastModifiedById: actorId,
      suspensionReason: status === "SUSPENDED" ? String(req.body?.reason || "Suspendido por un administrador.").trim().slice(0, 1000) : "",
      suspendedAt: status === "SUSPENDED" ? now : null,
      suspendedById: status === "SUSPENDED" ? actorId : null,
      bannedAt: status === "BANNED" ? now : null,
      bannedById: status === "BANNED" ? actorId : null,
      ...(status === "DELETED" ? { deletedAt: now, deletedById: actorId, deletionReason: String(req.body?.reason || "Cuenta desactivada administrativamente.").trim().slice(0, 1000) } : {}),
      ...(status !== "ACTIVE" ? { passwordVersion: { increment: 1 }, activeSessions: 0 } : {})
    };
    const user = await prisma.user.update({ where: { id }, data });
    await audit(req, "INTERNAL_USER_STATUS_CHANGED", id, `Estado del usuario interno ${user.email} cambiado a ${status}.`);
    return res.status(200).json({ success: true, message: "Estado del usuario actualizado correctamente.", user: serializeInternalUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "No se pudo cambiar el estado del usuario." });
  }
}

async function changeInternalUserRole(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    const role = normalizeValue(req.body?.role);
    const department = normalizeValue(req.body?.department);
    if (!id) return res.status(400).json({ success: false, message: "El identificador del usuario no es válido." });
    if (!INTERNAL_ROLES.includes(role)) return res.status(400).json({ success: false, message: "El rol solicitado no es válido." });
    if (!INTERNAL_DEPARTMENTS.includes(department)) return res.status(400).json({ success: false, message: "El departamento solicitado no es válido." });
    if (role === "SUPER_ADMIN" && !actorIsSuperAdmin(req)) return res.status(403).json({ success: false, message: "Solo un Super Admin puede asignar ese rol." });
    const current = await prisma.user.findFirst({ where: { id, accountType: "INTERNAL" } });
    if (!current) return res.status(404).json({ success: false, message: "Usuario interno no encontrado." });
    const protection = await protectSuperAdmin(req, current, role, null);
    if (protection) return res.status(protection.includes("último") ? 409 : 403).json({ success: false, message: protection });
    const user = await prisma.user.update({
      where: { id },
      data: { role, department, departments: [department], permissions: rolePermissions(role), securityLevel: getSecurityLevelForRole(role), lastModifiedById: await getRequestUserId(req), passwordVersion: { increment: 1 } }
    });
    await audit(req, "INTERNAL_USER_ROLE_CHANGED", id, `Rol de ${user.email} cambiado a ${role} y departamento ${department}.`);
    return res.status(200).json({ success: true, message: "Rol y departamento actualizados correctamente.", user: serializeInternalUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "No se pudo cambiar el rol del usuario." });
  }
}

async function assignInternalUserPermissions(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    if (!id) return res.status(400).json({ success: false, message: "El identificador del usuario no es válido." });
    if (!Array.isArray(req.body?.permissions)) return res.status(400).json({ success: false, message: "Debes enviar una lista de permisos." });
    const permissions = [...new Set(req.body.permissions.map(normalizeValue).filter(Boolean))];
    if (permissions.includes("*") && !actorIsSuperAdmin(req)) return res.status(403).json({ success: false, message: "Solo un Super Admin puede asignar acceso total." });
    const current = await prisma.user.findFirst({ where: { id, accountType: "INTERNAL" } });
    if (!current) return res.status(404).json({ success: false, message: "Usuario interno no encontrado." });
    if (current.role === "SUPER_ADMIN" && !actorIsSuperAdmin(req)) return res.status(403).json({ success: false, message: "Solo un Super Admin puede modificar permisos de otro Super Admin." });
    const user = await prisma.user.update({ where: { id }, data: { permissions, lastModifiedById: await getRequestUserId(req), passwordVersion: { increment: 1 } } });
    await audit(req, "INTERNAL_USER_PERMISSIONS_CHANGED", id, `Permisos administrativos de ${user.email} actualizados.`);
    return res.status(200).json({ success: true, message: "Permisos actualizados correctamente.", user: serializeInternalUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "No se pudieron actualizar los permisos." });
  }
}

async function resetInternalUserPassword(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    if (!id) return res.status(400).json({ success: false, message: "El identificador del usuario no es válido." });
    const current = await prisma.user.findFirst({ where: { id, accountType: "INTERNAL" } });
    if (!current) return res.status(404).json({ success: false, message: "Usuario interno no encontrado." });
    if (current.role === "SUPER_ADMIN" && !actorIsSuperAdmin(req)) return res.status(403).json({ success: false, message: "Solo un Super Admin puede restablecer la contraseña de otro Super Admin." });
    const temporaryPassword = String(req.body?.temporaryPassword || "") || generateTemporaryPassword();
    const passwordError = validatePasswordComplexity(temporaryPassword);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });
    const user = await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: req.body?.mustChangePassword !== false, passwordChangedAt: new Date(), passwordVersion: { increment: 1 }, failedLoginAttempts: 0, accountLockedUntil: null, activeSessions: 0, lastModifiedById: await getRequestUserId(req) }
    });
    await audit(req, "INTERNAL_USER_PASSWORD_RESET", id, `Contraseña administrativa de ${user.email} restablecida.`);
    return res.status(200).json({ success: true, message: "Contraseña restablecida correctamente.", credentials: { email: user.email, temporaryPassword, mustChangePassword: user.mustChangePassword } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "No se pudo restablecer la contraseña." });
  }
}

async function getInternalUserActivity(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    if (!id) return res.status(400).json({ success: false, message: "El identificador del usuario no es válido." });
    const exists = await prisma.user.findFirst({ where: { id, accountType: "INTERNAL" }, select: { id: true } });
    if (!exists) return res.status(404).json({ success: false, message: "Usuario interno no encontrado." });
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const where = { entityType: "USER", entityId: String(id) };
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, include: { actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true, employeeCode: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.auditLog.count({ where })
    ]);
    const activity = logs.map((log) => ({ ...log, _id: String(log.id), actor: log.actor ? { ...log.actor, _id: String(log.actor.id) } : null, targetType: log.entityType, targetId: log.entityId }));
    return res.status(200).json({ success: true, activity, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "No se pudo consultar la actividad del usuario." });
  }
}

module.exports = { getInternalUsers, getInternalUserById, createInternalUser, updateInternalUser, changeInternalUserStatus, changeInternalUserRole, assignInternalUserPermissions, resetInternalUserPassword, getInternalUserActivity };
