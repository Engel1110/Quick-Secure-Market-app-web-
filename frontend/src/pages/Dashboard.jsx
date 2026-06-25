import { Link, useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  

  const currentUser = user || {
    firstName: "Usuario",
    lastName: "QSM",
    email: "usuario@qsm.com",
    trustScore: 60,
    verificationStatus: "NOT_STARTED"
  };

  const trustScore = currentUser.trustScore || 60;
  const kycStatus = currentUser.verificationStatus || currentUser.kycStatus || "NOT_STARTED";
  const isVerified = currentUser.isVerified || kycStatus === "VERIFIED";

  const handleLogout = () => {
    localStorage.removeItem("qsm_user");
    localStorage.removeItem("qsm_token");
    logout();
    navigate("/login");
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
          font-family: 'Inter', system-ui, sans-serif;
        }
      `}</style>

      <aside style={sidebar}>
        <Link to="/" style={brand}>
          <div style={brandIcon}>🛡</div>
          <div>
            <strong style={brandTitle}>QSM</strong>
            <span style={brandSub}>Quick Secure Market</span>
          </div>
        </Link>

        <nav style={menu}>
          <Link style={activeMenuItem} to="/dashboard">🏠 Inicio</Link>
          <Link style={menuItem} to="/profile">👤 Mi perfil</Link>
          <Link style={menuItem} to="/marketplace">🛒 Marketplace</Link>
          <Link style={menuItem} to="/new-product">➕ Publicar producto</Link>
          <Link style={menuItem} to="/orders">📦 Mis órdenes</Link>
          <Link style={menuItem} to="/disputes">⚖ Mis disputas</Link>
          <Link style={menuItem} to="/marketing">📈 Marketing Center</Link>
          <Link style={menuItem} to="/complete-profile">🧾 Verificar identidad</Link>
          <button onClick={handleLogout} style={logoutButton}>🚪 Cerrar sesión</button>
        </nav>

        <div style={sideCard}>
          <p style={label}>ESTADO DE CUENTA</p>
          <h3>{formatKyc(kycStatus)}</h3>
          <p>
            {isVerified
              ? "Tu cuenta está lista para operar con mayor confianza."
              : "Completa tu identidad para desbloquear más beneficios."}
          </p>
        </div>
      </aside>

      <main style={main}>
        <Topbar />

        <section style={hero}>
          <p style={label}>CENTRO DE PROGRESO QSM</p>
          <h1 style={title}>
            Bienvenido, {currentUser.firstName} {currentUser.lastName} 👋
          </h1>
          <p style={subtitle}>
            Construye tu reputación digital, aumenta tu nivel de confianza y desbloquea
            nuevas capacidades dentro de Quick Secure Market.
          </p>
        </section>

        <Link to="/profile" style={profileCard}>
          <div style={avatar}>
            {currentUser.profilePhoto ? (
              <img src={currentUser.profilePhoto} alt="Perfil" style={avatarImg} />
            ) : (
              currentUser.firstName?.charAt(0) || "U"
            )}
          </div>

          <div>
            <strong>{currentUser.firstName} {currentUser.lastName}</strong>
            <p>{currentUser.email || "usuario@qsm.com"}</p>
            <span style={statusBadge(kycStatus)}>{formatKyc(kycStatus)}</span>
          </div>
        </Link>

        <section style={statsGrid}>
          <StatCard icon="🛒" title="Órdenes totales" value="12" text="+2 este mes" />
          <StatCard icon="📦" title="Enviadas" value="8" text="66.7% del total" />
          <StatCard icon="⚖️" title="Reclamos abiertos" value="1" text="En revisión" />
          <StatCard icon="💰" title="Dinero protegido" value="RD$ 45,000" text="Retenido por Pago Protegido" />
        </section>

        <section style={levelGrid}>
          <div style={levelCard}>
            <p style={label}>NIVEL ACTUAL</p>
            <h2>{getLevelName(kycStatus)}</h2>
            <p style={subtitle}>
              Tu cuenta está en la etapa inicial. Completa la verificación para activar más funciones.
            </p>

            <div style={scoreBox}>
              <span>Nivel de confianza</span>
              <strong>{trustScore}/100</strong>
            </div>

            <div style={progressTrack}>
              <div style={{ ...progressFill, width: `${trustScore}%` }} />
            </div>
          </div>

          <div style={aiCard}>
            <p style={label}>QSM AI RECOMIENDA</p>
            <h2>Completa tu verificación</h2>
            <p>
              Al validar tu identidad podrás publicar productos, aumentar tu nivel de confianza
              y generar mayor seguridad frente a compradores.
            </p>

            <Link to="/complete-profile" style={primaryButton}>
              Completar identidad →
            </Link>
          </div>
        </section>

        <section style={roadmapCard}>
          <p style={label}>TU CAMINO EN QSM</p>
          <h2>Así puedes crecer dentro de la plataforma</h2>

          <div style={roadmap}>
            <RoadStep done title="Cuenta creada" text="Ya tienes acceso inicial." />
            <RoadStep active title="Verificación pendiente" text="Sube documento y selfie." />
            <RoadStep locked title="Comprador protegido" text="Compra usando Pago Protegido." />
            <RoadStep locked title="Vendedor habilitado" text="Publica productos." />
            <RoadStep locked title="Vendedor confiable QSM" text="Accede a más beneficios." />
          </div>
        </section>

        <section style={contentGrid}>
          <div style={panel}>
            <p style={label}>CAPACIDADES DISPONIBLES</p>
            <h2>Qué puedes hacer ahora</h2>

            <div style={capabilitiesGrid}>
              <Capability icon="🛒" title="Explorar productos" text="Busca productos dentro del marketplace." />
              <Capability icon="💰" title="Comprar protegido" text="Usa Pago Protegido para mayor seguridad." />
              <Capability icon="⚖️" title="Abrir reclamos" text="Reporta problemas con evidencia." />
              <Capability icon="🤖" title="Usar QSM AI" text="Recibe orientación dentro de la plataforma." />
            </div>
          </div>

          <div style={panel}>
            <p style={label}>OBJETIVOS PARA DESBLOQUEAR</p>
            <h2>Próximos pasos</h2>

            <Checklist done={!!currentUser.firstName} text="Nombre real registrado" />
            <Checklist done={!!currentUser.phone} text="Teléfono agregado" />
            <Checklist done={kycStatus === "PENDING_REVIEW" || isVerified} text="Documentos enviados" />
            <Checklist done={isVerified} text="Identidad aprobada por QSM" />
            <Checklist done={isVerified} text="Modo vendedor habilitado" />
          </div>
        </section>
      </main>

      <AiAssistant pageContext="dashboard" />
    </div>
  );
}

function StatCard({ icon, title, value, text }) {
  return (
    <div style={statCard}>
      <div style={statIcon}>{icon}</div>
      <div>
        <p>{title}</p>
        <h2>{value}</h2>
        <span>{text}</span>
      </div>
    </div>
  );
}

function RoadStep({ title, text, done, active, locked }) {
  return (
    <div style={locked ? roadLocked : active ? roadActive : roadDone}>
      <div style={roadIcon}>{done ? "✅" : locked ? "🔒" : "🟡"}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Capability({ icon, title, text }) {
  return (
    <div style={capability}>
      <div style={capIcon}>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Checklist({ done, text }) {
  return (
    <div style={checkItem}>
      <span>{done ? "✅" : "⬜"}</span>
      <p>{text}</p>
    </div>
  );
}

function formatKyc(status) {
  const map = {
    NOT_STARTED: "Pendiente",
    PENDING: "Pendiente",
    PENDING_REVIEW: "En revisión",
    VERIFIED: "Verificado",
    REJECTED: "Rechazado"
  };

  return map[status] || "Pendiente";
}

function getLevelName(status) {
  if (status === "VERIFIED") return "Usuario Verificado QSM";
  if (status === "PENDING_REVIEW") return "Perfil en Revisión";
  return "Usuario Registrado";
}

const statusBadge = (status) => ({
  display: "inline-block",
  marginTop: "8px",
  padding: "7px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "13px",
  background:
    status === "VERIFIED"
      ? "rgba(34,197,94,0.18)"
      : status === "REJECTED"
      ? "rgba(239,68,68,0.18)"
      : "rgba(245,158,11,0.18)",
  color:
    status === "VERIFIED"
      ? "#86efac"
      : status === "REJECTED"
      ? "#fca5a5"
      : "#fde68a"
});

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(53,208,195,0.12), transparent 35%), #020617",
  color: "white",
  display: "grid",
  gridTemplateColumns: "260px minmax(0, 1fr)",
  overflowX: "hidden"
};

const sidebar = {
  minHeight: "100vh",
  background: "rgba(8,17,35,0.94)",
  borderRight: "1px solid rgba(53,208,195,0.18)",
  padding: "28px 16px",
  position: "sticky",
  top: 0
};

const brand = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "white",
  textDecoration: "none",
  marginBottom: "40px"
};

const brandIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  border: "1px solid rgba(53,208,195,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#35d0c3"
};

const brandTitle = {
  display: "block",
  fontSize: "28px",
  lineHeight: "28px"
};

const brandSub = {
  color: "#94a3b8",
  fontSize: "12px"
};

const menu = {
  display: "grid",
  gap: "11px"
};

const menuItem = {
  color: "#cbd5e1",
  textDecoration: "none",
  padding: "13px 14px",
  borderRadius: "15px",
  background: "rgba(15,23,42,0.38)",
  border: "1px solid rgba(148,163,184,0.10)",
  fontWeight: "700"
};

const activeMenuItem = {
  ...menuItem,
  background: "rgba(53,208,195,0.14)",
  border: "1px solid rgba(53,208,195,0.35)",
  color: "#35d0c3"
};

const logoutButton = {
  ...menuItem,
  textAlign: "left",
  cursor: "pointer",
  border: "1px solid rgba(248,113,113,0.24)",
  color: "#fca5a5"
};

const sideCard = {
  marginTop: "32px",
  background: "rgba(15,23,42,0.58)",
  border: "1px solid rgba(53,208,195,0.20)",
  borderRadius: "22px",
  padding: "20px",
  color: "#cbd5e1",
  textAlign: "center"
};

const main = {
  width: "100%",
  minWidth: 0,
  maxWidth: "1700px",
  margin: "0 auto",
  padding: "28px 34px 60px",
  overflowX: "hidden"
};

const hero = {
  marginTop: "18px",
  marginBottom: "24px",
  textAlign: "center"
};

const label = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase"
};

const title = {
  fontSize: "clamp(42px, 4vw, 66px)",
  lineHeight: "1.04",
  margin: "10px 0",
  letterSpacing: "-2px"
};

const subtitle = {
  color: "#cbd5e1",
  lineHeight: "28px",
  maxWidth: "850px",
  margin: "0 auto"
};

const profileCard = {
  width: "460px",
  maxWidth: "100%",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  background: "rgba(15,23,42,0.58)",
  border: "1px solid rgba(53,208,195,0.22)",
  borderRadius: "26px",
  padding: "22px",
  color: "white",
  textDecoration: "none",
  marginBottom: "26px"
};

const avatar = {
  width: "64px",
  height: "64px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  fontWeight: "900",
  overflow: "hidden"
};

const avatarImg = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "18px",
  marginBottom: "26px"
};

const statCard = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "24px",
  padding: "22px"
};

const statIcon = {
  width: "60px",
  height: "60px",
  borderRadius: "50%",
  background: "rgba(53,208,195,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px"
};

const levelGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: "24px",
  marginBottom: "28px"
};

const levelCard = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.20)",
  borderRadius: "28px",
  padding: "30px",
  textAlign: "center"
};

const aiCard = {
  ...levelCard,
  background:
    "linear-gradient(135deg, rgba(53,208,195,0.14), rgba(124,58,237,0.14))"
};

const scoreBox = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "26px",
  fontSize: "22px"
};

const progressTrack = {
  height: "14px",
  background: "rgba(148,163,184,0.18)",
  borderRadius: "999px",
  overflow: "hidden",
  marginTop: "16px"
};

const progressFill = {
  height: "100%",
  background: "linear-gradient(90deg, #35d0c3, #7c3aed)"
};

const primaryButton = {
  display: "inline-block",
  marginTop: "20px",
  background: "#35d0c3",
  color: "#020617",
  textDecoration: "none",
  padding: "14px 24px",
  borderRadius: "15px",
  fontWeight: "900"
};

const roadmapCard = {
  background: "rgba(15,23,42,0.58)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "28px",
  padding: "30px",
  marginBottom: "28px",
  textAlign: "center"
};

const roadmap = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "18px",
  marginTop: "24px"
};

const roadDone = {
  background: "rgba(34,197,94,0.10)",
  border: "1px solid rgba(34,197,94,0.25)",
  borderRadius: "22px",
  padding: "22px"
};

const roadActive = {
  background: "rgba(245,158,11,0.10)",
  border: "1px solid rgba(245,158,11,0.28)",
  borderRadius: "22px",
  padding: "22px"
};

const roadLocked = {
  background: "rgba(15,23,42,0.55)",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: "22px",
  padding: "22px",
  opacity: 0.72
};

const roadIcon = {
  fontSize: "28px"
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 0.7fr)",
  gap: "24px"
};

const panel = {
  background: "rgba(15,23,42,0.58)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "28px",
  padding: "30px"
};

const capabilitiesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "16px",
  marginTop: "22px"
};

const capability = {
  background: "rgba(2,6,23,0.48)",
  border: "1px solid rgba(53,208,195,0.14)",
  borderRadius: "20px",
  padding: "20px"
};

const capIcon = {
  fontSize: "30px"
};

const checkItem = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "13px 0",
  borderBottom: "1px solid rgba(148,163,184,0.12)"
};

export default Dashboard;