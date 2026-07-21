const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const crypto = require("crypto");

const User = require("../models/User");
const SecurityAlert = require("../models/SecurityAlert");
const SessionLog = require("../models/SessionLog");
const AuditLog = require("../models/AuditLog");

const {
  sendPasswordResetEmail,
  sendPasswordChangedEmail
} = require("../services/email.service");

/*
|--------------------------------------------------------------------------
| Configuración de seguridad
|--------------------------------------------------------------------------
*/

const FACE_CHECK_INTERVAL_HOURS = 72;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 30;
const RESET_TOKEN_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

/*
|--------------------------------------------------------------------------
| Roles autorizados para BackOffice
|--------------------------------------------------------------------------
*/

const INTERNAL_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SUPERVISOR",

  "WAREHOUSE_MANAGER",
  "WAREHOUSE_SUPERVISOR",
  "WAREHOUSE_STAFF",

  "DELIVERY_MANAGER",
  "DELIVERY_SUPERVISOR",
  "DELIVERY_AGENT",

  "FINANCE_MANAGER",
  "FINANCE_AGENT",

  "AUDITOR",

  "DISPUTE_MANAGER",
  "DISPUTE_AGENT",

  "VERIFICATION_MANAGER",
  "VERIFICATION_AGENT",

  "SECURITY_MANAGER",
  "SECURITY_ANALYST",

  "SUPPORT_MANAGER",
  "SUPPORT_AGENT",

  "MODERATION_MANAGER",
  "MODERATOR"
];

/*
|--------------------------------------------------------------------------
| Departamentos administrativos
|--------------------------------------------------------------------------
*/

const ALL_ADMIN_DEPARTMENTS = [
  "ADMINISTRATION",
  "WAREHOUSE",
  "DELIVERY",
  "FINANCE",
  "AUDIT",
  "DISPUTES",
  "VERIFICATION",
  "SECURITY",
  "SUPPORT",
  "MODERATION"
];

/*
|--------------------------------------------------------------------------
| Normalización
|--------------------------------------------------------------------------
*/

const normalizeUpperValue = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const normalizeEmail = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const normalizeName = (value) => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
};

const normalizePhone = (value) => {
  return String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");
};

const normalizeDocumentId = (value) => {
  return String(value || "")
    .replace(/\D/g, "")
    .trim();
};

const sanitizeText = (
  value,
  maximumLength = 500
) => {
  return validator.escape(
    String(value || "")
      .trim()
      .slice(0, maximumLength)
  );
};

/*
|--------------------------------------------------------------------------
| Validaciones
|--------------------------------------------------------------------------
*/

const isStrongPassword = (password) => {
  return validator.isStrongPassword(
    String(password || ""),
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    }
  );
};

const isValidDominicanDocument = (
  documentId
) => {
  return /^\d{11}$/.test(
    normalizeDocumentId(documentId)
  );
};

const hasRequiredRegistrationFiles = (
  uploads
) => {
  return Boolean(
    uploads.profilePhoto &&
      uploads.cedulaFront &&
      uploads.cedulaBack
  );
};

/*
|--------------------------------------------------------------------------
| JWT
|--------------------------------------------------------------------------
*/

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET no está definido en el archivo backend/.env."
    );
  }

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      passwordVersion: Number(
        user.passwordVersion || 0
      )
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN ||
        "1d"
    }
  );
};

/*
|--------------------------------------------------------------------------
| Token de recuperación
|--------------------------------------------------------------------------
*/

const hashResetToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
};

/*
|--------------------------------------------------------------------------
| Información de solicitud
|--------------------------------------------------------------------------
*/

const getClientIp = (req) => {
  const forwarded =
    req.headers["x-forwarded-for"];

  if (forwarded) {
    return String(forwarded)
      .split(",")[0]
      .trim();
  }

  return String(
    req.socket?.remoteAddress ||
      req.ip ||
      ""
  ).slice(0, 100);
};

const getDeviceInfo = (req) => {
  return String(
    req.headers["user-agent"] ||
      "Dispositivo desconocido"
  ).slice(0, 300);
};

/*
|--------------------------------------------------------------------------
| Archivos de registro KYC
|--------------------------------------------------------------------------
*/

const getFirstUploadedFile = (
  files,
  fieldName
) => {
  if (!files) {
    return null;
  }

  if (
    Array.isArray(files[fieldName]) &&
    files[fieldName].length > 0
  ) {
    return files[fieldName][0];
  }

  if (Array.isArray(files)) {
    return (
      files.find(
        (file) =>
          file.fieldname === fieldName
      ) || null
    );
  }

  return null;
};

const getUploadedFileUrl = (file) => {
  if (!file) {
    return "";
  }

  return String(
    file.path ||
      file.secure_url ||
      file.url ||
      file.location ||
      file.filename ||
      ""
  ).trim();
};

const getUploadedFilePublicId = (
  file
) => {
  if (!file) {
    return "";
  }

  return String(
    file.public_id ||
      file.publicId ||
      file.filename ||
      ""
  ).trim();
};

const getIdentityUploads = (req) => {
  const source =
    req.identityUploads || {};

  const profilePhotoFile =
    source.profilePhoto ||
    getFirstUploadedFile(
      req.files,
      "profilePhoto"
    );

  const cedulaFrontFile =
    source.cedulaFront ||
    getFirstUploadedFile(
      req.files,
      "cedulaFront"
    );

  const cedulaBackFile =
    source.cedulaBack ||
    getFirstUploadedFile(
      req.files,
      "cedulaBack"
    );

  const selfieFile =
    source.selfie ||
    getFirstUploadedFile(
      req.files,
      "selfie"
    );

  return {
    profilePhoto: getUploadedFileUrl(
      profilePhotoFile
    ),

    profilePhotoPublicId:
      getUploadedFilePublicId(
        profilePhotoFile
      ),

    cedulaFront: getUploadedFileUrl(
      cedulaFrontFile
    ),

    cedulaFrontPublicId:
      getUploadedFilePublicId(
        cedulaFrontFile
      ),

    cedulaBack: getUploadedFileUrl(
      cedulaBackFile
    ),

    cedulaBackPublicId:
      getUploadedFilePublicId(
        cedulaBackFile
      ),

    selfie: getUploadedFileUrl(
      selfieFile
    ),

    selfiePublicId:
      getUploadedFilePublicId(
        selfieFile
      )
  };
};

/*
|--------------------------------------------------------------------------
| Registros seguros
|--------------------------------------------------------------------------
*/

const createSessionLogSafe = (
  data
) => {
  SessionLog.create(data).catch(
    (error) => {
      console.error(
        "Error creando SessionLog:",
        error.message
      );
    }
  );
};

const createSecurityAlertSafe = (
  data
) => {
  SecurityAlert.create(data).catch(
    (error) => {
      console.error(
        "Error creando SecurityAlert:",
        error.message
      );
    }
  );
};

const createAuditLogSafe = (
  data
) => {
  AuditLog.create(data).catch(
    (error) => {
      console.error(
        "Error creando AuditLog:",
        error.message
      );
    }
  );
};

/*
|--------------------------------------------------------------------------
| Permisos
|--------------------------------------------------------------------------
*/

const normalizePermissionCodes = (
  permissions
) => {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return [
    ...new Set(
      permissions
        .map((permission) => {
          if (
            typeof permission ===
            "string"
          ) {
            return normalizeUpperValue(
              permission
            );
          }

          return normalizeUpperValue(
            permission?.code ||
              permission?.name
          );
        })
        .filter(Boolean)
    )
  ];
};

/*
|--------------------------------------------------------------------------
| Respuesta segura de cliente
|--------------------------------------------------------------------------
*/

const buildSafeUserResponse = (
  user
) => {
  return {
    id:
      user._id ||
      user.id,

    firstName:
      user.firstName || "",

    lastName:
      user.lastName || "",

    fullName:
      user.fullName ||
      `${user.firstName || ""} ${
        user.lastName || ""
      }`.trim(),

    email:
      user.email || "",

    phone:
      user.phone || "",

    profilePhoto:
      user.profilePhoto || "",

    role:
      user.role || "USER",

    accountType:
      user.accountType ||
      "CUSTOMER",

    status:
      user.status ||
      "ACTIVE",

    buyerEnabled:
      Boolean(
        user.buyerEnabled
      ),

    sellerEnabled:
      Boolean(
        user.sellerEnabled
      ),

    canBuy:
      user.status === "ACTIVE" &&
      user.buyerEnabled === true,

    canSell:
      user.status === "ACTIVE" &&
      user.sellerEnabled === true &&
      user.verificationStatus ===
        "APPROVED",

    isVerified:
      Boolean(
        user.isVerified
      ),

    verificationStatus:
      user.verificationStatus ||
      "NOT_STARTED",

    identityLevel:
      user.identityLevel ||
      "LEVEL_0",

    identitySubmittedAt:
      user.identitySubmittedAt ||
      null,

    identityReviewedAt:
      user.identityReviewedAt ||
      null,

    identityRejectionReason:
      user.identityRejectionReason ||
      "",

    trustScore:
      Number(
        user.trustScore || 0
      ),

    securityLevel:
      user.securityLevel ||
      "NORMAL",

    requireFaceCheck:
      Boolean(
        user.requireFaceCheck
      ),

    lastFaceVerification:
      user.lastFaceVerification ||
      null,

    lastLoginAt:
      user.lastLoginAt ||
      null,

    passwordChangedAt:
      user.passwordChangedAt ||
      null,

    createdAt:
      user.createdAt ||
      null
  };
};

/*
|--------------------------------------------------------------------------
| Respuesta segura administrativa
|--------------------------------------------------------------------------
*/

const buildSafeAdminResponse = (
  user
) => {
  const role =
    normalizeUpperValue(
      user.role
    );

  const department =
    normalizeUpperValue(
      user.department ||
        "ADMINISTRATION"
    );

  const permissions =
    role === "SUPER_ADMIN"
      ? ["*"]
      : normalizePermissionCodes(
          user.permissions
        );

  const storedDepartments =
    Array.isArray(
      user.departments
    )
      ? user.departments
          .map(
            normalizeUpperValue
          )
          .filter(Boolean)
      : [];

  const departments =
    role === "SUPER_ADMIN"
      ? ALL_ADMIN_DEPARTMENTS
      : storedDepartments.length > 0
        ? storedDepartments
        : [department];

  return {
    id:
      user._id ||
      user.id,

    firstName:
      user.firstName || "",

    lastName:
      user.lastName || "",

    fullName:
      user.fullName ||
      `${user.firstName || ""} ${
        user.lastName || ""
      }`.trim(),

    email:
      user.email || "",

    profilePhoto:
      user.profilePhoto || "",

    accountType:
      normalizeUpperValue(
        user.accountType ||
          "INTERNAL"
      ),

    role,
    department,
    departments,

    employeeCode:
      user.employeeCode || "",

    permissions,

    status:
      normalizeUpperValue(
        user.status ||
          "ACTIVE"
      ),

    securityLevel:
      user.securityLevel ||
      "NORMAL",

    mustChangePassword:
      Boolean(
        user.mustChangePassword
      ),

    lastLoginAt:
      user.lastLoginAt ||
      null,

    activeSessions:
      Number(
        user.activeSessions || 0
      )
  };
};

/*
|--------------------------------------------------------------------------
| Verificación facial periódica
|--------------------------------------------------------------------------
*/

const shouldRequirePeriodicFaceCheck = (
  user
) => {
  if (!user.isVerified) {
    return false;
  }

  if (
    !user.lastFaceVerification
  ) {
    return true;
  }

  const lastFaceTime =
    new Date(
      user.lastFaceVerification
    ).getTime();

  if (
    Number.isNaN(lastFaceTime)
  ) {
    return true;
  }

  const hoursSinceLastFaceCheck =
    (Date.now() -
      lastFaceTime) /
    (1000 * 60 * 60);

  return (
    hoursSinceLastFaceCheck >=
    FACE_CHECK_INTERVAL_HOURS
  );
};
/*
|--------------------------------------------------------------------------
| Registro normal con KYC
|--------------------------------------------------------------------------
*/

const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phone,
      documentId,
      documentType = "CEDULA_RD",
      dateOfBirth,
      gender,
      country,
      province,
      city,
      address
    } = req.body || {};

    /*
    |--------------------------------------------------------------------------
    | Campos obligatorios
    |--------------------------------------------------------------------------
    */

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !documentId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nombre, apellido, correo, contraseña y cédula son obligatorios."
      });
    }

    if (
      confirmPassword !== undefined &&
      password !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Las contraseñas no coinciden."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Normalización
    |--------------------------------------------------------------------------
    */

    const cleanFirstName =
      normalizeName(firstName);

    const cleanLastName =
      normalizeName(lastName);

    const cleanEmail =
      normalizeEmail(email);

    const cleanPhone =
      normalizePhone(phone);

    const cleanDocumentId =
      normalizeDocumentId(
        documentId
      );

    const cleanDocumentType =
      normalizeUpperValue(
        documentType
      );

    /*
    |--------------------------------------------------------------------------
    | Validaciones personales
    |--------------------------------------------------------------------------
    */

    if (
      cleanFirstName.length < 2 ||
      cleanFirstName.length > 50
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El nombre debe contener entre 2 y 50 caracteres."
      });
    }

    if (
      cleanLastName.length < 2 ||
      cleanLastName.length > 50
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El apellido debe contener entre 2 y 50 caracteres."
      });
    }

    if (
      !validator.isEmail(
        cleanEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El formato del correo no es válido."
      });
    }

    if (
      !isStrongPassword(
        password
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo."
      });
    }

    if (
      cleanDocumentType ===
        "CEDULA_RD" &&
      !isValidDominicanDocument(
        cleanDocumentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La cédula debe contener exactamente 11 dígitos."
      });
    }

    if (
      ![
        "CEDULA_RD",
        "PASSPORT",
        "OTHER"
      ].includes(
        cleanDocumentType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El tipo de documento no es válido."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Archivos KYC
    |--------------------------------------------------------------------------
    */

    const identityUploads =
      getIdentityUploads(req);

    if (
      !hasRequiredRegistrationFiles(
        identityUploads
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Debes subir la foto de perfil, la parte frontal de la cédula y la parte trasera de la cédula."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Fecha de nacimiento
    |--------------------------------------------------------------------------
    */

    let parsedDateOfBirth =
      null;

    if (dateOfBirth) {
      parsedDateOfBirth =
        new Date(dateOfBirth);

      if (
        Number.isNaN(
          parsedDateOfBirth.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La fecha de nacimiento no es válida."
        });
      }

      if (
        parsedDateOfBirth >
        new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La fecha de nacimiento no puede estar en el futuro."
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Verificar duplicados
    |--------------------------------------------------------------------------
    */

    const existingUser =
      await User.findOne({
        $or: [
          {
            email:
              cleanEmail
          },
          {
            documentId:
              cleanDocumentId
          }
        ]
      }).select(
        "+documentId"
      );

    if (existingUser) {
      const duplicatedEmail =
        normalizeEmail(
          existingUser.email
        ) === cleanEmail;

      return res.status(409).json({
        success: false,
        message:
          duplicatedEmail
            ? "Este correo ya está registrado."
            : "Esta cédula ya está registrada."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Contraseña
    |--------------------------------------------------------------------------
    */

    const hashedPassword =
      await bcrypt.hash(
        String(password),
        BCRYPT_ROUNDS
      );

    const currentIp =
      getClientIp(req);

    const currentDevice =
      getDeviceInfo(req);

    const now =
      new Date();

    /*
    |--------------------------------------------------------------------------
    | Crear usuario
    |--------------------------------------------------------------------------
    */

    const user =
      await User.create({
        firstName:
          cleanFirstName,

        lastName:
          cleanLastName,

        email:
          cleanEmail,

        password:
          hashedPassword,

        phone:
          cleanPhone,

        documentType:
          cleanDocumentType,

        documentId:
          cleanDocumentId,

        dateOfBirth:
          parsedDateOfBirth,

        gender:
          normalizeUpperValue(
            gender ||
              "PREFER_NOT_TO_SAY"
          ),

        country:
          sanitizeText(
            country ||
              "República Dominicana",
            100
          ),

        province:
          sanitizeText(
            province,
            100
          ),

        city:
          sanitizeText(
            city,
            100
          ),

        address:
          sanitizeText(
            address,
            300
          ),

        profilePhoto:
          identityUploads.profilePhoto,

        profilePhotoPublicId:
          identityUploads
            .profilePhotoPublicId,

        profilePhotoUploadedAt:
          now,

        cedulaFront:
          identityUploads.cedulaFront,

        cedulaFrontPublicId:
          identityUploads
            .cedulaFrontPublicId,

        cedulaBack:
          identityUploads.cedulaBack,

        cedulaBackPublicId:
          identityUploads
            .cedulaBackPublicId,

        selfie:
          identityUploads.selfie ||
          identityUploads.profilePhoto,

        selfiePublicId:
          identityUploads
            .selfiePublicId ||
          identityUploads
            .profilePhotoPublicId,

        accountType:
          "CUSTOMER",

        role:
          "USER",

        department:
          "CUSTOMER",

        departments:
          [],

        permissions:
          [],

        status:
          "ACTIVE",

        buyerEnabled:
          true,

        sellerEnabled:
          false,

        isVerified:
          false,

        verificationStatus:
          "PENDING_REVIEW",

        identityLevel:
          "LEVEL_0",

        identitySubmittedAt:
          now,

        identityReviewStartedAt:
          null,

        identityReviewedAt:
          null,

        identityReviewedBy:
          null,

        identityRejectionReason:
          "",

        identityResubmissionCount:
          0,

        verifiedAt:
          null,

        verifiedBy:
          null,

        verificationNotes:
          "",

        faceMatchScore:
          0,

        trustScore:
          50,

        securityLevel:
          "NORMAL",

        requireFaceCheck:
          false,

        failedLoginAttempts:
          0,

        suspiciousLoginCount:
          0,

        accountLockedUntil:
          null,

        activeSessions:
          0,

        passwordVersion:
          0,

        passwordChangedAt:
          null,

        mustChangePassword:
          false,

        lastLoginIp:
          currentIp,

        lastLoginDevice:
          currentDevice,

        lastLoginAt:
          null
      });

    /*
    |--------------------------------------------------------------------------
    | Auditoría
    |--------------------------------------------------------------------------
    */

    createAuditLogSafe({
      actor:
        user._id,

      actorRole:
        "USER",

      action:
        "CUSTOMER_REGISTERED",

      targetType:
        "USER",

      targetId:
        String(user._id),

      description:
        `Nuevo cliente registrado y enviado a verificación KYC: ${user.email}.`,

      ipAddress:
        currentIp,

      deviceInfo:
        currentDevice
    });

    createSessionLogSafe({
      user:
        user._id,

      ipAddress:
        currentIp,

      deviceInfo:
        currentDevice,

      loginStatus:
        "REGISTERED",

      riskLevel:
        "LOW",

      notes:
        "Cuenta creada. Verificación de identidad pendiente."
    });

    /*
    |--------------------------------------------------------------------------
    | Token
    |--------------------------------------------------------------------------
    */

    const token =
      generateToken(user);

    return res.status(201).json({
      success: true,

      message:
        "Cuenta creada correctamente. Puedes comprar desde ahora. Para vender, el equipo de verificación debe aprobar tu identidad.",

      token,

      requireFaceCheck:
        false,

      verificationRequired:
        true,

      user:
        buildSafeUserResponse(
          user
        )
    });
  } catch (error) {
    console.error(
      "Error registrando usuario:",
      error
    );

    if (
      error?.code === 11000
    ) {
      const duplicatedField =
        Object.keys(
          error.keyPattern ||
            error.keyValue ||
            {}
        )[0];

      let message =
        "El correo o documento ya está registrado.";

      if (
        duplicatedField ===
        "email"
      ) {
        message =
          "Este correo ya está registrado.";
      }

      if (
        duplicatedField ===
        "documentId"
      ) {
        message =
          "Esta cédula ya está registrada.";
      }

      return res.status(409).json({
        success: false,
        message
      });
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      const validationMessage =
        Object.values(
          error.errors || {}
        )
          .map(
            (validationError) =>
              validationError.message
          )
          .filter(Boolean)
          .join(" ");

      return res.status(400).json({
        success: false,
        message:
          validationMessage ||
          "Los datos enviados no son válidos."
      });
    }

    return res.status(500).json({
      success: false,

      message:
        "Error interno registrando el usuario.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};
/*
|--------------------------------------------------------------------------
| Login normal
|--------------------------------------------------------------------------
*/

const login = async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Correo y contraseña son obligatorios."
      });
    }

    const cleanEmail =
      normalizeEmail(email);

    if (
      !validator.isEmail(
        cleanEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El formato del correo no es válido."
      });
    }

    const user =
      await User.findOne({
        email:
          cleanEmail
      }).select(
        "+password +permissions +departments"
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Credenciales inválidas."
      });
    }

    const accountType =
      normalizeUpperValue(
        user.accountType
      );

    if (
      accountType === "INTERNAL" ||
      accountType === "ADMIN" ||
      accountType === "STAFF"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Las cuentas internas deben iniciar sesión desde el BackOffice."
      });
    }

    const status =
      normalizeUpperValue(
        user.status
      );

    if (
      status === "BANNED"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Esta cuenta ha sido bloqueada permanentemente."
      });
    }

    if (
      status === "SUSPENDED"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Esta cuenta se encuentra suspendida."
      });
    }

    if (
      status === "DELETED"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Esta cuenta ya no está disponible."
      });
    }

    if (
      status !== "ACTIVE"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Esta cuenta todavía no está activa."
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
      user.accountLockedUntil &&
      new Date(
        user.accountLockedUntil
      ) <= new Date()
    ) {
      user.accountLockedUntil =
        null;

      user.failedLoginAttempts =
        0;

      if (
        normalizeUpperValue(
          user.securityLevel
        ) === "LOCKED"
      ) {
        user.securityLevel =
          "NORMAL";
      }
    }

    const currentIp =
      getClientIp(req);

    const currentDevice =
      getDeviceInfo(req);

    const passwordMatch =
      await bcrypt.compare(
        String(password),
        user.password
      );

    if (!passwordMatch) {
      user.failedLoginAttempts =
        Number(
          user.failedLoginAttempts ||
            0
        ) + 1;

      const remainingAttempts =
        Math.max(
          MAX_FAILED_LOGIN_ATTEMPTS -
            user.failedLoginAttempts,
          0
        );

      createSessionLogSafe({
        user:
          user._id,

        ipAddress:
          currentIp,

        deviceInfo:
          currentDevice,

        loginStatus:
          "FAILED",

        riskLevel:
          user.failedLoginAttempts >= 3
            ? "HIGH"
            : "MEDIUM",

        notes:
          "Intento de inicio de sesión fallido."
      });

      createAuditLogSafe({
        actor:
          user._id,

        actorRole:
          normalizeUpperValue(
            user.role ||
              "USER"
          ),

        action:
          "USER_LOGIN_FAILED",

        targetType:
          "SECURITY",

        targetId:
          String(user._id),

        description:
          `Intento fallido de inicio de sesión para ${user.email}.`,

        ipAddress:
          currentIp,

        deviceInfo:
          currentDevice
      });

      if (
        user.failedLoginAttempts >=
        MAX_FAILED_LOGIN_ATTEMPTS
      ) {
        user.securityLevel =
          "LOCKED";

        user.accountLockedUntil =
          new Date(
            Date.now() +
              ACCOUNT_LOCK_MINUTES *
                60 *
                1000
          );

        createSecurityAlertSafe({
          user:
            user._id,

          type:
            "ACCOUNT_LOCKED",

          riskLevel:
            "CRITICAL",

          message:
            "Cuenta bloqueada temporalmente por múltiples intentos fallidos de contraseña.",

          ipAddress:
            currentIp,

          deviceInfo:
            currentDevice
        });
      }

      await user.save();

      return res.status(401).json({
        success: false,

        message:
          user.failedLoginAttempts >=
          MAX_FAILED_LOGIN_ATTEMPTS
            ? `Cuenta bloqueada por ${ACCOUNT_LOCK_MINUTES} minutos debido a múltiples intentos fallidos.`
            : "Credenciales inválidas.",

        remainingAttempts:
          remainingAttempts,

        accountLockedUntil:
          user.accountLockedUntil ||
          null
      });
    }

    let requireFaceCheck =
      Boolean(
        user.requireFaceCheck
      );

    let securityLevel =
      normalizeUpperValue(
        user.securityLevel ||
          "NORMAL"
      );

    let detectedNewIp =
      false;

    let detectedNewDevice =
      false;

    if (
      user.lastLoginIp &&
      user.lastLoginIp !==
        currentIp
    ) {
      detectedNewIp =
        true;

      requireFaceCheck =
        true;

      securityLevel =
        "ELEVATED";

      user.suspiciousLoginCount =
        Number(
          user.suspiciousLoginCount ||
            0
        ) + 1;

      createSecurityAlertSafe({
        user:
          user._id,

        type:
          "NEW_IP",

        riskLevel:
          "HIGH",

        message:
          "Se detectó un inicio de sesión desde una dirección IP diferente.",

        ipAddress:
          currentIp,

        deviceInfo:
          currentDevice
      });
    }

    if (
      user.lastLoginDevice &&
      user.lastLoginDevice !==
        currentDevice
    ) {
      detectedNewDevice =
        true;

      requireFaceCheck =
        true;

      securityLevel =
        "ELEVATED";

      user.suspiciousLoginCount =
        Number(
          user.suspiciousLoginCount ||
            0
        ) + 1;

      createSecurityAlertSafe({
        user:
          user._id,

        type:
          "NEW_DEVICE",

        riskLevel:
          "HIGH",

        message:
          "Se detectó un inicio de sesión desde un dispositivo diferente.",

        ipAddress:
          currentIp,

        deviceInfo:
          currentDevice
      });
    }

    if (
      shouldRequirePeriodicFaceCheck(
        user
      )
    ) {
      requireFaceCheck =
        true;

      securityLevel =
        "ELEVATED";
    }

    user.failedLoginAttempts =
      0;

    user.accountLockedUntil =
      null;

    user.lastLoginIp =
      currentIp;

    user.lastLoginDevice =
      currentDevice;

    user.requireFaceCheck =
      requireFaceCheck;

    user.securityLevel =
      securityLevel;

    user.lastLoginAt =
      new Date();

    user.activeSessions =
      Number(
        user.activeSessions ||
          0
      ) + 1;

    await user.save();

    createSessionLogSafe({
      user:
        user._id,

      ipAddress:
        currentIp,

      deviceInfo:
        currentDevice,

      loginStatus:
        requireFaceCheck
          ? "FACE_REQUIRED"
          : "SUCCESS",

      riskLevel:
        requireFaceCheck
          ? "HIGH"
          : "LOW",

      notes:
        requireFaceCheck
          ? "Credenciales correctas. Se requiere verificación facial."
          : "Inicio de sesión correcto."
    });

    createAuditLogSafe({
      actor:
        user._id,

      actorRole:
        normalizeUpperValue(
          user.role ||
            "USER"
        ),

      action:
        "USER_LOGIN_SUCCESS",

      targetType:
        "SECURITY",

      targetId:
        String(user._id),

      description:
        `Inicio de sesión exitoso para ${user.email}.`,

      ipAddress:
        currentIp,

      deviceInfo:
        currentDevice
    });

    const token =
      generateToken(user);

    const verificationStatus =
      normalizeUpperValue(
        user.verificationStatus ||
          "NOT_STARTED"
      );

    const canBuy =
      status === "ACTIVE" &&
      user.buyerEnabled === true;

    const canSell =
      status === "ACTIVE" &&
      user.sellerEnabled === true &&
      verificationStatus ===
        "APPROVED";

    let verificationMessage =
      "";

    if (
      verificationStatus ===
      "PENDING_REVIEW"
    ) {
      verificationMessage =
        "Tu identidad está siendo revisada. Puedes comprar, pero todavía no puedes vender.";
    }

    if (
      verificationStatus ===
      "REJECTED"
    ) {
      verificationMessage =
        "Tu verificación de identidad fue rechazada. Debes corregir y reenviar los documentos para vender.";
    }

    if (
      verificationStatus ===
      "APPROVED"
    ) {
      verificationMessage =
        "Tu identidad está verificada y tu cuenta está habilitada para comprar y vender.";
    }

    return res.status(200).json({
      success: true,

      message:
        requireFaceCheck
          ? "Credenciales correctas. Debes completar la verificación facial."
          : "Inicio de sesión correcto.",

      token,

      requireFaceCheck,

      security: {
        level:
          user.securityLevel,

        newIpDetected:
          detectedNewIp,

        newDeviceDetected:
          detectedNewDevice
      },

      capabilities: {
        canBuy,
        canSell
      },

      verification: {
        status:
          verificationStatus,

        identityLevel:
          user.identityLevel,

        message:
          verificationMessage
      },

      user:
        buildSafeUserResponse(
          user
        )
    });
  } catch (error) {
    console.error(
      "Error iniciando sesión:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Error interno iniciando sesión.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};
/*
|--------------------------------------------------------------------------
| Login administrativo
|--------------------------------------------------------------------------
*/

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Correo administrativo y contraseña son obligatorios."
      });
    }

    const cleanEmail = normalizeEmail(email);

    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message:
          "El formato del correo administrativo no es válido."
      });
    }

    const user = await User.findOne({
      email: cleanEmail
    }).select(
      "+password +permissions +departments"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Correo o contraseña incorrectos."
      });
    }

    const accountType =
      normalizeUpperValue(
        user.accountType
      );

    const role =
      normalizeUpperValue(
        user.role
      );

    const status =
      normalizeUpperValue(
        user.status
      );

    const isInternal =
      ["INTERNAL", "ADMIN", "STAFF"].includes(
        accountType
      );

    if (
      !isInternal ||
      !INTERNAL_ADMIN_ROLES.includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Esta cuenta no tiene acceso al BackOffice."
      });
    }

    if (status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message:
          "La cuenta administrativa está inactiva."
      });
    }

    if (
      user.accountLockedUntil &&
      user.accountLockedUntil > new Date()
    ) {
      return res.status(423).json({
        success: false,
        message:
          "Cuenta bloqueada temporalmente.",
        accountLockedUntil:
          user.accountLockedUntil
      });
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    const currentIp =
      getClientIp(req);

    const currentDevice =
      getDeviceInfo(req);

    if (!passwordMatch) {
      user.failedLoginAttempts =
        Number(
          user.failedLoginAttempts || 0
        ) + 1;

      if (
        user.failedLoginAttempts >=
        MAX_FAILED_LOGIN_ATTEMPTS
      ) {
        user.accountLockedUntil =
          new Date(
            Date.now() +
              ACCOUNT_LOCK_MINUTES *
                60 *
                1000
          );

        user.securityLevel =
          "LOCKED";

        createSecurityAlertSafe({
          user: user._id,
          type: "ACCOUNT_LOCKED",
          riskLevel: "CRITICAL",
          message:
            "Cuenta administrativa bloqueada.",
          ipAddress: currentIp,
          deviceInfo: currentDevice
        });
      }

      await user.save();

      createAuditLogSafe({
        actor: user._id,
        actorRole: role,
        action: "ADMIN_LOGIN_FAILED",
        targetType: "SECURITY",
        targetId: String(user._id),
        description:
          "Intento fallido de login administrativo.",
        ipAddress: currentIp,
        deviceInfo: currentDevice
      });

      return res.status(401).json({
        success: false,
        message:
          "Correo o contraseña incorrectos."
      });
    }

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = currentIp;
    user.lastLoginDevice =
      currentDevice;
    user.activeSessions =
      Number(user.activeSessions || 0) + 1;
    user.securityLevel = "NORMAL";

    await user.save();

    createSessionLogSafe({
      user: user._id,
      ipAddress: currentIp,
      deviceInfo: currentDevice,
      loginStatus: "SUCCESS",
      riskLevel: "LOW",
      notes:
        "Inicio de sesión administrativo."
    });

    createAuditLogSafe({
      actor: user._id,
      actorRole: role,
      action: "ADMIN_LOGIN_SUCCESS",
      targetType: "SECURITY",
      targetId: String(user._id),
      description:
        "Inicio de sesión administrativo exitoso.",
      ipAddress: currentIp,
      deviceInfo: currentDevice
    });

    const token =
      generateToken(user);

    return res.status(200).json({
      success: true,
      message:
        "Bienvenido al BackOffice.",
      token,
      user:
        buildSafeAdminResponse(user)
    });
  } catch (error) {
    console.error(
      "Error login admin:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error interno.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};

/*
|--------------------------------------------------------------------------
| Usuario autenticado
|--------------------------------------------------------------------------
*/

const getMe = async (req, res) => {
  try {
    const userId =
      req.user?._id ||
      req.user?.id;

    const user =
      await User.findById(userId)
        .select(
          "+permissions +departments"
        );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Usuario no encontrado."
      });
    }

    const accountType =
      normalizeUpperValue(
        user.accountType
      );

    const isInternal =
      ["INTERNAL", "ADMIN", "STAFF"].includes(
        accountType
      );

    return res.status(200).json({
      success: true,

      user: isInternal
        ? buildSafeAdminResponse(
            user
          )
        : buildSafeUserResponse(
            user
          ),

      permissions:
        normalizePermissionCodes(
          user.permissions
        ),

      buyerEnabled:
        Boolean(
          user.buyerEnabled
        ),

      sellerEnabled:
        Boolean(
          user.sellerEnabled
        ),

      verificationStatus:
        user.verificationStatus,

      identityLevel:
        user.identityLevel,

      canBuy:
        Boolean(
          user.buyerEnabled
        ),

      canSell:
        Boolean(
          user.sellerEnabled &&
            user.verificationStatus ===
              "APPROVED"
        )
    });
  } catch (error) {
    console.error(
      "Error getMe:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error obteniendo el usuario.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};
/*
|--------------------------------------------------------------------------
| Solicitar recuperación de contraseña
|--------------------------------------------------------------------------
*/

const forgotPassword = async (req, res) => {
  try {
    const cleanEmail = normalizeEmail(
      req.body?.email
    );

    const genericMessage =
      "Si existe una cuenta asociada, recibirás un correo de recuperación.";

    if (
      !cleanEmail ||
      !validator.isEmail(cleanEmail)
    ) {
      return res.status(200).json({
        success: true,
        message: genericMessage
      });
    }

    const user = await User.findOne({
      email: cleanEmail
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage
      });
    }

    const status = normalizeUpperValue(
      user.status
    );

    if (
      status === "BANNED" ||
      status === "DELETED"
    ) {
      return res.status(200).json({
        success: true,
        message: genericMessage
      });
    }

    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    user.resetPasswordToken =
      hashResetToken(resetToken);

    user.resetPasswordExpires =
      new Date(
        Date.now() +
          RESET_TOKEN_MINUTES *
            60 *
            1000
      );

    await user.save();

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    const resetLink =
      `${frontendUrl}/reset-password?token=${resetToken}`;

    createSecurityAlertSafe({
      user: user._id,
      type: "PASSWORD_RESET_REQUEST",
      riskLevel: "MEDIUM",
      message:
        "Se solicitó restablecer la contraseña de la cuenta.",
      ipAddress: getClientIp(req),
      deviceInfo: getDeviceInfo(req)
    });

    createSessionLogSafe({
      user: user._id,
      ipAddress: getClientIp(req),
      deviceInfo: getDeviceInfo(req),
      loginStatus:
        "PASSWORD_RESET_REQUEST",
      riskLevel: "MEDIUM",
      notes:
        "Solicitud de recuperación de contraseña."
    });

    createAuditLogSafe({
      actor: user._id,
      actorRole: normalizeUpperValue(
        user.role || "USER"
      ),
      action:
        "PASSWORD_RESET_REQUESTED",
      targetType: "SECURITY",
      targetId: String(user._id),
      description:
        `Solicitud de recuperación de contraseña para ${user.email}.`,
      ipAddress: getClientIp(req),
      deviceInfo: getDeviceInfo(req)
    });

    await sendPasswordResetEmail({
      to: user.email,
      resetLink,
      ip: getClientIp(req),
      device: getDeviceInfo(req)
    });

    return res.status(200).json({
      success: true,
      message: genericMessage
    });
  } catch (error) {
    console.error(
      "Error enviando recuperación:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error enviando correo de recuperación.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};

/*
|--------------------------------------------------------------------------
| Restablecer contraseña
|--------------------------------------------------------------------------
*/

const resetPassword = async (req, res) => {
  try {
    const {
      token,
      password,
      confirmPassword
    } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Token y nueva contraseña son obligatorios."
      });
    }

    if (
      confirmPassword !== undefined &&
      password !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Las contraseñas no coinciden."
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo."
      });
    }

    const hashedToken =
      hashResetToken(token);

    const user = await User.findOne({
      resetPasswordToken:
        hashedToken,
      resetPasswordExpires: {
        $gt: new Date()
      }
    }).select(
      "+password +resetPasswordToken +resetPasswordExpires"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Token inválido o expirado."
      });
    }

    const status = normalizeUpperValue(
      user.status
    );

    if (
      status === "BANNED" ||
      status === "DELETED"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No es posible restablecer la contraseña de esta cuenta."
      });
    }

    const samePassword =
      await bcrypt.compare(
        String(password),
        user.password
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          "La nueva contraseña no puede ser igual a la contraseña anterior."
      });
    }

    user.password =
      await bcrypt.hash(
        String(password),
        BCRYPT_ROUNDS
      );

    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.securityLevel = "NORMAL";
    user.requireFaceCheck = true;
    user.passwordChangedAt =
      new Date();

    user.passwordVersion =
      Number(
        user.passwordVersion || 0
      ) + 1;

    user.mustChangePassword = false;
    user.activeSessions = 0;

    await user.save();

    await sendPasswordChangedEmail({
      to: user.email,
      ip: getClientIp(req),
      device: getDeviceInfo(req)
    });

    createSecurityAlertSafe({
      user: user._id,
      type:
        "PASSWORD_RESET_COMPLETED",
      riskLevel: "HIGH",
      message:
        "La contraseña fue restablecida correctamente mediante enlace de recuperación.",
      ipAddress: getClientIp(req),
      deviceInfo: getDeviceInfo(req)
    });

    createSessionLogSafe({
      user: user._id,
      ipAddress: getClientIp(req),
      deviceInfo: getDeviceInfo(req),
      loginStatus:
        "PASSWORD_RESET_COMPLETED",
      riskLevel: "HIGH",
      notes:
        "Contraseña restablecida. Las sesiones activas fueron invalidadas."
    });

    createAuditLogSafe({
      actor: user._id,
      actorRole: normalizeUpperValue(
        user.role || "USER"
      ),
      action:
        "PASSWORD_RESET_COMPLETED",
      targetType: "SECURITY",
      targetId: String(user._id),
      description:
        `La contraseña de ${user.email} fue restablecida mediante token.`,
      ipAddress: getClientIp(req),
      deviceInfo: getDeviceInfo(req)
    });

    return res.status(200).json({
      success: true,
      message:
        "Contraseña actualizada correctamente. Por seguridad, inicia sesión nuevamente.",
      requireFaceCheck: true
    });
  } catch (error) {
    console.error(
      "Error restableciendo contraseña:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error restableciendo contraseña.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};

/*
|--------------------------------------------------------------------------
| Cambiar contraseña autenticada
|--------------------------------------------------------------------------
*/

const changePassword = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?._id ||
      req.user?.id;

    const {
      currentPassword,
      newPassword,
      confirmPassword
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "No autorizado."
      });
    }

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La contraseña actual y la nueva contraseña son obligatorias."
      });
    }

    if (
      confirmPassword !== undefined &&
      newPassword !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Las contraseñas no coinciden."
      });
    }

    if (
      !isStrongPassword(
        newPassword
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo."
      });
    }

    const user =
      await User.findById(
        userId
      ).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Usuario no encontrado."
      });
    }

    const status =
      normalizeUpperValue(
        user.status
      );

    if (
      status === "BANNED" ||
      status === "DELETED"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No es posible cambiar la contraseña de esta cuenta."
      });
    }

    const passwordMatch =
      await bcrypt.compare(
        String(currentPassword),
        user.password
      );

    if (!passwordMatch) {
      createSecurityAlertSafe({
        user: user._id,
        type:
          "PASSWORD_CHANGE_FAILED",
        riskLevel: "HIGH",
        message:
          "Intento fallido de cambio de contraseña.",
        ipAddress: getClientIp(req),
        deviceInfo: getDeviceInfo(req)
      });

      createAuditLogSafe({
        actor: user._id,
        actorRole:
          normalizeUpperValue(
            user.role || "USER"
          ),
        action:
          "PASSWORD_CHANGE_FAILED",
        targetType: "SECURITY",
        targetId:
          String(user._id),
        description:
          `Intento fallido de cambio de contraseña para ${user.email}.`,
        ipAddress:
          getClientIp(req),
        deviceInfo:
          getDeviceInfo(req)
      });

      return res.status(401).json({
        success: false,
        message:
          "La contraseña actual es incorrecta."
      });
    }

    const samePassword =
      await bcrypt.compare(
        String(newPassword),
        user.password
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          "La nueva contraseña no puede ser igual a la contraseña actual."
      });
    }

    user.password =
      await bcrypt.hash(
        String(newPassword),
        BCRYPT_ROUNDS
      );

    user.passwordChangedAt =
      new Date();

    user.passwordVersion =
      Number(
        user.passwordVersion || 0
      ) + 1;

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.securityLevel = "NORMAL";
    user.requireFaceCheck = true;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.mustChangePassword = false;
    user.activeSessions = 0;

    await user.save();

    await sendPasswordChangedEmail({
      to: user.email,
      ip: getClientIp(req),
      device: getDeviceInfo(req)
    });

    createSecurityAlertSafe({
      user: user._id,
      type: "PASSWORD_CHANGED",
      riskLevel: "HIGH",
      message:
        "La contraseña fue cambiada correctamente desde la cuenta autenticada.",
      ipAddress: getClientIp(req),
      deviceInfo: getDeviceInfo(req)
    });

    createSessionLogSafe({
      user: user._id,
      ipAddress: getClientIp(req),
      deviceInfo: getDeviceInfo(req),
      loginStatus:
        "PASSWORD_CHANGED",
      riskLevel: "HIGH",
      notes:
        "Contraseña cambiada. Las sesiones activas fueron invalidadas."
    });

    createAuditLogSafe({
      actor: user._id,
      actorRole:
        normalizeUpperValue(
          user.role || "USER"
        ),
      action:
        "PASSWORD_CHANGED",
      targetType: "SECURITY",
      targetId:
        String(user._id),
      description:
        `La contraseña de ${user.email} fue cambiada desde una sesión autenticada.`,
      ipAddress:
        getClientIp(req),
      deviceInfo:
        getDeviceInfo(req)
    });

    return res.status(200).json({
      success: true,
      message:
        "Contraseña cambiada correctamente. Por seguridad, vuelve a iniciar sesión.",
      requireFaceCheck: true
    });
  } catch (error) {
    console.error(
      "Error cambiando contraseña:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error cambiando contraseña.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};

/*
|--------------------------------------------------------------------------
| Exportaciones
|--------------------------------------------------------------------------
*/

module.exports = {
  register,
  login,
  adminLogin,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword
};
