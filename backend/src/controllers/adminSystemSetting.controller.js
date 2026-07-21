const validator = require("validator");

const SystemSetting = require(
  "../models/SystemSetting"
);

const AuditLog = require(
  "../models/AuditLog"
);

/*
|--------------------------------------------------------------------------
| Constantes
|--------------------------------------------------------------------------
*/

const GLOBAL_SETTINGS_KEY =
  "GLOBAL_SYSTEM_SETTINGS";

const ALLOWED_CURRENCIES = [
  "DOP",
  "USD"
];

/*
|--------------------------------------------------------------------------
| Campos permitidos
|--------------------------------------------------------------------------
*/

const BOOLEAN_FIELDS = {
  platform: [
    "marketplaceEnabled",
    "registrationEnabled",
    "loginEnabled",
    "purchasesEnabled",
    "salesEnabled",
    "maintenanceMode"
  ],

  verification: [
    "kycRequiredForBuying",
    "kycRequiredForSelling",
    "kycRequiredForWithdrawals",
    "faceVerificationEnabled",
    "periodicFaceCheckEnabled"
  ],

  finance: [
    "escrowEnabled",
    "walletEnabled",
    "withdrawalsEnabled",
    "refundsEnabled"
  ],

  operations: [
    "warehouseInspectionRequired",
    "deliveryPinRequired",
    "buyerConfirmationRequired"
  ],

  security: [
    "adminTwoFactorRequired",
    "userTwoFactorAvailable",
    "suspiciousIpDetectionEnabled",
    "suspiciousDeviceDetectionEnabled",
    "forcePasswordChangeForInternalUsers"
  ],

  communication: [
    "emailNotificationsEnabled",
    "pushNotificationsEnabled",
    "smsNotificationsEnabled",
    "adminAlertsEnabled",
    "securityAlertsEnabled",
    "orderNotificationsEnabled",
    "disputeNotificationsEnabled"
  ],

  moderation: [
    "automaticProductReviewEnabled",
    "requireProductApproval",
    "hideReportedProductsAutomatically",
    "allowUserReviews",
    "allowProductComments"
  ],

  automation: [
    "fraudDetectionEnabled",
    "aiModerationEnabled",
    "automaticRiskScoringEnabled",
    "automaticDisputePrioritizationEnabled",
    "automaticSecurityAlertsEnabled"
  ]
};

const NUMBER_FIELDS = {
  verification: {
    periodicFaceCheckHours: {
      min: 1,
      max: 8760
    },

    minimumSellerTrustScore: {
      min: 0,
      max: 100
    },

    minimumBuyerTrustScore: {
      min: 0,
      max: 100
    }
  },

  finance: {
    platformCommissionPercent: {
      min: 0,
      max: 100
    },

    sellerCommissionPercent: {
      min: 0,
      max: 100
    },

    buyerServiceFeePercent: {
      min: 0,
      max: 100
    },

    minimumWithdrawalAmount: {
      min: 0,
      max: 1000000000
    },

    maximumWithdrawalAmount: {
      min: 0,
      max: 1000000000
    },

    escrowReleaseHours: {
      min: 0,
      max: 720
    }
  },

  operations: {
    maximumDeliveryDays: {
      min: 1,
      max: 90
    },

    orderCancellationMinutes: {
      min: 0,
      max: 10080
    },

    disputeOpeningDays: {
      min: 1,
      max: 90
    },

    disputeResolutionDays: {
      min: 1,
      max: 180
    }
  },

  security: {
    adminSessionTimeoutMinutes: {
      min: 5,
      max: 1440
    },

    userSessionTimeoutMinutes: {
      min: 5,
      max: 10080
    },

    maximumLoginAttempts: {
      min: 1,
      max: 20
    },

    accountLockMinutes: {
      min: 1,
      max: 1440
    }
  },

  moderation: {
    reportsBeforeAutomaticHide: {
      min: 1,
      max: 1000
    }
  }
};

const STRING_FIELDS = {
  platform: {
    maintenanceMessage: {
      maxLength: 1000
    }
  },

  communication: {
    supportEmail: {
      maxLength: 160,
      isEmail: true
    },

    noReplyEmail: {
      maxLength: 160,
      isEmail: true
    }
  }
};

/*
|--------------------------------------------------------------------------
| Utilidades
|--------------------------------------------------------------------------
*/

const getActorId = (req) =>
  req.user?._id ||
  req.user?.id ||
  null;

const getActorRole = (req) =>
  String(
    req.user?.role || ""
  )
    .trim()
    .toUpperCase();

const getClientIp = (req) => {
  const forwarded =
    req.headers[
      "x-forwarded-for"
    ];

  if (forwarded) {
    return String(forwarded)
      .split(",")[0]
      .trim();
  }

  return String(
    req.ip ||
      req.socket?.remoteAddress ||
      ""
  );
};

const getDeviceInfo = (req) =>
  String(
    req.headers[
      "user-agent"
    ] ||
      "Dispositivo desconocido"
  ).slice(0, 300);

const hasOwn = (
  object,
  property
) =>
  Object.prototype.hasOwnProperty.call(
    object || {},
    property
  );

const isPlainObject = (
  value
) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const normalizeEmail = (
  value
) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeString = (
  value
) =>
  String(value || "")
    .trim();

const createAuditLogSafe = (
  data
) => {
  AuditLog.create(data).catch(
    (error) => {
      console.error(
        "Error creando AuditLog de System Settings:",
        error.message
      );
    }
  );
};

const serializeForComparison = (
  value
) => {
  if (
    value &&
    typeof value.toObject ===
      "function"
  ) {
    return value.toObject();
  }

  return JSON.parse(
    JSON.stringify(value || {})
  );
};

const describeChanges = (
  before,
  after
) => {
  const changes = [];

  const sections = [
    "platform",
    "verification",
    "finance",
    "operations",
    "security",
    "communication",
    "moderation",
    "automation"
  ];

  for (
    const section
    of sections
  ) {
    const previousSection =
      before?.[section] || {};

    const currentSection =
      after?.[section] || {};

    const keys = new Set([
      ...Object.keys(
        previousSection
      ),
      ...Object.keys(
        currentSection
      )
    ]);

    for (
      const key
      of keys
    ) {
      const previousValue =
        previousSection[key];

      const currentValue =
        currentSection[key];

      if (
        JSON.stringify(
          previousValue
        ) !==
        JSON.stringify(
          currentValue
        )
      ) {
        changes.push({
          field:
            `${section}.${key}`,
          previousValue,
          currentValue
        });
      }
    }
  }

  return changes;
};

/*
|--------------------------------------------------------------------------
| Validar y aplicar booleanos
|--------------------------------------------------------------------------
*/

const applyBooleanFields = ({
  sectionName,
  source,
  target,
  errors
}) => {
  const allowedFields =
    BOOLEAN_FIELDS[
      sectionName
    ] || [];

  for (
    const field
    of allowedFields
  ) {
    if (
      !hasOwn(
        source,
        field
      )
    ) {
      continue;
    }

    if (
      typeof source[field] !==
      "boolean"
    ) {
      errors.push(
        `${sectionName}.${field} debe ser verdadero o falso.`
      );

      continue;
    }

    target[field] =
      source[field];
  }
};

/*
|--------------------------------------------------------------------------
| Validar y aplicar números
|--------------------------------------------------------------------------
*/

const applyNumberFields = ({
  sectionName,
  source,
  target,
  errors
}) => {
  const fieldDefinitions =
    NUMBER_FIELDS[
      sectionName
    ] || {};

  for (
    const [
      field,
      rules
    ]
    of Object.entries(
      fieldDefinitions
    )
  ) {
    if (
      !hasOwn(
        source,
        field
      )
    ) {
      continue;
    }

    const numericValue =
      Number(
        source[field]
      );

    if (
      !Number.isFinite(
        numericValue
      )
    ) {
      errors.push(
        `${sectionName}.${field} debe ser numérico.`
      );

      continue;
    }

    if (
      numericValue <
        rules.min ||
      numericValue >
        rules.max
    ) {
      errors.push(
        `${sectionName}.${field} debe estar entre ${rules.min} y ${rules.max}.`
      );

      continue;
    }

    target[field] =
      numericValue;
  }
};

/*
|--------------------------------------------------------------------------
| Validar y aplicar textos
|--------------------------------------------------------------------------
*/

const applyStringFields = ({
  sectionName,
  source,
  target,
  errors
}) => {
  const fieldDefinitions =
    STRING_FIELDS[
      sectionName
    ] || {};

  for (
    const [
      field,
      rules
    ]
    of Object.entries(
      fieldDefinitions
    )
  ) {
    if (
      !hasOwn(
        source,
        field
      )
    ) {
      continue;
    }

    let normalizedValue =
      rules.isEmail
        ? normalizeEmail(
            source[field]
          )
        : normalizeString(
            source[field]
          );

    if (
      normalizedValue.length >
      rules.maxLength
    ) {
      errors.push(
        `${sectionName}.${field} no puede superar ${rules.maxLength} caracteres.`
      );

      continue;
    }

    if (
      rules.isEmail &&
      normalizedValue &&
      !validator.isEmail(
        normalizedValue
      )
    ) {
      errors.push(
        `${sectionName}.${field} debe contener un correo válido.`
      );

      continue;
    }

    target[field] =
      normalizedValue;
  }
};

/*
|--------------------------------------------------------------------------
| Aplicar actualización parcial
|--------------------------------------------------------------------------
*/

const applySettingsUpdate = (
  settings,
  body
) => {
  const errors = [];

  const sections = [
    "platform",
    "verification",
    "finance",
    "operations",
    "security",
    "communication",
    "moderation",
    "automation"
  ];

  for (
    const sectionName
    of sections
  ) {
    if (
      !hasOwn(
        body,
        sectionName
      )
    ) {
      continue;
    }

    const incomingSection =
      body[sectionName];

    if (
      !isPlainObject(
        incomingSection
      )
    ) {
      errors.push(
        `${sectionName} debe ser un objeto.`
      );

      continue;
    }

    if (
      !settings[
        sectionName
      ]
    ) {
      settings[
        sectionName
      ] = {};
    }

    applyBooleanFields({
      sectionName,
      source:
        incomingSection,
      target:
        settings[
          sectionName
        ],
      errors
    });

    applyNumberFields({
      sectionName,
      source:
        incomingSection,
      target:
        settings[
          sectionName
        ],
      errors
    });

    applyStringFields({
      sectionName,
      source:
        incomingSection,
      target:
        settings[
          sectionName
        ],
      errors
    });

    /*
    |--------------------------------------------------------------------------
    | Campos especiales
    |--------------------------------------------------------------------------
    */

    if (
      sectionName ===
        "finance" &&
      hasOwn(
        incomingSection,
        "currency"
      )
    ) {
      const currency =
        String(
          incomingSection.currency ||
            ""
        )
          .trim()
          .toUpperCase();

      if (
        !ALLOWED_CURRENCIES.includes(
          currency
        )
      ) {
        errors.push(
          "finance.currency debe ser DOP o USD."
        );
      } else {
        settings.finance.currency =
          currency;
      }
    }
  }

  return errors;
};

/*
|--------------------------------------------------------------------------
| Obtener configuración global
|--------------------------------------------------------------------------
| GET /api/admin/system-settings
|--------------------------------------------------------------------------
*/

const getSystemSettings = async (
  req,
  res
) => {
  try {
    const settings =
      await SystemSetting.getGlobal();

    return res
      .status(200)
      .json({
        success: true,
        settings
      });
  } catch (error) {
    console.error(
      "Error obteniendo configuración global:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo obtener la configuración global de QSM.",
        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined
      });
  }
};

/*
|--------------------------------------------------------------------------
| Actualizar configuración global
|--------------------------------------------------------------------------
| PATCH /api/admin/system-settings
|--------------------------------------------------------------------------
*/

const updateSystemSettings = async (
  req,
  res
) => {
  try {
    const actorId =
      getActorId(req);

    if (!actorId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Usuario administrativo no autenticado."
        });
    }

    const body =
      req.body || {};

    if (
      !isPlainObject(body) ||
      Object.keys(body).length ===
        0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Debes enviar al menos una configuración para actualizar."
        });
    }

    const settings =
      await SystemSetting.getGlobal();

    const before =
      serializeForComparison(
        settings
      );

    const validationErrors =
      applySettingsUpdate(
        settings,
        body
      );

    if (
      validationErrors.length >
      0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Una o más configuraciones no son válidas.",
          errors:
            validationErrors
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Validaciones cruzadas
    |--------------------------------------------------------------------------
    */

    if (
      settings.finance
        .maximumWithdrawalAmount <
      settings.finance
        .minimumWithdrawalAmount
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "El retiro máximo no puede ser menor que el retiro mínimo."
        });
    }

    if (
      settings.platform
        .maintenanceMode &&
      !String(
        settings.platform
          .maintenanceMessage ||
          ""
      ).trim()
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Debes indicar un mensaje cuando el modo mantenimiento esté activado."
        });
    }

    settings.updatedBy =
      actorId;

    await settings.save();

    const after =
      serializeForComparison(
        settings
      );

    const changes =
      describeChanges(
        before,
        after
      );

    createAuditLogSafe({
      actor:
        actorId,

      actorRole:
        getActorRole(req),

      action:
        "SYSTEM_SETTINGS_UPDATED",

      targetType:
        "SYSTEM",

      targetId:
        String(settings._id),

      description:
        `Configuración global actualizada. Campos modificados: ${
          changes.length
        }.`,

      ipAddress:
        getClientIp(req),

      deviceInfo:
        getDeviceInfo(req)
    });

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Configuración global actualizada correctamente.",
        settings,
        changes
      });
  } catch (error) {
    console.error(
      "Error actualizando configuración global:",
      error
    );

    if (
      error.name ===
      "ValidationError"
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Una o más configuraciones no son válidas.",
          error:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined
        });
    }

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo actualizar la configuración global de QSM.",
        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined
      });
  }
};

/*
|--------------------------------------------------------------------------
| Restaurar configuración global
|--------------------------------------------------------------------------
| POST /api/admin/system-settings/reset
|--------------------------------------------------------------------------
*/

const resetSystemSettings = async (
  req,
  res
) => {
  try {
    const actorId =
      getActorId(req);

    if (!actorId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Usuario administrativo no autenticado."
        });
    }

    const confirmation =
      String(
        req.body?.confirmation ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      confirmation !==
      "RESET_SYSTEM_SETTINGS"
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Debes confirmar la restauración enviando confirmation: RESET_SYSTEM_SETTINGS."
        });
    }

    const previousSettings =
      await SystemSetting.findOne({
        key:
          GLOBAL_SETTINGS_KEY
      });

    const previousId =
      previousSettings?._id ||
      null;

    await SystemSetting.deleteOne({
      key:
        GLOBAL_SETTINGS_KEY
    });

    const settings =
      await SystemSetting.create({
        key:
          GLOBAL_SETTINGS_KEY,

        updatedBy:
          actorId,

        lastResetBy:
          actorId,

        lastResetAt:
          new Date()
      });

    createAuditLogSafe({
      actor:
        actorId,

      actorRole:
        getActorRole(req),

      action:
        "SYSTEM_SETTINGS_RESET",

      targetType:
        "SYSTEM",

      targetId:
        String(
          settings._id ||
            previousId ||
            ""
        ),

      description:
        "La configuración global de QSM fue restaurada a sus valores predeterminados.",

      ipAddress:
        getClientIp(req),

      deviceInfo:
        getDeviceInfo(req)
    });

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Configuración global restaurada correctamente.",
        settings
      });
  } catch (error) {
    console.error(
      "Error restaurando configuración global:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo restaurar la configuración global de QSM.",
        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined
      });
  }
};

/*
|--------------------------------------------------------------------------
| Estado público de la plataforma
|--------------------------------------------------------------------------
| GET /api/admin/system-settings/status
|--------------------------------------------------------------------------
| Sigue siendo una ruta administrativa.
| Más adelante puedes crear una ruta pública separada para mantenimiento.
|--------------------------------------------------------------------------
*/

const getSystemStatus = async (
  req,
  res
) => {
  try {
    const settings =
      await SystemSetting.getGlobal();

    return res
      .status(200)
      .json({
        success: true,

        status: {
          marketplaceEnabled:
            settings.platform
              .marketplaceEnabled,

          registrationEnabled:
            settings.platform
              .registrationEnabled,

          loginEnabled:
            settings.platform
              .loginEnabled,

          purchasesEnabled:
            settings.platform
              .purchasesEnabled,

          salesEnabled:
            settings.platform
              .salesEnabled,

          maintenanceMode:
            settings.platform
              .maintenanceMode,

          maintenanceMessage:
            settings.platform
              .maintenanceMessage,

          currency:
            settings.finance
              .currency
        }
      });
  } catch (error) {
    console.error(
      "Error obteniendo estado global:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo obtener el estado global de QSM."
      });
  }
};

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  resetSystemSettings,
  getSystemStatus
};