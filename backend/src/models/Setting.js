const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Subdocumento de notificaciones
|--------------------------------------------------------------------------
*/

const notificationsSchema = new mongoose.Schema(
  {
    messages: {
      type: Boolean,
      default: true
    },

    orders: {
      type: Boolean,
      default: true
    },

    disputes: {
      type: Boolean,
      default: true
    },

    security: {
      type: Boolean,
      default: true
    },

    email: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Subdocumento de privacidad
|--------------------------------------------------------------------------
*/

const privacySchema = new mongoose.Schema(
  {
    showTrustScore: {
      type: Boolean,
      default: true
    },

    showLocation: {
      type: Boolean,
      default: true
    },

    allowMessages: {
      type: Boolean,
      default: true
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Subdocumento de seguridad
|--------------------------------------------------------------------------
*/

const securitySchema = new mongoose.Schema(
  {
    /*
     * Este campo guarda la preferencia.
     * La implementación real de 2FA se realizará en la fase de seguridad.
     */
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },

    loginAlerts: {
      type: Boolean,
      default: true
    },

    sessionTimeout: {
      type: String,
      enum: [
        "15",
        "30",
        "60",
        "240"
      ],
      default: "30"
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Configuración principal
|--------------------------------------------------------------------------
*/

const settingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },

    theme: {
      type: String,
      enum: [
        "dark",
        "light"
      ],
      default: "dark"
    },

    accentColor: {
      type: String,
      enum: [
        "cyan",
        "purple",
        "pink",
        "blue",
        "green",
        "orange"
      ],
      default: "cyan"
    },

    language: {
      type: String,
      enum: [
        "es",
        "en"
      ],
      default: "es"
    },

    density: {
      type: String,
      enum: [
        "comfortable",
        "compact",
        "spacious"
      ],
      default: "comfortable"
    },

    animations: {
      type: Boolean,
      default: true
    },

    glassEffect: {
      type: Boolean,
      default: true
    },

    compactSidebar: {
      type: Boolean,
      default: false
    },

    notifications: {
      type: notificationsSchema,
      default: () => ({})
    },

    privacy: {
      type: privacySchema,
      default: () => ({})
    },

    security: {
      type: securitySchema,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports =
  mongoose.models.Setting ||
  mongoose.model(
    "Setting",
    settingsSchema
  );