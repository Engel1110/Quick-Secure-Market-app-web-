const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Función auxiliar para valores monetarios
|--------------------------------------------------------------------------
*/

const moneyField = (
  defaultValue = 0
) => ({
  type: Number,
  default: defaultValue,
  min: 0
});

/*
|--------------------------------------------------------------------------
| Estado general de la plataforma
|--------------------------------------------------------------------------
*/

const platformSchema =
  new mongoose.Schema(
    {
      marketplaceEnabled: {
        type: Boolean,
        default: true
      },

      registrationEnabled: {
        type: Boolean,
        default: true
      },

      loginEnabled: {
        type: Boolean,
        default: true
      },

      purchasesEnabled: {
        type: Boolean,
        default: true
      },

      salesEnabled: {
        type: Boolean,
        default: true
      },

      maintenanceMode: {
        type: Boolean,
        default: false
      },

      maintenanceMessage: {
        type: String,
        trim: true,
        maxlength: 1000,
        default:
          "QSM se encuentra temporalmente en mantenimiento."
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Verificación y KYC
|--------------------------------------------------------------------------
*/

const verificationSchema =
  new mongoose.Schema(
    {
      kycRequiredForBuying: {
        type: Boolean,
        default: false
      },

      kycRequiredForSelling: {
        type: Boolean,
        default: true
      },

      kycRequiredForWithdrawals: {
        type: Boolean,
        default: true
      },

      faceVerificationEnabled: {
        type: Boolean,
        default: true
      },

      periodicFaceCheckEnabled: {
        type: Boolean,
        default: true
      },

      periodicFaceCheckHours: {
        type: Number,
        default: 72,
        min: 1,
        max: 8760
      },

      minimumSellerTrustScore: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
      },

      minimumBuyerTrustScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Finanzas y escrow
|--------------------------------------------------------------------------
*/

const financeSchema =
  new mongoose.Schema(
    {
      escrowEnabled: {
        type: Boolean,
        default: true
      },

      walletEnabled: {
        type: Boolean,
        default: true
      },

      withdrawalsEnabled: {
        type: Boolean,
        default: true
      },

      refundsEnabled: {
        type: Boolean,
        default: true
      },

      platformCommissionPercent: {
        type: Number,
        default: 5,
        min: 0,
        max: 100
      },

      sellerCommissionPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },

      buyerServiceFeePercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },

      minimumWithdrawalAmount:
        moneyField(500),

      maximumWithdrawalAmount:
        moneyField(500000),

      escrowReleaseHours: {
        type: Number,
        default: 24,
        min: 0,
        max: 720
      },

      currency: {
        type: String,
        enum: [
          "DOP",
          "USD"
        ],
        default: "DOP"
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Órdenes, entregas y disputas
|--------------------------------------------------------------------------
*/

const operationsSchema =
  new mongoose.Schema(
    {
      maximumDeliveryDays: {
        type: Number,
        default: 7,
        min: 1,
        max: 90
      },

      orderCancellationMinutes: {
        type: Number,
        default: 30,
        min: 0,
        max: 10080
      },

      disputeOpeningDays: {
        type: Number,
        default: 7,
        min: 1,
        max: 90
      },

      disputeResolutionDays: {
        type: Number,
        default: 15,
        min: 1,
        max: 180
      },

      warehouseInspectionRequired: {
        type: Boolean,
        default: true
      },

      deliveryPinRequired: {
        type: Boolean,
        default: true
      },

      buyerConfirmationRequired: {
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
| Seguridad global
|--------------------------------------------------------------------------
*/

const securitySchema =
  new mongoose.Schema(
    {
      adminTwoFactorRequired: {
        type: Boolean,
        default: false
      },

      userTwoFactorAvailable: {
        type: Boolean,
        default: true
      },

      adminSessionTimeoutMinutes: {
        type: Number,
        default: 30,
        min: 5,
        max: 1440
      },

      userSessionTimeoutMinutes: {
        type: Number,
        default: 240,
        min: 5,
        max: 10080
      },

      maximumLoginAttempts: {
        type: Number,
        default: 5,
        min: 1,
        max: 20
      },

      accountLockMinutes: {
        type: Number,
        default: 30,
        min: 1,
        max: 1440
      },

      suspiciousIpDetectionEnabled: {
        type: Boolean,
        default: true
      },

      suspiciousDeviceDetectionEnabled: {
        type: Boolean,
        default: true
      },

      forcePasswordChangeForInternalUsers: {
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
| Notificaciones y correos
|--------------------------------------------------------------------------
*/

const communicationSchema =
  new mongoose.Schema(
    {
      emailNotificationsEnabled: {
        type: Boolean,
        default: true
      },

      pushNotificationsEnabled: {
        type: Boolean,
        default: true
      },

      smsNotificationsEnabled: {
        type: Boolean,
        default: false
      },

      adminAlertsEnabled: {
        type: Boolean,
        default: true
      },

      securityAlertsEnabled: {
        type: Boolean,
        default: true
      },

      orderNotificationsEnabled: {
        type: Boolean,
        default: true
      },

      disputeNotificationsEnabled: {
        type: Boolean,
        default: true
      },

      supportEmail: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 160,
        default: ""
      },

      noReplyEmail: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 160,
        default: ""
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Moderación
|--------------------------------------------------------------------------
*/

const moderationSchema =
  new mongoose.Schema(
    {
      automaticProductReviewEnabled: {
        type: Boolean,
        default: false
      },

      requireProductApproval: {
        type: Boolean,
        default: false
      },

      hideReportedProductsAutomatically: {
        type: Boolean,
        default: false
      },

      reportsBeforeAutomaticHide: {
        type: Number,
        default: 5,
        min: 1,
        max: 1000
      },

      allowUserReviews: {
        type: Boolean,
        default: true
      },

      allowProductComments: {
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
| Inteligencia artificial y automatización
|--------------------------------------------------------------------------
*/

const automationSchema =
  new mongoose.Schema(
    {
      fraudDetectionEnabled: {
        type: Boolean,
        default: true
      },

      aiModerationEnabled: {
        type: Boolean,
        default: false
      },

      automaticRiskScoringEnabled: {
        type: Boolean,
        default: true
      },

      automaticDisputePrioritizationEnabled: {
        type: Boolean,
        default: false
      },

      automaticSecurityAlertsEnabled: {
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
| Modelo principal
|--------------------------------------------------------------------------
*/

const systemSettingSchema =
  new mongoose.Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | Solo debe existir un documento global
      |--------------------------------------------------------------------------
      */

      key: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        default:
          "GLOBAL_SYSTEM_SETTINGS",
        immutable: true
      },

      platform: {
        type: platformSchema,
        default: () => ({})
      },

      verification: {
        type: verificationSchema,
        default: () => ({})
      },

      finance: {
        type: financeSchema,
        default: () => ({})
      },

      operations: {
        type: operationsSchema,
        default: () => ({})
      },

      security: {
        type: securitySchema,
        default: () => ({})
      },

      communication: {
        type: communicationSchema,
        default: () => ({})
      },

      moderation: {
        type: moderationSchema,
        default: () => ({})
      },

      automation: {
        type: automationSchema,
        default: () => ({})
      },

      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      lastResetBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      lastResetAt: {
        type: Date,
        default: null
      }
    },
    {
      timestamps: true,
      versionKey: false
    }
  );

/*
|--------------------------------------------------------------------------
| Índices
|--------------------------------------------------------------------------
*/

systemSettingSchema.index(
  {
    key: 1
  },
  {
    unique: true
  }
);

/*
|--------------------------------------------------------------------------
| Método estático: obtener o crear configuración global
|--------------------------------------------------------------------------
*/

systemSettingSchema.statics.getGlobal =
  async function () {
    let settings =
      await this.findOne({
        key:
          "GLOBAL_SYSTEM_SETTINGS"
      });

    if (!settings) {
      settings =
        await this.create({
          key:
            "GLOBAL_SYSTEM_SETTINGS"
        });
    }

    return settings;
  };

/*
|--------------------------------------------------------------------------
| Exportar modelo
|--------------------------------------------------------------------------
*/

module.exports =
  mongoose.models.SystemSetting ||
  mongoose.model(
    "SystemSetting",
    systemSettingSchema
  );