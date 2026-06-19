import { Link, useNavigate } from "react-router-dom";
import AiAssistant from "../components/AiAssistant";

function MarketingCenter() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("qsm_user")) || {
    firstName: "Usuario",
    lastName: "QSM",
    email: "usuario@qsm.com",
    trustScore: 60,
    kycStatus: "PENDING"
  };

  const logout = () => {
    localStorage.removeItem("qsm_user");
    localStorage.removeItem("qsm_token");
    navigate("/login");
  };

  return (
    <div style={page}>
      <style>
        {`
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
        `}
      </style>

      <aside style={sidebar}>
        <Link to="/" style={brand}>
          <div style={brandIcon}>🛡</div>
          <div>
            <strong style={brandTitle}>QSM</strong>
            <span style={brandSub}>Quick Secure Market</span>
          </div>
        </Link>

        <nav style={menu}>
          <Link style={menuItem} to="/dashboard">🏠 Inicio</Link>
          <Link style={menuItem} to="/profile">👤 Mi perfil</Link>
          <Link style={menuItem} to="/marketplace">🛒 Marketplace</Link>
          <Link style={menuItem} to="/new-product">➕ Publicar producto</Link>
          <Link style={menuItem} to="/orders">📦 Mis órdenes</Link>
          <Link style={activeMenuItem} to="/marketing">📈 Marketing Center</Link>
          <Link style={menuItem} to="/disputes">⚖ Mis disputas</Link>
          <Link style={menuItem} to="/complete-profile">🧾 Verificación QSM</Link>
          <button onClick={logout} style={logoutButton}>🚪 Cerrar sesión</button>
        </nav>
      </aside>

      <main style={main}>
        <section style={hero}>
          <div>
            <p style={label}>MARKETING CENTER QSM</p>
            <h1 style={title}>Impulsa tus productos con inteligencia QSM</h1>
            <p style={subtitle}>
              Este centro ayuda al vendedor a entender cómo mejorar sus publicaciones,
              aumentar confianza, optimizar precios y preparar sus productos para vender mejor.
            </p>

            <div style={notice}>
              <strong>Modo demostración académica:</strong> las métricas mostradas son
              proyecciones o ejemplos visuales. No representan datos reales de operación.
            </div>
          </div>

          <div style={aiHeroCard}>
            <span style={aiBadge}>🤖 QSM AI</span>
            <h2>Recomendación principal</h2>
            <p>
              Completa fotos reales, descripción clara, precio competitivo y verificación QSM
              para aumentar la visibilidad del producto.
            </p>
          </div>
        </section>

        <section style={statsGrid}>
          <MetricCard title="Visibilidad" value="Proyección" detail="Mayor alcance con publicaciones verificadas" />
          <MetricCard title="Confianza" value={`${user.trustScore || 60}/100`} detail="Basado en Trust Score del usuario" />
          <MetricCard title="Optimización IA" value="Activa" detail="Recomendaciones para mejorar publicaciones" />
          <MetricCard title="Escrow" value="Protegido" detail="Compra segura como ventaja competitiva" />
        </section>

        <section style={contentGrid}>
          <div style={panel}>
            <p style={label}>RENDIMIENTO DE PUBLICACIONES</p>
            <h2>Resumen visual</h2>

            <div style={chartBox}>
              <ChartBar label="Fotos claras" value={85} />
              <ChartBar label="Descripción completa" value={70} />
              <ChartBar label="Precio competitivo" value={78} />
              <ChartBar label="Verificación QSM" value={60} />
              <ChartBar label="Confianza vendedor" value={user.trustScore || 60} />
            </div>

            <p style={smallNote}>
              Estos indicadores son una guía visual para explicar cómo QSM puede ayudar al vendedor.
            </p>
          </div>

          <div style={panel}>
            <p style={label}>PLAN DE MEJORA</p>
            <h2>Acciones recomendadas</h2>

            <ActionItem done text="Usar fotos reales del producto" />
            <ActionItem done={false} text="Agregar video corto del producto" />
            <ActionItem done text="Completar descripción técnica" />
            <ActionItem done={false} text="Validar identidad del vendedor" />
            <ActionItem done={false} text="Activar certificación QSM" />

            <Link to="/new-product" style={primaryButton}>
              Publicar producto optimizado →
            </Link>
          </div>
        </section>

        <section style={marketingGrid}>
          <InfoCard
            icon="📸"
            title="Mejora tus fotos"
            text="QSM recomienda imágenes claras, múltiples ángulos y fondo limpio para generar confianza."
          />

          <InfoCard
            icon="📝"
            title="Descripción vendedora"
            text="Incluye estado real, accesorios, garantía, ubicación, forma de entrega y detalles técnicos."
          />

          <InfoCard
            icon="💰"
            title="Precio inteligente"
            text="QSM AI puede comparar el precio con productos similares y sugerir si está alto o bajo."
          />

          <InfoCard
            icon="🛡️"
            title="Certificación QSM"
            text="Los productos verificados pueden obtener mayor confianza frente a compradores."
          />
        </section>

        <section style={panel}>
          <p style={label}>QSM AI MARKETING</p>
          <h2>Asistente de crecimiento para vendedores</h2>

          <div style={aiBox}>
            <p>
              Hola {user.firstName || "usuario"}. Para mejorar tus publicaciones,
              QSM recomienda enfocarte en tres cosas:
            </p>

            <ul>
              <li>Publicaciones con fotos reales y descripción verificable.</li>
              <li>Precios dentro del rango normal del mercado.</li>
              <li>Completar identidad QSM para aumentar confianza.</li>
            </ul>

            <p>
              En una versión real, esta IA analizaría vistas, clics, favoritos,
              precios y comportamiento del comprador.
            </p>
          </div>
        </section>
      </main>

      <AiAssistant pageContext="marketing" />
    </div>
  );
}

function MetricCard({ title, value, detail }) {
  return (
    <div style={metricCard}>
      <p>{title}</p>
      <h2>{value}</h2>
      <span>{detail}</span>
    </div>
  );
}

function ChartBar({ label, value }) {
  return (
    <div style={chartRow}>
      <div style={chartHeader}>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div style={track}>
        <div style={{ ...fill, width: `${value}%` }}></div>
      </div>
    </div>
  );
}

function ActionItem({ done, text }) {
  return (
    <div style={actionItem}>
      <span>{done ? "✅" : "⬜"}</span>
      <p>{text}</p>
    </div>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <div style={infoCard}>
      <div style={infoIcon}>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

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
  background: "rgba(8,17,35,0.92)",
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
  fontWeight: "700",
  fontSize: "15px"
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

const main = {
  width: "100%",
  maxWidth: "1600px",
  margin: "0 auto",
  padding: "36px",
  overflowX: "hidden"
};

const hero = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 390px",
  gap: "26px",
  alignItems: "stretch",
  marginBottom: "26px"
};

const label = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "900"
};

const title = {
  fontSize: "clamp(42px, 4vw, 70px)",
  lineHeight: "1.04",
  letterSpacing: "-2.5px",
  margin: "8px 0 16px"
};

const subtitle = {
  color: "#cbd5e1",
  lineHeight: "28px",
  maxWidth: "880px"
};

const notice = {
  marginTop: "22px",
  background: "rgba(245,158,11,0.12)",
  border: "1px solid rgba(245,158,11,0.28)",
  color: "#fde68a",
  borderRadius: "18px",
  padding: "16px",
  maxWidth: "850px"
};

const aiHeroCard = {
  background:
    "linear-gradient(135deg, rgba(53,208,195,0.14), rgba(124,58,237,0.16))",
  border: "1px solid rgba(53,208,195,0.25)",
  borderRadius: "28px",
  padding: "28px",
  backdropFilter: "blur(18px)"
};

const aiBadge = {
  display: "inline-block",
  background: "rgba(53,208,195,0.16)",
  border: "1px solid rgba(53,208,195,0.28)",
  color: "#35d0c3",
  padding: "9px 12px",
  borderRadius: "999px",
  fontWeight: "900"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "18px",
  marginBottom: "26px"
};

const metricCard = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "24px",
  padding: "22px"
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(340px, 0.8fr)",
  gap: "24px",
  marginBottom: "26px"
};

const panel = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "28px",
  padding: "28px",
  backdropFilter: "blur(18px)",
  marginBottom: "26px"
};

const chartBox = {
  display: "grid",
  gap: "18px",
  marginTop: "22px"
};

const chartRow = {
  display: "grid",
  gap: "8px"
};

const chartHeader = {
  display: "flex",
  justifyContent: "space-between",
  color: "#cbd5e1"
};

const track = {
  height: "12px",
  borderRadius: "999px",
  background: "rgba(148,163,184,0.18)",
  overflow: "hidden"
};

const fill = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #35d0c3, #7c3aed)"
};

const smallNote = {
  color: "#94a3b8",
  marginTop: "18px"
};

const actionItem = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "13px 0",
  borderBottom: "1px solid rgba(148,163,184,0.12)"
};

const primaryButton = {
  display: "block",
  textAlign: "center",
  marginTop: "20px",
  background: "#35d0c3",
  color: "#020617",
  padding: "14px",
  borderRadius: "15px",
  textDecoration: "none",
  fontWeight: "900"
};

const marketingGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "18px",
  marginBottom: "26px"
};

const infoCard = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "24px",
  padding: "22px"
};

const infoIcon = {
  fontSize: "34px"
};

const aiBox = {
  background: "rgba(2,6,23,0.48)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "22px",
  padding: "22px",
  color: "#cbd5e1",
  lineHeight: "28px"
};

export default MarketingCenter;