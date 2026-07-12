const mongoose = require("mongoose");
const validator = require("validator");

/*
|--------------------------------------------------------------------------
| Normalizar nombres
|--------------------------------------------------------------------------
| Convierte:
|   angel feliz  -> Angel Feliz
|   ÁNGEL FÉLIZ  -> Ángel Féliz
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

const userSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Información básica
    |--------------------------------------------------------------------------
    */

    firstName: {
      type: String,
      required: [
        true,
        "El nombre es obligatorio"
      ],
      trim: true,
      minlength: [
        2,
        "El nombre debe tener al menos 2 caracteres"
      ],
      maxlength: [
        50,
        "El nombre no puede superar los 50 caracteres"
      ],
      set: normalizePersonName
    },

    lastName: {
      type: String,
      required: [
        true,
        "El apellido es obligatorio"
      ],
      trim: true,
      minlength: [
        2,
        "El apellido debe tener al menos 2 caracteres"
      ],
      maxlength: [
        50,
        "El apellido no puede superar los 50 caracteres"
      ],
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
      validate: {
        validator: validator.isEmail,
        message:
          "Correo electrónico no válido"
      }
    },

    password: {
      type: String,
      required: [
        true,
        "La contraseña es obligatoria"
      ],
      minlength: [
        8,
        "La contraseña debe tener al menos 8 caracteres"
      ],
      select: false
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30
    },

    documentId: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50
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
      default: "PREFER_NOT_TO_SAY"
    },

    /*
    |--------------------------------------------------------------------------
    | Ubicación
    |--------------------------------------------------------------------------
    */

    country: {
      type: String,
      trim: true,
      default: "República Dominicana",
      maxlength: 100
    },

    province: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },

    city: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },

    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500
    },

    /*
    |--------------------------------------------------------------------------
    | Foto de perfil
    |--------------------------------------------------------------------------
    */

    profilePhoto: {
      type: String,
      trim: true,
      default: ""
    },

    profilePhotoPublicId: {
      type: String,
      trim: true,
      default: "",
      select: false
    },

    profilePhotoUploadedAt: {
      type: Date,
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | Roles y permisos
    |--------------------------------------------------------------------------
    */
   accountType: {
  type: String,
  enum: [
    "CUSTOMER",
    "INTERNAL",
    "SYSTEM"
  ],
  default: "CUSTOMER",
  index: true
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
  index: true
},


    permissions: {
      type: [String],
      default: []
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
  default: "CUSTOMER",
  index: true
},

    employeeCode: {
      type: String,
      trim: true,
      default: "",
      uppercase: true
    },

    buyerEnabled: {
      type: Boolean,
      default: true
    },

    sellerEnabled: {
      type: Boolean,
      default: true
    },

    mustChangePassword: {
  type: Boolean,
  default: false
},

createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},

lastModifiedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},

    /*
    |--------------------------------------------------------------------------
    | Verificación QSM y KYC
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
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED"
      ],
      default: "NOT_STARTED",
      index: true
    },

    identityLevel: {
      type: String,
      enum: [
        "LEVEL_0",
        "LEVEL_1",
        "LEVEL_2",
        "BUSINESS"
      ],
      default: "LEVEL_0"
    },

    cedulaFront: {
      type: String,
      trim: true,
      default: ""
    },

    cedulaBack: {
      type: String,
      trim: true,
      default: ""
    },

    selfie: {
      type: String,
      trim: true,
      default: ""
    },

    dailyVerificationPhoto: {
      type: String,
      trim: true,
      default: ""
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
      type: mongoose.Schema.Types.ObjectId,
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
    | Confianza y reputación
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
      trim: true,
      default: ""
    },

    lastLoginDevice: {
      type: String,
      trim: true,
      default: ""
    },

    suspiciousLoginCount: {
      type: Number,
      default: 0,
      min: 0
    },

    accountLockedUntil: {
      type: Date,
      default: null
    },

    activeSessions: {
      type: Number,
      default: 0,
      min: 0
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
      default: "PENDING",
      index: true
    },

    suspensionReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    },

    suspendedAt: {
      type: Date,
      default: null
    },

    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    bannedAt: {
      type: Date,
      default: null
    },

    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    deletionReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    },

    deletedAt: {
      type: Date,
      default: null
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
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
    | Preferencias básicas
    |--------------------------------------------------------------------------
    */

    language: {
      type: String,
      enum: ["es", "en"],
      default: "es"
    },

    timezone: {
      type: String,
      trim: true,
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
| Virtual: nombre completo
|--------------------------------------------------------------------------
*/

userSchema.virtual("fullName").get(
  function () {
    return [
      this.firstName,
      this.lastName
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  }
);

/*
|--------------------------------------------------------------------------
| JSON seguro
|--------------------------------------------------------------------------
*/

userSchema.set("toJSON", {
  virtuals: true,
  transform: (
    document,
    returnedObject
  ) => {
    delete returnedObject.password;
    delete returnedObject.resetPasswordToken;
    delete returnedObject.resetPasswordExpires;
    delete returnedObject.twoFactorSecret;
    delete returnedObject.profilePhotoPublicId;

    return returnedObject;
  }
});

userSchema.set("toObject", {
  virtuals: true
});

/*
|--------------------------------------------------------------------------
| Índices
|--------------------------------------------------------------------------
*/

userSchema.index(
  {
    documentId: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      documentId: {
        $type: "string",
        $ne: ""
      }
    }
  }
);

userSchema.index(
  {
    employeeCode: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      employeeCode: {
        $type: "string",
        $ne: ""
      }
    }
  }
);

userSchema.index(
  {
    resetPasswordToken: 1
  },
  {
    partialFilterExpression: {
      resetPasswordToken: {
        $type: "string"
      }
    }
  }
);

userSchema.index({
  role: 1,
  status: 1,
  createdAt: -1
});

userSchema.index({
  verificationStatus: 1,
  createdAt: -1
});

userSchema.index({
  trustScore: 1,
  createdAt: -1
});

module.exports =
  mongoose.model(
    "User",
    userSchema
  );