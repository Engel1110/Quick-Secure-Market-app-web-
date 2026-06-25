const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    actorRole: {
      type: String,
      default: ""
    },

    action: {
      type: String,
      required: true
    },

    targetType: {
      type: String,
      enum: [
        "USER",
        "PRODUCT",
        "ORDER",
        "DISPUTE",
        "KYC",
        "PAYMENT",
        "SECURITY",
        "SYSTEM"
      ],
      default: "SYSTEM"
    },

    targetId: {
      type: String,
      default: ""
    },

    description: {
      type: String,
      required: true
    },

    ipAddress: {
      type: String,
      default: ""
    },

    deviceInfo: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);