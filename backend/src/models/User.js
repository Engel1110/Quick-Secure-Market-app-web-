const mongoose = require("mongoose");
const validator = require("validator");

/*
|--------------------------------------------------------------------------
| Utilidades
|--------------------------------------------------------------------------
*/

const normalizePersonName = (value) => {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-DO")
    .replace(
      /(^|[\s'-])\p{L}/gu,
      (letter) =>
        letter.toLocaleUpperCase("es-DO")
    );
};

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizePhone = (value) =>
  String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");

const normalizeDocumentId = (
  value
) =>
  String(value || "")
    .replace(/\D/g, "")
    .trim();

const normalizeUpper = (
  value
) =>
  String(value || "")
    .trim()
    .toUpperCase();

/*
|--------------------------------------------------------------------------
| Esquema
|--------------------------------------------------------------------------
*/

const userSchema =
  new mongoose.Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | Información personal
      |--------------------------------------------------------------------------
      */

      firstName: {
        type: String,
        required: [
          true,
          "El nombre es obligatorio"
        ],
        trim: true,
        minlength: 2,
        maxlength: 50,
        set: normalizePersonName
      },

      lastName: {
        type: String,
        required: [
          true,
          "El apellido es obligatorio"
        ],
        trim: true,
        minlength: 2,
        maxlength: 50,
        set: normalizePersonName
      },

      email: {
        type: String,
        required: [
          true,
          "El correo es obligatorio"
        ],
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 160,
        set: normalizeEmail,
        validate: {
          validator:
            validator.isEmail,
          message:
            "Correo inválido"
        }
      },

      password: {
        type: String,
        required: true,
        minlength: 8,
        select: false
      },

      phone: {
        type: String,
        trim: true,
        default: "",
        maxlength: 30,
        set: normalizePhone
      },

      /*
      |--------------------------------------------------------------------------
      | Documento de identidad
      |--------------------------------------------------------------------------
      */

      documentType: {
        type: String,
        enum: [
          "CEDULA_RD",
          "PASSPORT",
          "OTHER"
        ],
        default:
          "CEDULA_RD"
      },

      documentId: {
        type: String,
        trim: true,
        default: "",
        maxlength: 11,
        unique: true,
        sparse: true,
        select: false,
        set:
          normalizeDocumentId,
        validate: {
          validator(value) {
            if (!value)
              return true;

            return /^\d{11}$/.test(
              value
            );
          },
          message:
            "La cédula debe contener exactamente 11 dígitos."
        }
      },

      dateOfBirth: {
        type: Date,
        default: null
      },

      gender: {
        type: String,
        enum: [
          "MALE",
          "FEMALE",
          "OTHER",
          "PREFER_NOT_TO_SAY"
        ],
        default:
          "PREFER_NOT_TO_SAY"
      },

      /*
      |--------------------------------------------------------------------------
      | Dirección
      |--------------------------------------------------------------------------
      */

      country: {
        type: String,
        default:
          "República Dominicana"
      },

      province: {
        type: String,
        default: ""
      },

      city: {
        type: String,
        default: ""
      },

      address: {
        type: String,
        default: ""
      },

/*
|--------------------------------------------------------------------------
| Imagen de perfil
|--------------------------------------------------------------------------
*/

profilePhoto: {
  type: String,
  default: ""
},

profilePhotoPublicId: {
  type: String,
  default: "",
  select: false
},

profilePhotoUploadedAt: {
  type: Date,
  default: null
},

pendingProfilePhoto: {
  type: String,
  default: "",
  select: false
},

pendingProfilePhotoPublicId: {
  type: String,
  default: "",
  select: false
},

profilePhotoStatus: {
  type: String,
  enum: [
    "NOT_STARTED",
    "PENDING",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "RESUBMISSION_REQUIRED"
  ],
  default: "NOT_STARTED",
  index: true
},

profilePhotoRejectedReason: {
  type: String,
  trim: true,
  default: "",
  maxlength: 1000
},

profilePhotoApprovedAt: {
  type: Date,
  default: null
},

profilePhotoApprovedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},
      /*
      |--------------------------------------------------------------------------
      | Cuenta
      |--------------------------------------------------------------------------
      */

      accountType: {
        type: String,
        enum: [
          "CUSTOMER",
          "INTERNAL",
          "SYSTEM"
        ],
        default:
          "CUSTOMER",
        index: true,
        set: normalizeUpper
      },

      role: {
        type: String,
        enum: [
          "USER",

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
        ],
        default: "USER",
        index: true,
        set: normalizeUpper
      },

      department: {
        type: String,
        enum: [
          "CUSTOMER",
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
        ],
        default:
          "CUSTOMER",
        index: true,
        set: normalizeUpper
      },

      departments: {
        type: [String],
        default: [],
        select: false
      },

      permissions: {
        type: [String],
        default: []
      },

      employeeCode: {
        type: String,
        trim: true,
        default: "",
        uppercase: true
      },

      /*
      |--------------------------------------------------------------------------
      | Capacidades
      |--------------------------------------------------------------------------
      */

      buyerEnabled: {
        type: Boolean,
        default: true,
        index: true
      },

      sellerEnabled: {
        type: Boolean,
        default: false,
        index: true
      },

      mustChangePassword: {
        type: Boolean,
        default: false
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      lastModifiedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      /*
      |--------------------------------------------------------------------------
      | KYC
      |--------------------------------------------------------------------------
      */

      isVerified: {
        type: Boolean,
        default: false,
        index: true
      },

      verificationStatus: {
        type: String,
        enum: [
          "NOT_STARTED",
          "PENDING",
          "PENDING_REVIEW",
          "UNDER_REVIEW",
          "APPROVED",
          "REJECTED",
          "RESUBMISSION_REQUIRED"
        ],
        default:
          "NOT_STARTED",
        index: true
      },

      identityLevel: {
        type: String,
        enum: [
          "LEVEL_0",
          "LEVEL_1",
          "LEVEL_2",
          "VERIFIED",
          "BUSINESS"
        ],
        default:
          "LEVEL_0"
      },
	        /*
      |--------------------------------------------------------------------------
      | Documentos de identidad
      |--------------------------------------------------------------------------
      */

      cedulaFront: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      cedulaFrontPublicId: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      cedulaBack: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      cedulaBackPublicId: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      selfie: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      selfiePublicId: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      /*
      |--------------------------------------------------------------------------
      | Flujo de revisión
      |--------------------------------------------------------------------------
      */

      identitySubmittedAt: {
        type: Date,
        default: null,
        index: true
      },

      identityReviewStartedAt: {
        type: Date,
        default: null
      },

      identityReviewedAt: {
        type: Date,
        default: null
      },

      identityReviewedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      identityRejectionReason: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1500
      },

      identityResubmissionCount: {
        type: Number,
        default: 0,
        min: 0
      },

      /*
      |--------------------------------------------------------------------------
      | Compatibilidad con versiones anteriores
      |--------------------------------------------------------------------------
      */

      dailyVerificationPhoto: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      faceMatchScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },

      lastFaceVerification: {
        type: Date,
        default: null
      },

      verifiedAt: {
        type: Date,
        default: null
      },

      verifiedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      verificationNotes: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1500
      },

      /*
      |--------------------------------------------------------------------------
      | Reputación
      |--------------------------------------------------------------------------
      */

      trustScore: {
        type: Number,
        default: 50,
        min: 0,
        max: 100,
        index: true
      },

      completedPurchases: {
        type: Number,
        default: 0,
        min: 0
      },

      completedSales: {
        type: Number,
        default: 0,
        min: 0
      },

      cancelledOrders: {
        type: Number,
        default: 0,
        min: 0
      },

      disputesOpened: {
        type: Number,
        default: 0,
        min: 0
      },

      fraudReports: {
        type: Number,
        default: 0,
        min: 0
      },

      /*
      |--------------------------------------------------------------------------
      | Favoritos
      |--------------------------------------------------------------------------
      */

      favorites: [
        {
          type:
            mongoose.Schema.Types.ObjectId,
          ref: "Product"
        }
      ],

      /*
      |--------------------------------------------------------------------------
      | Seguridad
      |--------------------------------------------------------------------------
      */

      securityLevel: {
        type: String,
        enum: [
          "NORMAL",
          "ELEVATED",
          "LOCKED",
          "CRITICAL"
        ],
        default: "NORMAL",
        index: true
      },

      requireFaceCheck: {
        type: Boolean,
        default: false
      },

      twoFactorEnabled: {
        type: Boolean,
        default: false
      },

      twoFactorSecret: {
        type: String,
        default: "",
        select: false
      },

      failedLoginAttempts: {
        type: Number,
        default: 0,
        min: 0
      },

      lastLoginAt: {
        type: Date,
        default: null
      },

      lastLoginIp: {
        type: String,
        default: ""
      },

      lastLoginDevice: {
        type: String,
        default: ""
      },

      suspiciousLoginCount: {
        type: Number,
        default: 0
      },

      accountLockedUntil: {
        type: Date,
        default: null
      },

      activeSessions: {
        type: Number,
        default: 0
      },

      /*
      |--------------------------------------------------------------------------
      | Estado de la cuenta
      |--------------------------------------------------------------------------
      */

      status: {
        type: String,
        enum: [
          "ACTIVE",
          "PENDING",
          "SUSPENDED",
          "BANNED",
          "DELETED"
        ],
        default: "ACTIVE",
        index: true
      },

      suspensionReason: {
        type: String,
        default: ""
      },

      suspendedAt: {
        type: Date,
        default: null
      },

      suspendedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      bannedAt: {
        type: Date,
        default: null
      },

      bannedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      deletionReason: {
        type: String,
        default: ""
      },

      deletedAt: {
        type: Date,
        default: null
      },

      deletedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
	        /*
      |--------------------------------------------------------------------------
      | Recuperación de contraseña
      |--------------------------------------------------------------------------
      */

      resetPasswordToken: {
        type: String,
        default: null,
        select: false
      },

      resetPasswordExpires: {
        type: Date,
        default: null,
        select: false
      },

      passwordChangedAt: {
        type: Date,
        default: null
      },

      passwordVersion: {
        type: Number,
        default: 0,
        min: 0
      },

      /*
      |--------------------------------------------------------------------------
      | Preferencias
      |--------------------------------------------------------------------------
      */

      language: {
        type: String,
        enum: [
          "es",
          "en"
        ],
        default: "es"
      },

      timezone: {
        type: String,
        default:
          "America/Santo_Domingo"
      },

      notificationsEnabled: {
        type: Boolean,
        default: true
      },

      emailNotificationsEnabled: {
        type: Boolean,
        default: true
      }
    },
    {
      timestamps: true,
      versionKey: false
    }
  );

/*
|--------------------------------------------------------------------------
| Virtuales
|--------------------------------------------------------------------------
*/

userSchema
  .virtual("fullName")
  .get(function () {
    return [
      this.firstName,
      this.lastName
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  });

userSchema
  .virtual("canBuy")
  .get(function () {
    return (
      this.status ===
        "ACTIVE" &&
      this.buyerEnabled ===
        true
    );
  });

userSchema
  .virtual("canSell")
  .get(function () {
    return (
      this.status ===
        "ACTIVE" &&
      this.sellerEnabled ===
        true &&
      this
        .verificationStatus ===
        "APPROVED"
    );
  });

userSchema
  .virtual(
    "identityPending"
  )
  .get(function () {
    return [
      "PENDING",
      "PENDING_REVIEW",
      "UNDER_REVIEW",
      "RESUBMISSION_REQUIRED"
    ].includes(
      this
        .verificationStatus
    );
  });

/*
|--------------------------------------------------------------------------
| Reglas de negocio
|--------------------------------------------------------------------------
*/

userSchema.pre(
  "validate",
  function () {
    /*
    |--------------------------------------------------------------------------
    | Los clientes siempre son USER
    |--------------------------------------------------------------------------
    */

    if (
      this.accountType ===
      "CUSTOMER"
    ) {
      this.role = "USER";

      this.department =
        "CUSTOMER";
    }

    /*
    |--------------------------------------------------------------------------
    | No puede vender hasta aprobar identidad
    |--------------------------------------------------------------------------
    */

    if (
      this
        .verificationStatus !==
      "APPROVED"
    ) {
      this.sellerEnabled =
        false;
    }

    /*
    |--------------------------------------------------------------------------
    | Cuenta bloqueada
    |--------------------------------------------------------------------------
    */

    if (
      [
        "BANNED",
        "DELETED"
      ].includes(
        this.status
      )
    ) {
      this.buyerEnabled =
        false;

      this.sellerEnabled =
        false;
    }

    /*
    |--------------------------------------------------------------------------
    | Si aprueba KYC
    |--------------------------------------------------------------------------
    */

    if (
      this
        .verificationStatus ===
        "APPROVED"
    ) {
      this.isVerified =
        true;

      this.identityLevel =
        "VERIFIED";
    }
  }
);

/*
|--------------------------------------------------------------------------
| Transformación JSON
|--------------------------------------------------------------------------
*/

userSchema.set(
  "toJSON",
  {
    virtuals: true,

    transform(
      document,
      returnedObject
    ) {
      delete returnedObject.password;

      delete returnedObject
        .resetPasswordToken;

      delete returnedObject
        .resetPasswordExpires;

      delete returnedObject
        .twoFactorSecret;

      delete returnedObject
        .documentId;

      delete returnedObject
        .cedulaFront;

      delete returnedObject
        .cedulaFrontPublicId;

      delete returnedObject
        .cedulaBack;

      delete returnedObject
        .cedulaBackPublicId;

      delete returnedObject
        .selfie;

      delete returnedObject
        .selfiePublicId;

      delete returnedObject
        .dailyVerificationPhoto;

      delete returnedObject
        .profilePhotoPublicId;

      delete returnedObject
        .departments;

       delete returnedObject
         .pendingProfilePhoto;

      delete returnedObject
        .pendingProfilePhotoPublicId;

      return returnedObject;
    }
  }
);

userSchema.set(
  "toObject",
  {
    virtuals: true
  }
);
/*
|--------------------------------------------------------------------------
| Índices de rendimiento
|--------------------------------------------------------------------------
*/

userSchema.index({
  accountType: 1,
  status: 1
});

userSchema.index({
  role: 1,
  status: 1
});

userSchema.index({
  department: 1,
  status: 1
});

userSchema.index({
  verificationStatus: 1,
  identitySubmittedAt: -1
});

userSchema.index({
  sellerEnabled: 1,
  verificationStatus: 1,
  status: 1
});

userSchema.index({
  buyerEnabled: 1,
  status: 1
});

userSchema.index({
  trustScore: -1,
  status: 1
});

userSchema.index({
  securityLevel: 1,
  status: 1
});

userSchema.index({
  createdAt: -1
});

userSchema.index({
  updatedAt: -1
});

userSchema.index({
  firstName: "text",
  lastName: "text",
  email: "text",
  employeeCode: "text"
});

/*
|--------------------------------------------------------------------------
| Métodos de instancia
|--------------------------------------------------------------------------
*/

userSchema.methods.enableSeller = function (
  reviewerId = null,
  notes = ""
) {
  const approvalDate = new Date();

  this.verificationStatus = "APPROVED";
  this.identityLevel = "VERIFIED";
  this.isVerified = true;
  this.sellerEnabled = true;

  this.identityReviewedAt = approvalDate;
  this.verifiedAt = approvalDate;

  this.identityReviewedBy = reviewerId;
  this.verifiedBy = reviewerId;

  this.verificationNotes = String(notes || "").trim();
  this.identityRejectionReason = "";

  /*
  |--------------------------------------------------------------------------
  | Aprobar fotografía pendiente
  |--------------------------------------------------------------------------
  */

  if (this.pendingProfilePhoto) {
    this.profilePhoto = this.pendingProfilePhoto;

    this.profilePhotoPublicId =
      this.pendingProfilePhotoPublicId || "";

    this.profilePhotoUploadedAt =
      approvalDate;

    this.pendingProfilePhoto = "";
    this.pendingProfilePhotoPublicId = "";
  }

  this.profilePhotoStatus = "APPROVED";
  this.profilePhotoRejectedReason = "";
  this.profilePhotoApprovedAt = approvalDate;
  this.profilePhotoApprovedBy = reviewerId;

  return this;
};

userSchema.methods.rejectIdentity = function (
  reviewerId = null,
  reason = ""
) {
  this.verificationStatus = "REJECTED";

  this.identityLevel = "LEVEL_0";

  this.isVerified = false;

  this.sellerEnabled = false;

  this.identityReviewedAt = new Date();

  this.identityReviewedBy = reviewerId;

  this.identityRejectionReason =
    String(reason || "").trim();

  /*
  |--------------------------------------------------------------------------
  | Rechazar fotografía de perfil
  |--------------------------------------------------------------------------
  */

  this.profilePhotoStatus = "REJECTED";

  this.profilePhotoRejectedReason =
    String(reason || "").trim();

  this.profilePhotoApprovedAt = null;

  this.profilePhotoApprovedBy = null;

  return this;
};

userSchema.methods.requestIdentityResubmission =
function (
  reviewerId = null,
  reason = ""
) {
  this.verificationStatus =
    "RESUBMISSION_REQUIRED";

  this.isVerified = false;

  this.sellerEnabled = false;

  this.identityReviewedAt =
    new Date();

  this.identityReviewedBy =
    reviewerId;

  this.identityRejectionReason =
    String(reason || "").trim();

  this.identityResubmissionCount =
    Number(
      this.identityResubmissionCount || 0
    ) + 1;

  /*
  |--------------------------------------------------------------------------
  | Solicitar nueva fotografía
  |--------------------------------------------------------------------------
  */

  this.profilePhotoStatus =
    "RESUBMISSION_REQUIRED";

  this.profilePhotoRejectedReason =
    String(reason || "").trim();

  this.profilePhotoApprovedAt =
    null;

  this.profilePhotoApprovedBy =
    null;

  return this;
};

userSchema.methods.startIdentityReview =
  function (
    reviewerId = null
  ) {
    this.verificationStatus =
      "UNDER_REVIEW";

    this.identityReviewStartedAt =
      new Date();

    this.identityReviewedBy =
      reviewerId;

    this.sellerEnabled =
      false;

    return this;
  };

userSchema.methods.submitIdentity =
  function () {
    this.verificationStatus =
      "PENDING_REVIEW";

    this.identitySubmittedAt =
      new Date();

    this.identityReviewStartedAt =
      null;

    this.identityReviewedAt =
      null;

    this.identityReviewedBy =
      null;

    this.identityRejectionReason =
      "";

    this.isVerified = false;

    this.sellerEnabled =
      false;

    return this;
  };

userSchema.methods.suspendAccount =
  function (
    administratorId = null,
    reason = ""
  ) {
    this.status =
      "SUSPENDED";

    this.suspendedAt =
      new Date();

    this.suspendedBy =
      administratorId;

    this.suspensionReason =
      String(reason || "").trim();

    this.buyerEnabled =
      false;

    this.sellerEnabled =
      false;

    return this;
  };

userSchema.methods.activateAccount =
  function () {
    this.status =
      "ACTIVE";

    this.suspendedAt =
      null;

    this.suspendedBy =
      null;

    this.suspensionReason =
      "";

    this.accountLockedUntil =
      null;

    this.failedLoginAttempts =
      0;

    if (
      this.accountType ===
      "CUSTOMER"
    ) {
      this.buyerEnabled =
        true;

      this.sellerEnabled =
        this
          .verificationStatus ===
        "APPROVED";
    }

    return this;
  };

userSchema.methods.banAccount =
  function (
    administratorId = null,
    reason = ""
  ) {
    this.status =
      "BANNED";

    this.bannedAt =
      new Date();

    this.bannedBy =
      administratorId;

    this.suspensionReason =
      String(reason || "").trim();

    this.buyerEnabled =
      false;

    this.sellerEnabled =
      false;

    return this;
  };

userSchema.methods.markAsDeleted =
  function (
    administratorId = null,
    reason = ""
  ) {
    this.status =
      "DELETED";

    this.deletedAt =
      new Date();

    this.deletedBy =
      administratorId;

    this.deletionReason =
      String(reason || "").trim();

    this.buyerEnabled =
      false;

    this.sellerEnabled =
      false;

    this.emailNotificationsEnabled =
      false;

    this.notificationsEnabled =
      false;

    return this;
  };

userSchema.methods.registerSuccessfulLogin =
  function ({
    ip = "",
    device = ""
  } = {}) {
    this.lastLoginAt =
      new Date();

    this.lastLoginIp =
      String(ip || "").trim();

    this.lastLoginDevice =
      String(device || "").trim();

    this.failedLoginAttempts =
      0;

    this.accountLockedUntil =
      null;

    return this;
  };

userSchema.methods.registerFailedLogin =
  function ({
    maximumAttempts = 5,
    lockMinutes = 30
  } = {}) {
    this.failedLoginAttempts =
      Number(
        this.failedLoginAttempts ||
          0
      ) + 1;

    if (
      this.failedLoginAttempts >=
      maximumAttempts
    ) {
      this.accountLockedUntil =
        new Date(
          Date.now() +
            lockMinutes *
              60 *
              1000
        );

      this.securityLevel =
        "LOCKED";
    }

    return this;
  };

userSchema.methods.isAccountLocked =
  function () {
    if (
      !this.accountLockedUntil
    ) {
      return false;
    }

    return (
      new Date(
        this.accountLockedUntil
      ).getTime() >
      Date.now()
    );
  };

userSchema.methods.hasPermission =
  function (permission) {
    if (!permission) {
      return false;
    }

    if (
      this.role ===
        "SUPER_ADMIN" ||
      this.permissions.includes(
        "*"
      )
    ) {
      return true;
    }

    return this.permissions.includes(
      String(permission)
        .trim()
        .toUpperCase()
    );
  };

userSchema.methods.belongsToDepartment =
  function (department) {
    const normalizedDepartment =
      normalizeUpper(
        department
      );

    if (
      this.department ===
      normalizedDepartment
    ) {
      return true;
    }

    return (
      Array.isArray(
        this.departments
      ) &&
      this.departments
        .map(normalizeUpper)
        .includes(
          normalizedDepartment
        )
    );
  };

/*
|--------------------------------------------------------------------------
| Métodos estáticos
|--------------------------------------------------------------------------
*/

userSchema.statics.findByEmail =
  function (email) {
    return this.findOne({
      email:
        normalizeEmail(email)
    });
  };

userSchema.statics.findInternalUsers =
  function (
    filters = {}
  ) {
    const query = {
      accountType:
        "INTERNAL"
    };

    if (filters.status) {
      query.status =
        normalizeUpper(
          filters.status
        );
    }

    if (filters.role) {
      query.role =
        normalizeUpper(
          filters.role
        );
    }

    if (
      filters.department
    ) {
      query.department =
        normalizeUpper(
          filters.department
        );
    }

    return this.find(query);
  };

userSchema.statics.findPendingVerification =
  function () {
    return this.find({
      accountType:
        "CUSTOMER",

      verificationStatus: {
        $in: [
          "PENDING",
          "PENDING_REVIEW",
          "UNDER_REVIEW",
          "RESUBMISSION_REQUIRED"
        ]
      },

      status: {
        $ne: "DELETED"
      }
    }).sort({
      identitySubmittedAt: 1,
      createdAt: 1
    });
  };

/*
|--------------------------------------------------------------------------
| Limpieza previa al guardado
|--------------------------------------------------------------------------
*/

userSchema.pre(
  "save",
  function () {
    if (
      Array.isArray(
        this.permissions
      )
    ) {
      this.permissions = [
        ...new Set(
          this.permissions
            .filter(Boolean)
            .map(
              (permission) =>
                normalizeUpper(
                  permission
                )
            )
        )
      ];
    }

    if (
      Array.isArray(
        this.departments
      )
    ) {
      this.departments = [
        ...new Set(
          this.departments
            .filter(Boolean)
            .map(
              (department) =>
                normalizeUpper(
                  department
                )
            )
        )
      ];
    }

    if (
      this.isModified(
        "password"
      )
    ) {
      this.passwordChangedAt =
        new Date();

      this.passwordVersion =
        Number(
          this.passwordVersion ||
            0
        ) + 1;
    }

    if (
      this
        .verificationStatus ===
      "APPROVED"
    ) {
      this.isVerified =
        true;

      this.identityLevel =
        "VERIFIED";

      if (
        this.status ===
        "ACTIVE"
      ) {
        this.sellerEnabled =
          true;
      }
    }

    if (
      this
        .verificationStatus !==
      "APPROVED"
    ) {
      this.isVerified =
        false;

      this.sellerEnabled =
        false;
    }

    if (
      [
        "SUSPENDED",
        "BANNED",
        "DELETED"
      ].includes(
        this.status
      )
    ) {
      this.buyerEnabled =
        false;

      this.sellerEnabled =
        false;
    }
  }
);

/*
|--------------------------------------------------------------------------
| Exportación
|--------------------------------------------------------------------------
*/

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    userSchema
  );

module.exports = User;