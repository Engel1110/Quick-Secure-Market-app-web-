import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Escribe tu correo electrónico.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase()
      });

      setMessage(
        res.data.message ||
          "Si existe una cuenta asociada, recibirás un correo de recuperación."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo procesar la solicitud. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={icon}>🔐</div>

        <p style={label}>RECUPERACIÓN QSM</p>
        <h1 style={title}>¿Olvidaste tu contraseña?</h1>
        <p style={subtitle}>
          Escribe el correo asociado a tu cuenta QSM. Te enviaremos un enlace seguro para restablecer tu contraseña.
        </p>

        {message && <div style={successBox}>{message}</div>}
        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={form}>
          <label style={field}>
            <span>Correo electrónico</span>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
            />
          </label>

          <button type="submit" disabled={loading} style={button}>
            {loading ? "Enviando..." : "Enviar enlace de recuperación →"}
          </button>
        </form>

        <Link to="/login" style={backLink}>
          ← Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top right, rgba(139,92,246,.22), transparent 32%), radial-gradient(circle at 20% 20%, rgba(53,208,195,.16), transparent 28%), #020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  color: "white",
  fontFamily: 'Inter, "Plus Jakarta Sans", system-ui, sans-serif'
};

const card = {
  width: "100%",
  maxWidth: "520px",
  background: "rgba(15,23,42,.78)",
  border: "1px solid rgba(53,208,195,.22)",
  borderRadius: "30px",
  padding: "34px",
  boxShadow: "0 30px 100px rgba(0,0,0,.35)",
  backdropFilter: "blur(18px)",
  textAlign: "center"
};

const icon = {
  width: "74px",
  height: "74px",
  borderRadius: "24px",
  margin: "0 auto 18px",
  background: "linear-gradient(135deg, #35d0c3, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px"
};

const label = { margin: 0, color: "#35d0c3", letterSpacing: "4px", fontSize: "12px", fontWeight: "950" };
const title = { fontSize: "38px", lineHeight: "1", margin: "12px 0" };
const subtitle = { color: "#cbd5e1", lineHeight: "27px", marginBottom: "22px" };
const form = { display: "grid", gap: "16px", textAlign: "left" };
const field = { display: "grid", gap: "9px", color: "#e2e8f0", fontWeight: "800" };

const input = {
  height: "56px",
  background: "rgba(2,6,23,.55)",
  border: "1px solid rgba(148,163,184,.18)",
  borderRadius: "16px",
  color: "white",
  padding: "0 15px",
  outline: "none"
};

const button = {
  height: "58px",
  border: "none",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  fontWeight: "950",
  cursor: "pointer"
};

const backLink = {
  display: "inline-flex",
  marginTop: "22px",
  color: "#35d0c3",
  textDecoration: "none",
  fontWeight: "900"
};

const successBox = {
  background: "rgba(34,197,94,.14)",
  border: "1px solid rgba(34,197,94,.32)",
  color: "#bbf7d0",
  padding: "13px 15px",
  borderRadius: "14px",
  marginBottom: "14px",
  fontWeight: "800",
  textAlign: "left"
};

const errorBox = {
  background: "rgba(127,29,29,.24)",
  border: "1px solid rgba(248,113,113,.30)",
  color: "#fecaca",
  padding: "13px 15px",
  borderRadius: "14px",
  marginBottom: "14px",
  fontWeight: "800",
  textAlign: "left"
};

export default ForgotPassword;
