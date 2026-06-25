const mongoose = require("mongoose");

const sessionLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ipAddress: { type: String, default: "" },
    deviceInfo: { type: String, default: "" },
    loginStatus: {
      type: String,
      enum: ["SUCCESS", "FAILED", "BLOCKED", "FACE_REQUIRED"],
      default: "SUCCESS"
    },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW"
    },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SessionLog", sessionLogSchema);