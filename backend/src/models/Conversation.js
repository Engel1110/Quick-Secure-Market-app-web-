const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null
    },

    lastMessage: {
      text: {
        type: String,
        default: ""
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      createdAt: {
        type: Date,
        default: null
      }
    },

    unread: {
      type: Map,
      of: Number,
      default: {}
    },

    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    blockedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    labels: [
      {
        name: {
          type: String,
          trim: true
        },
        color: {
          type: String,
          default: "#1976d2"
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      }
    ],

    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
      }
    ],

    favoriteBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    language: {
      type: String,
      default: "es"
    },

    translationEnabled: {
      type: Boolean,
      default: false
    },

    exportCount: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED", "BLOCKED"],
      default: "ACTIVE"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Conversation", conversationSchema);