import api from "../api/axios";

/*
|--------------------------------------------------------------------------
| Configuración Global del Sistema
|--------------------------------------------------------------------------
|
| Todas las rutas parten de:
|
| /api/admin/system-settings
|
|--------------------------------------------------------------------------
*/

const BASE_URL = "/admin/system-settings";

/*
|--------------------------------------------------------------------------
| Obtener configuración global
|--------------------------------------------------------------------------
*/

export const getSystemSettings = async () => {
  const response = await api.get(BASE_URL);

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Actualizar configuración
|--------------------------------------------------------------------------
*/

export const updateSystemSettings = async (
  settings
) => {
  validateSystemSettings(settings);

  const response = await api.patch(
    BASE_URL,
    settings
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Restaurar configuración
|--------------------------------------------------------------------------
*/

export const resetSystemSettings =
  async () => {
    const response =
      await api.post(
        `${BASE_URL}/reset`
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Clonar configuración
|--------------------------------------------------------------------------
*/

export const cloneSystemSettings =
  (settings) =>
    JSON.parse(
      JSON.stringify(settings)
    );

/*
|--------------------------------------------------------------------------
| Comparar configuración
|--------------------------------------------------------------------------
*/

export const hasSettingsChanged = (
  original,
  current
) =>
  JSON.stringify(original) !==
  JSON.stringify(current);

/*
|--------------------------------------------------------------------------
| Valores por defecto
|--------------------------------------------------------------------------
*/

export const createDefaultSettings =
  () => ({
    platform: {
      marketplaceEnabled: true,
      registrationEnabled: true,
      loginEnabled: true,
      purchasesEnabled: true,
      salesEnabled: true,
      maintenanceMode: false,
      maintenanceMessage: ""
    },

    verification: {
      kycRequiredForBuying: false,
      kycRequiredForSelling: true,
      kycRequiredForWithdrawals: true,

      faceVerificationEnabled: true,

      periodicFaceCheckEnabled: true,

      periodicFaceCheckHours: 72,

      minimumSellerTrustScore: 50
    },

    finance: {
      platformCommissionPercent: 5,

      currency: "DOP",

      escrowEnabled: true,

      escrowReleaseHours: 72,

      automaticRefunds: true
    },

    security: {
      adminSessionTimeoutMinutes: 30,

      maximumLoginAttempts: 5,

      accountLockMinutes: 30,

      forceStrongPasswords: true,

      require2FAForAdmins: false,

      securityAlertsEnabled: true
    },

    moderation: {
      autoHideReportedProducts: true,

      minimumReportsToHide: 5,

      aiModerationEnabled: true
    },

    communication: {
      internalMessagingEnabled: true,

      allowAttachments: true,

      maxAttachmentSizeMB: 25,

      allowVoiceMessages: true,

      allowVideoMessages: true
    },

    automation: {
      automaticEscrowRelease: true,

      automaticDisputeEscalation: true,

      disputeEscalationHours: 48
    },

    appearance: {
      defaultTheme: "dark",

      defaultLanguage: "es",

      glassEffect: true,

      animations: true
    }
  });

/*
|--------------------------------------------------------------------------
| Validaciones
|--------------------------------------------------------------------------
*/

export const validateSystemSettings =
  (settings) => {
    if (!settings) {
      throw new Error(
        "No existen configuraciones."
      );
    }

    if (
      settings.finance
        ?.platformCommissionPercent <
        0 ||
      settings.finance
        ?.platformCommissionPercent >
        100
    ) {
      throw new Error(
        "La comisión debe estar entre 0 y 100%."
      );
    }

    if (
      settings.security
        ?.maximumLoginAttempts <
      1
    ) {
      throw new Error(
        "Los intentos máximos deben ser mayores que cero."
      );
    }

    if (
      settings.security
        ?.adminSessionTimeoutMinutes <
      5
    ) {
      throw new Error(
        "La sesión mínima es de 5 minutos."
      );
    }

    return true;
  };

/*
|--------------------------------------------------------------------------
| Obtener mensaje de error
|--------------------------------------------------------------------------
*/

export const getSystemSettingsError =
  (
    error,
    fallback =
      "No se pudo completar la operación."
  ) =>
    error?.response?.data?.message ||
    error?.message ||
    fallback;

/*
|--------------------------------------------------------------------------
| Exportar configuración
|--------------------------------------------------------------------------
*/

export const exportSettings =
  (settings) => {
    const blob = new Blob(
      [
        JSON.stringify(
          settings,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "qsm-system-settings.json";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  };

/*
|--------------------------------------------------------------------------
| Importar configuración
|--------------------------------------------------------------------------
*/

export const importSettings =
  async (file) => {
    const text =
      await file.text();

    const settings =
      JSON.parse(text);

    validateSystemSettings(
      settings
    );

    return settings;
  };