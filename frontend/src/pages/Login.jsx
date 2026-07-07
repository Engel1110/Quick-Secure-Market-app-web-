import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => localStorage.getItem("qsm_theme") || "dark");
  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isDark = theme === "dark";

  useEffect(() => {
    localStorage.setItem("qsm_theme", theme);
    document.documentElement.setAttribute("data-qsm-theme", theme);
  }, [theme]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.email || !form.password) {
      setMessage("Completa tu correo y contraseña.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email: form.email.trim(),
        password: form.password
      });

      const data = response.data;

      const token = data.token || data.accessToken || data?.user?.token;
      const user = data.user || data.usuario || data.data?.user;

      if (!token) {
        setMessage("El backend no devolvió un token válido.");
        return;
      }

      if (remember) {
        localStorage.setItem("qsm_token", token);
        localStorage.setItem("token", token);
      } else {
        sessionStorage.setItem("qsm_token", token);
        sessionStorage.setItem("token", token);
      }

      if (user) {
        localStorage.setItem("qsm_user", JSON.stringify(user));
        localStorage.setItem("user", JSON.stringify(user));
      }

      navigate("/dashboard");
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "No se pudo iniciar sesión. Verifica tus credenciales.";

      setMessage(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page(isDark)}>
      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          margin: 0;
          padding: 0;
          min-height: 100%;
          width: 100%;
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
          overflow-x: hidden;
        }

        body {
          background: ${isDark ? "#020617" : "#f8fafc"};
        }

        button, input, a {
          font-family: inherit;
        }

        a, button {
          transition: all .25s ease;
        }

        a:hover, button:hover {
          transform: translateY(-2px);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes glow {
          0%,100% { opacity: .55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }

        .login-card {
          animation: fadeUp .65s ease;
        }

        .hero-glow {
          animation: glow 5s ease-in-out infinite;
        }

        @media (max-width: 1050px) {
          .login-grid {
            grid-template-columns: 1fr !important;
          }

          .visual-panel {
            min-height: 520px !important;
          }
        }

        @media (max-width: 720px) {
          .page-shell {
            padding: 18px !important;
          }

          .topbar {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .nav-links {
            flex-wrap: wrap !important;
          }

          .title {
            font-size: 42px !important;
            line-height: 48px !important;
          }

          .login-card {
            padding: 26px !important;
          }
        }
      `}</style>

      <div className="page-shell" style={shell}>
        <header className="topbar" style={topbar(isDark)}>
          <Link to="/" style={brand}>
            <div style={brandIcon(isDark)}>🛡</div>
            <div>
              <strong style={brandTitle(isDark)}>QSM</strong>
              <span style={brandSub(isDark)}>Quick Secure Market</span>
            </div>
          </Link>

          <nav className="nav-links" style={nav}>
            <Link to="/" style={navLink(isDark)}>Inicio</Link>
            <Link to="/#nosotros" style={navLink(isDark)}>Nosotros</Link>
            <Link to="/#seguridad" style={navLink(isDark)}>Seguridad</Link>
            <Link to="/#pago-protegido" style={navLink(isDark)}>Pago Protegido</Link>
            <Link to="/#demo" style={navLink(isDark)}>Demo</Link>
            <Link to="/#contacto" style={navLink(isDark)}>Contacto</Link>
          </nav>

          <div style={topActions}>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              style={themeButton(isDark)}
            >
              {isDark ? "☀️ Light" : "🌙 Dark"}
            </button>

            <Link to="/register" style={registerTop}>
              Crear cuenta
            </Link>
          </div>
        </header>

        <main className="login-grid" style={grid}>
          <section className="visual-panel" style={visualPanel(isDark)}>
            <div style={visualOverlay(isDark)} />

            <div style={visualContent}>
              <p style={eyebrow}>PLATAFORMA SEGURA Y CONFIABLE</p>

              <h1 className="title" style={title(isDark)}>
                Compra y vende con total <span style={gradientText}>confianza.</span>
              </h1>

              <p style={subtitle(isDark)}>
                QSM protege tus transacciones con verificación de identidad,
                Pago Protegido y tecnología antifraude avanzada.
              </p>

              <div style={ctaRow}>
                <Link to="/register" style={primaryButton}>
                  Crear cuenta segura →
                </Link>

                <Link to="/#demo" style={secondaryButton(isDark)}>
                  Ver demostración ▷
                </Link>
              </div>

              <div style={statsRow}>
                <Stat dark={isDark} icon="👥" value="12K+" label="Usuarios protegidos" />
                <Stat dark={isDark} icon="📦" value="8K+" label="Productos publicados" />
                <Stat dark={isDark} icon="🛡" value="98%" label="Confianza estimada" />
                <Stat dark={isDark} icon="⚖️" value="1,280+" label="Reclamos resueltos" />
              </div>

              <div style={trustBar(isDark)}>
                <span>🛡 Identidad validada</span>
                <span>💰 Pago retenido</span>
                <span>🤖 IA antifraude</span>
                <span>📦 Código QSM</span>
              </div>
            </div>
          </section>

          <section className="login-card" style={card(isDark)}>
            <div className="hero-glow" style={lockIcon(isDark)}>🔐</div>

            <h2 style={cardTitle(isDark)}>Bienvenido de nuevo</h2>
            <p style={cardText(isDark)}>
              Inicia sesión para continuar de forma segura.
            </p>

            <form onSubmit={handleLogin} style={formStyle}>
              <label style={label(isDark)}>Correo electrónico</label>
              <div style={inputWrap(isDark)}>
                <span>✉️</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="ejemplo@correo.com"
                  style={input(isDark)}
                  autoComplete="email"
                />
              </div>

              <label style={label(isDark)}>Contraseña</label>
              <div style={inputWrap(isDark)}>
                <span>🔒</span>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Ingresa tu contraseña"
                  style={input(isDark)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={eyeButton(isDark)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <div style={formOptions}>
                <label style={checkLabel(isDark)}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Recordarme
                </label>

                <button type="button" style={forgotButton}>
                  <Link to="/forgot-password">
                   ¿Olvidaste tu contraseña?
                    </Link>
                </button>
              </div>

              {message && <div style={alertBox}>{message}</div>}

              <button type="submit" disabled={loading} style={loginSubmit(loading)}>
                {loading ? "Iniciando sesión..." : "Iniciar sesión →"}
              </button>
            </form>

            <div style={divider(isDark)}>
              <span></span>
              <p>o continúa con</p>
              <span></span>
            </div>

            <div style={socialGrid}>
              <button type="button" style={socialButton(isDark)}>G</button>
              <button type="button" style={socialButton(isDark)}></button>
              <button type="button" style={socialButton(isDark)}>▦</button>
            </div>

            <p style={bottomText(isDark)}>
              ¿No tienes cuenta? <Link to="/register" style={bottomLink}>Crear usuario</Link>
            </p>
          </section>
        </main>

        <footer style={footer(isDark)}>
          <div>
            <strong>🛡 QSM</strong>
            <span>Quick Secure Market - Marketplace seguro de República Dominicana.</span>
          </div>

          <div style={safeBadge(isDark)}>
            <span>🛡</span>
            <div>
              <strong>Transacciones 100% seguras</strong>
              <p>Protegemos cada paso del proceso.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Stat({ icon, value, label, dark }) {
  return (
    <div style={statCard(dark)}>
      <span>{icon}</span>
      <strong>{value}</strong>
      <p>{label}</p>
    </div>
  );
}

const page = (dark) => ({
  minHeight: "100vh",
  background: dark
    ? "radial-gradient(circle at top right, #111827 0%, #020617 45%, #000 100%)"
    : "linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #eef2ff 100%)",
  color: dark ? "white" : "#0f172a"
});

const shell = {
  minHeight: "100vh",
  padding: "26px 34px",
  display: "flex",
  flexDirection: "column",
  gap: "26px"
};

const topbar = (dark) => ({
  height: "74px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "24px",
  padding: "0 10px"
});

const brand = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  textDecoration: "none"
};

const brandIcon = (dark) => ({
  width: "54px",
  height: "54px",
  borderRadius: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: dark ? "rgba(56,189,248,.12)" : "rgba(124,58,237,.10)",
  border: dark ? "1px solid rgba(56,189,248,.25)" : "1px solid rgba(124,58,237,.18)"
});

const brandTitle = (dark) => ({
  display: "block",
  color: dark ? "white" : "#0f172a",
  fontSize: "30px",
  fontWeight: "950",
  lineHeight: "30px"
});

const brandSub = (dark) => ({
  color: dark ? "#cbd5e1" : "#64748b",
  fontSize: "12px",
  fontWeight: "700"
});

const nav = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "24px"
};

const navLink = (dark) => ({
  color: dark ? "#e5e7eb" : "#334155",
  textDecoration: "none",
  fontWeight: "800"
});

const topActions = {
  display: "flex",
  alignItems: "center",
  gap: "12px"
};

const themeButton = (dark) => ({
  border: dark ? "1px solid rgba(148,163,184,.18)" : "1px solid rgba(15,23,42,.12)",
  background: dark ? "rgba(15,23,42,.72)" : "white",
  color: dark ? "white" : "#0f172a",
  borderRadius: "999px",
  padding: "14px 18px",
  cursor: "pointer",
  fontWeight: "900"
});

const registerTop = {
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  padding: "15px 22px",
  borderRadius: "16px",
  textDecoration: "none",
  fontWeight: "900",
  boxShadow: "0 18px 50px rgba(139,92,246,.35)"
};

const grid = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "1.35fr .9fr",
  gap: "34px",
  alignItems: "stretch"
};

const visualPanel = (dark) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: "34px",
  minHeight: "720px",
  backgroundImage:
    "linear-gradient(90deg, rgba(2,6,23,.95), rgba(2,6,23,.68), rgba(2,6,23,.18)), url(https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=2200&q=90)",
  backgroundSize: "cover",
  backgroundPosition: "center",
  border: dark ? "1px solid rgba(148,163,184,.12)" : "1px solid rgba(15,23,42,.08)",
  boxShadow: "0 40px 120px rgba(0,0,0,.35)"
});

const visualOverlay = () => ({
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 70% 38%, rgba(139,92,246,.36), transparent 32%), radial-gradient(circle at 25% 80%, rgba(56,189,248,.18), transparent 28%)"
});

const visualContent = {
  position: "relative",
  zIndex: 2,
  height: "100%",
  padding: "58px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center"
};

const eyebrow = {
  color: "#35d0c3",
  letterSpacing: "3px",
  fontWeight: "900",
  fontSize: "15px"
};

const title = () => ({
  fontSize: "clamp(54px, 5.4vw, 92px)",
  lineHeight: "1",
  letterSpacing: "-4px",
  margin: "22px 0",
  maxWidth: "650px"
});

const gradientText = {
  display: "block",
  background: "linear-gradient(90deg, #38bdf8, #8b5cf6, #ec4899)",
  WebkitBackgroundClip: "text",
  color: "transparent"
};

const subtitle = () => ({
  color: "#dbeafe",
  fontSize: "19px",
  lineHeight: "32px",
  maxWidth: "610px"
});

const ctaRow = {
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
  marginTop: "32px"
};

const primaryButton = {
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  textDecoration: "none",
  border: "none",
  borderRadius: "16px",
  padding: "17px 28px",
  fontWeight: "900",
  cursor: "pointer"
};

const secondaryButton = () => ({
  color: "white",
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,.22)",
  background: "rgba(15,23,42,.58)",
  borderRadius: "16px",
  padding: "17px 28px",
  fontWeight: "900",
  backdropFilter: "blur(14px)"
});

const statsRow = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(120px, 1fr))",
  gap: "16px",
  maxWidth: "820px",
  marginTop: "38px"
};

const statCard = () => ({
  background: "rgba(15,23,42,.62)",
  border: "1px solid rgba(148,163,184,.16)",
  borderRadius: "22px",
  padding: "20px",
  color: "white",
  backdropFilter: "blur(16px)"
});

const trustBar = () => ({
  marginTop: "30px",
  display: "flex",
  flexWrap: "wrap",
  gap: "16px",
  width: "fit-content",
  padding: "14px 18px",
  borderRadius: "18px",
  background: "rgba(15,23,42,.68)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "#e5e7eb",
  backdropFilter: "blur(14px)"
});

const card = (dark) => ({
  alignSelf: "center",
  background: dark ? "rgba(15,23,42,.68)" : "rgba(255,255,255,.88)",
  border: dark ? "1px solid rgba(56,189,248,.22)" : "1px solid rgba(15,23,42,.08)",
  borderRadius: "34px",
  padding: "48px",
  color: dark ? "white" : "#0f172a",
  boxShadow: dark ? "0 38px 120px rgba(0,0,0,.32)" : "0 38px 120px rgba(15,23,42,.10)",
  backdropFilter: "blur(26px)"
});

const lockIcon = (dark) => ({
  width: "70px",
  height: "70px",
  borderRadius: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 26px",
  background: dark ? "rgba(139,92,246,.16)" : "rgba(124,58,237,.10)",
  border: dark ? "1px solid rgba(139,92,246,.28)" : "1px solid rgba(124,58,237,.18)",
  fontSize: "28px"
});

const cardTitle = (dark) => ({
  color: dark ? "white" : "#0f172a",
  fontSize: "30px",
  textAlign: "center",
  marginBottom: "8px"
});

const cardText = (dark) => ({
  color: dark ? "#cbd5e1" : "#64748b",
  textAlign: "center",
  marginBottom: "34px"
});

const formStyle = {
  display: "grid",
  gap: "14px"
};

const label = (dark) => ({
  color: dark ? "#cbd5e1" : "#334155",
  fontWeight: "800",
  marginTop: "4px"
});

const inputWrap = (dark) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: dark ? "rgba(2,6,23,.60)" : "#f8fafc",
  border: dark ? "1px solid rgba(148,163,184,.16)" : "1px solid rgba(15,23,42,.10)",
  borderRadius: "16px",
  padding: "0 16px"
});

const input = (dark) => ({
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  color: dark ? "white" : "#0f172a",
  padding: "18px 0",
  fontSize: "15px"
});

const eyeButton = (dark) => ({
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: dark ? "white" : "#0f172a"
});

const formOptions = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  margin: "4px 0 10px"
};

const checkLabel = (dark) => ({
  color: dark ? "#cbd5e1" : "#475569",
  display: "flex",
  alignItems: "center",
  gap: "8px"
});

const forgotButton = {
  border: "none",
  background: "transparent",
  color: "#35d0c3",
  cursor: "pointer",
  fontWeight: "800"
};

const alertBox = {
  background: "rgba(239,68,68,.14)",
  border: "1px solid rgba(239,68,68,.35)",
  color: "#fecaca",
  padding: "12px 14px",
  borderRadius: "14px",
  fontWeight: "800"
};

const loginSubmit = (loading) => ({
  marginTop: "8px",
  width: "100%",
  border: "none",
  borderRadius: "16px",
  padding: "18px",
  cursor: loading ? "not-allowed" : "pointer",
  background: loading
    ? "linear-gradient(135deg, #64748b, #475569)"
    : "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  fontWeight: "950",
  fontSize: "16px",
  opacity: loading ? 0.75 : 1
});

const divider = (dark) => ({
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: "14px",
  alignItems: "center",
  margin: "28px 0 18px",
  color: dark ? "#94a3b8" : "#64748b"
});

const socialGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "12px"
};

const socialButton = (dark) => ({
  height: "58px",
  borderRadius: "16px",
  border: dark ? "1px solid rgba(148,163,184,.16)" : "1px solid rgba(15,23,42,.10)",
  background: dark ? "rgba(2,6,23,.50)" : "#f8fafc",
  color: dark ? "white" : "#0f172a",
  cursor: "pointer",
  fontWeight: "950",
  fontSize: "20px"
});

const bottomText = (dark) => ({
  textAlign: "center",
  marginTop: "26px",
  color: dark ? "#cbd5e1" : "#64748b"
});

const bottomLink = {
  color: "#a855f7",
  fontWeight: "900",
  textDecoration: "none"
};

const footer = (dark) => ({
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "center",
  color: dark ? "#94a3b8" : "#64748b",
  padding: "0 10px 8px"
});

const safeBadge = (dark) => ({
  display: "flex",
  alignItems: "center",
  gap: "14px",
  background: dark ? "rgba(15,23,42,.72)" : "white",
  border: dark ? "1px solid rgba(148,163,184,.16)" : "1px solid rgba(15,23,42,.10)",
  borderRadius: "22px",
  padding: "18px 24px",
  color: dark ? "white" : "#0f172a"
});

export default Login;