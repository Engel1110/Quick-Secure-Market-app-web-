import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Debes completar correo y contraseña.");
      return;
    }

    const user = {
      id: Date.now(),
      firstName: form.email.includes("admin") ? "Admin" : "Engel",
      lastName: form.email.includes("admin") ? "QSM" : "Feliz",
      email: form.email,
      role: form.email.includes("admin") ? "ADMIN" : "USER",
      trustScore: form.email.includes("admin") ? 100 : 60,
      kycStatus: form.email.includes("admin") ? "VERIFIED" : "PENDING_REVIEW"
    };

    localStorage.setItem("qsm_user", JSON.stringify(user));
    localStorage.setItem("qsm_token", "demo-token");

    navigate("/dashboard");
  };

  const handleGoogleDemo = () => {
    const user = {
      id: Date.now(),
      firstName: "Usuario",
      lastName: "Google",
      email: "usuario@gmail.com",
      role: "USER",
      trustScore: 55,
      kycStatus: "PENDING"
    };

    localStorage.setItem("qsm_user", JSON.stringify(user));
    localStorage.setItem("qsm_token", "google-demo-token");

    navigate("/complete-profile");
  };

  return (
    <div style={page}>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          html, body, #root {
            width: 100%;
            min-height: 100%;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            background: #020617;
            font-family: 'Inter', system-ui, sans-serif;
          }

          body {
            overflow-y: auto;
          }

          @keyframes slowZoom {
            from { transform: scale(1); }
            to { transform: scale(1.08); }
          }

          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(26px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <div style={background}></div>
      <div style={overlay}></div>

      <main style={layout}>
        <section style={left}>
          <Link to="/" style={brand}>
            <div style={brandIcon}>🛡</div>
            <div>
              <strong style={brandTitle}>QSM</strong>
              <span style={brandSub}>Quick Secure Market</span>
            </div>
          </Link>

          <div style={heroContent}>
            <div style={badge}>🔒 Plataforma segura y confiable</div>

            <h1 style={title}>
              Compra y vende con{" "}
              <span style={accent}>protección digital QSM.</span>
            </h1>

            <p style={description}>
              Accede a una plataforma diseñada para reducir fraudes mediante
              verificación de identidad, escrow, reputación y asistencia inteligente.
            </p>

            <div style={features}>
              <Feature icon="🛡" title="Escrow Seguro" text="El pago queda protegido hasta confirmar recepción." />
              <Feature icon="🧾" title="Identidad Verificada" text="Validación de usuarios para mayor confianza." />
              <Feature icon="⭐" title="Trust Score" text="Reputación transparente para compradores y vendedores." />
            </div>

            <div style={projectionBox}>
              <div>
                <h2>Proyección QSM</h2>
                <p>Métricas estimadas para etapas futuras del proyecto.</p>
              </div>

              <div style={projectionGrid}>
                <Projection value="10K+" label="usuarios verificados" />
                <Projection value="25K+" label="transacciones protegidas" />
                <Projection value="4.9/5" label="objetivo de confianza" />
              </div>
            </div>

            <p style={note}>
              * Las métricas mostradas son proyecciones del modelo de negocio, no datos reales de operación.
            </p>
          </div>
        </section>

        <section style={right}>
          <form onSubmit={handleLogin} style={loginCard}>
            <div style={loginIcon}>🛡</div>

            <h2>Iniciar sesión</h2>

            <p style={loginSubtitle}>
              Accede a tu cuenta de Quick Secure Market.
            </p>

            <input
              name="email"
              type="email"
              placeholder="Correo electrónico"
              value={form.email}
              onChange={handleChange}
              style={input}
            />

            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={handleChange}
              style={input}
            />

            <div style={helpRow}>
              <span></span>
              <button type="button" style={linkButton}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && <p style={errorText}>{error}</p>}

            <button type="submit" style={primaryButton}>
              Entrar
            </button>

            <div style={divider}>
              <span></span>
              <p>o continúa con</p>
              <span></span>
            </div>

            <button type="button" onClick={handleGoogleDemo} style={googleButton}>
              <span style={googleG}>G</span>
              Continuar con Google
            </button>

            <p style={registerText}>
              ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div style={feature}>
      <div style={featureIcon}>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Projection({ value, label }) {
  return (
    <div style={projectionItem}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const page = {
  width: "100%",
  minHeight: "100vh",
  position: "relative",
  color: "white",
  background: "#020617",
  overflowX: "hidden",
  overflowY: "auto"
};

const background = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1920&q=90')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  animation: "slowZoom 20s ease-in-out forwards"
};

const overlay = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(90deg, rgba(2,6,23,0.98), rgba(2,6,23,0.82), rgba(2,6,23,0.58)), radial-gradient(circle at 75% 45%, rgba(53,208,195,0.18), transparent 30%), radial-gradient(circle at 85% 75%, rgba(124,58,237,0.22), transparent 34%)"
};

const layout = {
  position: "relative",
  zIndex: 2,
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.15fr) minmax(420px, 0.85fr)",
  gap: "40px",
  padding: "56px 7vw",
  alignItems: "center",
  overflow: "hidden",
  animation: "fadeUp .8s ease"
};

const left = {
  minWidth: 0
};

const right = {
  minWidth: 0,
  display: "flex",
  justifyContent: "center"
};

const brand = {
  display: "inline-flex",
  alignItems: "center",
  gap: "14px",
  color: "white",
  textDecoration: "none",
  marginBottom: "74px"
};

const brandIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "18px",
  border: "1px solid rgba(53,208,195,0.45)",
  color: "#35d0c3",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px"
};

const brandTitle = {
  display: "block",
  fontSize: "28px",
  lineHeight: "28px"
};

const brandSub = {
  display: "block",
  color: "#cbd5e1",
  fontSize: "14px"
};

const heroContent = {
  maxWidth: "820px"
};

const badge = {
  display: "inline-block",
  color: "#35d0c3",
  background: "rgba(53,208,195,0.10)",
  border: "1px solid rgba(53,208,195,0.30)",
  padding: "10px 16px",
  borderRadius: "999px",
  fontWeight: "800",
  marginBottom: "22px"
};

const title = {
  fontSize: "clamp(46px, 5vw, 78px)",
  lineHeight: "1.04",
  letterSpacing: "-2.8px",
  margin: "0 0 24px",
  fontWeight: "900"
};

const accent = {
  color: "#35d0c3"
};

const description = {
  color: "#cbd5e1",
  fontSize: "20px",
  lineHeight: "34px",
  maxWidth: "720px"
};

const features = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "18px",
  marginTop: "36px",
  maxWidth: "820px"
};

const feature = {
  background: "rgba(15,23,42,0.50)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "22px",
  padding: "20px",
  backdropFilter: "blur(18px)"
};

const featureIcon = {
  fontSize: "30px"
};

const projectionBox = {
  marginTop: "32px",
  maxWidth: "820px",
  background: "rgba(15,23,42,0.55)",
  border: "1px solid rgba(53,208,195,0.24)",
  borderRadius: "28px",
  padding: "24px",
  backdropFilter: "blur(20px)"
};

const projectionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "16px",
  marginTop: "18px"
};

const projectionItem = {
  background: "rgba(2,6,23,0.45)",
  borderRadius: "18px",
  padding: "18px",
  border: "1px solid rgba(148,163,184,0.12)"
};

const note = {
  color: "#94a3b8",
  fontSize: "13px",
  marginTop: "14px"
};

const loginCard = {
  width: "100%",
  maxWidth: "480px",
  background: "rgba(8,17,35,0.72)",
  border: "1px solid rgba(53,208,195,0.35)",
  borderRadius: "32px",
  padding: "38px",
  backdropFilter: "blur(26px)",
  boxShadow: "0 45px 110px rgba(0,0,0,0.58)",
  textAlign: "center"
};

const loginIcon = {
  width: "72px",
  height: "72px",
  margin: "0 auto 20px",
  borderRadius: "24px",
  background: "rgba(53,208,195,0.12)",
  border: "1px solid rgba(53,208,195,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px"
};

const loginSubtitle = {
  color: "#cbd5e1",
  marginBottom: "26px"
};

const input = {
  width: "100%",
  padding: "16px",
  marginBottom: "14px",
  borderRadius: "16px",
  border: "1px solid rgba(148,163,184,0.24)",
  background: "rgba(2,6,23,0.70)",
  color: "white",
  outline: "none",
  fontFamily: "'Inter', system-ui, sans-serif"
};

const helpRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "16px"
};

const linkButton = {
  background: "transparent",
  color: "#35d0c3",
  border: "none",
  cursor: "pointer",
  fontWeight: "800"
};

const primaryButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "16px"
};

const divider = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: "12px",
  alignItems: "center",
  color: "#94a3b8",
  fontSize: "13px",
  margin: "24px 0"
};

const googleButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "16px",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(2,6,23,0.56)",
  color: "white",
  fontWeight: "850",
  cursor: "pointer"
};

const googleG = {
  color: "#35d0c3",
  marginRight: "10px",
  fontWeight: "900"
};

const registerText = {
  color: "#cbd5e1",
  marginTop: "22px"
};

const errorText = {
  color: "#fca5a5",
  background: "rgba(127,29,29,0.22)",
  border: "1px solid rgba(248,113,113,0.28)",
  borderRadius: "14px",
  padding: "12px"
};

export default Login;