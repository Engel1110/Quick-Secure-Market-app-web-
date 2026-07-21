const Setting = require(
  "../models/Setting"
);

/*
|--------------------------------------------------------------------------
| Valores permitidos
|--------------------------------------------------------------------------
*/

const ALLOWED_THEMES = [
  "dark",
  "light"
];

const ALLOWED_ACCENT_COLORS = [
  "cyan",
  "purple",
  "pink",
  "blue",
  "green",
  "orange"
];

const ALLOWED_LANGUAGES = [
  "es",
  "en"
];

const ALLOWED_DENSITIES = [
  "comfortable",
  "compact",
  "spacious"
];

const ALLOWED_SESSION_TIMEOUTS = [
  "15",
  "30",
  "60",
  "240"
];

/*
|--------------------------------------------------------------------------
| Configuración predeterminada
|--------------------------------------------------------------------------
*/

const defaultSettings = (
  userId
) => ({
  user: userId,

  theme: "dark",

  accentColor: "cyan",

  language: "es",

  density: "comfortable",

  animations: true,

  glassEffect: true,

  compactSidebar: false,

  notifications: {
    messages: true,
    orders: true,
    disputes: true,
    security: true,
    email: false
  },

  privacy: {
    showTrustScore: true,
    showLocation: true,
    allowMessages: true
  },

  security: {
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: "30"
  }
});

/*
|--------------------------------------------------------------------------
| Utilidades
|--------------------------------------------------------------------------
*/

const getUserId = (
  req
) =>
  req.user?._id ||
  req.user?.id;

const hasOwn = (
  object,
  property
) =>
  Object.prototype.hasOwnProperty.call(
    object || {},
    property
  );

const isBoolean = (
  value
) =>
  typeof value ===
  "boolean";

const validateEnum = (
  value,
  allowedValues
) =>
  allowedValues.includes(
    value
  );

/*
|--------------------------------------------------------------------------
| Obtener configuración
|--------------------------------------------------------------------------
*/

const getMySettings = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Usuario no autenticado."
      });
    }

    let settings =
      await Setting.findOne({
        user: userId
      });

    if (!settings) {
      settings =
        await Setting.create(
          defaultSettings(
            userId
          )
        );
    }

    return res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error(
      "Error obteniendo configuraciones:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo obtener la configuración.",
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
| Actualizar configuración
|--------------------------------------------------------------------------
*/

const updateMySettings = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Usuario no autenticado."
      });
    }

    const body =
      req.body || {};

    /*
    |--------------------------------------------------------------------------
    | Validar valores principales
    |--------------------------------------------------------------------------
    */

    if (
      hasOwn(body, "theme") &&
      !validateEnum(
        body.theme,
        ALLOWED_THEMES
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El tema seleccionado no es válido."
      });
    }

    if (
      hasOwn(
        body,
        "accentColor"
      ) &&
      !validateEnum(
        body.accentColor,
        ALLOWED_ACCENT_COLORS
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El color seleccionado no es válido."
      });
    }

    if (
      hasOwn(body, "language") &&
      !validateEnum(
        body.language,
        ALLOWED_LANGUAGES
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El idioma seleccionado no es válido."
      });
    }

    if (
      hasOwn(body, "density") &&
      !validateEnum(
        body.density,
        ALLOWED_DENSITIES
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La densidad seleccionada no es válida."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validar booleanos principales
    |--------------------------------------------------------------------------
    */

    const mainBooleanFields = [
      "animations",
      "glassEffect",
      "compactSidebar"
    ];

    for (
      const field
      of mainBooleanFields
    ) {
      if (
        hasOwn(body, field) &&
        !isBoolean(
          body[field]
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `El campo ${field} debe ser verdadero o falso.`
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Buscar o crear configuración
    |--------------------------------------------------------------------------
    */

    let settings =
      await Setting.findOne({
        user: userId
      });

    if (!settings) {
      settings =
        new Setting(
          defaultSettings(
            userId
          )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Actualizar campos principales
    |--------------------------------------------------------------------------
    */

    if (
      hasOwn(body, "theme")
    ) {
      settings.theme =
        body.theme;
    }

    if (
      hasOwn(
        body,
        "accentColor"
      )
    ) {
      settings.accentColor =
        body.accentColor;
    }

    if (
      hasOwn(body, "language")
    ) {
      settings.language =
        body.language;
    }

    if (
      hasOwn(body, "density")
    ) {
      settings.density =
        body.density;
    }

    for (
      const field
      of mainBooleanFields
    ) {
      if (
        hasOwn(body, field)
      ) {
        settings[field] =
          body[field];
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Actualizar notificaciones
    |--------------------------------------------------------------------------
    */

    if (
      body.notifications &&
      typeof body.notifications ===
        "object"
    ) {
      const notificationFields = [
        "messages",
        "orders",
        "disputes",
        "security",
        "email"
      ];

      for (
        const field
        of notificationFields
      ) {
        if (
          hasOwn(
            body.notifications,
            field
          )
        ) {
          if (
            !isBoolean(
              body.notifications[
                field
              ]
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                `La configuración notifications.${field} debe ser verdadera o falsa.`
            });
          }

          settings.notifications[
            field
          ] =
            body.notifications[
              field
            ];
        }
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Actualizar privacidad
    |--------------------------------------------------------------------------
    */

    if (
      body.privacy &&
      typeof body.privacy ===
        "object"
    ) {
      const privacyFields = [
        "showTrustScore",
        "showLocation",
        "allowMessages"
      ];

      for (
        const field
        of privacyFields
      ) {
        if (
          hasOwn(
            body.privacy,
            field
          )
        ) {
          if (
            !isBoolean(
              body.privacy[
                field
              ]
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                `La configuración privacy.${field} debe ser verdadera o falsa.`
            });
          }

          settings.privacy[
            field
          ] =
            body.privacy[
              field
            ];
        }
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Actualizar seguridad
    |--------------------------------------------------------------------------
    */

    if (
      body.security &&
      typeof body.security ===
        "object"
    ) {
      const securityBooleanFields = [
        "twoFactorEnabled",
        "loginAlerts"
      ];

      for (
        const field
        of securityBooleanFields
      ) {
        if (
          hasOwn(
            body.security,
            field
          )
        ) {
          if (
            !isBoolean(
              body.security[
                field
              ]
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                `La configuración security.${field} debe ser verdadera o falsa.`
            });
          }

          settings.security[
            field
          ] =
            body.security[
              field
            ];
        }
      }

      if (
        hasOwn(
          body.security,
          "sessionTimeout"
        )
      ) {
        const sessionTimeout =
          String(
            body.security
              .sessionTimeout
          );

        if (
          !validateEnum(
            sessionTimeout,
            ALLOWED_SESSION_TIMEOUTS
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "El tiempo de sesión seleccionado no es válido."
          });
        }

        settings.security
          .sessionTimeout =
            sessionTimeout;
      }
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message:
        "Configuración actualizada correctamente.",
      settings
    });
  } catch (error) {
    console.error(
      "Error actualizando configuraciones:",
      error
    );

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
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

    return res.status(500).json({
      success: false,
      message:
        "No se pudo actualizar la configuración.",
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
| Restaurar configuración
|--------------------------------------------------------------------------
*/

const resetMySettings = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Usuario no autenticado."
      });
    }

    const restoredSettings =
      defaultSettings(
        userId
      );

    const settings =
      await Setting.findOneAndUpdate(
        {
          user: userId
        },
        {
          $set:
            restoredSettings
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Configuración restaurada correctamente.",
      settings
    });
  } catch (error) {
    console.error(
      "Error restaurando configuraciones:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo restaurar la configuración.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
  }
};

module.exports = {
  getMySettings,
  updateMySettings,
  resetMySettings
};