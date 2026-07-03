import { Link, NavLink, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("qsm_user")) || {
    firstName: "Usuario",
    lastName: "QSM",
    role: "USER",
    trustScore: 60
  };

  const handleLogout = () => {
    localStorage.removeItem("qsm_token");
    localStorage.removeItem("qsm_user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside style={sidebar}>
      <Link to="/dashboard" style={brand}>
        <div style={brandIcon}>🛡</div>
        <div>
          <strong style={brandTitle}>QSM</strong>
          <span style={brandSub}>Quick Secure Market</span>
        </div>
      </Link>

      <nav style={menu}>
        <SidebarLink to="/dashboard" icon="🏠" label="Inicio" />
        <SidebarLink to="/marketplace" icon="🛒" label="Marketplace" />
        <SidebarLink to="/new-product" icon="➕" label="Publicar producto" />

        <div style={divider} />

        <SidebarLink to="/orders" icon="📦" label="Mis compras" />
        <SidebarLink to="/sales" icon="💰" label="Mis ventas" />
        <SidebarLink to="/favorites" icon="❤️" label="Favoritos" />
        <SidebarLink to="/messages" icon="💬" label="Mensajes" />

        <div style={divider} />

       
        <SidebarLink to="/complete-profile" icon="🧾" label="Verificación QSM" />
        <SidebarLink to="/disputes" icon="⚖️" label="Centro de reclamos" />
        <SidebarLink to="/settings" icon="⚙️" label="Configuración" />
      </nav>

      <div style={userCard}>
        <div style={avatar}>
          {user.firstName?.charAt(0)?.toUpperCase() || "U"}
        </div>

        <div style={{ minWidth: 0 }}>
          <strong style={userName}>
            {user.firstName} {user.lastName}
          </strong>
          <p style={userMeta}>
            Confianza {user.trustScore || 60}/100
          </p>
        </div>
      </div>

      <button onClick={handleLogout} style={logoutButton}>
        🚪 Cerrar sesión
      </button>
    </aside>
  );
}

function SidebarLink({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...menuItem,
        ...(isActive ? activeMenuItem : {})
      })}
    >
      <span style={menuIcon}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

const sidebar = {
  minHeight: "100vh",
  width: "280px",
  background:
    "linear-gradient(180deg, rgba(8,17,35,.96), rgba(2,6,23,.98))",
  borderRight: "1px solid rgba(56,189,248,.16)",
  padding: "26px 16px",
  position: "sticky",
  top: 0,
  color: "white",
  display: "flex",
  flexDirection: "column",
  gap: "22px"
};

const brand = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "white",
  textDecoration: "none",
  padding: "8px 8px 18px"
};

const brandIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 0 28px rgba(56,189,248,.28)"
};

const brandTitle = {
  display: "block",
  fontSize: "28px",
  lineHeight: "28px",
  fontWeight: "950"
};

const brandSub = {
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: "700"
};

const menu = {
  display: "grid",
  gap: "8px",
  flex: 1
};

const menuItem = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "#cbd5e1",
  textDecoration: "none",
  padding: "13px 14px",
  borderRadius: "16px",
  background: "transparent",
  border: "1px solid transparent",
  fontWeight: "850",
  transition: "all .25s ease"
};

const activeMenuItem = {
  color: "white",
  background:
    "linear-gradient(135deg, rgba(56,189,248,.16), rgba(139,92,246,.18))",
  border: "1px solid rgba(56,189,248,.28)",
  boxShadow:
    "0 0 26px rgba(56,189,248,.12), inset 0 0 18px rgba(139,92,246,.10)"
};

const menuIcon = {
  width: "28px",
  display: "inline-flex",
  justifyContent: "center"
};

const divider = {
  height: "1px",
  background: "rgba(148,163,184,.14)",
  margin: "8px 10px"
};

const userCard = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "14px",
  borderRadius: "20px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.16)"
};

const avatar = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #35d0c3, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950",
  flexShrink: 0
};

const userName = {
  display: "block",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const userMeta = {
  margin: "3px 0 0",
  color: "#94a3b8",
  fontSize: "12px"
};

const logoutButton = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: "16px",
  border: "1px solid rgba(248,113,113,.22)",
  background: "rgba(127,29,29,.16)",
  color: "#fecaca",
  cursor: "pointer",
  fontWeight: "900"
};

export default Sidebar;