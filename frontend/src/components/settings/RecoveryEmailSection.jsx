import {
  useEffect,
  useState
} from "react";

import api from "../../api/axios";

function RecoveryEmailSection() {
  const [
    status,
    setStatus
  ] = useState({
    primaryEmail: "",
    recoveryEmailMasked: "",
    pendingRecoveryEmailMasked: "",
    verified: false,
    pending: false
  });

  const [
    recoveryEmail,
    setRecoveryEmail
  ] = useState("");

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

  const loadStatus =
    async () => {
      try {
        setLoading(true);

        const response =
          await api.get(
            "/auth/recovery-email"
          );

        setStatus(
          response.data
            ?.recoveryEmail || {}
        );
      } catch (
        requestError
      ) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
            "No se pudo consultar el correo de recuperación."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(
    () => {
      loadStatus();
    },
    []
  );

  const requestVerification =
    async (
      event
    ) => {
      event.preventDefault();

      setMessage("");
      setError("");

      const cleanEmail =
        recoveryEmail
          .trim()
          .toLowerCase();

      if (!cleanEmail) {
        setError(
          "Escribe el correo de recuperación."
        );
        return;
      }

      try {
        setSaving(true);

        const response =
          await api.post(
            "/auth/recovery-email/request-verification",
            {
              recoveryEmail:
                cleanEmail
            }
          );

        setMessage(
          response.data
            ?.message ||
            "Enviamos un enlace de verificación."
        );

        setRecoveryEmail("");

        await loadStatus();
      } catch (
        requestError
      ) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
            "No se pudo enviar la verificación."
        );
      } finally {
        setSaving(false);
      }
    };

  const removeRecoveryEmail =
    async () => {
      const confirmed =
        window.confirm(
          "¿Deseas eliminar el correo de recuperación verificado?"
        );

      if (!confirmed) {
        return;
      }

      setMessage("");
      setError("");

      try {
        setSaving(true);

        const response =
          await api.delete(
            "/auth/recovery-email"
          );

        setMessage(
          response.data
            ?.message ||
            "Correo de recuperación eliminado."
        );

        await loadStatus();
      } catch (
        requestError
      ) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
            "No se pudo eliminar el correo de recuperación."
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <section
      style={container}
    >
      <div style={header}>
        <div>
          <p style={eyebrow}>
            RECUPERACIÓN DE CUENTA
          </p>

          <h3 style={title}>
            Correo de recuperación
          </h3>

          <p style={text}>
            Este correo recibirá el enlace
            seguro cuando olvides tu contraseña.
          </p>
        </div>

        <span
          style={
            status.verified
              ? verifiedBadge
              : pendingBadge
          }
        >
          {status.verified
            ? "VERIFICADO"
            : status.pending
              ? "PENDIENTE"
              : "NO CONFIGURADO"}
        </span>
      </div>

      {message && (
        <div
          role="status"
          style={successBox}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={errorBox}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={infoCard}>
          Consultando correo de recuperación...
        </div>
      ) : (
        <>
          <div style={infoGrid}>
            <div style={infoCard}>
              <span style={infoLabel}>
                Correo principal
              </span>

              <strong>
                {status.primaryEmail ||
                  "No disponible"}
              </strong>
            </div>

            <div style={infoCard}>
              <span style={infoLabel}>
                Correo de recuperación
              </span>

              <strong>
                {status.recoveryEmailMasked ||
                  "No configurado"}
              </strong>
            </div>
          </div>

          {status.pending && (
            <div style={pendingNotice}>
              <strong>
                Verificación pendiente:
              </strong>{" "}
              {
                status.pendingRecoveryEmailMasked
              }
              <br />
              Revisa ese correo y abre el enlace
              de confirmación.
            </div>
          )}

          <form
            onSubmit={
              requestVerification
            }
            style={form}
          >
            <label style={field}>
              <span>
                {status.verified
                  ? "Cambiar correo de recuperación"
                  : "Agregar correo de recuperación"}
              </span>

              <input
                type="email"
                value={
                  recoveryEmail
                }
                onChange={(
                  event
                ) =>
                  setRecoveryEmail(
                    event.target.value
                  )
                }
                placeholder="ejemplo@gmail.com"
                autoComplete="email"
                disabled={saving}
                style={input}
              />
            </label>

            <div style={actions}>
              <button
                type="submit"
                disabled={saving}
                style={primaryButton}
              >
                {saving
                  ? "Enviando..."
                  : "Enviar enlace de verificación"}
              </button>

              {status.verified && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    removeRecoveryEmail
                  }
                  style={dangerButton}
                >
                  Eliminar
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  );
}

const container = {
  marginTop: "20px",
  padding: "20px",
  borderRadius:
    "var(--qsm-radius-medium)",
  border:
    "1px solid var(--qsm-border)",
  background:
    "var(--qsm-surface-soft)",
  display: "grid",
  gap: "16px"
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: "16px",
  flexWrap: "wrap"
};

const eyebrow = {
  margin: 0,
  color:
    "var(--qsm-accent)",
  fontSize: "11px",
  fontWeight: 950,
  letterSpacing: "2px"
};

const title = {
  margin: "8px 0"
};

const text = {
  margin: 0,
  color:
    "var(--qsm-text-secondary)",
  lineHeight: "24px"
};

const verifiedBadge = {
  padding: "8px 12px",
  borderRadius: "999px",
  color: "#86efac",
  background:
    "rgba(34, 197, 94, .14)",
  border:
    "1px solid rgba(34, 197, 94, .30)",
  fontSize: "11px",
  fontWeight: 950
};

const pendingBadge = {
  ...verifiedBadge,
  color: "#fde68a",
  background:
    "rgba(245, 158, 11, .14)",
  border:
    "1px solid rgba(245, 158, 11, .30)"
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "12px"
};

const infoCard = {
  minWidth: 0,
  padding: "15px",
  borderRadius: "15px",
  border:
    "1px solid var(--qsm-border)",
  background:
    "var(--qsm-surface)",
  display: "grid",
  gap: "6px",
  wordBreak: "break-word"
};

const infoLabel = {
  color:
    "var(--qsm-muted)",
  fontSize: "12px"
};

const pendingNotice = {
  padding: "14px",
  borderRadius: "14px",
  background:
    "rgba(245, 158, 11, .12)",
  border:
    "1px solid rgba(245, 158, 11, .28)",
  color: "#fde68a",
  lineHeight: "24px"
};

const form = {
  display: "grid",
  gap: "13px"
};

const field = {
  display: "grid",
  gap: "8px",
  color:
    "var(--qsm-text)",
  fontWeight: 850
};

const input = {
  minHeight: "54px",
  width: "100%",
  borderRadius: "15px",
  padding: "0 14px",
  outline: "none",
  color:
    "var(--qsm-text)",
  background:
    "var(--qsm-surface)",
  border:
    "1px solid var(--qsm-border)"
};

const actions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap"
};

const primaryButton = {
  minHeight: "48px",
  padding: "0 18px",
  border: "none",
  borderRadius: "14px",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
  background:
    "linear-gradient(135deg, var(--qsm-accent), #38bdf8, #8b5cf6)"
};

const dangerButton = {
  ...primaryButton,
  background:
    "rgba(127, 29, 29, .25)",
  border:
    "1px solid rgba(248, 113, 113, .30)",
  color: "#fecaca"
};

const successBox = {
  padding: "13px 15px",
  borderRadius: "14px",
  background:
    "rgba(34, 197, 94, .14)",
  border:
    "1px solid rgba(34, 197, 94, .30)",
  color: "#bbf7d0",
  fontWeight: 800
};

const errorBox = {
  ...successBox,
  background:
    "rgba(127, 29, 29, .24)",
  border:
    "1px solid rgba(248, 113, 113, .30)",
  color: "#fecaca"
};

export default RecoveryEmailSection;
