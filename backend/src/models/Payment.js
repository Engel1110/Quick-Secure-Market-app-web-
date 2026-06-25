const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    method: {
      type: String,
      enum: ["QSM_ESCROW", "CARD", "BANK_TRANSFER", "CASH"],
      default: "QSM_ESCROW"
    },

    status: {
      type: String,
      enum: ["PENDING", "HELD", "RELEASED", "REFUNDED", "FAILED"],
      default: "PENDING"
    },

    transactionCode: {
      type: String,
      required: true,
      unique: true
    },

    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);