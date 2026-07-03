import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    firstName: String,
    lastName: String,
    phone: String,
    documentType: {
      type: String,
      enum: ["CEDULA", "PASAPORTE", "LICENCIA"],
      default: "CEDULA"
    },
    documentNumber: {
      type: String,
      trim: true
    },
    address: String,
    city: String,
    province: String,
    gender: {
      type: String,
      enum: ["MASCULINO", "FEMENINO", "OTRO", ""],
      default: ""
    },
    birthDate: Date,
    documentFrontUrl: String,
    documentBackUrl: String,
    selfieUrl: String,
    status: {
      type: String,
      enum: ["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED", "NEEDS_REVIEW"],
      default: "NOT_SUBMITTED"
    },
    trustScore: {
      type: Number,
      default: 50
    },
    rejectionReason: {
      type: String,
      default: ""
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: Date,
    lastDailyCheck: Date,
    dailyChecks: [
      {
        checkedAt: {
          type: Date,
          default: Date.now
        },
        status: {
          type: String,
          enum: ["PASSED", "FAILED", "NEEDS_REVIEW"],
          default: "PASSED"
        }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Verification", verificationSchema);
