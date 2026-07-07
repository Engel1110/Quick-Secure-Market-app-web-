import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({
    password: "",
    confirmPassword: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const passwordValid = useMemo(() => {
    return (
      form.password.length >= 8 &&
      /[A-Z]/.test(form.password) &&
      /[a-z]/.test(form.password) &&
      /\d/.test(form.password) &&
      /[^A-Za-z0-9]/.test(form.password)
    );
  }, [form.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("El enlace de recuperación no tiene token válido.");
      return;
    }

    if (!passwordValid) {
      setError("La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/reset-password", {
        token,
        password: form.password
      });

      setMessage(res.data.message || "Contraseña actualizada correctamente.");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo restablecer la contraseña. El enlace puede estar vencido."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={icon}>🔑</div>

        <p style={label}>NUEVA CONTRASEÑA</p>
        <h1 style={title}>Restablecer acceso</h1>
        <p style={subtitle}>
          Crea una contraseña segura para volver a entrar a tu cuenta QSM.
        </p>

        {!token && (
          <div style={errorBox}>
            Este enlace no tiene token válido. Solicita un nuevo enlace de recuperación.
          </div>
        )}

        {message && <div style={successBox}>{message}</div>}
        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={formStyle}>
          <label style={field}>
            <span>Nueva contraseña</span>
            <input
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={input}
            />
          </label>

          <label style={field}>
            <span>Confirmar contraseña</span>
            <input
              type="password"
              placeholder="Repite tu contraseña"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              style={input}
            />
          </label>

          <div style={rulesBox}>
            <p style={passwordValid ? ruleOk : ruleBad}>
              {passwordValid ? "✅" : "•"} Mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.
            </p>
            <p style={form.password && form.password === form.confirmPassword ? ruleOk : ruleBad}>
              {form.password && form.password === form.confirmPassword ? "✅" : "•"} Las contraseñas deben coincidir.
            </p>
          </div>

          <button type="submit" disabled={loading || !token} style={button}>
            {loading ? "Actualizando..." : "Guardar nueva contraseña →"}
          </button>
        </form>

        <Link to="/forgot-password" style={backLink}>
          Solicitar otro enlace
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
  maxWidth: "540px",
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
const formStyle = { display: "grid", gap: "16px", textAlign: "left" };
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

const rulesBox = {
  background: "rgba(2,6,23,.38)",
  border: "1px solid rgba(148,163,184,.12)",
  borderRadius: "16px",
  padding: "14px"
};

const ruleOk = { color: "#bbf7d0", margin: "5px 0", fontWeight: "800" };
const ruleBad = { color: "#cbd5e1", margin: "5px 0" };

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

export default ResetPassword;
