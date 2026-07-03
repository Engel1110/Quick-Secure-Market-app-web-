import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AiAssistant from "../components/AiAssistant";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const savedUser = safeJson(localStorage.getItem("qsm_user"));

  const currentUser =
    user ||
    savedUser || {
      firstName: "Usuario",
      lastName: "QSM",
      email: "usuario@qsm.com",
      phone: "",
      trustScore: 50,
      verificationStatus: "NOT_STARTED",
      kycStatus: "NOT_STARTED",
      isVerified: false
    };

  const [search, setSearch] = useState("");

  const trustScore = Number(currentUser.trustScore || 50);
  const verificationStatus =
    currentUser.verificationStatus || currentUser.kycStatus || "NOT_STARTED";

  const isVerified = currentUser.isVerified || verificationStatus === "VERIFIED";
  const firstName = currentUser.firstName || "Usuario";
  const lastName = currentUser.lastName || "QSM";
  const fullName = `${firstName} ${lastName}`.trim();

  const dashboardStats = useMemo(
    () => [
      { icon: "👥", title: "Usuarios demo activos", value: 1, change: "+0%", color: "#38bdf8" },
      { icon: "📦", title: "Productos publicados", value: 0, change: "+0%", color: "#22c55e" },
      { icon: "🛍️", title: "Órdenes demo", value: 0, change: "+0%", color: "#a855f7" },
      { icon: "🛡", title: "Transacciones protegidas", value: 0, change: "+0%", color: "#10b981" }
    ],
    []
  );

  const progressItems = [
    {
      title: "Información básica",
      status: currentUser.firstName && currentUser.email ? "Completado" : "Pendiente",
      done: Boolean(currentUser.firstName && currentUser.email)
    },
    { title: "Verificación de identidad", status: isVerified ? "Completado" : "Pendiente", done: isVerified },
    { title: "Agregar método de pago", status: "Pendiente", done: false },
    { title: "Publicar tu primer producto", status: "Pendiente", done: false }
  ];

  const handleSearch = (event) => {
    event.preventDefault();

    const value = search.trim();

    if (!value) {
      navigate("/marketplace");
      return;
    }

    navigate(`/marketplace?search=${encodeURIComponent(value)}`);
  };

  return (
    <div style={page}>
      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: #020617;
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
        }

        a, button, input { font-family: inherit; }
        a, button { transition: all .25s ease; }
        a:hover, button:hover { transform: translateY(-2px); }

        @media (max-width: 1180px) {
          .sidebar-wrapper { display: none !important; }
          .dashboard-page { grid-template-columns: 1fr !important; }
          .stats-grid, .hero-section, .middle-grid, .cta-panel, .topbar { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 760px) {
          .main-content { padding: 18px !important; }
          .hero-title { font-size: 42px !important; }
          .progress-layout, .security-content { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="dashboard-page" style={layout}>
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main className="main-content" style={main}>
          <header className="topbar" style={topbar}>
            <form onSubmit={handleSearch} style={searchBox}>
              <span style={searchIcon}>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar productos, usuarios o reclamos..."
                style={searchInput}
              />
              <button type="submit" style={searchKey}>Enter</button>
            </form>

            <div style={topActions}>
              <IconButton icon="🔔" badge="3" to="/notifications" />
              <IconButton icon="💬" badge="2" to="/messages" />
              <IconButton icon="✉️" badge="1" to="/messages" />

              <Link to="/profile" style={userMini}>
                <div style={miniAvatar}>{firstName.charAt(0).toUpperCase()}</div>
                <div>
                  <strong>{fullName}</strong>
                  <p>{formatVerificationStatus(verificationStatus)}</p>
                </div>
              </Link>
            </div>
          </header>

          <section className="hero-section" style={hero}>
            <div>
              <p style={welcomeTag}>Bienvenido de nuevo</p>
              <h1 className="hero-title" style={heroTitle}>Hola, {firstName}! 👋</h1>
              <p style={heroText}>
                Este es el resumen de tu actividad en Quick Secure Market.
                Desde aquí puedes completar tu perfil, publicar productos,
                revisar órdenes y explorar el Marketplace.
              </p>
            </div>

            <div style={trustCard}>
              <div style={trustIcon}>🛡</div>
              <div style={{ flex: 1 }}>
                <p style={smallLabel}>Nivel de confianza</p>
                <h2 style={trustValue}>{trustScore}/100</h2>
                <div style={miniProgress}>
                  <div style={{ ...miniProgressFill, width: `${trustScore}%` }} />
                </div>
              </div>
            </div>
          </section>

          <section className="stats-grid" style={statsGrid}>
            {dashboardStats.map((item) => <StatCard key={item.title} {...item} />)}
          </section>

          <section className="middle-grid" style={middleGrid}>
            <div style={panel}>
              <h2 style={panelTitle}>Tu progreso en QSM</h2>

              <div className="progress-layout" style={progressLayout}>
                <div style={circleProgress}>
                  <svg width="190" height="190" viewBox="0 0 190 190">
                    <circle cx="95" cy="95" r="76" stroke="rgba(148,163,184,.18)" strokeWidth="16" fill="none" />
                    <circle
                      cx="95"
                      cy="95"
                      r="76"
                      stroke="url(#progressGradient)"
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 76}`}
                      strokeDashoffset={`${2 * Math.PI * 76 * (1 - trustScore / 100)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 95 95)"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="55%" stopColor="#35d0c3" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <strong>{trustScore}%</strong>
                  <span>Perfil completado</span>
                </div>

                <div style={progressList}>
                  {progressItems.map((item) => (
                    <div key={item.title} style={progressItem}>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.status}</p>
                      </div>
                      <span style={item.done ? doneDot : pendingDot}>{item.done ? "✓" : "!"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link to="/complete-profile" style={primaryButton}>Completar perfil →</Link>
            </div>

            <div style={securityPanel}>
              <div>
                <h2 style={panelTitle}>Seguridad y protección</h2>
                <div className="security-content" style={securityContent}>
                  <div style={shieldVisual}>✅</div>

                  <div style={securityList}>
                    <h3>QSM te protege en cada paso</h3>
                    <p>✓ Verificación de identidad</p>
                    <p>✓ Pago Protegido</p>
                    <p>✓ Detección de fraudes</p>
                    <p>✓ Soporte y disputas</p>
                    <p>✓ Centro de reclamos</p>
                  </div>
                </div>
              </div>

              <Link to="/complete-profile" style={primaryButton}>Conoce más sobre seguridad →</Link>
            </div>

            <div style={activityPanel}>
              <h2 style={panelTitle}>Actividad reciente</h2>
              <div style={emptyActivity}>
                <div style={emptyIcon}>📭</div>
                <h3>Aún no tienes actividad</h3>
                <p>Cuando realices compras, ventas o publicaciones, aparecerán aquí.</p>
                <Link to="/marketplace" style={primaryButton}>Ir al Marketplace →</Link>
              </div>
            </div>
          </section>

          <section className="cta-panel" style={ctaPanel}>
            <div style={ctaIcon}>⭐</div>

            <div>
              <h2>¡Comienza tu camino en QSM!</h2>
              <p>Publica tu primer producto o explora el Marketplace para encontrar lo que necesitas.</p>
            </div>

            <div style={ctaActions}>
              <Link to="/new-product" style={ghostButton}>➕ Publicar producto</Link>
              <Link to="/marketplace" style={primaryButton}>Explorar Marketplace →</Link>
            </div>
          </section>

          <footer style={footer}>
            <span>© 2026 Quick Secure Market (QSM). Todos los derechos reservados.</span>
            <div style={footerLinks}>
              <Link to="/settings">Configuración</Link>
              <Link to="/privacy">Privacidad</Link>
              <Link to="/help">Ayuda</Link>
            </div>
          </footer>
        </main>
      </div>

      <AiAssistant pageContext="dashboard" />
    </div>
  );
}

function IconButton({ icon, badge, to }) {
  return (
    <Link to={to} style={iconButton}>
      <span>{icon}</span>
      {badge && <small style={badgeStyle}>{badge}</small>}
    </Link>
  );
}

function StatCard({ icon, title, value, change, color }) {
  return (
    <div style={statCard}>
      <div style={{ ...statIcon, background: `${color}22`, color }}>{icon}</div>

      <div style={{ flex: 1 }}>
        <p style={statTitle}>{title}</p>
        <h2 style={statValue}>{value}</h2>
        <span style={statChange}>{change} vs última semana</span>
      </div>

      <svg width="72" height="38" viewBox="0 0 72 38" style={{ overflow: "visible" }}>
        <polyline
          points="2,32 12,26 21,30 30,16 39,22 48,9 57,14 70,4"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function formatVerificationStatus(status) {
  const map = {
    NOT_STARTED: "Pendiente",
    PENDING: "Pendiente",
    PENDING_REVIEW: "En revisión",
    VERIFIED: "Verificado",
    REJECTED: "Rechazado"
  };

  return map[status] || "Pendiente";
}

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(139,92,246,.18), transparent 34%), radial-gradient(circle at 15% 20%, rgba(56,189,248,.10), transparent 28%), #020617",
  color: "white"
};

const layout = {
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr)"
};

const main = {
  minWidth: 0,
  padding: "26px 34px 28px",
  overflowX: "hidden"
};

const topbar = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 640px) auto",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "22px",
  marginBottom: "30px"
};

const searchBox = {
  height: "58px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(148,163,184,.18)",
  borderRadius: "17px",
  padding: "0 15px",
  boxShadow: "0 18px 60px rgba(0,0,0,.18)"
};

const searchIcon = { color: "#94a3b8", fontSize: "22px" };

const searchInput = {
  flex: 1,
  height: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "white",
  fontSize: "15px"
};

const searchKey = {
  border: "1px solid rgba(148,163,184,.18)",
  background: "rgba(2,6,23,.55)",
  color: "#cbd5e1",
  padding: "8px 12px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "800"
};

const topActions = {
  display: "flex",
  alignItems: "center",
  gap: "13px",
  justifyContent: "flex-end"
};

const iconButton = {
  width: "56px",
  height: "56px",
  borderRadius: "16px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(148,163,184,.16)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  textDecoration: "none",
  position: "relative",
  fontSize: "20px"
};

const badgeStyle = {
  position: "absolute",
  top: "-7px",
  right: "-5px",
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  background: "#ef4444",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "950"
};

const userMini = {
  minWidth: "190px",
  minHeight: "58px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(148,163,184,.16)",
  borderRadius: "17px",
  padding: "8px 14px",
  color: "white",
  textDecoration: "none"
};

const miniAvatar = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  fontWeight: "950"
};

const hero = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 330px",
  gap: "24px",
  alignItems: "end",
  marginBottom: "24px"
};

const welcomeTag = { margin: 0, color: "#c084fc", fontWeight: "950", letterSpacing: ".5px" };

const heroTitle = {
  margin: "12px 0",
  fontSize: "clamp(48px, 4vw, 72px)",
  lineHeight: "1.02",
  letterSpacing: "-2.6px"
};

const heroText = { color: "#cbd5e1", fontSize: "18px", lineHeight: "30px", maxWidth: "760px" };

const trustCard = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(148,163,184,.16)",
  borderRadius: "24px",
  padding: "22px",
  display: "flex",
  gap: "16px",
  alignItems: "center"
};

const trustIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "18px",
  background: "rgba(16,185,129,.18)",
  color: "#34d399",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px"
};

const smallLabel = { margin: 0, color: "#cbd5e1" };
const trustValue = { margin: "5px 0 10px", fontSize: "32px" };

const miniProgress = {
  height: "10px",
  borderRadius: "999px",
  background: "rgba(148,163,184,.18)",
  overflow: "hidden"
};

const miniProgressFill = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #38bdf8, #8b5cf6, #ec4899)"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "18px",
  marginBottom: "24px"
};

const statCard = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(148,163,184,.14)",
  borderRadius: "24px",
  padding: "24px",
  minHeight: "125px"
};

const statIcon = {
  width: "62px",
  height: "62px",
  borderRadius: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
  flexShrink: 0
};

const statTitle = { margin: 0, color: "#cbd5e1", fontWeight: "800" };
const statValue = { margin: "6px 0 2px", fontSize: "32px" };
const statChange = { color: "#22c55e", fontSize: "13px", fontWeight: "800" };

const middleGrid = {
  display: "grid",
  gridTemplateColumns: "1.25fr 1.45fr .95fr",
  gap: "20px",
  marginBottom: "24px"
};

const panel = {
  minHeight: "330px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(148,163,184,.14)",
  borderRadius: "26px",
  padding: "24px",
  boxShadow: "0 24px 90px rgba(0,0,0,.14)"
};

const securityPanel = { ...panel, display: "flex", flexDirection: "column", justifyContent: "space-between" };
const activityPanel = { ...panel };
const panelTitle = { margin: "0 0 18px", fontSize: "22px" };

const progressLayout = {
  display: "grid",
  gridTemplateColumns: "210px 1fr",
  gap: "24px",
  alignItems: "center"
};

const circleProgress = {
  width: "210px",
  height: "238px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  position: "relative"
};

const progressList = { display: "grid", gap: "12px" };

const progressItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  background: "rgba(30,41,59,.62)",
  borderRadius: "14px",
  padding: "13px 14px"
};

const doneDot = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  background: "#22c55e",
  color: "#052e16",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950"
};

const pendingDot = { ...doneDot, background: "#f59e0b", color: "#451a03" };

const securityContent = {
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  gap: "20px",
  alignItems: "center"
};

const shieldVisual = {
  height: "210px",
  borderRadius: "32px",
  background:
    "radial-gradient(circle, rgba(56,189,248,.32), transparent 62%), linear-gradient(135deg, rgba(56,189,248,.20), rgba(139,92,246,.20))",
  border: "1px solid rgba(56,189,248,.16)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "82px",
  boxShadow: "0 0 70px rgba(56,189,248,.16)"
};

const securityList = { color: "#cbd5e1", lineHeight: "30px" };

const emptyActivity = {
  height: "calc(100% - 40px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  color: "#cbd5e1"
};

const emptyIcon = { fontSize: "70px", marginBottom: "20px" };

const primaryButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "15px 24px",
  borderRadius: "14px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 18px 54px rgba(139,92,246,.25)"
};

const ghostButton = {
  ...primaryButton,
  background: "rgba(15,23,42,.64)",
  border: "1px solid rgba(148,163,184,.18)",
  boxShadow: "none"
};

const ctaPanel = {
  minHeight: "140px",
  background:
    "linear-gradient(135deg, rgba(139,92,246,.20), rgba(15,23,42,.82), rgba(56,189,248,.12))",
  border: "1px solid rgba(139,92,246,.18)",
  borderRadius: "26px",
  padding: "24px",
  display: "grid",
  gridTemplateColumns: "74px 1fr auto",
  gap: "22px",
  alignItems: "center",
  marginBottom: "20px"
};

const ctaIcon = {
  width: "74px",
  height: "74px",
  borderRadius: "22px",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "36px"
};

const ctaActions = { display: "flex", gap: "14px", flexWrap: "wrap" };

const footer = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  color: "#94a3b8",
  padding: "4px 0"
};

const footerLinks = { display: "flex", gap: "18px" };

export default Dashboard;
