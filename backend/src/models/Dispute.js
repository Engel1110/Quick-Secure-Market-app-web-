const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
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

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },

    reason: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    evidence: {
        type: [String],
        default: []
    },

    status: {
        type: String,
        enum: [
            "OPEN",
            "UNDER_REVIEW",
            "RESOLVED",
            "REFUNDED",
            "REJECTED"
        ],
        default: "OPEN"
    },

    adminNotes: {
        type: String,
        default: ""
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("Dispute", disputeSchema);