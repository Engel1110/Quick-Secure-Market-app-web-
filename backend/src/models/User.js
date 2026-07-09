const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: 2,
      maxlength: 50
    },

    lastName: {
      type: String,
      required: [true, "El apellido es obligatorio"],
      trim: true,
      minlength: 2,
      maxlength: 50
    },

    email: {
      type: String,
      required: [true, "El correo es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: "Correo electrónico no válido"
      }
    },

    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      minlength: 8,
      select: false
    },

    phone: {
      type: String,
      trim: true,
      default: ""
    },

    documentId: {
      type: String,
      trim: true,
      default: ""
    },

    role: {
      type: String,
      enum: ["USER", "ADMIN", "SENIOR_ADMIN", "AUDITOR", "VERIFICATION_AGENT"],
      default: "USER"
    },

    buyerEnabled: {
      type: Boolean,
      default: true
    },

    sellerEnabled: {
      type: Boolean,
      default: true
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    verificationStatus: {
      type: String,
      enum: ["NOT_STARTED", "PENDING", "APPROVED", "REJECTED"],
      default: "NOT_STARTED"
    },

    identityLevel: {
      type: String,
      enum: ["LEVEL_0", "LEVEL_1", "LEVEL_2", "BUSINESS"],
      default: "LEVEL_0"
    },

    cedulaFront: {
      type: String,
      default: ""
    },

    cedulaBack: {
      type: String,
      default: ""
    },

    selfie: {
      type: String,
      default: ""
    },

    dailyVerificationPhoto: {
      type: String,
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

    trustScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },

    securityLevel: {
      type: String,
      enum: ["NORMAL", "ELEVATED", "LOCKED"],
      default: "NORMAL"
    },

    requireFaceCheck: {
      type: Boolean,
      default: false
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0
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
      default: 0,
      min: 0
    },

    accountLockedUntil: {
      type: Date,
      default: null
    },

    status: {
      type: String,
      enum: ["ACTIVE", "PENDING", "SUSPENDED", "BANNED"],
      default: "PENDING"
    },

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
    }
  },
  { timestamps: true }
);

userSchema.index({ documentId: 1 }, { sparse: true });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);