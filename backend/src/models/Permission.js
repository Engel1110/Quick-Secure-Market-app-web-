const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    module: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model(
  "Permission",
  permissionSchema
);