const mongoose = require("mongoose");

const securityAlertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["NEW_DEVICE", "NEW_IP", "FAILED_FACE_CHECK", "ACCOUNT_LOCKED", "SUSPICIOUS_LOGIN"],
      required: true
    },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM"
    },
    message: { type: String, required: true },
    ipAddress: { type: String, default: "" },
    deviceInfo: { type: String, default: "" },
    status: {
      type: String,
      enum: ["OPEN", "UNDER_REVIEW", "RESOLVED"],
      default: "OPEN"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SecurityAlert", securityAlertSchema);