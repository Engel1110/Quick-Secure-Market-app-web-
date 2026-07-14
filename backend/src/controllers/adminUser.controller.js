const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const AuditLog = require("../models/AuditLog");

/*
|--------------------------------------------------------------------------
| Constantes
|--------------------------------------------------------------------------
*/

const INTERNAL_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SUPERVISOR",

  "AUDITOR",

  "DISPUTE_MANAGER",
  "DISPUTE_AGENT",

  "VERIFICATION_MANAGER",
  "VERIFICATION_AGENT",

  "WAREHOUSE_MANAGER",
  "WAREHOUSE_SUPERVISOR",
  "WAREHOUSE_STAFF",

  "DELIVERY_MANAGER",
  "DELIVERY_SUPERVISOR",
  "DELIVERY_AGENT",

  "FINANCE_MANAGER",
  "FINANCE_AGENT",

  "SECURITY_MANAGER",
  "SECURITY_ANALYST",

  "SUPPORT_MANAGER",
  "SUPPORT_AGENT",

  "MODERATION_MANAGER",
  "MODERATOR"
];

const INTERNAL_DEPARTMENTS = [
  "ADMINISTRATION",
  "WAREHOUSE",
  "DELIVERY",
  "FINANCE",
  "AUDIT",
  "DISPUTES",
  "SECURITY",
  "SUPPORT",
  "VERIFICATION",
  "MODERATION"
];

const ACCOUNT_STATUSES = [
  "ACTIVE",
  "PENDING",
  "SUSPENDED",
  "BANNED",
  "DELETED"
];

const DEPARTMENT_PREFIXES = {
  ADMINISTRATION: "AD",
  WAREHOUSE: "WH",
  DELIVERY: "DL",
  FINANCE: "FN",
  AUDIT: "AU",
  DISPUTES: "DS",
  SECURITY: "SC",
  SUPPORT: "SP",
  VERIFICATION: "VR",
  MODERATION: "MD"
};

/*
|--------------------------------------------------------------------------
| Utilidades generales
|--------------------------------------------------------------------------
*/

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeStatus = (value) => {
  const status = normalizeValue(value);

  /*
  |--------------------------------------------------------------------------
  | Compatibilidad con el frontend temporal
  |--------------------------------------------------------------------------
  */

  if (status === "INACTIVE") {
    return "PENDING";
  }

  return status;
};

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const escapeRegex = (value) =>
  String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

const getRequestIp = (req) =>
  String(
    req.headers["x-forwarded-for"] ||
      req.ip ||
      req.socket?.remoteAddress ||
      ""
  )
    .split(",")[0]
    .trim();

const getDeviceInfo = (req) =>
  String(req.headers["user-agent"] || "")
    .trim()
    .slice(0, 1000);

const getSecurityLevelForRole = (role) => {
  const normalizedRole = normalizeValue(role);

  if (
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "SENIOR_ADMIN" ||
    normalizedRole.includes("SECURITY") ||
    normalizedRole.includes("FINANCE")
  ) {
    return "ELEVATED";
  }

  return "NORMAL";
};

const generateTemporaryPassword = () => {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "@#$%!?";

  const randomCharacter = (characters) =>
    characters[
      Math.floor(Math.random() * characters.length)
    ];

  const requiredCharacters = [
    randomCharacter(uppercase),
    randomCharacter(lowercase),
    randomCharacter(numbers),
    randomCharacter(symbols)
  ];

  const allCharacters =
    uppercase + lowercase + numbers + symbols;

  while (requiredCharacters.length < 16) {
    requiredCharacters.push(
      randomCharacter(allCharacters)
    );
  }

  return requiredCharacters
    .sort(() => Math.random() - 0.5)
    .join("");
};

const validatePasswordComplexity = (password) => {
  const value = String(password || "");

  if (value.length < 12) {
    return {
      valid: false,
      message:
        "La contraseña debe tener al menos 12 caracteres."
    };
  }

  if (!/[A-Z]/.test(value)) {
    return {
      valid: false,
      message:
        "La contraseña debe incluir una letra mayúscula."
    };
  }

  if (!/[a-z]/.test(value)) {
    return {
      valid: false,
      message:
        "La contraseña debe incluir una letra minúscula."
    };
  }

  if (!/[0-9]/.test(value)) {
    return {
      valid: false,
      message:
        "La contraseña debe incluir un número."
    };
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    return {
      valid: false,
      message:
        "La contraseña debe incluir un símbolo."
    };
  }

  return {
    valid: true,
    message: ""
  };
};

/*
|--------------------------------------------------------------------------
| Generación de código de empleado
|--------------------------------------------------------------------------
*/

const generateEmployeeCode = async (department) => {
  const normalizedDepartment =
    normalizeValue(department);

  const prefix =
    DEPARTMENT_PREFIXES[
      normalizedDepartment
    ] || "IN";

  const codePrefix = `QSM-${prefix}-`;

  const existingUsers = await User.find({
    accountType: "INTERNAL",
    employeeCode: {
      $regex: `^${escapeRegex(codePrefix)}`
    }
  })
    .select("employeeCode")
    .lean();

  const usedNumbers = existingUsers
    .map((user) => {
      const match = String(
        user.employeeCode || ""
      ).match(/(\d+)$/);

      return match
        ? Number(match[1])
        : 0;
    })
    .filter(Number.isFinite);

  let nextNumber =
    usedNumbers.length > 0
      ? Math.max(...usedNumbers) + 1
      : 1;

  let employeeCode;

  do {
    employeeCode =
      `${codePrefix}${String(nextNumber).padStart(
        4,
        "0"
      )}`;

    nextNumber += 1;
  } while (
    await User.exists({
      employeeCode
    })
  );

  return employeeCode;
};

/*
|--------------------------------------------------------------------------
| Obtener permisos de un rol
|--------------------------------------------------------------------------
*/

const getRoleWithPermissions = async (roleName) => {
  const normalizedRole =
    normalizeValue(roleName);

  return Role.findOne({
    name: normalizedRole,
    isActive: true
  }).populate({
    path: "permissions",
    match: {
      isActive: true
    },
    select: "code name module"
  });
};

const getRolePermissionCodes = (roleDocument) => {
  if (
    !roleDocument ||
    !Array.isArray(roleDocument.permissions)
  ) {
    return [];
  }

  return [
    ...new Set(
      roleDocument.permissions
        .map((permission) =>
          normalizeValue(permission?.code)
        )
        .filter(Boolean)
    )
  ];
};

/*
|--------------------------------------------------------------------------
| Auditoría
|--------------------------------------------------------------------------
*/

const createAuditLog = async ({
  req,
  action,
  targetId,
  description
}) => {
  try {
    if (!req.user?._id) {
      return;
    }

    await AuditLog.create({
      actor: req.user._id,
      actorRole:
        normalizeValue(req.user.role),
      action,
      targetType: "USER",
      targetId:
        String(targetId || ""),
      description,
      ipAddress:
        getRequestIp(req),
      deviceInfo:
        getDeviceInfo(req)
    });
  } catch (error) {
    console.error(
      "No se pudo registrar la auditoría:",
      error.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| Protección de Super Admin
|--------------------------------------------------------------------------
*/

const getActiveSuperAdminCount = async () =>
  User.countDocuments({
    accountType: "INTERNAL",
    role: "SUPER_ADMIN",
    status: "ACTIVE"
  });

const actorIsSuperAdmin = (req) =>
  normalizeValue(req.user?.role) ===
    "SUPER_ADMIN" ||
  (
    Array.isArray(req.user?.permissions) &&
    req.user.permissions
      .map(normalizeValue)
      .includes("*")
  );

const canManageSuperAdmin = (req) =>
  actorIsSuperAdmin(req);

const ensureSuperAdminCanBeModified =
  async ({
    req,
    targetUser,
    requestedRole,
    requestedStatus
  }) => {
    const targetIsSuperAdmin =
      targetUser.role === "SUPER_ADMIN";

    if (
      targetIsSuperAdmin &&
      !canManageSuperAdmin(req)
    ) {
      return {
        allowed: false,
        statusCode: 403,
        message:
          "Solo un Super Admin puede modificar otra cuenta Super Admin."
      };
    }

    const changingAwayFromSuperAdmin =
      targetIsSuperAdmin &&
      requestedRole &&
      requestedRole !== "SUPER_ADMIN";

    const disablingSuperAdmin =
      targetIsSuperAdmin &&
      requestedStatus &&
      requestedStatus !== "ACTIVE";

    if (
      changingAwayFromSuperAdmin ||
      disablingSuperAdmin
    ) {
      const activeSuperAdmins =
        await getActiveSuperAdminCount();

      if (
        activeSuperAdmins <= 1 &&
        targetUser.status === "ACTIVE"
      ) {
        return {
          allowed: false,
          statusCode: 409,
          message:
            "No puedes modificar al último Super Admin activo del sistema."
        };
      }
    }

    return {
      allowed: true
    };
  };

/*
|--------------------------------------------------------------------------
| Formatear respuesta segura
|--------------------------------------------------------------------------
*/

const serializeInternalUser = (user) => {
  const object =
    typeof user.toJSON === "function"
      ? user.toJSON()
      : { ...user };

  delete object.password;
  delete object.resetPasswordToken;
  delete object.resetPasswordExpires;
  delete object.twoFactorSecret;
  delete object.profilePhotoPublicId;

  return object;
};

/*
|--------------------------------------------------------------------------
| GET /api/admin/internal-users
|--------------------------------------------------------------------------
*/

const getInternalUsers = async (req, res) => {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      100
    );

    const skip = (page - 1) * limit;

    const search = String(
      req.query.search || ""
    ).trim();

    const department =
      normalizeValue(req.query.department);

    const role =
      normalizeValue(req.query.role);

    const status =
      normalizeStatus(req.query.status);

    const sortBy = [
      "createdAt",
      "updatedAt",
      "firstName",
      "lastName",
      "email",
      "employeeCode",
      "lastLoginAt"
    ].includes(req.query.sortBy)
      ? req.query.sortBy
      : "createdAt";

    const sortOrder =
      String(req.query.sortOrder).toLowerCase() ===
      "asc"
        ? 1
        : -1;

    const query = {
      accountType: "INTERNAL"
    };

    if (
      department &&
      department !== "ALL"
    ) {
      query.department = department;
    }

    if (
      role &&
      role !== "ALL"
    ) {
      query.role = role;
    }

    if (
      status &&
      status !== "ALL"
    ) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(
        escapeRegex(search),
        "i"
      );

      query.$or = [
        {
          firstName: searchRegex
        },
        {
          lastName: searchRegex
        },
        {
          email: searchRegex
        },
        {
          employeeCode: searchRegex
        }
      ];
    }

    const [
      users,
      total,
      active,
      suspended,
      pending,
      banned
    ] = await Promise.all([
      User.find(query)
        .select("-password")
        .populate(
          "createdBy",
          "firstName lastName email employeeCode"
        )
        .populate(
          "lastModifiedBy",
          "firstName lastName email employeeCode"
        )
        .sort({
          [sortBy]: sortOrder
        })
        .skip(skip)
        .limit(limit),

      User.countDocuments(query),

      User.countDocuments({
        accountType: "INTERNAL",
        status: "ACTIVE"
      }),

      User.countDocuments({
        accountType: "INTERNAL",
        status: "SUSPENDED"
      }),

      User.countDocuments({
        accountType: "INTERNAL",
        status: "PENDING"
      }),

      User.countDocuments({
        accountType: "INTERNAL",
        status: "BANNED"
      })
    ]);

    return res.status(200).json({
      success: true,

      users: users.map(
        serializeInternalUser
      ),

      statistics: {
        total,
        active,
        suspended,
        inactive: pending,
        pending,
        banned
      },

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(total / limit),
        hasNextPage:
          page * limit < total,
        hasPreviousPage:
          page > 1
      }
    });
  } catch (error) {
    console.error(
      "Error obteniendo usuarios internos:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudieron obtener los usuarios internos."
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/admin/internal-users/:userId
|--------------------------------------------------------------------------
*/

const getInternalUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador del usuario no es válido."
      });
    }

    const user = await User.findOne({
      _id: userId,
      accountType: "INTERNAL"
    })
      .select("-password")
      .populate(
        "createdBy",
        "firstName lastName email employeeCode"
      )
      .populate(
        "lastModifiedBy",
        "firstName lastName email employeeCode"
      )
      .populate(
        "suspendedBy",
        "firstName lastName email employeeCode"
      )
      .populate(
        "bannedBy",
        "firstName lastName email employeeCode"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Usuario interno no encontrado."
      });
    }

    return res.status(200).json({
      success: true,
      user:
        serializeInternalUser(user)
    });
  } catch (error) {
    console.error(
      "Error obteniendo usuario interno:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo obtener el usuario interno."
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/admin/internal-users
|--------------------------------------------------------------------------
*/

const createInternalUser = async (req, res) => {
  try {
    const firstName = String(
      req.body.firstName || ""
    ).trim();

    const lastName = String(
      req.body.lastName || ""
    ).trim();

    const email =
      normalizeEmail(req.body.email);

    const department =
      normalizeValue(req.body.department);

    const role =
      normalizeValue(req.body.role);

    const requestedEmployeeCode =
      normalizeValue(
        req.body.employeeCode
      );

    const status =
      normalizeStatus(
        req.body.status || "ACTIVE"
      );

    const mustChangePassword =
      req.body.mustChangePassword !== false;

    const requestedPassword =
      String(
        req.body.temporaryPassword ||
        req.body.password ||
        ""
      );

    if (
      !firstName ||
      !lastName ||
      !email ||
      !department ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nombre, apellido, correo, departamento y rol son obligatorios."
      });
    }

    if (
      !INTERNAL_DEPARTMENTS.includes(
        department
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El departamento indicado no es válido."
      });
    }

    if (!INTERNAL_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message:
          "El rol administrativo indicado no es válido."
      });
    }

    if (!ACCOUNT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "El estado inicial no es válido."
      });
    }

    if (
      role === "SUPER_ADMIN" &&
      !actorIsSuperAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo un Super Admin puede crear otra cuenta Super Admin."
      });
    }

    const existingEmail =
      await User.exists({
        email
      });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          "Ya existe un usuario con ese correo electrónico."
      });
    }

    const employeeCode =
      requestedEmployeeCode ||
      (await generateEmployeeCode(
        department
      ));

    const existingEmployeeCode =
      await User.exists({
        employeeCode
      });

    if (existingEmployeeCode) {
      return res.status(409).json({
        success: false,
        message:
          "El código de empleado ya está registrado."
      });
    }

    const roleDocument =
      await getRoleWithPermissions(role);

    if (!roleDocument) {
      return res.status(400).json({
        success: false,
        message:
          `El rol ${role} no existe o está inactivo. Ejecuta primero el seed de roles.`
      });
    }

    const temporaryPassword =
      requestedPassword ||
      generateTemporaryPassword();

    const passwordValidation =
      validatePasswordComplexity(
        temporaryPassword
      );

    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          passwordValidation.message
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        temporaryPassword,
        12
      );

    const rolePermissions =
      role === "SUPER_ADMIN"
        ? ["*"]
        : getRolePermissionCodes(
            roleDocument
          );

    const createdUser =
      await User.create({
        firstName,
        lastName,
        email,
        password:
          hashedPassword,

        accountType:
          "INTERNAL",

        role,
        department,
        employeeCode,

        permissions:
          rolePermissions,

        status,

        securityLevel:
          getSecurityLevelForRole(
            role
          ),

        buyerEnabled:
          false,

        sellerEnabled:
          false,

        mustChangePassword,

        createdBy:
          req.user._id,

        lastModifiedBy:
          req.user._id,

        isVerified:
          true,

        verificationStatus:
          "APPROVED",

        identityLevel:
          role === "SUPER_ADMIN"
            ? "BUSINESS"
            : "LEVEL_1",

        trustScore:
          100,

        passwordChangedAt:
          new Date(),

        passwordVersion:
          0
      });

    await createAuditLog({
      req,
      action:
        "INTERNAL_USER_CREATED",
      targetId:
        createdUser._id,
      description:
        `Usuario interno ${createdUser.email} creado con rol ${createdUser.role} y departamento ${createdUser.department}.`
    });

    return res.status(201).json({
      success: true,
      message:
        "Usuario interno creado correctamente.",

      user:
        serializeInternalUser(
          createdUser
        ),

      credentials: {
        email:
          createdUser.email,

        temporaryPassword,

        mustChangePassword:
          createdUser.mustChangePassword
      }
    });
  } catch (error) {
    console.error(
      "Error creando usuario interno:",
      error
    );

    if (error.code === 11000) {
      const duplicatedField =
        Object.keys(
          error.keyPattern || {}
        )[0] || "dato";

      return res.status(409).json({
        success: false,
        message:
          `Ya existe un registro con el mismo ${duplicatedField}.`
      });
    }

    if (
      error.name ===
      "ValidationError"
    ) {
      const messages =
        Object.values(
          error.errors
        ).map(
          (item) =>
            item.message
        );

      return res.status(400).json({
        success: false,
        message:
          messages.join(" ")
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "No se pudo crear el usuario interno."
    });
  }
};

/*
|--------------------------------------------------------------------------
| PATCH /api/admin/internal-users/:userId
|--------------------------------------------------------------------------
*/

const updateInternalUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador del usuario no es válido."
      });
    }

    const user = await User.findOne({
      _id: userId,
      accountType: "INTERNAL"
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Usuario interno no encontrado."
      });
    }

    const editableFields = [
      "firstName",
      "lastName",
      "phone",
      "country",
      "province",
      "city",
      "address",
      "language",
      "timezone",
      "notificationsEnabled",
      "emailNotificationsEnabled",
      "mustChangePassword"
    ];

    editableFields.forEach((field) => {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {
        user[field] =
          req.body[field];
      }
    });

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "email"
      )
    ) {
      const email =
        normalizeEmail(
          req.body.email
        );

      const existingEmail =
        await User.exists({
          email,
          _id: {
            $ne: user._id
          }
        });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message:
            "Ya existe otro usuario con ese correo electrónico."
        });
      }

      user.email = email;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "employeeCode"
      )
    ) {
      const employeeCode =
        normalizeValue(
          req.body.employeeCode
        );

      const existingCode =
        await User.exists({
          employeeCode,
          _id: {
            $ne: user._id
          }
        });

      if (existingCode) {
        return res.status(409).json({
          success: false,
          message:
            "Ya existe otro usuario con ese código de empleado."
        });
      }

      user.employeeCode =
        employeeCode;
    }

    user.lastModifiedBy =
      req.user._id;

    await user.save();

    await createAuditLog({
      req,
      action:
        "INTERNAL_USER_UPDATED",
      targetId:
        user._id,
      description:
        `Información del usuario interno ${user.email} actualizada.`
    });

    return res.status(200).json({
      success: true,
      message:
        "Usuario interno actualizado correctamente.",
      user:
        serializeInternalUser(user)
    });
  } catch (error) {
    console.error(
      "Error actualizando usuario interno:",
      error
    );

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          Object.values(
            error.errors
          )
            .map(
              (item) =>
                item.message
            )
            .join(" ")
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "No se pudo actualizar el usuario interno."
    });
  }
};

/*
|--------------------------------------------------------------------------
| PATCH /api/admin/internal-users/:userId/status
|--------------------------------------------------------------------------
*/

const changeInternalUserStatus = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador del usuario no es válido."
      });
    }

    const requestedStatus =
      normalizeStatus(
        req.body.status
      );

    if (
      !ACCOUNT_STATUSES.includes(
        requestedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El estado solicitado no es válido."
      });
    }

    const user = await User.findOne({
      _id: userId,
      accountType: "INTERNAL"
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Usuario interno no encontrado."
      });
    }

    if (
      String(user._id) ===
        String(req.user._id) &&
      requestedStatus !== "ACTIVE"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "No puedes suspender, bloquear o desactivar tu propia cuenta."
      });
    }

    const protection =
      await ensureSuperAdminCanBeModified({
        req,
        targetUser: user,
        requestedStatus
      });

    if (!protection.allowed) {
      return res
        .status(
          protection.statusCode
        )
        .json({
          success: false,
          message:
            protection.message
        });
    }

    user.status =
      requestedStatus;

    user.lastModifiedBy =
      req.user._id;

    if (
      requestedStatus ===
      "SUSPENDED"
    ) {
      user.suspensionReason =
        String(
          req.body.reason ||
          "Suspendido por un administrador."
        )
          .trim()
          .slice(0, 1000);

      user.suspendedAt =
        new Date();

      user.suspendedBy =
        req.user._id;
    } else {
      user.suspensionReason = "";
      user.suspendedAt = null;
      user.suspendedBy = null;
    }

    if (
      requestedStatus ===
      "BANNED"
    ) {
      user.bannedAt =
        new Date();

      user.bannedBy =
        req.user._id;
    } else {
      user.bannedAt = null;
      user.bannedBy = null;
    }

    if (
      requestedStatus ===
      "DELETED"
    ) {
      user.deletedAt =
        new Date();

      user.deletedBy =
        req.user._id;

      user.deletionReason =
        String(
          req.body.reason ||
          "Cuenta desactivada administrativamente."
        )
          .trim()
          .slice(0, 1000);
    }

    /*
    |--------------------------------------------------------------------------
    | Invalidar sesiones
    |--------------------------------------------------------------------------
    */

    if (
      requestedStatus !==
      "ACTIVE"
    ) {
      user.passwordVersion =
        Number(
          user.passwordVersion || 0
        ) + 1;

      user.activeSessions = 0;
    }

    await user.save();

    await createAuditLog({
      req,
      action:
        "INTERNAL_USER_STATUS_CHANGED",
      targetId:
        user._id,
      description:
        `Estado del usuario interno ${user.email} cambiado a ${requestedStatus}.`
    });

    return res.status(200).json({
      success: true,
      message:
        "Estado del usuario actualizado correctamente.",
      user:
        serializeInternalUser(user)
    });
  } catch (error) {
    console.error(
      "Error cambiando estado del usuario:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo cambiar el estado del usuario."
    });
  }
};

/*
|--------------------------------------------------------------------------
| PATCH /api/admin/internal-users/:userId/role
|--------------------------------------------------------------------------
*/

const changeInternalUserRole = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador del usuario no es válido."
      });
    }

    const requestedRole =
      normalizeValue(
        req.body.role
      );

    const requestedDepartment =
      normalizeValue(
        req.body.department
      );

    if (
      !INTERNAL_ROLES.includes(
        requestedRole
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El rol solicitado no es válido."
      });
    }

    if (
      !INTERNAL_DEPARTMENTS.includes(
        requestedDepartment
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El departamento solicitado no es válido."
      });
    }

    if (
      requestedRole ===
        "SUPER_ADMIN" &&
      !actorIsSuperAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo un Super Admin puede asignar el rol Super Admin."
      });
    }

    const user = await User.findOne({
      _id: userId,
      accountType: "INTERNAL"
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Usuario interno no encontrado."
      });
    }

    const protection =
      await ensureSuperAdminCanBeModified({
        req,
        targetUser: user,
        requestedRole
      });

    if (!protection.allowed) {
      return res
        .status(
          protection.statusCode
        )
        .json({
          success: false,
          message:
            protection.message
        });
    }

    const roleDocument =
      await getRoleWithPermissions(
        requestedRole
      );

    if (!roleDocument) {
      return res.status(400).json({
        success: false,
        message:
          `El rol ${requestedRole} no existe o está inactivo.`
      });
    }

    user.role =
      requestedRole;

    user.department =
      requestedDepartment;

    user.permissions =
      requestedRole ===
      "SUPER_ADMIN"
        ? ["*"]
        : getRolePermissionCodes(
            roleDocument
          );

    user.securityLevel =
      getSecurityLevelForRole(
        requestedRole
      );

    user.lastModifiedBy =
      req.user._id;

    /*
    |--------------------------------------------------------------------------
    | Invalidar tokens anteriores
    |--------------------------------------------------------------------------
    */

    user.passwordVersion =
      Number(
        user.passwordVersion || 0
      ) + 1;

    await user.save();

    await createAuditLog({
      req,
      action:
        "INTERNAL_USER_ROLE_CHANGED",
      targetId:
        user._id,
      description:
        `Rol de ${user.email} cambiado a ${requestedRole} y departamento ${requestedDepartment}.`
    });

    return res.status(200).json({
      success: true,
      message:
        "Rol y departamento actualizados correctamente.",
      user:
        serializeInternalUser(user)
    });
  } catch (error) {
    console.error(
      "Error cambiando rol interno:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo cambiar el rol del usuario."
    });
  }
};

/*
|--------------------------------------------------------------------------
| PATCH /api/admin/internal-users/:userId/permissions
|--------------------------------------------------------------------------
*/

const assignInternalUserPermissions = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador del usuario no es válido."
      });
    }

    if (
      !Array.isArray(
        req.body.permissions
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Debes enviar una lista de permisos."
      });
    }

    const requestedPermissions = [
      ...new Set(
        req.body.permissions
          .map(normalizeValue)
          .filter(Boolean)
      )
    ];

    if (
      requestedPermissions.includes(
        "*"
      ) &&
      !actorIsSuperAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo un Super Admin puede asignar acceso total."
      });
    }

    const user = await User.findOne({
      _id: userId,
      accountType: "INTERNAL"
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Usuario interno no encontrado."
      });
    }

    if (
      user.role ===
        "SUPER_ADMIN" &&
      !actorIsSuperAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo un Super Admin puede modificar permisos de otro Super Admin."
      });
    }

    if (
      requestedPermissions.includes("*")
    ) {
      user.permissions = ["*"];
    } else {
      const activePermissions =
        await Permission.find({
          code: {
            $in: requestedPermissions
          },
          isActive: true
        }).select("code");

      const validPermissionCodes =
        activePermissions.map(
          (permission) =>
            permission.code
        );

      const invalidPermissions =
        requestedPermissions.filter(
          (code) =>
            !validPermissionCodes.includes(
              code
            )
        );

      if (
        invalidPermissions.length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Uno o más permisos no existen o están inactivos.",
          invalidPermissions
        });
      }

      user.permissions =
        validPermissionCodes;
    }

    user.lastModifiedBy =
      req.user._id;

    user.passwordVersion =
      Number(
        user.passwordVersion || 0
      ) + 1;

    await user.save();

    await createAuditLog({
      req,
      action:
        "INTERNAL_USER_PERMISSIONS_CHANGED",
      targetId:
        user._id,
      description:
        `Permisos administrativos de ${user.email} actualizados.`
    });

    return res.status(200).json({
      success: true,
      message:
        "Permisos actualizados correctamente.",
      user:
        serializeInternalUser(user)
    });
  } catch (error) {
    console.error(
      "Error asignando permisos:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudieron actualizar los permisos."
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/admin/internal-users/:userId/reset-password
|--------------------------------------------------------------------------
*/

const resetInternalUserPassword = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador del usuario no es válido."
      });
    }

    const user = await User.findOne({
      _id: userId,
      accountType: "INTERNAL"
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Usuario interno no encontrado."
      });
    }

    if (
      user.role ===
        "SUPER_ADMIN" &&
      !actorIsSuperAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo un Super Admin puede restablecer la contraseña de otro Super Admin."
      });
    }

    const temporaryPassword =
      String(
        req.body.temporaryPassword ||
        ""
      ) ||
      generateTemporaryPassword();

    const validation =
      validatePasswordComplexity(
        temporaryPassword
      );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message:
          validation.message
      });
    }

    user.password =
      await bcrypt.hash(
        temporaryPassword,
        12
      );

    user.mustChangePassword =
      req.body.mustChangePassword !== false;

    user.passwordChangedAt =
      new Date();

    user.passwordVersion =
      Number(
        user.passwordVersion || 0
      ) + 1;

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.activeSessions = 0;

    user.lastModifiedBy =
      req.user._id;

    await user.save();

    await createAuditLog({
      req,
      action:
        "INTERNAL_USER_PASSWORD_RESET",
      targetId:
        user._id,
      description:
        `Contraseña administrativa de ${user.email} restablecida.`
    });

    return res.status(200).json({
      success: true,
      message:
        "Contraseña restablecida correctamente.",

      credentials: {
        email:
          user.email,

        temporaryPassword,

        mustChangePassword:
          user.mustChangePassword
      }
    });
  } catch (error) {
    console.error(
      "Error restableciendo contraseña:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo restablecer la contraseña."
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/admin/internal-users/:userId/activity
|--------------------------------------------------------------------------
*/

const getInternalUserActivity = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador del usuario no es válido."
      });
    }

    const userExists =
      await User.exists({
        _id: userId,
        accountType: "INTERNAL"
      });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message:
          "Usuario interno no encontrado."
      });
    }

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      100
    );

    const skip =
      (page - 1) * limit;

    const query = {
      targetType: "USER",
      targetId:
        String(userId)
    };

    const [logs, total] =
      await Promise.all([
        AuditLog.find(query)
          .populate(
            "actor",
            "firstName lastName email role employeeCode"
          )
          .sort({
            createdAt: -1
          })
          .skip(skip)
          .limit(limit),

        AuditLog.countDocuments(
          query
        )
      ]);

    return res.status(200).json({
      success: true,
      activity: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(
      "Error obteniendo actividad:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo consultar la actividad del usuario."
    });
  }
};

module.exports = {
  getInternalUsers,
  getInternalUserById,
  createInternalUser,
  updateInternalUser,
  changeInternalUserStatus,
  changeInternalUserRole,
  assignInternalUserPermissions,
  resetInternalUserPassword,
  getInternalUserActivity
};