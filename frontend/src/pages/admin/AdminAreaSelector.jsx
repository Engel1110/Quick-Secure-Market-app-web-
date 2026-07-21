import { Navigate, useNavigate } from "react-router-dom";

const AREAS = [
  {
    id: "ADMINISTRATION",
    title: "Administración",
    description:
      "Usuarios internos, roles, permisos y operaciones generales.",
    icon: "👑",
    route: "/admin/dashboard"
  },
  {
    id: "WAREHOUSE",
    title: "Almacén",
    description:
      "Recepción, inventario, inspección y despacho.",
    icon: "🏬",
    route: "/admin/warehouse"
  },
{
  id: "VERIFICATION",
  title: "Verificación",
  description:
    "Identidad, cédulas, fotografías, KYC y aprobación de vendedores.",
  icon: "🪪",
  route: "/admin/verification"
},
  {
    id: "DELIVERY",
    title: "Delivery",
    description:
      "Asignaciones, rutas, repartidores y entregas.",
    icon: "🚚",
    route: "/admin/delivery"
  },
  {
    id: "DISPUTES",
    title: "Disputas",
    description:
      "Investigación, evidencias y resolución de casos.",
    icon: "⚖️",
    route: "/admin/disputes"
  },
  {
    id: "AUDIT",
    title: "Auditoría",
    description:
      "Logs, trazabilidad y acciones administrativas.",
    icon: "📋",
    route: "/admin/audit"
  },
  {
    id: "FINANCE",
    title: "Finanzas",
    description:
      "Pagos, escrow, comisiones y reembolsos.",
    icon: "💰",
    route: "/admin/finance"
  },
  {
    id: "SUPPORT",
    title: "Soporte",
    description:
      "Tickets, usuarios y escalamiento de casos.",
    icon: "🎧",
    route: "/admin/support"
  },
  {
    id: "MODERATION",
    title: "Moderación",
    description:
      "Productos, usuarios y contenido reportado.",
    icon: "🚩",
    route: "/admin/moderation"
  },
  {
    id: "SECURITY",
    title: "Seguridad",
    description:
      "Sesiones, accesos y alertas de seguridad.",
    icon: "🔐",
    route: "/admin/security"
  }
];

function AdminAreaSelector() {
  const navigate = useNavigate();

  const token =
    localStorage.getItem("qsm_admin_token") ||
    sessionStorage.getItem("qsm_admin_token");

  const rawUser =
    localStorage.getItem("qsm_admin_user") ||
    sessionStorage.getItem("qsm_admin_user");

  if (!token || !rawUser) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  let user;

  try {
    user = JSON.parse(rawUser);
  } catch {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

const normalizedRole = String(
  user.role || ""
)
  .trim()
  .toUpperCase();

const normalizedPermissions =
  Array.isArray(user.permissions)
    ? user.permissions.map(
        (permission) =>
          typeof permission === "string"
            ? permission
                .trim()
                .toUpperCase()
            : String(
                permission?.code || ""
              )
                .trim()
                .toUpperCase()
      )
    : [];

const isSuperAdmin =
  normalizedRole === "SUPER_ADMIN" ||
  normalizedPermissions.includes("*");

  const allowedAreas = isSuperAdmin
    ? AREAS
    : AREAS.filter((area) =>
        user.departments?.includes(area.id)
      );

  const handleLogout = () => {
    localStorage.removeItem("qsm_admin_token");
    localStorage.removeItem("qsm_admin_user");
    sessionStorage.removeItem("qsm_admin_token");
    sessionStorage.removeItem("qsm_admin_user");

    navigate("/admin/login", {
      replace: true
    });
  };

  return (
    <div style={page}>
      <header style={header}>
        <div>
          <strong style={brand}>
            🛡 QSM BackOffice
          </strong>

          <p style={muted}>
            Bienvenido, {user.fullName || user.firstName}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={logoutButton}
        >
          Cerrar sesión
        </button>
      </header>

      <main style={main}>
        <div style={heading}>
          <span style={eyebrow}>
            ACCESO ADMINISTRATIVO
          </span>

          <h1 style={title}>
            Selecciona tu área de trabajo
          </h1>

          <p style={description}>
            Solo se muestran los departamentos
            autorizados para tu cuenta.
          </p>
        </div>

        <section style={grid}>
          {allowedAreas.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => navigate(area.route)}
              style={card}
            >
              <span style={icon}>
                {area.icon}
              </span>

              <strong style={cardTitle}>
                {area.title}
              </strong>

              <p style={cardText}>
                {area.description}
              </p>

              <span style={enterText}>
                Entrar al área →
              </span>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top right, rgba(124,58,237,.18), transparent 30%), #020617",
  color: "white",
  padding: "28px"
};

const header = {
  maxWidth: "1300px",
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "20px",
  padding: "20px 24px",
  border: "1px solid rgba(148,163,184,.15)",
  borderRadius: "22px",
  background: "rgba(15,23,42,.72)"
};

const brand = {
  fontSize: "24px"
};

const muted = {
  color: "#94a3b8",
  marginBottom: 0
};

const logoutButton = {
  border: "1px solid rgba(239,68,68,.35)",
  background: "rgba(239,68,68,.10)",
  color: "#fecaca",
  borderRadius: "14px",
  padding: "12px 18px",
  fontWeight: "800",
  cursor: "pointer"
};

const main = {
  maxWidth: "1300px",
  margin: "60px auto 0"
};

const heading = {
  textAlign: "center",
  maxWidth: "760px",
  margin: "0 auto 42px"
};

const eyebrow = {
  color: "#38bdf8",
  letterSpacing: "3px",
  fontWeight: "900",
  fontSize: "13px"
};

const title = {
  fontSize: "52px",
  margin: "14px 0"
};

const description = {
  color: "#cbd5e1",
  fontSize: "18px"
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "22px"
};

const card = {
  minHeight: "260px",
  padding: "28px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  textAlign: "left",
  color: "white",
  borderRadius: "24px",
  border: "1px solid rgba(139,92,246,.24)",
  background: "rgba(15,23,42,.76)",
  cursor: "pointer"
};

const icon = {
  width: "58px",
  height: "58px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "18px",
  background: "rgba(139,92,246,.16)",
  fontSize: "28px",
  marginBottom: "20px"
};

const cardTitle = {
  fontSize: "22px"
};

const cardText = {
  color: "#94a3b8",
  lineHeight: "24px",
  flex: 1
};

const enterText = {
  color: "#c4b5fd",
  fontWeight: "900"
};

export default AdminAreaSelector;