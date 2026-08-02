import {
  useMemo,
  useState
} from "react";

import {
  NavLink,
  useNavigate
} from "react-router-dom";

const MENU = [
  {
    section: "PRINCIPAL",
    items: [
      {
        to: "/admin/dashboard",
        icon: "⌂",
        label: "Dashboard",
        description: "Centro de operaciones",
        departments: ["ADMINISTRATION"]
      },
      {
        to: "/admin/select-area",
        icon: "◈",
        label: "Seleccionar área",
        description: "Cambiar departamento",
        all: true
      },
      {
        to: "/admin/messages",
        icon: "💬",
        label: "Chat Admin",
        description: "Comunicación interna",
        all: true,
        featured: true
      }
    ]
  },
  {
    section: "OPERACIONES",
    items: [
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
        description: "Escrow y liberaciones",
        departments: ["FINANCE", "ADMINISTRATION"]
      },
      {
        to: "/admin/disputes",
        icon: "⚖",
        label: "Disputas",
        description: "Casos y resoluciones",
        departments: ["DISPUTES"]
      },
      {
        to: "/admin/verification",
        icon: "◇",
        label: "Verificación",
        description: "Identidad y KYC",
        departments: ["VERIFICATION"]
      }
    ]
  },
  {
    section: "CONTROL Y SOPORTE",
    items: [
      {
        to: "/admin/support",
        icon: "?",
        label: "Soporte",
        description: "Tickets y atención",
        departments: ["SUPPORT"]
      },
      {
        to: "/admin/moderation",
        icon: "⚑",
        label: "Moderación",
        description: "Contenido reportado",
        departments: ["MODERATION", "ADMINISTRATION"]
      },
      {
        to: "/admin/security",
        icon: "♢",
        label: "Seguridad",
        description: "Riesgos y accesos",
        departments: ["SECURITY", "ADMINISTRATION"]
      },
      {
        to: "/admin/audit",
        icon: "▤",
        label: "Auditoría",
        description: "Logs y trazabilidad",
        departments: ["AUDIT", "ADMINISTRATION"]
      }
    ]
  },
  {
    section: "ADMINISTRACIÓN",
    items: [
      {
        to: "/admin/internal-users",
        icon: "♙",
        label: "Usuarios internos",
        description: "Roles y permisos",
        departments: ["ADMINISTRATION"]
      },
      {
        to: "/admin/system-settings",
        icon: "⚙",
        label: "Configuración",
        description: "Parámetros globales",
        departments: ["ADMINISTRATION"]
      }
    ]
  }
];

const GLOBAL_ROLES = new Set([
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

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function getAdminUser() {
  return (
    safeJson(localStorage.getItem("qsm_admin_user")) ||
    safeJson(sessionStorage.getItem("qsm_admin_user")) ||
    safeJson(localStorage.getItem("admin_user")) ||
    {}
  );
}

function getName(user) {
  return (
    user?.fullName ||
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user?.name ||
    user?.email ||
    "Usuario interno"
  );
}

function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/s+/)
    .filter(Boolean);

  if (!words.length) {
    return "Q";
  }

  return (
    words[0].slice(0, 1) +
    (words.length > 1
      ? words[words.length - 1].slice(0, 1)
      : "")
  ).toUpperCase();
}

export default function AdminSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  counts = {}
}) {
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const user = useMemo(
    () => getAdminUser(),
    []
  );

  const role = normalizeCode(user?.role);

  const departments = useMemo(() => {
    const source = Array.isArray(user?.departments)
      ? user.departments
      : user?.department
        ? [user.department]
        : [];

    return source
      .map(normalizeCode)
      .filter(Boolean);
  }, [user]);

  const permissions = useMemo(() => (
    Array.isArray(user?.permissions)
      ? user.permissions
          .map((item) =>
            normalizeCode(
              typeof item === "string"
                ? item
                : item?.code
            )
          )
          .filter(Boolean)
      : []
  ), [user]);

  const globalAccess =
    GLOBAL_ROLES.has(role) ||
    permissions.includes("*");

  const visibleSections = useMemo(() => (
    MENU
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.all || globalAccess) {
            return true;
          }

          return item.departments?.some(
            (department) =>
              departments.includes(department)
          );
        })
      }))
      .filter((section) => section.items.length)
  ), [departments, globalAccess]);

  const name = getName(user);
  const roleLabel =
    user?.roleLabel ||
    role.replaceAll("_", " ") ||
    "BackOffice";

  const logout = () => {
    [
      "qsm_admin_token",
      "qsm_admin_user",
      "admin_token",
      "admin_user"
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    navigate("/admin/login", {
      replace: true
    });
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="qsm-global-admin-overlay"
          aria-label="Cerrar menú"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={[
          "qsm-global-admin-sidebar",
          collapsed
            ? "is-collapsed"
            : "",
          mobileOpen
            ? "is-mobile-open"
            : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="qsm-global-admin-sidebar__brand">
          <button
            type="button"
            className="qsm-global-admin-sidebar__logo"
            onClick={() =>
              navigate("/admin/dashboard")
            }
          >
            <span>Q</span>

            {!collapsed && (
              <div>
                <strong>QSM</strong>
                <small>BackOffice</small>
              </div>
            )}
          </button>

          <button
            type="button"
            className="qsm-global-admin-sidebar__mobile-close"
            onClick={onCloseMobile}
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <div className="qsm-global-admin-sidebar__profile">
          <span>
            {getInitials(name)}
          </span>

          {!collapsed && (
            <div>
              <strong>{name}</strong>
              <small>{roleLabel}</small>
              <em>
                <i />
                Sesión activa
              </em>
            </div>
          )}
        </div>

        <nav className="qsm-global-admin-sidebar__nav">
          {visibleSections.map((section) => (
            <section key={section.section}>
              {!collapsed && (
                <p>{section.section}</p>
              )}

              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  title={
                    collapsed
                      ? item.label
                      : undefined
                  }
                  className={({ isActive }) => [
                    "qsm-global-admin-sidebar__item",
                    isActive
                      ? "is-active"
                      : "",
                    item.featured
                      ? "is-featured"
                      : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="qsm-global-admin-sidebar__item-icon">
                    {item.icon}
                  </span>

                  {!collapsed && (
                    <>
                      <span className="qsm-global-admin-sidebar__item-text">
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>

                      {Number(counts?.[item.to] || 0) > 0 && (
                        <span className="qsm-global-admin-sidebar__badge">
                          {Number(counts[item.to]) > 99
                            ? "99+"
                            : Number(counts[item.to])}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </section>
          ))}
        </nav>

        <div className="qsm-global-admin-sidebar__bottom">
          <button
            type="button"
            onClick={onToggleCollapsed}
          >
            <span>
              {collapsed ? "→" : "←"}
            </span>

            {!collapsed && (
              <span>Contraer menú</span>
            )}
          </button>

          <button
            type="button"
            className="is-logout"
            onClick={() =>
              setConfirmLogout(true)
            }
          >
            <span>↪</span>

            {!collapsed && (
              <span>Cerrar sesión</span>
            )}
          </button>
        </div>
      </aside>

      {confirmLogout && (
        <div
          className="qsm-global-admin-confirm"
          role="dialog"
          aria-modal="true"
        >
          <section>
            <span>↪</span>
            <h3>Cerrar sesión</h3>
            <p>
              ¿Deseas salir del BackOffice de QSM?
            </p>

            <div>
              <button
                type="button"
                onClick={() =>
                  setConfirmLogout(false)
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="is-danger"
                onClick={logout}
              >
                Cerrar sesión
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
