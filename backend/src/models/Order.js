const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
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

    price: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "PAID",
        "SHIPPED",
        "DELIVERED",
        "COMPLETED",
        "DISPUTED",
        "CANCELLED"
      ],
      default: "PENDING"
    },

    escrowStatus: {
      type: String,
      enum: ["HELD", "RELEASED", "REFUNDED"],
      default: "HELD"
    },

    paymentMethod: {
      type: String,
      default: "QSM_ESCROW"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);