import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  cloneSystemSettings,
  exportSettings,
  getSystemSettings,
  getSystemSettingsError,
  hasSettingsChanged,
  importSettings,
  resetSystemSettings,
  updateSystemSettings
} from "../../../services/adminSystemSettings.service.js";

import "../dashboard/adminDashboard.css";
import "./systemSettings.css";

const SECTIONS = [
  ["platform", "Plataforma", "◫"],
  ["verification", "Verificación", "✓"],
  ["finance", "Finanzas", "$"],
  ["operations", "Operaciones", "⌘"],
  ["security", "Seguridad", "♢"],
  ["communication", "Comunicaciones", "✉"],
  ["moderation", "Moderación", "⚑"],
  ["automation", "Automatización", "✦"]
];

function SystemSettings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [activeSection, setActiveSection] = useState("platform");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  const currentAdmin = useMemo(() => getCurrentAdminUser(), []);

  const changed = useMemo(() => {
    if (!settings || !originalSettings) return false;
    return hasSettingsChanged(originalSettings, settings);
  }, [settings, originalSettings]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getSystemSettings();
      const normalized = normalizeSettings(response?.settings || response?.data || response);
      setSettings(cloneSystemSettings(normalized));
      setOriginalSettings(cloneSystemSettings(normalized));
    } catch (requestError) {
      setError(getSystemSettingsError(requestError, "No se pudo cargar la configuración global."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!changed) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [changed]);

  const updateField = (section, field, value) => {
    setError("");
    setSuccess("");
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value
      }
    }));
  };

  const save = async () => {
    if (!settings || !changed || saving) return;

    try {
      setSaving(true);
      setError("");
      const payload = buildUpdatePayload(originalSettings, settings);
      const response = await updateSystemSettings(payload);
      const normalized = normalizeSettings(response?.settings || settings);
      setSettings(cloneSystemSettings(normalized));
      setOriginalSettings(cloneSystemSettings(normalized));
      setSuccess(response?.message || "Configuración guardada correctamente.");
    } catch (requestError) {
      setError(getSystemSettingsError(requestError, "No se pudo guardar la configuración."));
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!originalSettings || saving) return;
    setSettings(cloneSystemSettings(originalSettings));
    setError("");
    setSuccess("");
  };

  const reset = async () => {
    if (resetting) return;

    try {
      setResetting(true);
      setError("");
      const response = await resetSystemSettings();
      const normalized = normalizeSettings(response?.settings || response?.data || response);
      setSettings(cloneSystemSettings(normalized));
      setOriginalSettings(cloneSystemSettings(normalized));
      setResetOpen(false);
      setSuccess(response?.message || "Configuración restaurada correctamente.");
    } catch (requestError) {
      setError(getSystemSettingsError(requestError, "No se pudo restaurar la configuración."));
    } finally {
      setResetting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setImporting(true);
      setError("");
      const imported = await importSettings(file);
      setSettings(cloneSystemSettings(normalizeSettings(imported)));
      setSuccess("Configuración importada. Revisa los cambios y pulsa Guardar.");
    } catch (requestError) {
      setError(getSystemSettingsError(requestError, "El archivo importado no es válido."));
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="qsm-admin-shell qsm-system-settings-page">
      <aside className="qsm-settings-sidebar">
        <button className="qsm-settings-sidebar__brand" type="button" onClick={() => navigate("/admin/dashboard")}>
          <span>Q</span>
          <div><strong>QSM</strong><small>BackOffice</small></div>
        </button>

        <div className="qsm-settings-sidebar__profile">
          <span>{currentAdmin.initials}</span>
          <div><strong>{currentAdmin.name}</strong><small>{currentAdmin.roleLabel}</small></div>
        </div>

        <nav className="qsm-settings-sidebar__nav">
          <button type="button" onClick={() => navigate("/admin/dashboard")}><span>⌂</span>Dashboard</button>
          <button type="button" onClick={() => navigate("/admin/internal-users")}><span>♙</span>Usuarios internos</button>
          <button type="button" className="is-active"><span>⚙</span>Configuración global</button>
          <button type="button" onClick={() => navigate("/admin/audit")}><span>▤</span>Auditoría</button>
          <button type="button" onClick={() => navigate("/admin/security")}><span>♢</span>Seguridad</button>
        </nav>

        <button className="qsm-settings-sidebar__back" type="button" onClick={() => navigate("/admin/dashboard")}>← Volver al Dashboard</button>
      </aside>

      <div className="qsm-settings-main">
        <header className="qsm-settings-topbar">
          <div><span>CONTROL CENTRAL</span><strong>Configuración global del sistema</strong></div>

          <div className="qsm-settings-topbar__actions">
            <button type="button" className="qsm-admin-button qsm-admin-button--secondary" onClick={() => exportSettings(settings)}>Exportar</button>

            <label className="qsm-admin-button qsm-admin-button--secondary qsm-settings-import-button">
              {importing ? "Importando..." : "Importar"}
              <input type="file" accept="application/json,.json" disabled={importing} onChange={handleImport} />
            </label>

            <button type="button" className="qsm-admin-button qsm-admin-button--secondary" disabled={!changed || saving} onClick={discard}>Descartar</button>
            <button type="button" className="qsm-admin-button qsm-admin-button--primary" disabled={!changed || saving} onClick={save}>{saving ? "Guardando..." : "Guardar cambios"}</button>
          </div>
        </header>

        <main className="qsm-settings-content">
          <section className="qsm-settings-hero">
            <div>
              <span>SISTEMA EMPRESARIAL</span>
              <h1>Centro maestro de configuración</h1>
              <p>Controla marketplace, seguridad, finanzas, verificación, operaciones y automatización desde un solo lugar.</p>
            </div>

            <div className="qsm-settings-hero__status">
              <StatusBadge active={settings.platform.marketplaceEnabled} activeText="Marketplace activo" inactiveText="Marketplace detenido" />
              <StatusBadge active={!settings.platform.maintenanceMode} activeText="Operación normal" inactiveText="Modo mantenimiento" />
              <StatusBadge active={settings.security.suspiciousIpDetectionEnabled} activeText="Protección activa" inactiveText="Protección limitada" />
            </div>
          </section>

          {error && <Alert type="error" title="No se pudo completar la operación" message={error} onClose={() => setError("")} />}
          {success && <Alert type="success" title="Operación completada" message={success} onClose={() => setSuccess("")} />}
          {changed && <div className="qsm-settings-unsaved"><span>●</span><p>Tienes cambios sin guardar.</p></div>}

          <div className="qsm-settings-layout">
            <aside className="qsm-settings-section-nav">
              <span>CATEGORÍAS</span>

              {SECTIONS.map(([id, label, icon]) => (
                <button key={id} type="button" className={activeSection === id ? "is-active" : ""} onClick={() => setActiveSection(id)}>
                  <span>{icon}</span>{label}
                </button>
              ))}

              <div className="qsm-settings-section-nav__danger">
                <strong>Zona crítica</strong>
                <p>Restaura todos los valores globales.</p>
                <button type="button" onClick={() => setResetOpen(true)}>Restaurar valores</button>
              </div>
            </aside>

            <section className="qsm-settings-panel">
              {activeSection === "platform" && <PlatformSection values={settings.platform} onChange={(field, value) => updateField("platform", field, value)} />}
              {activeSection === "verification" && <VerificationSection values={settings.verification} onChange={(field, value) => updateField("verification", field, value)} />}
              {activeSection === "finance" && <FinanceSection values={settings.finance} onChange={(field, value) => updateField("finance", field, value)} />}
              {activeSection === "operations" && <OperationsSection values={settings.operations} onChange={(field, value) => updateField("operations", field, value)} />}
              {activeSection === "security" && <SecuritySection values={settings.security} onChange={(field, value) => updateField("security", field, value)} />}
              {activeSection === "communication" && <CommunicationSection values={settings.communication} onChange={(field, value) => updateField("communication", field, value)} />}
              {activeSection === "moderation" && <ModerationSection values={settings.moderation} onChange={(field, value) => updateField("moderation", field, value)} />}
              {activeSection === "automation" && <AutomationSection values={settings.automation} onChange={(field, value) => updateField("automation", field, value)} />}
            </section>
          </div>
        </main>
      </div>

      {resetOpen && <ResetModal resetting={resetting} onClose={() => !resetting && setResetOpen(false)} onConfirm={reset} />}
    </div>
  );
}

function PlatformSection({ values, onChange }) {
  return (
    <Section eyebrow="PLATAFORMA" title="Disponibilidad general" description="Controla las funciones principales visibles para usuarios y personal interno.">
      <ToggleGrid>
        <Toggle title="Marketplace" description="Permite navegar por productos y publicaciones." value={values.marketplaceEnabled} onChange={(value) => onChange("marketplaceEnabled", value)} />
        <Toggle title="Registro de usuarios" description="Permite crear nuevas cuentas." value={values.registrationEnabled} onChange={(value) => onChange("registrationEnabled", value)} />
        <Toggle title="Inicio de sesión" description="Permite acceder a cuentas existentes." value={values.loginEnabled} onChange={(value) => onChange("loginEnabled", value)} />
        <Toggle title="Compras" description="Permite iniciar nuevos procesos de compra." value={values.purchasesEnabled} onChange={(value) => onChange("purchasesEnabled", value)} />
        <Toggle title="Ventas" description="Permite publicar y vender productos." value={values.salesEnabled} onChange={(value) => onChange("salesEnabled", value)} />
        <Toggle title="Modo mantenimiento" description="Suspende temporalmente la operación pública." value={values.maintenanceMode} danger onChange={(value) => onChange("maintenanceMode", value)} />
      </ToggleGrid>

      <Subsection title="Mensaje de mantenimiento" description="Se mostrará cuando el mantenimiento esté activo.">
        <textarea className="qsm-settings-textarea" rows="5" maxLength="1000" value={values.maintenanceMessage} onChange={(event) => onChange("maintenanceMessage", event.target.value)} />
      </Subsection>
    </Section>
  );
}

function VerificationSection({ values, onChange }) {
  return (
    <Section eyebrow="IDENTIDAD Y CONFIANZA" title="Verificación y KYC" description="Define cuándo se exige verificación de identidad y reconocimiento facial.">
      <ToggleGrid>
        <Toggle title="KYC para comprar" description="Exige identidad aprobada antes de comprar." value={values.kycRequiredForBuying} onChange={(value) => onChange("kycRequiredForBuying", value)} />
        <Toggle title="KYC para vender" description="Exige identidad aprobada antes de publicar." value={values.kycRequiredForSelling} onChange={(value) => onChange("kycRequiredForSelling", value)} />
        <Toggle title="KYC para retiros" description="Protege la salida de fondos." value={values.kycRequiredForWithdrawals} onChange={(value) => onChange("kycRequiredForWithdrawals", value)} />
        <Toggle title="Verificación facial" description="Activa controles de reconocimiento facial." value={values.faceVerificationEnabled} onChange={(value) => onChange("faceVerificationEnabled", value)} />
        <Toggle title="Face Check periódico" description="Solicita validaciones recurrentes." value={values.periodicFaceCheckEnabled} onChange={(value) => onChange("periodicFaceCheckEnabled", value)} />
      </ToggleGrid>

      <Subsection title="Reglas de confianza" description="Ajusta intervalos y puntuaciones mínimas.">
        <FieldGrid>
          <NumberField label="Intervalo Face Check" suffix="horas" min={1} max={8760} value={values.periodicFaceCheckHours} onChange={(value) => onChange("periodicFaceCheckHours", value)} />
          <NumberField label="Trust Score vendedor" suffix="/100" min={0} max={100} value={values.minimumSellerTrustScore} onChange={(value) => onChange("minimumSellerTrustScore", value)} />
          <NumberField label="Trust Score comprador" suffix="/100" min={0} max={100} value={values.minimumBuyerTrustScore} onChange={(value) => onChange("minimumBuyerTrustScore", value)} />
        </FieldGrid>
      </Subsection>
    </Section>
  );
}

function FinanceSection({ values, onChange }) {
  return (
    <Section eyebrow="FINANZAS" title="Pagos, escrow y comisiones" description="Administra el comportamiento financiero de QSM.">
      <ToggleGrid>
        <Toggle title="Escrow" description="Retiene fondos hasta completar la transacción." value={values.escrowEnabled} onChange={(value) => onChange("escrowEnabled", value)} />
        <Toggle title="Wallet" description="Habilita balances internos." value={values.walletEnabled} onChange={(value) => onChange("walletEnabled", value)} />
        <Toggle title="Retiros" description="Permite solicitar salida de fondos." value={values.withdrawalsEnabled} onChange={(value) => onChange("withdrawalsEnabled", value)} />
        <Toggle title="Reembolsos" description="Permite devolver fondos." value={values.refundsEnabled} onChange={(value) => onChange("refundsEnabled", value)} />
      </ToggleGrid>

      <Subsection title="Comisiones" description="Define los porcentajes aplicados en cada operación.">
        <FieldGrid>
          <NumberField label="Comisión plataforma" suffix="%" min={0} max={100} step="0.01" value={values.platformCommissionPercent} onChange={(value) => onChange("platformCommissionPercent", value)} />
          <NumberField label="Comisión vendedor" suffix="%" min={0} max={100} step="0.01" value={values.sellerCommissionPercent} onChange={(value) => onChange("sellerCommissionPercent", value)} />
          <NumberField label="Tarifa comprador" suffix="%" min={0} max={100} step="0.01" value={values.buyerServiceFeePercent} onChange={(value) => onChange("buyerServiceFeePercent", value)} />
        </FieldGrid>
      </Subsection>

      <Subsection title="Retiros y liberación" description="Controla límites y tiempos operativos.">
        <FieldGrid>
          <NumberField label="Retiro mínimo" suffix={values.currency} min={0} value={values.minimumWithdrawalAmount} onChange={(value) => onChange("minimumWithdrawalAmount", value)} />
          <NumberField label="Retiro máximo" suffix={values.currency} min={0} value={values.maximumWithdrawalAmount} onChange={(value) => onChange("maximumWithdrawalAmount", value)} />
          <NumberField label="Liberación escrow" suffix="horas" min={0} max={720} value={values.escrowReleaseHours} onChange={(value) => onChange("escrowReleaseHours", value)} />
          <SelectField label="Moneda principal" value={values.currency} options={[{ value: "DOP", label: "DOP — Peso dominicano" }, { value: "USD", label: "USD — Dólar estadounidense" }]} onChange={(value) => onChange("currency", value)} />
        </FieldGrid>
      </Subsection>
    </Section>
  );
}

function OperationsSection({ values, onChange }) {
  return (
    <Section eyebrow="OPERACIONES" title="Órdenes, delivery y disputas" description="Configura plazos y controles de la operación logística.">
      <ToggleGrid>
        <Toggle title="Inspección de almacén" description="Exige inspección antes del despacho." value={values.warehouseInspectionRequired} onChange={(value) => onChange("warehouseInspectionRequired", value)} />
        <Toggle title="PIN de entrega" description="Exige PIN para confirmar entrega." value={values.deliveryPinRequired} onChange={(value) => onChange("deliveryPinRequired", value)} />
        <Toggle title="Confirmación del comprador" description="Requiere confirmación antes de liberar fondos." value={values.buyerConfirmationRequired} onChange={(value) => onChange("buyerConfirmationRequired", value)} />
      </ToggleGrid>

      <Subsection title="Plazos operativos" description="Define tiempos permitidos para órdenes y disputas.">
        <FieldGrid>
          <NumberField label="Entrega máxima" suffix="días" min={1} max={90} value={values.maximumDeliveryDays} onChange={(value) => onChange("maximumDeliveryDays", value)} />
          <NumberField label="Cancelación de orden" suffix="minutos" min={0} max={10080} value={values.orderCancellationMinutes} onChange={(value) => onChange("orderCancellationMinutes", value)} />
          <NumberField label="Apertura de disputa" suffix="días" min={1} max={90} value={values.disputeOpeningDays} onChange={(value) => onChange("disputeOpeningDays", value)} />
          <NumberField label="Resolución de disputa" suffix="días" min={1} max={180} value={values.disputeResolutionDays} onChange={(value) => onChange("disputeResolutionDays", value)} />
        </FieldGrid>
      </Subsection>
    </Section>
  );
}

function SecuritySection({ values, onChange }) {
  return (
    <Section eyebrow="SEGURIDAD" title="Protección global" description="Controla sesiones, bloqueos y detección de riesgo.">
      <ToggleGrid>
        <Toggle title="2FA administradores" description="Obliga segundo factor en BackOffice." value={values.adminTwoFactorRequired} onChange={(value) => onChange("adminTwoFactorRequired", value)} />
        <Toggle title="2FA usuarios" description="Permite segundo factor en cuentas normales." value={values.userTwoFactorAvailable} onChange={(value) => onChange("userTwoFactorAvailable", value)} />
        <Toggle title="Detección de IP" description="Identifica accesos desde IP sospechosas." value={values.suspiciousIpDetectionEnabled} onChange={(value) => onChange("suspiciousIpDetectionEnabled", value)} />
        <Toggle title="Detección de dispositivo" description="Identifica dispositivos desconocidos." value={values.suspiciousDeviceDetectionEnabled} onChange={(value) => onChange("suspiciousDeviceDetectionEnabled", value)} />
        <Toggle title="Cambio obligatorio" description="Aplica a nuevas cuentas internas." value={values.forcePasswordChangeForInternalUsers} onChange={(value) => onChange("forcePasswordChangeForInternalUsers", value)} />
      </ToggleGrid>

      <Subsection title="Sesiones y bloqueo" description="Define duración y tolerancia de acceso.">
        <FieldGrid>
          <NumberField label="Sesión administrativa" suffix="minutos" min={5} max={1440} value={values.adminSessionTimeoutMinutes} onChange={(value) => onChange("adminSessionTimeoutMinutes", value)} />
          <NumberField label="Sesión de usuario" suffix="minutos" min={5} max={10080} value={values.userSessionTimeoutMinutes} onChange={(value) => onChange("userSessionTimeoutMinutes", value)} />
          <NumberField label="Intentos máximos" suffix="intentos" min={1} max={20} value={values.maximumLoginAttempts} onChange={(value) => onChange("maximumLoginAttempts", value)} />
          <NumberField label="Tiempo de bloqueo" suffix="minutos" min={1} max={1440} value={values.accountLockMinutes} onChange={(value) => onChange("accountLockMinutes", value)} />
        </FieldGrid>
      </Subsection>
    </Section>
  );
}

function CommunicationSection({ values, onChange }) {
  return (
    <Section eyebrow="COMUNICACIONES" title="Notificaciones y correos" description="Gestiona los canales globales utilizados por QSM.">
      <ToggleGrid>
        <Toggle title="Correo" description="Activa correos operativos y transaccionales." value={values.emailNotificationsEnabled} onChange={(value) => onChange("emailNotificationsEnabled", value)} />
        <Toggle title="Push" description="Activa avisos en dispositivos compatibles." value={values.pushNotificationsEnabled} onChange={(value) => onChange("pushNotificationsEnabled", value)} />
        <Toggle title="SMS" description="Activa alertas por mensaje de texto." value={values.smsNotificationsEnabled} onChange={(value) => onChange("smsNotificationsEnabled", value)} />
        <Toggle title="Alertas administrativas" description="Envía eventos importantes al BackOffice." value={values.adminAlertsEnabled} onChange={(value) => onChange("adminAlertsEnabled", value)} />
        <Toggle title="Alertas de seguridad" description="Notifica accesos y riesgos." value={values.securityAlertsEnabled} onChange={(value) => onChange("securityAlertsEnabled", value)} />
        <Toggle title="Órdenes" description="Informa cambios en pedidos." value={values.orderNotificationsEnabled} onChange={(value) => onChange("orderNotificationsEnabled", value)} />
        <Toggle title="Disputas" description="Informa aperturas y resoluciones." value={values.disputeNotificationsEnabled} onChange={(value) => onChange("disputeNotificationsEnabled", value)} />
      </ToggleGrid>

      <Subsection title="Correos institucionales" description="Configura direcciones visibles para soporte y comunicaciones automáticas.">
        <FieldGrid>
          <TextField label="Correo de soporte" type="email" placeholder="soporte@qsm.com" value={values.supportEmail} onChange={(value) => onChange("supportEmail", value)} />
          <TextField label="Correo no-reply" type="email" placeholder="no-reply@qsm.com" value={values.noReplyEmail} onChange={(value) => onChange("noReplyEmail", value)} />
        </FieldGrid>
      </Subsection>
    </Section>
  );
}

function ModerationSection({ values, onChange }) {
  return (
    <Section eyebrow="MODERACIÓN" title="Contenido y reportes" description="Define cómo se revisan publicaciones y reportes.">
      <ToggleGrid>
        <Toggle title="Revisión automática" description="Analiza productos automáticamente." value={values.automaticProductReviewEnabled} onChange={(value) => onChange("automaticProductReviewEnabled", value)} />
        <Toggle title="Aprobación obligatoria" description="Requiere aprobación manual." value={values.requireProductApproval} onChange={(value) => onChange("requireProductApproval", value)} />
        <Toggle title="Ocultar reportados" description="Oculta productos con múltiples reportes." value={values.hideReportedProductsAutomatically} onChange={(value) => onChange("hideReportedProductsAutomatically", value)} />
        <Toggle title="Reseñas" description="Permite reseñas después de comprar." value={values.allowUserReviews} onChange={(value) => onChange("allowUserReviews", value)} />
        <Toggle title="Comentarios" description="Permite comentarios en publicaciones." value={values.allowProductComments} onChange={(value) => onChange("allowProductComments", value)} />
      </ToggleGrid>

      <Subsection title="Umbral de reportes" description="Número de reportes antes de ocultar contenido.">
        <FieldGrid>
          <NumberField label="Reportes requeridos" suffix="reportes" min={1} max={1000} value={values.reportsBeforeAutomaticHide} onChange={(value) => onChange("reportsBeforeAutomaticHide", value)} />
        </FieldGrid>
      </Subsection>
    </Section>
  );
}

function AutomationSection({ values, onChange }) {
  return (
    <Section eyebrow="AUTOMATIZACIÓN" title="IA y controles automáticos" description="Activa procesos inteligentes para riesgo, moderación y seguridad.">
      <ToggleGrid>
        <Toggle title="Detección de fraude" description="Analiza patrones sospechosos." value={values.fraudDetectionEnabled} onChange={(value) => onChange("fraudDetectionEnabled", value)} />
        <Toggle title="Moderación con IA" description="Analiza contenido automáticamente." value={values.aiModerationEnabled} onChange={(value) => onChange("aiModerationEnabled", value)} />
        <Toggle title="Risk Scoring" description="Actualiza puntuaciones de riesgo." value={values.automaticRiskScoringEnabled} onChange={(value) => onChange("automaticRiskScoringEnabled", value)} />
        <Toggle title="Prioridad de disputas" description="Ordena casos según riesgo e impacto." value={values.automaticDisputePrioritizationEnabled} onChange={(value) => onChange("automaticDisputePrioritizationEnabled", value)} />
        <Toggle title="Alertas automáticas" description="Genera alertas de seguridad." value={values.automaticSecurityAlertsEnabled} onChange={(value) => onChange("automaticSecurityAlertsEnabled", value)} />
      </ToggleGrid>
    </Section>
  );
}

function Section({ eyebrow, title, description, children }) {
  return <div className="qsm-settings-section"><header><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></header>{children}</div>;
}

function ToggleGrid({ children }) {
  return <div className="qsm-settings-grid">{children}</div>;
}

function Subsection({ title, description, children }) {
  return <section className="qsm-settings-subsection"><div><h3>{title}</h3><p>{description}</p></div>{children}</section>;
}

function FieldGrid({ children }) {
  return <div className="qsm-settings-fields">{children}</div>;
}

function Toggle({ title, description, value, onChange, danger = false }) {
  return (
    <article className={`qsm-settings-toggle-card${danger ? " qsm-settings-toggle-card--danger" : ""}`}>
      <div><strong>{title}</strong><p>{description}</p></div>
      <button type="button" role="switch" aria-checked={value} className={`qsm-settings-switch${value ? " is-active" : ""}`} onClick={() => onChange(!value)}><span /></button>
    </article>
  );
}

function NumberField({ label, value, onChange, suffix = "", min, max, step = "1" }) {
  return (
    <div className="qsm-settings-field">
      <label>{label}</label>
      <div className="qsm-settings-input-group">
        <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
        {suffix && <span>{suffix}</span>}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", placeholder = "" }) {
  return <div className="qsm-settings-field"><label>{label}</label><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>;
}

function SelectField({ label, value, options, onChange }) {
  return <div className="qsm-settings-field"><label>{label}</label><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}

function StatusBadge({ active, activeText, inactiveText }) {
  return <span className={`qsm-settings-status${active ? " is-active" : " is-inactive"}`}><i />{active ? activeText : inactiveText}</span>;
}

function Alert({ type, title, message, onClose }) {
  return <div className={`qsm-settings-alert qsm-settings-alert--${type}`}><span>{type === "success" ? "✓" : "⚠"}</span><div><strong>{title}</strong><p>{message}</p></div><button type="button" onClick={onClose}>×</button></div>;
}

function ResetModal({ resetting, onClose, onConfirm }) {
  return (
    <div className="qsm-admin-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && !resetting && onClose()}>
      <div className="qsm-admin-modal qsm-admin-modal--small">
        <div className="qsm-admin-modal__header"><div><h3>Restaurar configuración</h3><p>Todos los valores volverán a su estado predeterminado.</p></div><button type="button" className="qsm-admin-modal__close" disabled={resetting} onClick={onClose}>×</button></div>
        <div className="qsm-admin-modal__body"><div className="qsm-settings-reset-warning"><span>⚠</span><div><strong>Esta acción es crítica</strong><p>Los cambios actuales se perderán y la operación quedará registrada en auditoría.</p></div></div></div>
        <div className="qsm-admin-modal__footer"><button type="button" className="qsm-admin-button qsm-admin-button--secondary" disabled={resetting} onClick={onClose}>Cancelar</button><button type="button" className="qsm-admin-button qsm-settings-danger-button" disabled={resetting} onClick={onConfirm}>{resetting ? "Restaurando..." : "Restaurar configuración"}</button></div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return <div className="qsm-admin-shell qsm-system-settings-page"><div className="qsm-settings-loading"><span>◌</span><h2>Cargando configuración global</h2><p>Consultando el estado actual de QSM.</p></div></div>;
}

function buildUpdatePayload(original, current) {
  const payload = {};
  for (const [section] of SECTIONS) {
    if (JSON.stringify(original[section]) !== JSON.stringify(current[section])) payload[section] = current[section];
  }
  return payload;
}

function normalizeSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};

  return {
    platform: {
      marketplaceEnabled: source.platform?.marketplaceEnabled ?? true,
      registrationEnabled: source.platform?.registrationEnabled ?? true,
      loginEnabled: source.platform?.loginEnabled ?? true,
      purchasesEnabled: source.platform?.purchasesEnabled ?? true,
      salesEnabled: source.platform?.salesEnabled ?? true,
      maintenanceMode: source.platform?.maintenanceMode ?? false,
      maintenanceMessage: source.platform?.maintenanceMessage || "QSM se encuentra temporalmente en mantenimiento."
    },
    verification: {
      kycRequiredForBuying: source.verification?.kycRequiredForBuying ?? false,
      kycRequiredForSelling: source.verification?.kycRequiredForSelling ?? true,
      kycRequiredForWithdrawals: source.verification?.kycRequiredForWithdrawals ?? true,
      faceVerificationEnabled: source.verification?.faceVerificationEnabled ?? true,
      periodicFaceCheckEnabled: source.verification?.periodicFaceCheckEnabled ?? true,
      periodicFaceCheckHours: Number(source.verification?.periodicFaceCheckHours ?? 72),
      minimumSellerTrustScore: Number(source.verification?.minimumSellerTrustScore ?? 50),
      minimumBuyerTrustScore: Number(source.verification?.minimumBuyerTrustScore ?? 0)
    },
    finance: {
      escrowEnabled: source.finance?.escrowEnabled ?? true,
      walletEnabled: source.finance?.walletEnabled ?? true,
      withdrawalsEnabled: source.finance?.withdrawalsEnabled ?? true,
      refundsEnabled: source.finance?.refundsEnabled ?? true,
      platformCommissionPercent: Number(source.finance?.platformCommissionPercent ?? 5),
      sellerCommissionPercent: Number(source.finance?.sellerCommissionPercent ?? 0),
      buyerServiceFeePercent: Number(source.finance?.buyerServiceFeePercent ?? 0),
      minimumWithdrawalAmount: Number(source.finance?.minimumWithdrawalAmount ?? 500),
      maximumWithdrawalAmount: Number(source.finance?.maximumWithdrawalAmount ?? 500000),
      escrowReleaseHours: Number(source.finance?.escrowReleaseHours ?? 24),
      currency: source.finance?.currency || "DOP"
    },
    operations: {
      maximumDeliveryDays: Number(source.operations?.maximumDeliveryDays ?? 7),
      orderCancellationMinutes: Number(source.operations?.orderCancellationMinutes ?? 30),
      disputeOpeningDays: Number(source.operations?.disputeOpeningDays ?? 7),
      disputeResolutionDays: Number(source.operations?.disputeResolutionDays ?? 15),
      warehouseInspectionRequired: source.operations?.warehouseInspectionRequired ?? true,
      deliveryPinRequired: source.operations?.deliveryPinRequired ?? true,
      buyerConfirmationRequired: source.operations?.buyerConfirmationRequired ?? true
    },
    security: {
      adminTwoFactorRequired: source.security?.adminTwoFactorRequired ?? false,
      userTwoFactorAvailable: source.security?.userTwoFactorAvailable ?? true,
      adminSessionTimeoutMinutes: Number(source.security?.adminSessionTimeoutMinutes ?? 30),
      userSessionTimeoutMinutes: Number(source.security?.userSessionTimeoutMinutes ?? 240),
      maximumLoginAttempts: Number(source.security?.maximumLoginAttempts ?? 5),
      accountLockMinutes: Number(source.security?.accountLockMinutes ?? 30),
      suspiciousIpDetectionEnabled: source.security?.suspiciousIpDetectionEnabled ?? true,
      suspiciousDeviceDetectionEnabled: source.security?.suspiciousDeviceDetectionEnabled ?? true,
      forcePasswordChangeForInternalUsers: source.security?.forcePasswordChangeForInternalUsers ?? true
    },
    communication: {
      emailNotificationsEnabled: source.communication?.emailNotificationsEnabled ?? true,
      pushNotificationsEnabled: source.communication?.pushNotificationsEnabled ?? true,
      smsNotificationsEnabled: source.communication?.smsNotificationsEnabled ?? false,
      adminAlertsEnabled: source.communication?.adminAlertsEnabled ?? true,
      securityAlertsEnabled: source.communication?.securityAlertsEnabled ?? true,
      orderNotificationsEnabled: source.communication?.orderNotificationsEnabled ?? true,
      disputeNotificationsEnabled: source.communication?.disputeNotificationsEnabled ?? true,
      supportEmail: source.communication?.supportEmail || "",
      noReplyEmail: source.communication?.noReplyEmail || ""
    },
    moderation: {
      automaticProductReviewEnabled: source.moderation?.automaticProductReviewEnabled ?? false,
      requireProductApproval: source.moderation?.requireProductApproval ?? false,
      hideReportedProductsAutomatically: source.moderation?.hideReportedProductsAutomatically ?? false,
      reportsBeforeAutomaticHide: Number(source.moderation?.reportsBeforeAutomaticHide ?? 5),
      allowUserReviews: source.moderation?.allowUserReviews ?? true,
      allowProductComments: source.moderation?.allowProductComments ?? true
    },
    automation: {
      fraudDetectionEnabled: source.automation?.fraudDetectionEnabled ?? true,
      aiModerationEnabled: source.automation?.aiModerationEnabled ?? false,
      automaticRiskScoringEnabled: source.automation?.automaticRiskScoringEnabled ?? true,
      automaticDisputePrioritizationEnabled: source.automation?.automaticDisputePrioritizationEnabled ?? false,
      automaticSecurityAlertsEnabled: source.automation?.automaticSecurityAlertsEnabled ?? true
    }
  };
}

function getCurrentAdminUser() {
  const rawUser = localStorage.getItem("qsm_admin_user") || sessionStorage.getItem("qsm_admin_user");
  let user = {};

  try {
    user = rawUser ? JSON.parse(rawUser) : {};
  } catch {
    user = {};
  }

  const firstName = user.firstName || "Administrador";
  const lastName = user.lastName || "QSM";
  const role = String(user.role || "SUPER_ADMIN").trim().toUpperCase();
  const labels = { SUPER_ADMIN: "Super Administrador", SENIOR_ADMIN: "Senior Administrator", ADMIN: "Administrador" };

  return {
    ...user,
    name: user.fullName || `${firstName} ${lastName}`,
    initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
    roleLabel: labels[role] || role
  };
}

export default SystemSettings;
