import {
  useMemo,
  useState
} from "react";

import {
  NavLink,
  useNavigate
} from "react-router-dom";

import {
  useSettings
} from "../../context/SettingsContext";

const ALL_LINKS = [
  {
    to: "/admin/dashboard",
    icon: "⌂",
    label: "Dashboard",
    description: "Resumen administrativo",
    departments: ["ADMINISTRATION"]
  },
  {
    to: "/admin/warehouse",
    icon: "▣",
    label: "Almacén",
    description: "Recepción e inspección",
    departments: ["WAREHOUSE"]
  },
  {
    to: "/admin/delivery",
    icon: "🚚",
    label: "Delivery",
    description: "Recogida y entrega",
    departments: ["DELIVERY"]
  },
  {
    to: "/admin/finance",
    icon: "$",
    label: "Finanzas",
    description: "Pagos y liberaciones",
    departments: ["FINANCE", "ADMINISTRATION"]
  },
  {
    to: "/admin/verification",
    icon: "◇",
    label: "Verificación",
    description: "KYC e identidad",
    departments: ["VERIFICATION"]
  },
  {
    to: "/admin/disputes",
    icon: "⚖",
    label: "Disputas",
    description: "Casos y reclamaciones",
    departments: ["DISPUTES"]
  },
  {
    to: "/admin/moderation",
    icon: "◉",
    label: "Moderación",
    description: "Contenido y publicaciones",
    departments: ["MODERATION", "ADMINISTRATION"]
  },
  {
    to: "/admin/support",
    icon: "?",
    label: "Soporte",
    description: "Tickets y ayuda",
    departments: ["SUPPORT"]
  },
  {
    to: "/admin/security",
    icon: "🛡",
    label: "Seguridad",
    description: "Fraude y alertas",
    departments: ["SECURITY", "ADMINISTRATION"]
  },
  {
    to: "/admin/audit",
    icon: "◎",
    label: "Auditoría",
    description: "Trazabilidad del sistema",
    departments: ["AUDIT", "ADMINISTRATION"]
  },
  {
    to: "/admin/internal-users",
    icon: "♙",
    label: "Usuarios internos",
    description: "Personal y permisos",
    departments: ["ADMINISTRATION"]
  },
  {
    to: "/admin/system-settings",
    icon: "⚙",
    label: "Configuración",
    description: "Parámetros del sistema",
    departments: ["ADMINISTRATION"]
  }
];

const ADMIN_ROLES = new Set([
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SUPERVISOR"
]);

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function displayName(user) {
  const name = [
    user?.firstName,
    user?.lastName
  ].filter(Boolean).join(" ").trim();

  return name || user?.name || user?.email || "Usuario interno";
}

export default function AdminSidebar({
  counts = {}
}) {
  const navigate = useNavigate();
  const { settings, updateSetting, saveSettings } = useSettings();

  const [mobileOpen, setMobileOpen] = useState(false);

  const user = useMemo(() => (
    safeJson(localStorage.getItem("admin_user")) ||
    safeJson(localStorage.getItem("qsm_user")) ||
    safeJson(localStorage.getItem("user")) ||
    {}
  ), []);

  const role = normalize(user?.role);
  const department = normalize(user?.department);
  const isGlobalAdmin = ADMIN_ROLES.has(role);

  const links = useMemo(() => {
    if (isGlobalAdmin) {
      return ALL_LINKS;
    }

    return ALL_LINKS.filter((item) =>
      item.departments.includes(department)
    );
  }, [department, isGlobalAdmin]);

  const collapsed = Boolean(settings?.compactSidebar);

  const toggleCollapsed = () => {
    const next = !collapsed;

    updateSetting("compactSidebar", next);

    saveSettings({
      ...settings,
      compactSidebar: next
    }).catch(() => {});
  };

  const logout = () => {
    [
      "token",
      "qsm_token",
      "qsm_user",
      "user",
      "admin_token",
      "admin_user"
    ].forEach((key) => localStorage.removeItem(key));

    navigate("/admin/login", {
      replace: true
    });
  };

  const content = (
    <>
      <div className="qsm-admin-sidebar__brand">
        <div className="qsm-admin-sidebar__logo">🛡</div>

        {!collapsed && (
          <div>
            <strong>QSM</strong>
            <span>Panel Administrativo</span>
          </div>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir" : "Contraer"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="qsm-admin-sidebar__nav">
        {!collapsed && (
          <p>NAVEGACIÓN PRINCIPAL</p>
        )}

        <AdminLink
          to="/admin/select-area"
          icon="⌘"
          label="Todas las áreas"
          description="Selector administrativo"
          collapsed={collapsed}
        />

        <AdminLink
          to="/admin/messages"
          icon="💬"
          label="Chat Admin"
          description="Mensajes y respuestas"
          count={counts?.messages}
          collapsed={collapsed}
          highlighted
        />

        <div className="qsm-admin-sidebar__divider" />

        {!collapsed && (
          <p>ÁREAS ADMINISTRATIVAS</p>
        )}

        {links.map((item) => (
          <AdminLink
            key={item.to}
            {...item}
            count={counts?.[item.to]}
            collapsed={collapsed}
          />
        ))}

        <div className="qsm-admin-sidebar__divider" />

        <AdminLink
          to="/admin/dashboard"
          icon="✦"
          label="QSM AI"
          description="Asistente administrativo"
          collapsed={collapsed}
          ai
        />
      </nav>

      <div className="qsm-admin-sidebar__footer">
        <div className="qsm-admin-sidebar__user">
          <span>
            {displayName(user).slice(0, 1).toUpperCase()}
          </span>

          {!collapsed && (
            <div>
              <strong>{displayName(user)}</strong>
              <small>{department || role || "QSM"}</small>
            </div>
          )}
        </div>

        <button
          type="button"
          className="qsm-admin-sidebar__logout"
          onClick={logout}
        >
          ⇥
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        .qsm-admin-sidebar {
          width: ${collapsed ? "96px" : "280px"};
          min-width: ${collapsed ? "96px" : "280px"};
          height: 100dvh;
          position: fixed;
          inset: 0 auto 0 0;
          display: flex;
          flex-direction: column;
          padding: 18px 14px;
          color: #f8fafc;
          border-right: 1px solid rgba(139,92,246,.18);
          background:
            radial-gradient(circle at 15% 4%,rgba(139,92,246,.18),transparent 28%),
            radial-gradient(circle at 90% 15%,rgba(53,208,195,.10),transparent 26%),
            linear-gradient(180deg,#0a1224,#030712);
          box-shadow: 18px 0 60px rgba(0,0,0,.24);
          transition: width .25s ease,min-width .25s ease;
          z-index: 900;
        }

        .qsm-admin-sidebar__brand {
          min-height: 60px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 4px;
        }

        .qsm-admin-sidebar__logo {
          width: 50px;
          height: 50px;
          flex: 0 0 50px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          border: 1px solid rgba(139,92,246,.32);
          background: linear-gradient(135deg,rgba(124,58,237,.42),rgba(53,208,195,.24));
          font-size: 24px;
        }

        .qsm-admin-sidebar__brand div:nth-child(2) {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .qsm-admin-sidebar__brand strong {
          font-size: 22px;
        }

        .qsm-admin-sidebar__brand span {
          color: #94a3b8;
          font-size: 9px;
          white-space: nowrap;
        }

        .qsm-admin-sidebar__brand > button {
          width: 32px;
          height: 32px;
          margin-left: auto;
          border: 1px solid rgba(139,92,246,.25);
          border-radius: 10px;
          background: rgba(15,23,42,.82);
          color: #c4b5fd;
          cursor: pointer;
        }

        .qsm-admin-sidebar__nav {
          min-height: 0;
          flex: 1;
          display: grid;
          align-content: start;
          gap: 5px;
          padding: 14px 2px;
          overflow-y: auto;
        }

        .qsm-admin-sidebar__nav > p {
          margin: 8px 10px 5px;
          color: #67e8f9;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.8px;
        }

        .qsm-admin-sidebar__link {
          position: relative;
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: ${collapsed ? "center" : "flex-start"};
          gap: 10px;
          padding: ${collapsed ? "8px" : "8px 10px"};
          border: 1px solid transparent;
          border-radius: 14px;
          color: #cbd5e1;
          text-decoration: none;
          transition: .2s ease;
        }

        .qsm-admin-sidebar__link:hover,
        .qsm-admin-sidebar__link.is-active {
          border-color: rgba(139,92,246,.32);
          background: linear-gradient(135deg,rgba(124,58,237,.22),rgba(53,208,195,.10));
          color: #fff;
          transform: translateX(${collapsed ? "0" : "2px"});
        }

        .qsm-admin-sidebar__link.is-highlighted {
          border-color: rgba(53,208,195,.22);
        }

        .qsm-admin-sidebar__link.is-ai {
          margin-top: 4px;
          background: linear-gradient(135deg,rgba(124,58,237,.44),rgba(37,99,235,.32));
        }

        .qsm-admin-sidebar__icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: rgba(148,163,184,.08);
          font-size: 17px;
        }

        .qsm-admin-sidebar__text {
          min-width: 0;
          flex: 1;
          display: grid;
          gap: 2px;
        }

        .qsm-admin-sidebar__text strong {
          overflow: hidden;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .qsm-admin-sidebar__text small {
          overflow: hidden;
          color: #64748b;
          font-size: 8px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .qsm-admin-sidebar__count {
          min-width: 21px;
          height: 21px;
          display: grid;
          place-items: center;
          padding: 0 5px;
          border-radius: 999px;
          background: #ef4444;
          color: #fff;
          font-size: 8px;
          font-weight: 900;
        }

        .qsm-admin-sidebar__divider {
          height: 1px;
          margin: 10px 8px;
          background: linear-gradient(90deg,transparent,rgba(148,163,184,.16),transparent);
        }

        .qsm-admin-sidebar__footer {
          display: grid;
          gap: 9px;
          padding-top: 10px;
        }

        .qsm-admin-sidebar__user {
          display: flex;
          align-items: center;
          justify-content: ${collapsed ? "center" : "flex-start"};
          gap: 10px;
          padding: 10px;
          border: 1px solid rgba(56,189,248,.16);
          border-radius: 15px;
          background: rgba(15,23,42,.74);
        }

        .qsm-admin-sidebar__user > span {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: linear-gradient(135deg,#38bdf8,#8b5cf6);
          font-weight: 900;
        }

        .qsm-admin-sidebar__user div {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .qsm-admin-sidebar__user strong,
        .qsm-admin-sidebar__user small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .qsm-admin-sidebar__user strong {
          font-size: 10px;
        }

        .qsm-admin-sidebar__user small {
          color: #67e8f9;
          font-size: 7px;
        }

        .qsm-admin-sidebar__logout {
          min-height: 43px;
          display: flex;
          align-items: center;
          justify-content: ${collapsed ? "center" : "flex-start"};
          gap: 9px;
          padding: 10px 13px;
          border: 1px solid rgba(248,113,113,.26);
          border-radius: 13px;
          background: rgba(127,29,29,.16);
          color: #fca5a5;
          cursor: pointer;
        }

        .qsm-admin-sidebar-mobile {
          display: none;
        }

        @media (max-width: 1100px) {
          .qsm-admin-sidebar {
            display: none;
          }

          .qsm-admin-sidebar-mobile {
            position: fixed;
            top: 16px;
            left: 16px;
            z-index: 3100;
            width: 46px;
            height: 46px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(139,92,246,.30);
            border-radius: 14px;
            background: #0a1224;
            color: #fff;
          }

          .qsm-admin-sidebar.is-mobile-open {
            width: 290px;
            min-width: 290px;
            display: flex;
            z-index: 3200;
          }
        }
      `}</style>

      <aside
        className={`qsm-admin-sidebar ${mobileOpen ? "is-mobile-open" : ""}`}
      >
        {content}
      </aside>

      <button
        type="button"
        className="qsm-admin-sidebar-mobile"
        onClick={() => setMobileOpen((current) => !current)}
      >
        ☰
      </button>
    </>
  );
}

function AdminLink({
  to,
  icon,
  label,
  description,
  count = 0,
  collapsed,
  highlighted = false,
  ai = false
}) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) => [
        "qsm-admin-sidebar__link",
        isActive ? "is-active" : "",
        highlighted ? "is-highlighted" : "",
        ai ? "is-ai" : ""
      ].filter(Boolean).join(" ")}
    >
      <span className="qsm-admin-sidebar__icon">
        {icon}
      </span>

      {!collapsed && (
        <>
          <span className="qsm-admin-sidebar__text">
            <strong>{label}</strong>
            <small>{description}</small>
          </span>

          {Number(count || 0) > 0 && (
            <span className="qsm-admin-sidebar__count">
              {Number(count) > 99 ? "99+" : Number(count)}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
