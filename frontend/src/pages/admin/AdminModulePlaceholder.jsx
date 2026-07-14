import { useNavigate } from "react-router-dom";

function AdminModulePlaceholder({
  title,
  description,
  icon = "🛡️"
}) {
  const navigate = useNavigate();

  const rawUser =
    localStorage.getItem("qsm_admin_user") ||
    sessionStorage.getItem("qsm_admin_user");

  let user = null;

  try {
    user = rawUser
      ? JSON.parse(rawUser)
      : null;
  } catch {
    user = null;
  }

  return (
    <div style={page}>
      <header style={header}>
        <div>
          <strong style={brand}>
            🛡 QSM BackOffice
          </strong>

          <p style={muted}>
            {user?.name ||
              user?.fullName ||
              user?.firstName ||
              "Usuario administrativo"}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/admin/select-area")
          }
          style={secondaryButton}
        >
          ← Cambiar de área
        </button>
      </header>

      <main style={content}>
        <div style={iconBox}>
          {icon}
        </div>

        <span style={eyebrow}>
          MÓDULO ADMINISTRATIVO
        </span>

        <h1 style={titleStyle}>
          {title}
        </h1>

        <p style={descriptionStyle}>
          {description}
        </p>

        <div style={notice}>
          <strong>
            Dashboard en construcción
          </strong>

          <p>
            La ruta y la protección administrativa ya
            están funcionando. Ahora construiremos el
            contenido completo de esta área.
          </p>
        </div>

        <div style={actions}>
          <button
            type="button"
            onClick={() =>
              navigate("/admin/dashboard")
            }
            style={primaryButton}
          >
            Ir al Dashboard administrativo
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/select-area")
            }
            style={secondaryButton}
          >
            Seleccionar otra área
          </button>
        </div>
      </main>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "28px",
  background:
    "radial-gradient(circle at top right, rgba(124,58,237,.20), transparent 30%), #020617",
  color: "white"
};

const header = {
  maxWidth: "1250px",
  margin: "0 auto",
  padding: "18px 22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  border: "1px solid rgba(148,163,184,.16)",
  borderRadius: "20px",
  background: "rgba(15,23,42,.72)"
};

const brand = {
  fontSize: "23px"
};

const muted = {
  margin: "4px 0 0",
  color: "#94a3b8"
};

const content = {
  maxWidth: "760px",
  margin: "100px auto 0",
  padding: "48px",
  textAlign: "center",
  border: "1px solid rgba(139,92,246,.24)",
  borderRadius: "30px",
  background: "rgba(15,23,42,.80)",
  boxShadow: "0 30px 90px rgba(0,0,0,.35)"
};

const iconBox = {
  width: "88px",
  height: "88px",
  margin: "0 auto 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "26px",
  background: "rgba(139,92,246,.16)",
  fontSize: "40px"
};

const eyebrow = {
  color: "#38bdf8",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "2.5px"
};

const titleStyle = {
  margin: "14px 0",
  fontSize: "48px"
};

const descriptionStyle = {
  color: "#cbd5e1",
  fontSize: "17px",
  lineHeight: "28px"
};

const notice = {
  marginTop: "28px",
  padding: "20px",
  border: "1px solid rgba(245,158,11,.24)",
  borderRadius: "16px",
  background: "rgba(245,158,11,.08)",
  color: "#fde68a"
};

const actions = {
  marginTop: "28px",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "12px"
};

const primaryButton = {
  border: "none",
  borderRadius: "13px",
  padding: "14px 18px",
  background:
    "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  fontWeight: "900",
  cursor: "pointer"
};

const secondaryButton = {
  border: "1px solid rgba(148,163,184,.22)",
  borderRadius: "13px",
  padding: "14px 18px",
  background: "rgba(15,23,42,.72)",
  color: "#e2e8f0",
  fontWeight: "900",
  cursor: "pointer"
};

export default AdminModulePlaceholder;