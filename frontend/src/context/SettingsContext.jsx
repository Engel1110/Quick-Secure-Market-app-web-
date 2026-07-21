import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import api from "../api/axios";
import { useAuth } from "./AuthContext";

export const DEFAULT_SETTINGS = {
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
};

const ACCENT_COLORS = {
  cyan: {
    hex: "#35d0c3",
    rgb: "53, 208, 195"
  },

  purple: {
    hex: "#8b5cf6",
    rgb: "139, 92, 246"
  },

  pink: {
    hex: "#ec4899",
    rgb: "236, 72, 153"
  },

  blue: {
    hex: "#38bdf8",
    rgb: "56, 189, 248"
  },

  green: {
    hex: "#22c55e",
    rgb: "34, 197, 94"
  },

  orange: {
    hex: "#f59e0b",
    rgb: "245, 158, 11"
  }
};

const SettingsContext = createContext(null);

function safeJson(value) {
  try {
    return value
      ? JSON.parse(value)
      : null;
  } catch {
    return null;
  }
}

function getUserId(user) {
  return (
    user?.id ||
    user?._id ||
    ""
  );
}

function getStorageKey(user) {
  const userId =
    getUserId(user);

  return userId
    ? `qsm_settings_${userId}`
    : "qsm_settings";
}

export function mergeSettings(
  base,
  incoming = {}
) {
  return {
    ...base,
    ...incoming,

    notifications: {
      ...base.notifications,
      ...(incoming.notifications || {})
    },

    privacy: {
      ...base.privacy,
      ...(incoming.privacy || {})
    },

    security: {
      ...base.security,
      ...(incoming.security || {})
    }
  };
}

export function getAccentColor(
  color
) {
  return (
    ACCENT_COLORS[color] ||
    ACCENT_COLORS.cyan
  );
}

function getLocalSettings(
  user
) {
  const userKey =
    getStorageKey(user);

  const userSettings =
    safeJson(
      localStorage.getItem(
        userKey
      )
    );

  const genericSettings =
    safeJson(
      localStorage.getItem(
        "qsm_settings"
      )
    );

  return mergeSettings(
    DEFAULT_SETTINGS,
    userSettings ||
      genericSettings ||
      {}
  );
}

function applySettingsToDocument(
  settings
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  const root =
    document.documentElement;

  const body =
    document.body;

  const accent =
    getAccentColor(
      settings.accentColor
    );

  root.dataset.qsmTheme =
    settings.theme;

  root.dataset.qsmDensity =
    settings.density;

  root.dataset.qsmAnimations =
    String(
      settings.animations
    );

  root.dataset.qsmGlass =
    String(
      settings.glassEffect
    );

  root.dataset.qsmSidebarCompact =
    String(
      settings.compactSidebar
    );

  body.dataset.qsmTheme =
    settings.theme;

  body.dataset.qsmDensity =
    settings.density;

  body.dataset.qsmAnimations =
    String(
      settings.animations
    );

  body.dataset.qsmGlass =
    String(
      settings.glassEffect
    );

  root.style.setProperty(
    "--qsm-accent",
    accent.hex
  );

  root.style.setProperty(
    "--qsm-accent-rgb",
    accent.rgb
  );

  localStorage.setItem(
    "qsm_theme",
    settings.theme
  );

  localStorage.setItem(
    "qsm_accent",
    settings.accentColor
  );

  localStorage.setItem(
    "qsm_language",
    settings.language
  );

  const sidebarValue =
    String(
      Boolean(
        settings.compactSidebar
      )
    );

  const previousSidebarValue =
    localStorage.getItem(
      "qsm_sidebar_collapsed"
    );

  localStorage.setItem(
    "qsm_sidebar_collapsed",
    sidebarValue
  );

  if (
    previousSidebarValue !==
    sidebarValue
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "qsm-sidebar-changed",
        {
          detail: {
            collapsed:
              Boolean(
                settings.compactSidebar
              ),

            source:
              "settings-context"
          }
        }
      )
    );
  }
}

export function SettingsProvider({
  children
}) {
  const {
    user,
    token,
    loading: authLoading
  } = useAuth();

  const userId =
    getUserId(user);

  const storageKey =
    getStorageKey(user);

  const [
    settings,
    setSettings
  ] = useState(() =>
    getLocalSettings(null)
  );

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState("");

  const [
    error,
    setError
  ] = useState("");

  const persistLocalSettings =
    useCallback(
      (
        nextSettings
      ) => {
        const normalized =
          mergeSettings(
            DEFAULT_SETTINGS,
            nextSettings
          );

        localStorage.setItem(
          "qsm_settings",
          JSON.stringify(
            normalized
          )
        );

        localStorage.setItem(
          storageKey,
          JSON.stringify(
            normalized
          )
        );

        return normalized;
      },
      [
        storageKey
      ]
    );

  const loadSettings =
    useCallback(
      async () => {
        if (authLoading) {
          return;
        }

        setLoading(true);
        setError("");

        const localSettings =
          getLocalSettings(
            user
          );

        if (
          !token ||
          !userId
        ) {
          setSettings(
            localSettings
          );

          setLoading(false);
          return;
        }

        try {
          const response =
            await api.get(
              "/settings/me"
            );

          const backendSettings =
            response.data
              ?.settings ||
            response.data
              ?.data ||
            response.data ||
            {};

          const normalized =
            mergeSettings(
              DEFAULT_SETTINGS,
              backendSettings
            );

          setSettings(
            normalized
          );

          persistLocalSettings(
            normalized
          );
        } catch (
          requestError
        ) {
          setSettings(
            localSettings
          );

          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
              "No se pudieron cargar las configuraciones del servidor."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        authLoading,
        token,
        user,
        userId,
        persistLocalSettings
      ]
    );

  useEffect(() => {
    loadSettings();
  }, [
    loadSettings
  ]);

  useEffect(() => {
    const normalized =
      persistLocalSettings(
        settings
      );

    applySettingsToDocument(
      normalized
    );
  }, [
    settings,
    persistLocalSettings
  ]);

  /*
  |--------------------------------------------------------------------------
  | Escuchar cambios realizados directamente desde el Sidebar
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleSidebarChange =
      (event) => {
        if (
          event?.detail?.source ===
          "settings-context"
        ) {
          return;
        }

        const collapsed =
          Boolean(
            event?.detail
              ?.collapsed
          );

        setSettings(
          (
            currentSettings
          ) => {
            if (
              currentSettings
                .compactSidebar ===
              collapsed
            ) {
              return currentSettings;
            }

            return {
              ...currentSettings,
              compactSidebar:
                collapsed
            };
          }
        );
      };

    window.addEventListener(
      "qsm-sidebar-changed",
      handleSidebarChange
    );

    return () => {
      window.removeEventListener(
        "qsm-sidebar-changed",
        handleSidebarChange
      );
    };
  }, []);

  const updateSetting =
    useCallback(
      (
        key,
        value
      ) => {
        setSettings(
          (
            currentSettings
          ) => ({
            ...currentSettings,
            [key]: value
          })
        );

        setMessage("");
        setError("");
      },
      []
    );

  const updateNested =
    useCallback(
      (
        section,
        key,
        value
      ) => {
        setSettings(
          (
            currentSettings
          ) => ({
            ...currentSettings,

            [section]: {
              ...currentSettings[
                section
              ],

              [key]: value
            }
          })
        );

        setMessage("");
        setError("");
      },
      []
    );

  const replaceSettings =
    useCallback(
      (
        nextSettings
      ) => {
        setSettings(
          mergeSettings(
            DEFAULT_SETTINGS,
            nextSettings
          )
        );
      },
      []
    );

  const saveSettings =
    useCallback(
      async (
        customSettings = null
      ) => {
        const settingsToSave =
          mergeSettings(
            DEFAULT_SETTINGS,
            customSettings ||
              settings
          );

        setSaving(true);
        setMessage("");
        setError("");

        try {
          if (
            !token ||
            !userId
          ) {
            setSettings(
              settingsToSave
            );

            persistLocalSettings(
              settingsToSave
            );

            setMessage(
              "Configuración guardada localmente."
            );

            return settingsToSave;
          }

          const response =
            await api.put(
              "/settings/me",
              settingsToSave
            );

          const backendSettings =
            response.data
              ?.settings ||
            response.data
              ?.data ||
            settingsToSave;

          const normalized =
            mergeSettings(
              DEFAULT_SETTINGS,
              backendSettings
            );

          setSettings(
            normalized
          );

          persistLocalSettings(
            normalized
          );

          setMessage(
            response.data
              ?.message ||
              "Configuración guardada correctamente."
          );

          return normalized;
        } catch (
          requestError
        ) {
          persistLocalSettings(
            settingsToSave
          );

          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
              "No se pudo guardar la configuración en el servidor."
          );

          throw requestError;
        } finally {
          setSaving(false);
        }
      },
      [
        settings,
        token,
        userId,
        persistLocalSettings
      ]
    );

  const resetSettings =
    useCallback(
      async () => {
        setSaving(true);
        setMessage("");
        setError("");

        try {
          let restoredSettings =
            DEFAULT_SETTINGS;

          if (
            token &&
            userId
          ) {
            const response =
              await api.post(
                "/settings/me/reset"
              );

            restoredSettings =
              response.data
                ?.settings ||
              response.data
                ?.data ||
              DEFAULT_SETTINGS;

            setMessage(
              response.data
                ?.message ||
                "Configuración restaurada correctamente."
            );
          } else {
            setMessage(
              "Configuración local restaurada correctamente."
            );
          }

          const normalized =
            mergeSettings(
              DEFAULT_SETTINGS,
              restoredSettings
            );

          setSettings(
            normalized
          );

          persistLocalSettings(
            normalized
          );

          return normalized;
        } catch (
          requestError
        ) {
          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
              "No se pudo restaurar la configuración."
          );

          throw requestError;
        } finally {
          setSaving(false);
        }
      },
      [
        token,
        userId,
        persistLocalSettings
      ]
    );

  const clearFeedback =
    useCallback(() => {
      setMessage("");
      setError("");
    }, []);

  const contextValue =
    useMemo(
      () => ({
        settings,
        loading,
        saving,
        message,
        error,

        updateSetting,
        updateNested,
        replaceSettings,

        loadSettings,
        saveSettings,
        resetSettings,
        clearFeedback
      }),
      [
        settings,
        loading,
        saving,
        message,
        error,
        updateSetting,
        updateNested,
        replaceSettings,
        loadSettings,
        saveSettings,
        resetSettings,
        clearFeedback
      ]
    );

  return (
    <SettingsContext.Provider
      value={
        contextValue
      }
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context =
    useContext(
      SettingsContext
    );

  if (!context) {
    throw new Error(
      "useSettings debe utilizarse dentro de SettingsProvider."
    );
  }

  return context;
}