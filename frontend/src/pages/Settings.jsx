import {
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import api from "../api/axios";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

import {
  useAuth
} from "../context/AuthContext";

import {
  useSettings
} from "../context/SettingsContext";

const TEXT = {
  es: {
    pageLabel: "CONFIGURACIÓN QSM",
    title: "Centro de control",
    subtitle:
      "Personaliza la experiencia dentro de QSM: apariencia, idioma, notificaciones, privacidad y seguridad.",

    appearance: "Apariencia",
    language: "Idioma",
    notifications: "Notificaciones",
    privacy: "Privacidad",
    security: "Seguridad",
    account: "Cuenta",

    theme: "Tema",
    dark: "Oscuro",
    light: "Claro",
    darkMode: "Modo oscuro",
    lightMode: "Modo claro",
    activeColor: "Color activo",
    alerts: "Alertas",
    active: "Activa",
    basic: "Básica",

    settingsLabel: "AJUSTES",

    appearanceTitle: "Apariencia",
    appearanceText:
      "Controla cómo se ve QSM después de iniciar sesión.",
    darkText:
      "Ideal para trabajar de noche.",
    lightText:
      "Vista limpia y luminosa.",
    primaryColor: "Color principal",

    animations: "Animaciones",
    animationsText:
      "Efectos suaves en botones y tarjetas.",
    glassEffect: "Efecto cristal",
    glassEffectText:
      "Fondos translúcidos tipo glassmorphism.",
    compactSidebar: "Sidebar compacto",
    compactSidebarText:
      "Reduce el espacio lateral del menú.",
    visualDensity: "Densidad visual",
    visualDensityText:
      "Controla separación y tamaño.",
    comfortable: "Cómodo",
    compact: "Compacto",
    spacious: "Espacioso",

    preview: "Vista previa",
    protectedPurchase: "Compra protegida",
    previewText:
      "Este es un ejemplo de cómo se verá la interfaz con tu tema.",
    primaryButton: "Botón principal",

    languageRegionTitle: "Idioma y región",
    languageRegionText:
      "Controla el idioma principal y muestra tu configuración regional.",
    primaryLanguage: "Idioma principal",
    spanish: "Español",
    english: "English",
    region: "Región",
    currency: "Moneda",
    timezone: "Zona horaria",

    notificationsTitle: "Notificaciones",
    notificationsText:
      "Decide qué alertas quieres recibir dentro de QSM.",
    messages: "Mensajes",
    orders: "Órdenes",
    disputes: "Reclamos",
    securityAlerts: "Seguridad",
    email: "Correo",
    alertsOf: "Alertas de",

    privacyTitle: "Privacidad",
    privacyText:
      "Controla qué información se muestra a otros usuarios.",
    showTrustScore: "Mostrar puntuación QSM",
    showTrustScoreText:
      "Permite mostrar tu nivel de confianza.",
    showLocation: "Mostrar ubicación general",
    showLocationText:
      "Muestra ciudad o provincia, nunca la dirección exacta.",
    allowMessages: "Permitir mensajes",
    allowMessagesText:
      "Otros usuarios pueden contactarte.",

    securityTitle: "Seguridad",
    securityText:
      "Opciones para proteger tu cuenta QSM.",
    loginAlerts: "Alertas de inicio",
    loginAlertsText:
      "Avisar cuando se detecte una sesión nueva.",
    twoFactor: "Doble factor",
    twoFactorText:
      "La activación real de 2FA se implementará con código QR y verificación.",
    comingSoon: "PRÓXIMAMENTE",
    sessionTime: "Tiempo de sesión",
    sessionTimeText:
      "Inactividad permitida antes de solicitar una nueva sesión.",
    minutes15: "15 minutos",
    minutes30: "30 minutos",
    hour1: "1 hora",
    hours4: "4 horas",

    changePassword: "Cambiar contraseña",
    passwordText:
      "Usa una contraseña fuerte. Al cambiarla, QSM invalida las sesiones anteriores.",
    currentPassword: "Contraseña actual",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar contraseña",
    updatePassword: "Actualizar contraseña",
    updating: "Actualizando...",

    minimum8: "Mínimo 8 caracteres",
    uppercase: "Una mayúscula",
    lowercase: "Una minúscula",
    number: "Un número",
    symbol: "Un símbolo",
    passwordsMatch: "Las contraseñas coinciden",

    accountTitle: "Cuenta",
    accountText:
      "Información y acciones de tu cuenta actual.",
    qsmTrust: "Confianza QSM",
    editProfile: "Editar perfil",
    exportSettings: "Exportar ajustes",
    logout: "Cerrar sesión",
    sensitiveZone: "Zona sensible",
    sensitiveText:
      "La eliminación y desactivación permanente de la cuenta requieren endpoints protegidos adicionales.",

    restore: "Restaurar",
    saveChanges: "Guardar cambios",
    saving: "Guardando...",
    loadingTitle: "Cargando configuración...",
    loadingText:
      "QSM está consultando tus preferencias.",

    restoreConfirm:
      "¿Deseas restaurar todas las configuraciones de QSM?",
    passwordConfirm:
      "¿Deseas cambiar tu contraseña? Por seguridad se cerrarán tus sesiones activas.",
    allPasswordFields:
      "Completa todos los campos de contraseña.",
    passwordMismatch:
      "La nueva contraseña no coincide.",
    samePassword:
      "La nueva contraseña no puede ser igual a la actual.",
    weakPassword:
      "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.",
    passwordSuccess:
      "Contraseña actualizada correctamente. Todas las sesiones anteriores fueron invalidadas.",
    passwordError:
      "No se pudo cambiar la contraseña. Verifica tu contraseña actual.",
    exportSuccess:
      "Tus configuraciones fueron exportadas correctamente."
  },

  en: {
    pageLabel: "QSM SETTINGS",
    title: "Control center",
    subtitle:
      "Customize your QSM experience: appearance, language, notifications, privacy and security.",

    appearance: "Appearance",
    language: "Language",
    notifications: "Notifications",
    privacy: "Privacy",
    security: "Security",
    account: "Account",

    theme: "Theme",
    dark: "Dark",
    light: "Light",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    activeColor: "Active color",
    alerts: "Alerts",
    active: "Active",
    basic: "Basic",

    settingsLabel: "SETTINGS",

    appearanceTitle: "Appearance",
    appearanceText:
      "Control how QSM looks after you sign in.",
    darkText:
      "Ideal for working at night.",
    lightText:
      "A clean and bright view.",
    primaryColor: "Primary color",

    animations: "Animations",
    animationsText:
      "Smooth effects on buttons and cards.",
    glassEffect: "Glass effect",
    glassEffectText:
      "Translucent glassmorphism surfaces.",
    compactSidebar: "Compact sidebar",
    compactSidebarText:
      "Reduce the sidebar width.",
    visualDensity: "Visual density",
    visualDensityText:
      "Control spacing and component size.",
    comfortable: "Comfortable",
    compact: "Compact",
    spacious: "Spacious",

    preview: "Preview",
    protectedPurchase: "Protected purchase",
    previewText:
      "This is an example of how the interface will look with your theme.",
    primaryButton: "Primary button",

    languageRegionTitle: "Language and region",
    languageRegionText:
      "Control the main language and view your regional configuration.",
    primaryLanguage: "Main language",
    spanish: "Español",
    english: "English",
    region: "Region",
    currency: "Currency",
    timezone: "Time zone",

    notificationsTitle: "Notifications",
    notificationsText:
      "Choose which QSM alerts you want to receive.",
    messages: "Messages",
    orders: "Orders",
    disputes: "Disputes",
    securityAlerts: "Security",
    email: "Email",
    alertsOf: "Alerts for",

    privacyTitle: "Privacy",
    privacyText:
      "Control which information other users can see.",
    showTrustScore: "Show QSM score",
    showTrustScoreText:
      "Allow your trust level to be displayed.",
    showLocation: "Show general location",
    showLocationText:
      "Shows city or province, never the exact address.",
    allowMessages: "Allow messages",
    allowMessagesText:
      "Other users can contact you.",

    securityTitle: "Security",
    securityText:
      "Options to protect your QSM account.",
    loginAlerts: "Login alerts",
    loginAlertsText:
      "Notify you when a new session is detected.",
    twoFactor: "Two-factor authentication",
    twoFactorText:
      "Real 2FA activation will include a QR code and verification.",
    comingSoon: "COMING SOON",
    sessionTime: "Session timeout",
    sessionTimeText:
      "Allowed inactivity before a new session is requested.",
    minutes15: "15 minutes",
    minutes30: "30 minutes",
    hour1: "1 hour",
    hours4: "4 hours",

    changePassword: "Change password",
    passwordText:
      "Use a strong password. QSM invalidates previous sessions after a change.",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    updatePassword: "Update password",
    updating: "Updating...",

    minimum8: "At least 8 characters",
    uppercase: "One uppercase letter",
    lowercase: "One lowercase letter",
    number: "One number",
    symbol: "One symbol",
    passwordsMatch: "Passwords match",

    accountTitle: "Account",
    accountText:
      "Information and actions for your current account.",
    qsmTrust: "QSM trust",
    editProfile: "Edit profile",
    exportSettings: "Export settings",
    logout: "Sign out",
    sensitiveZone: "Sensitive area",
    sensitiveText:
      "Permanent account deletion and deactivation require additional protected endpoints.",

    restore: "Restore",
    saveChanges: "Save changes",
    saving: "Saving...",
    loadingTitle: "Loading settings...",
    loadingText:
      "QSM is retrieving your preferences.",

    restoreConfirm:
      "Do you want to restore all QSM settings?",
    passwordConfirm:
      "Do you want to change your password? Your active sessions will be closed for security.",
    allPasswordFields:
      "Complete all password fields.",
    passwordMismatch:
      "The new passwords do not match.",
    samePassword:
      "The new password cannot be the same as the current one.",
    weakPassword:
      "The password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one symbol.",
    passwordSuccess:
      "Password updated successfully. All previous sessions were invalidated.",
    passwordError:
      "The password could not be changed. Check your current password.",
    exportSuccess:
      "Your settings were exported successfully."
  }
};

const NOTIFICATION_LABEL_KEYS = {
  messages: "messages",
  orders: "orders",
  disputes: "disputes",
  security: "securityAlerts",
  email: "email"
};

function Settings() {
  const navigate =
    useNavigate();

  const {
    user,
    logout
  } = useAuth();

  const {
    settings,
    loading,
    saving,
    message,
    error,
    updateSetting,
    updateNested,
    saveSettings,
    resetSettings,
    clearFeedback
  } = useSettings();

  const t =
    TEXT[
      settings.language
    ] || TEXT.es;

  const [
    activeTab,
    setActiveTab
  ] = useState(
    "appearance"
  );

  const [
    passwordForm,
    setPasswordForm
  ] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [
    showPasswords,
    setShowPasswords
  ] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const [
    passwordSaving,
    setPasswordSaving
  ] = useState(false);

  const [
    actionMessage,
    setActionMessage
  ] = useState("");

  const [
    actionError,
    setActionError
  ] = useState("");

  const previewStyle =
    useMemo(
      () =>
        getThemePreview(
          settings.theme,
          settings.accentColor
        ),
      [
        settings.theme,
        settings.accentColor
      ]
    );

  const displayedMessage =
    actionMessage ||
    message;

  const displayedError =
    actionError ||
    error;

  const layoutStyle = {
    ...layout,
    gridTemplateColumns:
      settings.compactSidebar
        ? "96px minmax(0, 1fr)"
        : "300px minmax(0, 1fr)"
  };

  const clearLocalFeedback =
    () => {
      setActionMessage("");
      setActionError("");
      clearFeedback();
    };

  const changeMainSetting =
    (
      key,
      value
    ) => {
      clearLocalFeedback();
      updateSetting(
        key,
        value
      );
    };

  const changeNestedSetting =
    (
      section,
      key,
      value
    ) => {
      clearLocalFeedback();
      updateNested(
        section,
        key,
        value
      );
    };

  const handleSave =
    async () => {
      clearLocalFeedback();

      try {
        await saveSettings();
      } catch {
        // El contexto ya muestra el error correcto.
      }
    };

  const handleReset =
    async () => {
      const confirmed =
        window.confirm(
          t.restoreConfirm
        );

      if (!confirmed) {
        return;
      }

      clearLocalFeedback();

      try {
        await resetSettings();
      } catch {
        // El contexto ya muestra el error correcto.
      }
    };

  const changePassword =
    async (
      event
    ) => {
      event.preventDefault();

      clearLocalFeedback();

      if (
        !passwordForm.currentPassword ||
        !passwordForm.newPassword ||
        !passwordForm.confirmPassword
      ) {
        setActionError(
          t.allPasswordFields
        );
        return;
      }

      if (
        passwordForm.newPassword !==
        passwordForm.confirmPassword
      ) {
        setActionError(
          t.passwordMismatch
        );
        return;
      }

      if (
        passwordForm.currentPassword ===
        passwordForm.newPassword
      ) {
        setActionError(
          t.samePassword
        );
        return;
      }

      if (
        !isStrongPasswordLocal(
          passwordForm.newPassword
        )
      ) {
        setActionError(
          t.weakPassword
        );
        return;
      }

      const confirmed =
        window.confirm(
          t.passwordConfirm
        );

      if (!confirmed) {
        return;
      }

      try {
        setPasswordSaving(true);

        await api.post(
          "/auth/change-password",
          {
            currentPassword:
              passwordForm.currentPassword,

            newPassword:
              passwordForm.newPassword,

            confirmPassword:
              passwordForm.confirmPassword
          }
        );

        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });

        setActionMessage(
          t.passwordSuccess
        );

        setTimeout(
          () => {
            logout();

            navigate(
              "/login",
              {
                replace: true
              }
            );
          },
          1800
        );
      } catch (
        requestError
      ) {
        setActionError(
          requestError
            ?.response
            ?.data
            ?.message ||
            t.passwordError
        );
      } finally {
        setPasswordSaving(false);
      }
    };

  const exportSettings =
    () => {
      clearLocalFeedback();

      const exportData = {
        exportedAt:
          new Date()
            .toISOString(),

        user: {
          id:
            user?.id ||
            user?._id ||
            null,

          email:
            user?.email ||
            ""
        },

        settings
      };

      const blob =
        new Blob(
          [
            JSON.stringify(
              exportData,
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
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href =
        url;

      link.download =
        `qsm-settings-${
          new Date()
            .toISOString()
            .slice(0, 10)
        }.json`;

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url
      );

      setActionMessage(
        t.exportSuccess
      );
    };

  const handleLogout =
    () => {
      logout();

      navigate(
        "/login",
        {
          replace: true
        }
      );
    };

  return (
    <div
      className="qsm-page"
      style={page}
    >
      <style>{`
        .settings-page,
        .settings-page * {
          box-sizing: border-box;
        }

        .settings-page button,
        .settings-page a {
          transition:
            transform var(--qsm-transition),
            box-shadow var(--qsm-transition),
            border-color var(--qsm-transition),
            background var(--qsm-transition),
            color var(--qsm-transition);
        }

        .settings-page button:not(:disabled):hover,
        .settings-page a:hover {
          transform: translateY(-2px);
        }

        @keyframes qsmSettingsFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1100px) {
          .settings-page {
            display: block !important;
          }

          .settings-layout,
          .stats-grid,
          .theme-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .sidebar-wrapper {
            display: block !important;
          }

          .hero-row {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .main-content {
            padding-top: 78px !important;
          }
        }

        @media (max-width: 760px) {
          .main-content {
            padding:
              76px 16px 36px !important;
          }

          .settings-layout,
          .stats-grid,
          .two-columns,
          .theme-grid,
          .color-grid,
          .action-row,
          .account-actions {
            grid-template-columns:
              1fr !important;
          }

          .settings-side-nav {
            position: static !important;
          }

          .profile-box {
            align-items:
              flex-start !important;

            flex-direction:
              column !important;
          }
        }
      `}</style>

      <div
        className="settings-page"
        style={layoutStyle}
      >
        <div
          className="sidebar-wrapper"
        >
          <Sidebar />
        </div>

        <main
          className="main-content"
          style={main}
        >
          <Topbar />

          <section
            className="hero-row"
            style={hero}
          >
            <div>
              <p style={label}>
                {t.pageLabel}
              </p>

              <h1 style={title}>
                {t.title}
              </h1>

              <p style={subtitle}>
                {t.subtitle}
              </p>
            </div>

            <div
              className="qsm-glass"
              style={heroBadge}
            >
              <span
                style={heroBadgeIcon}
              >
                ⚙️
              </span>

              <div>
                <strong>
                  {settings.theme ===
                  "dark"
                    ? t.darkMode
                    : t.lightMode}
                </strong>

                <p style={heroBadgeText}>
                  {t.activeColor}:{" "}
                  {formatAccent(
                    settings.accentColor,
                    settings.language
                  )}
                </p>
              </div>
            </div>
          </section>

          <section
            className="stats-grid"
            style={statsGrid}
          >
            <StatCard
              icon="🎨"
              title={t.theme}
              value={
                settings.theme ===
                "dark"
                  ? t.dark
                  : t.light
              }
            />

            <StatCard
              icon="🌎"
              title={t.language}
              value={
                settings.language ===
                "es"
                  ? t.spanish
                  : t.english
              }
            />

            <StatCard
              icon="🔔"
              title={t.alerts}
              value={countEnabled(
                settings.notifications
              )}
            />

            <StatCard
              icon="🔐"
              title={t.security}
              value={
                settings.security
                  .loginAlerts
                  ? t.active
                  : t.basic
              }
            />
          </section>

          {displayedMessage && (
            <div
              role="status"
              style={successBox}
            >
              {displayedMessage}
            </div>
          )}

          {displayedError && (
            <div
              role="alert"
              style={errorBox}
            >
              {displayedError}
            </div>
          )}

          {loading ? (
            <div
              className="qsm-glass"
              style={centerCard}
            >
              <h2>
                {t.loadingTitle}
              </h2>

              <p>
                {t.loadingText}
              </p>
            </div>
          ) : (
            <section
              className="settings-layout"
              style={settingsLayout}
            >
              <aside
                className="settings-side-nav qsm-glass"
                style={sideNav}
              >
                <TabButton
                  active={
                    activeTab ===
                    "appearance"
                  }
                  icon="🎨"
                  text={t.appearance}
                  onClick={() =>
                    setActiveTab(
                      "appearance"
                    )
                  }
                />

                <TabButton
                  active={
                    activeTab ===
                    "language"
                  }
                  icon="🌎"
                  text={t.language}
                  onClick={() =>
                    setActiveTab(
                      "language"
                    )
                  }
                />

                <TabButton
                  active={
                    activeTab ===
                    "notifications"
                  }
                  icon="🔔"
                  text={t.notifications}
                  onClick={() =>
                    setActiveTab(
                      "notifications"
                    )
                  }
                />

                <TabButton
                  active={
                    activeTab ===
                    "privacy"
                  }
                  icon="🛡️"
                  text={t.privacy}
                  onClick={() =>
                    setActiveTab(
                      "privacy"
                    )
                  }
                />

                <TabButton
                  active={
                    activeTab ===
                    "security"
                  }
                  icon="🔐"
                  text={t.security}
                  onClick={() =>
                    setActiveTab(
                      "security"
                    )
                  }
                />

                <TabButton
                  active={
                    activeTab ===
                    "account"
                  }
                  icon="👤"
                  text={t.account}
                  onClick={() =>
                    setActiveTab(
                      "account"
                    )
                  }
                />
              </aside>

              <section
                className="qsm-glass"
                style={panel}
              >
                {activeTab ===
                  "appearance" && (
                  <>
                    <PanelHeader
                      label={
                        t.settingsLabel
                      }
                      title={
                        t.appearanceTitle
                      }
                      text={
                        t.appearanceText
                      }
                    />

                    <div
                      className="theme-grid"
                      style={themeGrid}
                    >
                      <ThemeCard
                        active={
                          settings.theme ===
                          "dark"
                        }
                        icon="🌙"
                        title={t.darkMode}
                        text={t.darkText}
                        onClick={() =>
                          changeMainSetting(
                            "theme",
                            "dark"
                          )
                        }
                      />

                      <ThemeCard
                        active={
                          settings.theme ===
                          "light"
                        }
                        icon="☀️"
                        title={t.lightMode}
                        text={t.lightText}
                        onClick={() =>
                          changeMainSetting(
                            "theme",
                            "light"
                          )
                        }
                      />
                    </div>

                    <h3>
                      {t.primaryColor}
                    </h3>

                    <div
                      className="color-grid"
                      style={colorGrid}
                    >
                      {[
                        "cyan",
                        "purple",
                        "pink",
                        "blue",
                        "green",
                        "orange"
                      ].map(
                        (
                          color
                        ) => (
                          <button
                            key={
                              color
                            }
                            type="button"
                            onClick={() =>
                              changeMainSetting(
                                "accentColor",
                                color
                              )
                            }
                            style={
                              settings.accentColor ===
                              color
                                ? activeColorButton(
                                    color
                                  )
                                : colorButton(
                                    color
                                  )
                            }
                          >
                            <span
                              style={colorDot(
                                color
                              )}
                            />

                            {formatAccent(
                              color,
                              settings.language
                            )}
                          </button>
                        )
                      )}
                    </div>

                    <div
                      className="two-columns"
                      style={twoColumns}
                    >
                      <SettingToggle
                        title={
                          t.animations
                        }
                        text={
                          t.animationsText
                        }
                        checked={
                          settings.animations
                        }
                        onChange={(
                          value
                        ) =>
                          changeMainSetting(
                            "animations",
                            value
                          )
                        }
                      />

                      <SettingToggle
                        title={
                          t.glassEffect
                        }
                        text={
                          t.glassEffectText
                        }
                        checked={
                          settings.glassEffect
                        }
                        onChange={(
                          value
                        ) =>
                          changeMainSetting(
                            "glassEffect",
                            value
                          )
                        }
                      />

                      <SettingToggle
                        title={
                          t.compactSidebar
                        }
                        text={
                          t.compactSidebarText
                        }
                        checked={
                          settings.compactSidebar
                        }
                        onChange={(
                          value
                        ) =>
                          changeMainSetting(
                            "compactSidebar",
                            value
                          )
                        }
                      />

                      <div
                        style={settingBox}
                      >
                        <h3>
                          {t.visualDensity}
                        </h3>

                        <p style={muted}>
                          {
                            t.visualDensityText
                          }
                        </p>

                        <select
                          value={
                            settings.density
                          }
                          onChange={(
                            event
                          ) =>
                            changeMainSetting(
                              "density",
                              event.target
                                .value
                            )
                          }
                          style={input}
                        >
                          <option
                            value="comfortable"
                          >
                            {t.comfortable}
                          </option>

                          <option
                            value="compact"
                          >
                            {t.compact}
                          </option>

                          <option
                            value="spacious"
                          >
                            {t.spacious}
                          </option>
                        </select>
                      </div>
                    </div>

                    <div
                      style={previewBox}
                    >
                      <h3>
                        {t.preview}
                      </h3>

                      <div
                        style={
                          previewStyle.card
                        }
                      >
                        <span
                          style={
                            previewStyle.badge
                          }
                        >
                          QSM
                        </span>

                        <h2>
                          {
                            t.protectedPurchase
                          }
                        </h2>

                        <p>
                          {t.previewText}
                        </p>

                        <button
                          type="button"
                          style={
                            previewStyle.button
                          }
                        >
                          {t.primaryButton}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {activeTab ===
                  "language" && (
                  <>
                    <PanelHeader
                      label={
                        t.settingsLabel
                      }
                      title={
                        t.languageRegionTitle
                      }
                      text={
                        t.languageRegionText
                      }
                    />

                    <div
                      className="two-columns"
                      style={twoColumns}
                    >
                      <div
                        style={settingBox}
                      >
                        <h3>
                          {
                            t.primaryLanguage
                          }
                        </h3>

                        <select
                          value={
                            settings.language
                          }
                          onChange={(
                            event
                          ) =>
                            changeMainSetting(
                              "language",
                              event.target
                                .value
                            )
                          }
                          style={input}
                        >
                          <option
                            value="es"
                          >
                            {t.spanish}
                          </option>

                          <option
                            value="en"
                          >
                            {t.english}
                          </option>
                        </select>
                      </div>

                      <InfoBox
                        title={t.region}
                        value="República Dominicana"
                      />

                      <InfoBox
                        title={t.currency}
                        value="DOP / RD$"
                      />

                      <InfoBox
                        title={t.timezone}
                        value="America/Santo_Domingo"
                      />
                    </div>
                  </>
                )}

                {activeTab ===
                  "notifications" && (
                  <>
                    <PanelHeader
                      label={
                        t.settingsLabel
                      }
                      title={
                        t.notificationsTitle
                      }
                      text={
                        t.notificationsText
                      }
                    />

                    <div
                      className="two-columns"
                      style={twoColumns}
                    >
                      {Object.entries(
                        NOTIFICATION_LABEL_KEYS
                      ).map(
                        ([
                          key,
                          translationKey
                        ]) => (
                          <SettingToggle
                            key={key}
                            title={
                              t[
                                translationKey
                              ]
                            }
                            text={`${t.alertsOf} ${String(
                              t[
                                translationKey
                              ]
                            ).toLocaleLowerCase(
                              settings.language ===
                                "es"
                                ? "es-DO"
                                : "en-US"
                            )}.`}
                            checked={
                              settings
                                .notifications[
                                key
                              ]
                            }
                            onChange={(
                              value
                            ) =>
                              changeNestedSetting(
                                "notifications",
                                key,
                                value
                              )
                            }
                          />
                        )
                      )}
                    </div>
                  </>
                )}

                {activeTab ===
                  "privacy" && (
                  <>
                    <PanelHeader
                      label={
                        t.settingsLabel
                      }
                      title={
                        t.privacyTitle
                      }
                      text={
                        t.privacyText
                      }
                    />

                    <div
                      className="two-columns"
                      style={twoColumns}
                    >
                      <SettingToggle
                        title={
                          t.showTrustScore
                        }
                        text={
                          t.showTrustScoreText
                        }
                        checked={
                          settings.privacy
                            .showTrustScore
                        }
                        onChange={(
                          value
                        ) =>
                          changeNestedSetting(
                            "privacy",
                            "showTrustScore",
                            value
                          )
                        }
                      />

                      <SettingToggle
                        title={
                          t.showLocation
                        }
                        text={
                          t.showLocationText
                        }
                        checked={
                          settings.privacy
                            .showLocation
                        }
                        onChange={(
                          value
                        ) =>
                          changeNestedSetting(
                            "privacy",
                            "showLocation",
                            value
                          )
                        }
                      />

                      <SettingToggle
                        title={
                          t.allowMessages
                        }
                        text={
                          t.allowMessagesText
                        }
                        checked={
                          settings.privacy
                            .allowMessages
                        }
                        onChange={(
                          value
                        ) =>
                          changeNestedSetting(
                            "privacy",
                            "allowMessages",
                            value
                          )
                        }
                      />
                    </div>
                  </>
                )}

                {activeTab ===
                  "security" && (
                  <>
                    <PanelHeader
                      label={
                        t.settingsLabel
                      }
                      title={
                        t.securityTitle
                      }
                      text={
                        t.securityText
                      }
                    />

                    <div
                      className="two-columns"
                      style={twoColumns}
                    >
                      <SettingToggle
                        title={
                          t.loginAlerts
                        }
                        text={
                          t.loginAlertsText
                        }
                        checked={
                          settings.security
                            .loginAlerts
                        }
                        onChange={(
                          value
                        ) =>
                          changeNestedSetting(
                            "security",
                            "loginAlerts",
                            value
                          )
                        }
                      />

                      <SettingToggle
                        title={t.twoFactor}
                        text={
                          t.twoFactorText
                        }
                        checked={false}
                        onChange={() => {}}
                        disabled
                        badge={
                          t.comingSoon
                        }
                      />

                      <div
                        style={settingBox}
                      >
                        <h3>
                          {t.sessionTime}
                        </h3>

                        <p style={muted}>
                          {
                            t.sessionTimeText
                          }
                        </p>

                        <select
                          value={
                            settings.security
                              .sessionTimeout
                          }
                          onChange={(
                            event
                          ) =>
                            changeNestedSetting(
                              "security",
                              "sessionTimeout",
                              event.target
                                .value
                            )
                          }
                          style={input}
                        >
                          <option
                            value="15"
                          >
                            {t.minutes15}
                          </option>

                          <option
                            value="30"
                          >
                            {t.minutes30}
                          </option>

                          <option
                            value="60"
                          >
                            {t.hour1}
                          </option>

                          <option
                            value="240"
                          >
                            {t.hours4}
                          </option>
                        </select>
                      </div>
                    </div>

                    <form
                      onSubmit={
                        changePassword
                      }
                      style={passwordBox}
                    >
                      <h3>
                        🔐{" "}
                        {t.changePassword}
                      </h3>

                      <p style={muted}>
                        {t.passwordText}
                      </p>

                      <div
                        className="two-columns"
                        style={twoColumns}
                      >
                        <PasswordField
                          placeholder={
                            t.currentPassword
                          }
                          value={
                            passwordForm.currentPassword
                          }
                          show={
                            showPasswords.currentPassword
                          }
                          autoComplete="current-password"
                          onToggle={() =>
                            setShowPasswords(
                              (
                                current
                              ) => ({
                                ...current,

                                currentPassword:
                                  !current.currentPassword
                              })
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            setPasswordForm(
                              (
                                current
                              ) => ({
                                ...current,

                                currentPassword:
                                  event.target
                                    .value
                              })
                            )
                          }
                        />

                        <PasswordField
                          placeholder={
                            t.newPassword
                          }
                          value={
                            passwordForm.newPassword
                          }
                          show={
                            showPasswords.newPassword
                          }
                          autoComplete="new-password"
                          onToggle={() =>
                            setShowPasswords(
                              (
                                current
                              ) => ({
                                ...current,

                                newPassword:
                                  !current.newPassword
                              })
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            setPasswordForm(
                              (
                                current
                              ) => ({
                                ...current,

                                newPassword:
                                  event.target
                                    .value
                              })
                            )
                          }
                        />

                        <PasswordField
                          placeholder={
                            t.confirmPassword
                          }
                          value={
                            passwordForm.confirmPassword
                          }
                          show={
                            showPasswords.confirmPassword
                          }
                          autoComplete="new-password"
                          onToggle={() =>
                            setShowPasswords(
                              (
                                current
                              ) => ({
                                ...current,

                                confirmPassword:
                                  !current.confirmPassword
                              })
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            setPasswordForm(
                              (
                                current
                              ) => ({
                                ...current,

                                confirmPassword:
                                  event.target
                                    .value
                              })
                            )
                          }
                        />
                      </div>

                      <PasswordRules
                        password={
                          passwordForm.newPassword
                        }
                        confirmPassword={
                          passwordForm.confirmPassword
                        }
                        labels={t}
                      />

                      <button
                        type="submit"
                        disabled={
                          passwordSaving
                        }
                        style={
                          primaryButton
                        }
                      >
                        {passwordSaving
                          ? t.updating
                          : `${t.updatePassword} →`}
                      </button>
                    </form>
                  </>
                )}

                {activeTab ===
                  "account" && (
                  <>
                    <PanelHeader
                      label={
                        t.settingsLabel
                      }
                      title={
                        t.accountTitle
                      }
                      text={
                        t.accountText
                      }
                    />

                    <div
                      className="profile-box"
                      style={profileBox}
                    >
                      <div style={avatar}>
                        {String(
                          user?.firstName ||
                            user?.email ||
                            "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <h2>
                          {user?.firstName ||
                            "Usuario"}{" "}
                          {user?.lastName ||
                            "QSM"}
                        </h2>

                        <p style={muted}>
                          {user?.email ||
                            "usuario@qsm.com"}
                        </p>

                        <strong>
                          {t.qsmTrust}:{" "}
                          {user?.trustScore ??
                            50}
                          /100
                        </strong>
                      </div>
                    </div>

                    <div
                      className="account-actions"
                      style={
                        accountActions
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            "/profile"
                          )
                        }
                        style={
                          outlineButton
                        }
                      >
                        {t.editProfile}
                      </button>

                      <button
                        type="button"
                        onClick={
                          exportSettings
                        }
                        style={
                          outlineButton
                        }
                      >
                        {t.exportSettings}
                      </button>

                      <button
                        type="button"
                        onClick={
                          handleLogout
                        }
                        style={
                          logoutActionButton
                        }
                      >
                        {t.logout}
                      </button>
                    </div>

                    <div
                      style={dangerBox}
                    >
                      <h3>
                        {t.sensitiveZone}
                      </h3>

                      <p>
                        {t.sensitiveText}
                      </p>
                    </div>
                  </>
                )}

                <div
                  className="action-row"
                  style={actionRow}
                >
                  <button
                    type="button"
                    onClick={
                      handleReset
                    }
                    disabled={saving}
                    style={
                      outlineButton
                    }
                  >
                    {t.restore}
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleSave
                    }
                    disabled={saving}
                    style={
                      primaryButton
                    }
                  >
                    {saving
                      ? t.saving
                      : `${t.saveChanges} →`}
                  </button>
                </div>
              </section>
            </section>
          )}
        </main>
      </div>

      <AiAssistant
        pageContext="settings"
      />
    </div>
  );
}

function TabButton({
  active,
  icon,
  text,
  onClick
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={
        active
          ? activeSideTab
          : sideTab
      }
    >
      <span>{icon}</span>
      {text}
    </button>
  );
}

function ThemeCard({
  active,
  icon,
  title,
  text,
  onClick
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={
        active
          ? activeThemeCard
          : themeCard
      }
    >
      <span style={themeIcon}>
        {icon}
      </span>

      <strong>
        {title}
      </strong>

      <p style={muted}>
        {text}
      </p>
    </button>
  );
}

function SettingToggle({
  title,
  text,
  checked,
  onChange,
  disabled = false,
  badge = ""
}) {
  return (
    <div style={settingBox}>
      <div>
        <div
          style={settingTitleRow}
        >
          <h3 style={noMargin}>
            {title}
          </h3>

          {badge && (
            <span style={comingSoonBadge}>
              {badge}
            </span>
          )}
        </div>

        <p style={muted}>
          {text}
        </p>
      </div>

      <button
        type="button"
        disabled={disabled}
        aria-pressed={
          checked
        }
        onClick={() =>
          onChange(
            !checked
          )
        }
        style={
          checked
            ? toggleOn
            : toggleOff
        }
      >
        <span
          style={
            checked
              ? toggleDotOn
              : toggleDotOff
          }
        />
      </button>
    </div>
  );
}

function PanelHeader({
  label: headerLabel,
  title: headerTitle,
  text
}) {
  return (
    <div style={panelHeader}>
      <p style={label}>
        {headerLabel}
      </p>

      <h2>
        {headerTitle}
      </h2>

      <p style={muted}>
        {text}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  title: cardTitle,
  value
}) {
  return (
    <div
      className="qsm-glass"
      style={statCard}
    >
      <div style={statIcon}>
        {icon}
      </div>

      <div style={statText}>
        <span style={mutedSmall}>
          {cardTitle}
        </span>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}

function InfoBox({
  title: boxTitle,
  value
}) {
  return (
    <div style={settingBox}>
      <h3>{boxTitle}</h3>

      <input
        value={value}
        readOnly
        style={input}
      />
    </div>
  );
}

function PasswordField({
  placeholder,
  value,
  onChange,
  show,
  onToggle,
  autoComplete
}) {
  return (
    <div
      style={passwordInputWrap}
    >
      <input
        type={
          show
            ? "text"
            : "password"
        }
        placeholder={
          placeholder
        }
        value={value}
        onChange={onChange}
        style={passwordInput}
        autoComplete={
          autoComplete
        }
      />

      <button
        type="button"
        onClick={onToggle}
        style={passwordEye}
        aria-label={
          show
            ? "Ocultar contraseña"
            : "Mostrar contraseña"
        }
      >
        {show
          ? "🙈"
          : "👁️"}
      </button>
    </div>
  );
}

function PasswordRules({
  password,
  confirmPassword,
  labels
}) {
  return (
    <div style={passwordRulesBox}>
      <p
        style={
          password.length >= 8
            ? ruleOk
            : ruleBad
        }
      >
        ✓ {labels.minimum8}
      </p>

      <p
        style={
          /[A-Z]/.test(
            password
          )
            ? ruleOk
            : ruleBad
        }
      >
        ✓ {labels.uppercase}
      </p>

      <p
        style={
          /[a-z]/.test(
            password
          )
            ? ruleOk
            : ruleBad
        }
      >
        ✓ {labels.lowercase}
      </p>

      <p
        style={
          /\d/.test(
            password
          )
            ? ruleOk
            : ruleBad
        }
      >
        ✓ {labels.number}
      </p>

      <p
        style={
          /[^A-Za-z0-9]/.test(
            password
          )
            ? ruleOk
            : ruleBad
        }
      >
        ✓ {labels.symbol}
      </p>

      <p
        style={
          password &&
          password ===
            confirmPassword
            ? ruleOk
            : ruleBad
        }
      >
        ✓{" "}
        {labels.passwordsMatch}
      </p>
    </div>
  );
}

function isStrongPasswordLocal(
  password
) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(
      password
    )
  );
}

function countEnabled(
  object
) {
  return Object.values(
    object || {}
  ).filter(Boolean).length;
}

function formatAccent(
  color,
  language
) {
  const names = {
    es: {
      cyan: "Cian",
      purple: "Morado",
      pink: "Rosado",
      blue: "Azul",
      green: "Verde",
      orange: "Naranja"
    },

    en: {
      cyan: "Cyan",
      purple: "Purple",
      pink: "Pink",
      blue: "Blue",
      green: "Green",
      orange: "Orange"
    }
  };

  return (
    names[language]?.[
      color
    ] ||
    names.es[color] ||
    color
  );
}

function getAccentColor(
  color
) {
  return (
    {
      cyan: "#35d0c3",
      purple: "#8b5cf6",
      pink: "#ec4899",
      blue: "#38bdf8",
      green: "#22c55e",
      orange: "#f59e0b"
    }[color] ||
    "#35d0c3"
  );
}

function getThemePreview(
  theme,
  accentColor
) {
  const accent =
    getAccentColor(
      accentColor
    );

  const dark =
    theme === "dark";

  return {
    card: {
      marginTop: "16px",
      padding: "22px",
      borderRadius:
        "var(--qsm-radius-medium)",
      background:
        dark
          ? "rgba(2, 6, 23, .70)"
          : "rgba(255, 255, 255, .96)",
      color:
        dark
          ? "#ffffff"
          : "#0f172a",
      border:
        `1px solid ${accent}55`,
      boxShadow:
        `0 18px 50px ${accent}18`
    },

    badge: {
      display:
        "inline-flex",
      padding:
        "7px 11px",
      borderRadius:
        "999px",
      background:
        `${accent}22`,
      color:
        accent,
      fontWeight:
        "900"
    },

    button: {
      marginTop:
        "14px",
      background:
        `linear-gradient(135deg, ${accent}, #8b5cf6)`,
      color:
        "#ffffff",
      border:
        "none",
      padding:
        "12px 16px",
      borderRadius:
        "13px",
      fontWeight:
        "950"
    }
  };
}

const page = {
  width: "100%",
  minHeight: "100vh",
  background:
    "transparent",
  color:
    "var(--qsm-text)"
};

const layout = {
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  overflowX: "hidden",
  transition:
    "grid-template-columns var(--qsm-transition)"
};

const main = {
  width: "100%",
  minWidth: 0,
  padding:
    "26px 34px 56px",
  overflowX: "hidden"
};

const hero = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "24px",
  margin: "22px 0"
};

const label = {
  color:
    "var(--qsm-accent)",
  letterSpacing:
    "4px",
  fontSize: "12px",
  fontWeight: "950",
  textTransform:
    "uppercase",
  margin: 0
};

const title = {
  color:
    "var(--qsm-text)",
  fontSize:
    "clamp(40px, 3.6vw, 62px)",
  lineHeight: "1",
  margin:
    "10px 0",
  letterSpacing:
    "-2px"
};

const subtitle = {
  color:
    "var(--qsm-text-secondary)",
  lineHeight:
    "29px",
  maxWidth:
    "860px",
  margin: 0
};

const heroBadge = {
  display: "flex",
  alignItems:
    "center",
  gap: "14px",
  minWidth:
    "270px",
  background:
    "var(--qsm-surface)",
  border:
    "1px solid var(--qsm-border-accent)",
  borderRadius:
    "var(--qsm-radius-medium)",
  padding:
    "18px",
  color:
    "var(--qsm-text)"
};

const heroBadgeIcon = {
  fontSize: "26px"
};

const heroBadgeText = {
  marginTop:
    "5px",
  color:
    "var(--qsm-muted)"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap:
    "var(--qsm-space-md)",
  marginBottom:
    "20px"
};

const statCard = {
  display: "flex",
  alignItems:
    "center",
  gap: "14px",
  minWidth: 0,
  background:
    "var(--qsm-surface)",
  border:
    "1px solid var(--qsm-border)",
  borderRadius:
    "var(--qsm-radius-medium)",
  padding:
    "20px",
  color:
    "var(--qsm-text)"
};

const statIcon = {
  width: "52px",
  height: "52px",
  flexShrink: 0,
  borderRadius:
    "17px",
  background:
    "rgba(var(--qsm-accent-rgb), .14)",
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  fontSize:
    "24px"
};

const statText = {
  minWidth: 0,
  display: "grid",
  gap: "3px"
};

const mutedSmall = {
  color:
    "var(--qsm-muted)",
  fontSize: "12px"
};

const settingsLayout = {
  display: "grid",
  gridTemplateColumns:
    "270px minmax(0, 1fr)",
  gap:
    "20px"
};

const sideNav = {
  position: "sticky",
  top: "20px",
  background:
    "var(--qsm-surface)",
  border:
    "1px solid var(--qsm-border)",
  borderRadius:
    "var(--qsm-radius-large)",
  padding:
    "16px",
  alignSelf:
    "start",
  display: "grid",
  gap: "10px"
};

const sideTab = {
  width: "100%",
  display: "flex",
  alignItems:
    "center",
  gap: "12px",
  padding:
    "14px",
  borderRadius:
    "15px",
  background:
    "var(--qsm-surface-soft)",
  border:
    "1px solid var(--qsm-border)",
  color:
    "var(--qsm-text-secondary)",
  cursor:
    "pointer",
  fontWeight:
    "900",
  textAlign:
    "left"
};

const activeSideTab = {
  ...sideTab,
  background:
    "linear-gradient(135deg, rgba(var(--qsm-accent-rgb), .20), rgba(139, 92, 246, .18))",
  border:
    "1px solid var(--qsm-border-accent)",
  color:
    "var(--qsm-text)"
};

const panel = {
  minWidth: 0,
  background:
    "var(--qsm-surface)",
  border:
    "1px solid var(--qsm-border)",
  borderRadius:
    "var(--qsm-radius-large)",
  padding:
    "var(--qsm-space-lg)",
  animation:
    "qsmSettingsFadeUp .35s ease",
  color:
    "var(--qsm-text)"
};

const panelHeader = {
  marginBottom:
    "20px"
};

const themeGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "14px",
  marginBottom:
    "22px"
};

const themeCard = {
  textAlign:
    "left",
  minHeight:
    "150px",
  display: "grid",
  alignContent:
    "start",
  gap: "10px",
  background:
    "var(--qsm-surface-soft)",
  border:
    "1px solid var(--qsm-border)",
  borderRadius:
    "var(--qsm-radius-medium)",
  padding:
    "20px",
  color:
    "var(--qsm-text-secondary)",
  cursor:
    "pointer"
};

const activeThemeCard = {
  ...themeCard,
  background:
    "linear-gradient(135deg, rgba(var(--qsm-accent-rgb), .16), rgba(139, 92, 246, .16))",
  border:
    "1px solid var(--qsm-border-accent)",
  color:
    "var(--qsm-text)",
  boxShadow:
    "0 18px 45px rgba(var(--qsm-accent-rgb), .10)"
};

const themeIcon = {
  fontSize:
    "28px"
};

const colorGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "12px",
  marginBottom:
    "22px"
};

const colorButton = (
  color
) => ({
  display: "flex",
  alignItems:
    "center",
  gap: "10px",
  minWidth: 0,
  background:
    "var(--qsm-surface-soft)",
  border:
    "1px solid var(--qsm-border)",
  color:
    "var(--qsm-text)",
  padding:
    "13px",
  borderRadius:
    "15px",
  cursor:
    "pointer",
  fontWeight:
    "900"
});

const activeColorButton = (
  color
) => ({
  ...colorButton(
    color
  ),
  border:
    `1px solid ${getAccentColor(
      color
    )}`,
  boxShadow:
    `0 0 26px ${getAccentColor(
      color
    )}33`
});

const colorDot = (
  color
) => ({
  width: "18px",
  height: "18px",
  flexShrink: 0,
  borderRadius:
    "50%",
  background:
    getAccentColor(
      color
    )
});

const twoColumns = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "14px"
};

const settingBox = {
  minHeight:
    "126px",
  minWidth: 0,
  background:
    "var(--qsm-surface-soft)",
  border:
    "1px solid var(--qsm-border)",
  borderRadius:
    "var(--qsm-radius-medium)",
  padding:
    "18px",
  display: "flex",
  flexDirection:
    "column",
  justifyContent:
    "space-between",
  gap: "12px",
  color:
    "var(--qsm-text)"
};

const settingTitleRow = {
  display: "flex",
  alignItems:
    "center",
  flexWrap: "wrap",
  gap: "8px"
};

const noMargin = {
  margin: 0
};

const comingSoonBadge = {
  display:
    "inline-flex",
  alignItems:
    "center",
  minHeight:
    "22px",
  padding:
    "0 8px",
  borderRadius:
    "999px",
  background:
    "rgba(139, 92, 246, .16)",
  border:
    "1px solid rgba(139, 92, 246, .28)",
  color:
    "#c4b5fd",
  fontSize:
    "8px",
  fontWeight:
    "950",
  letterSpacing:
    ".6px"
};

const muted = {
  color:
    "var(--qsm-text-secondary)",
  lineHeight:
    "25px"
};

const input = {
  width: "100%",
  minHeight:
    "54px",
  background:
    "var(--qsm-surface-soft)",
  border:
    "1px solid var(--qsm-border)",
  color:
    "var(--qsm-text)",
  borderRadius:
    "15px",
  padding:
    "0 14px",
  outline:
    "none"
};

const toggleOff = {
  width: "62px",
  height: "34px",
  borderRadius:
    "999px",
  border:
    "1px solid var(--qsm-border)",
  background:
    "var(--qsm-surface-strong)",
  cursor:
    "pointer",
  padding:
    "4px",
  alignSelf:
    "flex-start"
};

const toggleOn = {
  ...toggleOff,
  background:
    "linear-gradient(135deg, var(--qsm-accent), #8b5cf6)",
  border:
    "1px solid var(--qsm-border-accent)"
};

const toggleDotOff = {
  display: "block",
  width: "24px",
  height: "24px",
  borderRadius:
    "50%",
  background:
    "var(--qsm-muted)",
  transform:
    "translateX(0)",
  transition:
    "transform var(--qsm-transition)"
};

const toggleDotOn = {
  ...toggleDotOff,
  background:
    "#ffffff",
  transform:
    "translateX(26px)"
};

const previewBox = {
  marginTop:
    "22px",
  background:
    "var(--qsm-surface-soft)",
  border:
    "1px solid var(--qsm-border)",
  borderRadius:
    "var(--qsm-radius-medium)",
  padding:
    "18px"
};

const passwordBox = {
  marginTop:
    "20px",
  background:
    "var(--qsm-surface-soft)",
  border:
    "1px solid var(--qsm-border)",
  borderRadius:
    "var(--qsm-radius-medium)",
  padding:
    "18px",
  display: "grid",
  gap: "14px"
};

const profileBox = {
  display: "flex",
  alignItems:
    "center",
  gap: "18px",
  background:
    "var(--qsm-surface-soft)",
  border:
    "1px solid var(--qsm-border)",
  borderRadius:
    "var(--qsm-radius-medium)",
  padding:
    "20px"
};

const avatar = {
  width: "74px",
  height: "74px",
  flexShrink: 0,
  borderRadius:
    "24px",
  background:
    "linear-gradient(135deg, var(--qsm-accent), #8b5cf6)",
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  fontSize:
    "30px",
  fontWeight:
    "950",
  color:
    "#ffffff"
};

const accountActions = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "12px",
  marginTop:
    "16px"
};

const dangerBox = {
  marginTop:
    "18px",
  background:
    "rgba(127, 29, 29, .18)",
  border:
    "1px solid rgba(248, 113, 113, .24)",
  color:
    "#fecaca",
  borderRadius:
    "var(--qsm-radius-medium)",
  padding:
    "18px"
};

const actionRow = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1.4fr",
  gap: "12px",
  marginTop:
    "24px"
};

const outlineButton = {
  minHeight:
    "48px",
  textAlign:
    "center",
  background:
    "var(--qsm-surface-soft)",
  border:
    "1px solid var(--qsm-border)",
  color:
    "var(--qsm-text)",
  borderRadius:
    "13px",
  padding:
    "12px 16px",
  fontWeight:
    "950",
  cursor:
    "pointer"
};

const logoutActionButton = {
  ...outlineButton,
  background:
    "rgba(127, 29, 29, .18)",
  border:
    "1px solid rgba(248, 113, 113, .28)",
  color:
    "#fca5a5"
};

const primaryButton = {
  minHeight:
    "48px",
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  background:
    "linear-gradient(135deg, var(--qsm-accent), #38bdf8, #8b5cf6)",
  color:
    "#ffffff",
  textDecoration:
    "none",
  border:
    "none",
  padding:
    "14px 20px",
  borderRadius:
    "14px",
  fontWeight:
    "950",
  cursor:
    "pointer",
  boxShadow:
    "0 18px 54px rgba(var(--qsm-accent-rgb), .18)"
};

const successBox = {
  background:
    "rgba(34, 197, 94, .14)",
  border:
    "1px solid rgba(34, 197, 94, .32)",
  color:
    "#bbf7d0",
  padding:
    "14px 18px",
  borderRadius:
    "16px",
  marginBottom:
    "16px",
  fontWeight:
    "800"
};

const errorBox = {
  background:
    "rgba(127, 29, 29, .24)",
  border:
    "1px solid rgba(248, 113, 113, .30)",
  color:
    "#fecaca",
  padding:
    "14px 18px",
  borderRadius:
    "16px",
  marginBottom:
    "16px",
  fontWeight:
    "800"
};

const centerCard = {
  background:
    "var(--qsm-surface)",
  border:
    "1px solid var(--qsm-border)",
  borderRadius:
    "var(--qsm-radius-large)",
  padding:
    "44px",
  textAlign:
    "center",
  color:
    "var(--qsm-text-secondary)"
};

const passwordInputWrap = {
  display: "flex",
  alignItems:
    "center",
  background:
    "var(--qsm-surface-soft)",
  border:
    "1px solid var(--qsm-border)",
  borderRadius:
    "15px",
  padding:
    "0 12px"
};

const passwordInput = {
  flex: 1,
  minWidth: 0,
  minHeight:
    "54px",
  background:
    "transparent",
  border:
    "none",
  color:
    "var(--qsm-text)",
  outline:
    "none"
};

const passwordEye = {
  background:
    "transparent",
  border:
    "none",
  color:
    "var(--qsm-text)",
  cursor:
    "pointer",
  fontSize:
    "18px"
};

const passwordRulesBox = {
  background:
    "var(--qsm-surface-soft)",
  border:
    "1px solid var(--qsm-border)",
  borderRadius:
    "16px",
  padding:
    "14px"
};

const ruleOk = {
  color:
    "#86efac",
  margin:
    "6px 0",
  fontWeight:
    "800"
};

const ruleBad = {
  color:
    "var(--qsm-muted)",
  margin:
    "6px 0"
};

export default Settings;
