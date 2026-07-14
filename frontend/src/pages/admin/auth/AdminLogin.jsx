import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../../services/api";

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SUPERVISOR",

  "WAREHOUSE_MANAGER",
  "WAREHOUSE_SUPERVISOR",
  "WAREHOUSE_STAFF",

  "DELIVERY_MANAGER",
  "DELIVERY_SUPERVISOR",
  "DELIVERY_AGENT",

  "DISPUTE_MANAGER",
  "DISPUTE_AGENT",

  "AUDITOR",

  "FINANCE_MANAGER",
  "FINANCE_AGENT",

  "SUPPORT_MANAGER",
  "SUPPORT_AGENT",

  "MODERATION_MANAGER",
  "MODERATOR",

  "SECURITY_MANAGER",
  "SECURITY_ANALYST"
];

/*
 * Cuenta temporal de desarrollo.
 * Se usa mientras MongoDB y el login administrativo real no estén disponibles.
 * Elimina este bloque cuando POST /api/admin/auth/login esté funcionando.
 */
const TEMP_SUPER_ADMIN = {
  id: "qsm-super-admin-001",
  firstName: "Engel",
  lastName: "Feliz",
  fullName: "Engel Feliz",
  name: "Engel Feliz",
  email: "superadmin.qsm@gmail.com",
  password: "QsmSuperAdmin@2026!",
  accountType: "INTERNAL",
  role: "SUPER_ADMIN",
  roles: ["SUPER_ADMIN"],
  roleLabel: "Super Administrador",
  department: "ADMINISTRATION",
  departments: [
    "ADMINISTRATION",
    "WAREHOUSE",
    "DELIVERY",
    "FINANCE",
    "AUDIT",
    "DISPUTES",
    "SECURITY",
    "SUPPORT",
    "MODERATION"
  ],
  permissions: ["*"],
  status: "ACTIVE",
  isActive: true,
  active: true
};

function AdminLogin() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState(
    () => localStorage.getItem("qsm_theme") || "dark"
  );

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  const isDark = theme === "dark";

  useEffect(() => {
    localStorage.setItem("qsm_theme", theme);

    document.documentElement.setAttribute(
      "data-qsm-theme",
      theme
    );
  }, [theme]);

  useEffect(() => {
    const existingToken =
      localStorage.getItem("qsm_admin_token") ||
      sessionStorage.getItem("qsm_admin_token");

    const existingUser =
      localStorage.getItem("qsm_admin_user") ||
      sessionStorage.getItem("qsm_admin_user");

    if (!existingToken || !existingUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(existingUser);

      if (hasAdministrativeAccess(parsedUser)) {
        navigate("/admin/select-area", {
          replace: true
        });
      }
    } catch {
      clearAdministrativeSession();
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));

    if (message) {
      setMessage("");
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("error");

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setMessage(
        "Completa tu correo administrativo y contraseña."
      );
      return;
    }

    if (!isValidEmail(email)) {
      setMessage(
        "Ingresa un correo electrónico válido."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Acceso temporal para continuar desarrollando el BackOffice
       * sin depender todavía de MongoDB.
       */
      const isTemporarySuperAdmin =
        email === TEMP_SUPER_ADMIN.email &&
        password === TEMP_SUPER_ADMIN.password;

      if (isTemporarySuperAdmin) {
        const {
          password: removedPassword,
          ...safeTemporaryAdmin
        } = TEMP_SUPER_ADMIN;

        const temporaryToken =
          `qsm-temp-admin-${Date.now()}`;

        saveAdministrativeSession({
          token: temporaryToken,
          user: normalizeAdministrativeUser(
            safeTemporaryAdmin
          ),
          remember
        });

        setMessageType("success");
        setMessage(
          "Acceso autorizado. Bienvenido, Engel Feliz."
        );

        window.setTimeout(() => {
          navigate("/admin/select-area", {
            replace: true
          });
        }, 450);

        return;
      }

      /*
       * Login real actual.
       * Cuando el backend administrativo esté listo, cambia:
       *
       *   /auth/login
       *
       * por:
       *
       *   /admin/auth/login
       */
      const response = await api.post("/auth/login", {
        email,
        password
      });

      const data = response?.data || {};

      const token =
        data.token ||
        data.accessToken ||
        data?.user?.token ||
        data?.data?.token;

      const user =
        data.user ||
        data.usuario ||
        data?.data?.user;

      if (!token) {
        setMessage(
          "El servidor no devolvió un token administrativo válido."
        );
        return;
      }

      if (!user) {
        setMessage(
          "El servidor no devolvió la información del usuario."
        );
        return;
      }

      if (!hasAdministrativeAccess(user)) {
        clearAdministrativeSession();

        setMessage(
          "Esta cuenta no tiene autorización para ingresar al BackOffice de QSM."
        );
        return;
      }

      const normalizedStatus = String(
        user.status || "ACTIVE"
      ).toUpperCase();

      if (
        user.isActive === false ||
        user.active === false ||
        [
          "SUSPENDED",
          "BANNED",
          "DISABLED",
          "INACTIVE"
        ].includes(normalizedStatus)
      ) {
        clearAdministrativeSession();

        setMessage(
          "Esta cuenta administrativa está suspendida o desactivada."
        );
        return;
      }

      const normalizedUser =
        normalizeAdministrativeUser(user);

      saveAdministrativeSession({
        token,
        user: normalizedUser,
        remember
      });

      setMessageType("success");
      setMessage(
        `Acceso autorizado. Bienvenido, ${
          normalizedUser.name || "administrador"
        }.`
      );

      window.setTimeout(() => {
        navigate("/admin/select-area", {
          replace: true
        });
      }, 450);
    } catch (error) {
      const status = error?.response?.status;

      let backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error;

      if (status === 401) {
        backendMessage =
          "Correo o contraseña administrativa incorrectos.";
      }

      if (status === 403) {
        backendMessage =
          "Tu cuenta no tiene autorización para acceder al BackOffice.";
      }

      if (status === 429) {
        backendMessage =
          "Demasiados intentos de acceso. Espera unos minutos e inténtalo nuevamente.";
      }

      setMessage(
        backendMessage ||
          "No se pudo iniciar sesión. Verifica tus credenciales administrativas."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page(isDark)}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          margin: 0;
          padding: 0;
          min-height: 100%;
          width: 100%;
          font-family:
            Inter,
            "Plus Jakarta Sans",
            system-ui,
            sans-serif;
          overflow-x: hidden;
        }

        body {
          background: ${
            isDark ? "#020617" : "#f8fafc"
          };
        }

        button,
        input,
        a {
          font-family: inherit;
        }

        a,
        button {
          transition:
            transform 0.25s ease,
            opacity 0.25s ease,
            border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        a:hover,
        button:hover {
          transform: translateY(-2px);
        }

        button:disabled {
          transform: none;
        }

        input::placeholder {
          color: ${
            isDark ? "#64748b" : "#94a3b8"
          };
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glow {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(1);
          }

          50% {
            opacity: 1;
            transform: scale(1.04);
          }
        }

        @keyframes adminPulse {
          0%,
          100% {
            box-shadow:
              0 0 0 0 rgba(139, 92, 246, 0),
              0 18px 45px rgba(139, 92, 246, 0.14);
          }

          50% {
            box-shadow:
              0 0 0 10px rgba(139, 92, 246, 0.05),
              0 22px 60px rgba(139, 92, 246, 0.25);
          }
        }

        .admin-login-card {
          animation: fadeUp 0.65s ease;
        }

        .admin-shield-glow {
          animation:
            glow 5s ease-in-out infinite,
            adminPulse 4s ease-in-out infinite;
        }

        .admin-feature-card:hover {
          border-color: rgba(139, 92, 246, 0.44) !important;
          background: rgba(15, 23, 42, 0.78) !important;
        }

        .admin-input-wrapper:focus-within {
          border-color: rgba(139, 92, 246, 0.72) !important;
          box-shadow:
            0 0 0 4px rgba(139, 92, 246, 0.1),
            0 14px 40px rgba(2, 6, 23, 0.18);
        }

        @media (max-width: 1180px) {
          .admin-login-grid {
            grid-template-columns: 1fr !important;
          }

          .admin-visual-panel {
            min-height: 620px !important;
          }

          .admin-login-card {
            width: 100% !important;
            max-width: 720px !important;
            justify-self: center !important;
          }
        }

        @media (max-width: 900px) {
          .admin-topbar {
            height: auto !important;
            flex-wrap: wrap !important;
          }

          .admin-nav-links {
            order: 3;
            width: 100%;
            justify-content: center !important;
            flex-wrap: wrap !important;
          }

          .admin-stats-row {
            grid-template-columns:
              repeat(2, minmax(130px, 1fr)) !important;
          }
        }

        @media (max-width: 720px) {
          .admin-page-shell {
            padding: 16px !important;
          }

          .admin-topbar {
            align-items: flex-start !important;
          }

          .admin-nav-links {
            display: none !important;
          }

          .admin-visual-panel {
            min-height: 560px !important;
          }

          .admin-visual-content {
            padding: 34px 26px !important;
          }

          .admin-title {
            font-size: 46px !important;
            line-height: 50px !important;
            letter-spacing: -2px !important;
          }

          .admin-login-card {
            padding: 30px 24px !important;
          }

          .admin-form-options {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .admin-footer {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 520px) {
          .admin-stats-row {
            grid-template-columns: 1fr !important;
          }

          .admin-trust-bar {
            display: grid !important;
            width: 100% !important;
          }

          .admin-top-actions {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>

      <div
        className="admin-page-shell"
        style={shell}
      >
        <header
          className="admin-topbar"
          style={topbar(isDark)}
        >
          <Link
            to="/"
            style={brand}
            aria-label="Volver al inicio de QSM"
          >
            <div style={brandIcon(isDark)}>
              🛡
            </div>

            <div>
              <strong style={brandTitle(isDark)}>
                QSM
              </strong>

              <span style={brandSub(isDark)}>
                Quick Secure Market
              </span>
            </div>
          </Link>

          <nav
            className="admin-nav-links"
            style={nav}
          >
            <Link
              to="/"
              style={navLink(isDark)}
            >
              Inicio
            </Link>

            <Link
              to="/#nosotros"
              style={navLink(isDark)}
            >
              Nosotros
            </Link>

            <Link
              to="/#seguridad"
              style={navLink(isDark)}
            >
              Seguridad
            </Link>

            <Link
              to="/#pago-protegido"
              style={navLink(isDark)}
            >
              Pago Protegido
            </Link>

            <Link
              to="/#demo"
              style={navLink(isDark)}
            >
              Demo
            </Link>

            <Link
              to="/#contacto"
              style={navLink(isDark)}
            >
              Contacto
            </Link>
          </nav>

          <div
            className="admin-top-actions"
            style={topActions}
          >
            <button
              type="button"
              onClick={() =>
                setTheme(
                  isDark ? "light" : "dark"
                )
              }
              style={themeButton(isDark)}
              aria-label="Cambiar tema"
            >
              {isDark ? "☀️ Light" : "🌙 Dark"}
            </button>

            <Link
              to="/"
              style={returnButton(isDark)}
            >
              ← Volver al lobby
            </Link>
          </div>
        </header>

        <main
          className="admin-login-grid"
          style={grid}
        >
          <section
            className="admin-visual-panel"
            style={visualPanel(isDark)}
          >
            <div style={visualOverlay()} />

            <div
              className="admin-visual-content"
              style={visualContent}
            >
              <div style={internalBadge}>
                <span>🛡</span>

                <div>
                  <strong>
                    QSM BackOffice Empresarial
                  </strong>

                  <small>
                    Portal interno protegido
                  </small>
                </div>
              </div>

              <p style={eyebrow}>
                ACCESO EXCLUSIVO PARA PERSONAL AUTORIZADO
              </p>

              <h1
                className="admin-title"
                style={title()}
              >
                Protege, administra y cuida la{" "}
                <span style={gradientText}>
                  comunidad QSM.
                </span>
              </h1>

              <p style={subtitle()}>
                Inicia sesión como miembro del equipo
                administrativo y contribuye al cuidado,
                seguridad y protección de compradores,
                vendedores y operaciones de Quick Secure
                Market.
              </p>

              <div style={responsibilityBox}>
                <span style={responsibilityIcon}>
                  ⚠️
                </span>

                <div>
                  <strong>
                    Tu acceso representa una responsabilidad
                  importante
                  </strong>

                  <p>
                    Todas las acciones administrativas pueden
                    ser registradas para mantener la
                    trazabilidad, integridad y seguridad de la
                    plataforma.
                  </p>
                </div>
              </div>

              <div
                className="admin-stats-row"
                style={statsRow}
              >
                <Stat
                  icon="👥"
                  value="Usuarios"
                  label="Protección de cuentas"
                />

                <Stat
                  icon="📦"
                  value="Órdenes"
                  label="Seguimiento operativo"
                />

                <Stat
                  icon="⚖️"
                  value="Disputas"
                  label="Resolución responsable"
                />

                <Stat
                  icon="🔐"
                  value="Seguridad"
                  label="Control y auditoría"
                />
              </div>

              <div
                className="admin-trust-bar"
                style={trustBar()}
              >
                <span>🔐 Acceso controlado</span>
                <span>🧾 Auditoría activa</span>
                <span>🛡 Permisos por función</span>
                <span>📍 Trazabilidad de acciones</span>
              </div>
            </div>
          </section>

          <section
            className="admin-login-card"
            style={card(isDark)}
          >
            <div
              className="admin-shield-glow"
              style={lockIcon(isDark)}
            >
              🛡
            </div>

            <div style={adminCardBadge}>
              QSM BACKOFFICE
            </div>

            <h2 style={cardTitle(isDark)}>
              Inicio de sesión administrativo
            </h2>

            <p style={cardText(isDark)}>
              Ingresa con la cuenta interna asignada por
              Quick Secure Market.
            </p>

            <form
              onSubmit={handleLogin}
              style={formStyle}
              noValidate
            >
              <label style={label(isDark)}>
                Correo administrativo
              </label>

              <div
                className="admin-input-wrapper"
                style={inputWrap(isDark)}
              >
                <span>✉️</span>

                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="superadmin.qsm@gmail.com"
                  style={input(isDark)}
                  autoComplete="username"
                  disabled={loading}
                  spellCheck="false"
                />
              </div>

              <small style={fieldHelp(isDark)}>
                Utiliza únicamente el correo interno asignado
                a tu cuenta.
              </small>

              <label style={label(isDark)}>
                Contraseña
              </label>

              <div
                className="admin-input-wrapper"
                style={inputWrap(isDark)}
              >
                <span>🔒</span>

                <input
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Ingresa tu contraseña"
                  style={input(isDark)}
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  style={eyeButton(isDark)}
                  aria-label={
                    showPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  disabled={loading}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <div
                className="admin-form-options"
                style={formOptions}
              >
                <label style={checkLabel(isDark)}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) =>
                      setRemember(
                        event.target.checked
                      )
                    }
                    disabled={loading}
                  />

                  Mantener sesión iniciada
                </label>

                <Link
                  to="/admin/forgot-password"
                  style={forgotLink}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {message && (
                <div
                  role="alert"
                  style={
                    messageType === "success"
                      ? successBox
                      : alertBox
                  }
                >
                  <span>
                    {messageType === "success"
                      ? "✅"
                      : "⚠️"}
                  </span>

                  <p>{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={loginSubmit(loading)}
              >
                {loading
                  ? "Verificando autorización..."
                  : "Ingresar al BackOffice →"}
              </button>
            </form>

            <div style={securityDivider(isDark)}>
              <span />
              <p>SEGURIDAD ADMINISTRATIVA</p>
              <span />
            </div>

            <div style={adminSecurityGrid}>
              <div
                className="admin-feature-card"
                style={securityCard(isDark)}
              >
                <span>🧑‍💼</span>

                <div>
                  <strong>
                    Cuenta individual
                  </strong>

                  <small>
                    No compartas tus credenciales.
                  </small>
                </div>
              </div>

              <div
                className="admin-feature-card"
                style={securityCard(isDark)}
              >
                <span>🧾</span>

                <div>
                  <strong>
                    Acciones registradas
                  </strong>

                  <small>
                    La actividad puede ser auditada.
                  </small>
                </div>
              </div>

              <div
                className="admin-feature-card"
                style={securityCard(isDark)}
              >
                <span>🔐</span>

                <div>
                  <strong>
                    Permisos controlados
                  </strong>

                  <small>
                    Solo verás tus áreas autorizadas.
                  </small>
                </div>
              </div>
            </div>

            <div style={noAccountBox(isDark)}>
              <span>ℹ️</span>

              <p>
                ¿No tienes acceso? Contacta al Super
                Administrador o al departamento responsable de
                cuentas internas.
              </p>
            </div>

            <p style={warningText(isDark)}>
              Este portal está reservado exclusivamente para
              empleados y personal autorizado de QSM.
            </p>
          </section>
        </main>

        <footer
          className="admin-footer"
          style={footer(isDark)}
        >
          <div style={footerBrand}>
            <strong>🛡 QSM BackOffice</strong>

            <span>
              Centro seguro de administración y operaciones.
            </span>
          </div>

          <div style={safeBadge(isDark)}>
            <span style={safeBadgeIcon}>🔒</span>

            <div>
              <strong>
                Acceso administrativo protegido
              </strong>

              <p>
                Las sesiones y acciones pueden ser registradas.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div style={statCard()}>
      <span style={statIcon}>
        {icon}
      </span>

      <strong>{value}</strong>

      <p>{label}</p>
    </div>
  );
}

function normalizeAdministrativeUser(user) {
  const roles = getUserRoles(user);

  const departments = Array.isArray(user.departments)
    ? user.departments
    : Array.isArray(user.areas)
      ? user.areas
      : Array.isArray(user.allowedDepartments)
        ? user.allowedDepartments
        : user.department
          ? [user.department]
          : [];

  const firstName =
    user.firstName ||
    user.nombre ||
    "";

  const lastName =
    user.lastName ||
    user.apellido ||
    "";

  const fullName =
    user.fullName ||
    user.name ||
    `${firstName} ${lastName}`.trim() ||
    user.email ||
    "Usuario administrativo";

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return {
    ...user,
    firstName,
    lastName,
    fullName,
    name: fullName,
    initials,
    role:
      typeof user.role === "string"
        ? user.role
        : user.role?.name ||
          roles[0] ||
          "INTERNAL_USER",
    roles,
    department:
      user.department ||
      departments[0] ||
      "ADMINISTRATION",
    departments,
    permissions: Array.isArray(user.permissions)
      ? user.permissions
      : [],
    accountType:
      user.accountType ||
      user.userType ||
      user.type ||
      "INTERNAL",
    status: String(
      user.status || "ACTIVE"
    ).toUpperCase()
  };
}

function hasAdministrativeAccess(user) {
  if (!user || typeof user !== "object") {
    return false;
  }

  const accountType = String(
    user.accountType ||
      user.userType ||
      user.type ||
      ""
  ).toUpperCase();

  if (
    accountType === "INTERNAL" ||
    accountType === "ADMIN" ||
    accountType === "STAFF"
  ) {
    return true;
  }

  const userRoles = getUserRoles(user);

  return userRoles.some((role) =>
    ADMIN_ROLES.includes(role)
  );
}

function getUserRoles(user) {
  const values = [];

  if (typeof user.role === "string") {
    values.push(user.role);
  }

  if (typeof user.role?.name === "string") {
    values.push(user.role.name);
  }

  if (Array.isArray(user.roles)) {
    user.roles.forEach((role) => {
      if (typeof role === "string") {
        values.push(role);
      }

      if (typeof role?.name === "string") {
        values.push(role.name);
      }
    });
  }

  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((role) =>
          role
            .trim()
            .toUpperCase()
            .replaceAll(" ", "_")
            .replaceAll("-", "_")
        )
    )
  ];
}

function saveAdministrativeSession({
  token,
  user,
  remember
}) {
  clearAdministrativeSession();

  const storage = remember
    ? localStorage
    : sessionStorage;

  storage.setItem(
    "qsm_admin_token",
    token
  );

  storage.setItem(
    "qsm_admin_user",
    JSON.stringify(user)
  );

  storage.setItem(
    "qsm_admin_remember",
    String(remember)
  );
}

function clearAdministrativeSession() {
  localStorage.removeItem(
    "qsm_admin_token"
  );

  localStorage.removeItem(
    "qsm_admin_user"
  );

  localStorage.removeItem(
    "qsm_admin_remember"
  );

  sessionStorage.removeItem(
    "qsm_admin_token"
  );

  sessionStorage.removeItem(
    "qsm_admin_user"
  );

  sessionStorage.removeItem(
    "qsm_admin_remember"
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

const page = (dark) => ({
  minHeight: "100vh",

  background: dark
    ? `
      radial-gradient(
        circle at 85% 10%,
        rgba(88, 28, 135, 0.24),
        transparent 30%
      ),
      radial-gradient(
        circle at 10% 80%,
        rgba(14, 116, 144, 0.16),
        transparent 28%
      ),
      linear-gradient(
        135deg,
        #020617 0%,
        #050816 46%,
        #000000 100%
      )
    `
    : `
      radial-gradient(
        circle at 85% 10%,
        rgba(139, 92, 246, 0.12),
        transparent 30%
      ),
      linear-gradient(
        135deg,
        #ffffff 0%,
        #f8fafc 50%,
        #eef2ff 100%
      )
    `,

  color: dark
    ? "white"
    : "#0f172a"
});

const shell = {
  minHeight: "100vh",
  padding: "26px 34px",
  display: "flex",
  flexDirection: "column",
  gap: "26px"
};

const topbar = (dark) => ({
  minHeight: "74px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "24px",
  padding: "0 10px",

  background: dark
    ? "rgba(2,6,23,.34)"
    : "rgba(255,255,255,.42)",

  borderRadius: "22px",
  border: dark
    ? "1px solid rgba(148,163,184,.10)"
    : "1px solid rgba(15,23,42,.07)",

  backdropFilter: "blur(22px)"
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

  background: dark
    ? "linear-gradient(135deg, rgba(56,189,248,.15), rgba(139,92,246,.18))"
    : "rgba(124,58,237,.10)",

  border: dark
    ? "1px solid rgba(139,92,246,.34)"
    : "1px solid rgba(124,58,237,.18)",

  boxShadow:
    "0 16px 40px rgba(139,92,246,.12)"
});

const brandTitle = (dark) => ({
  display: "block",
  color: dark
    ? "white"
    : "#0f172a",
  fontSize: "30px",
  fontWeight: "950",
  lineHeight: "30px"
});

const brandSub = (dark) => ({
  color: dark
    ? "#cbd5e1"
    : "#64748b",
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
  color: dark
    ? "#e5e7eb"
    : "#334155",
  textDecoration: "none",
  fontWeight: "800"
});

const topActions = {
  display: "flex",
  alignItems: "center",
  gap: "12px"
};

const themeButton = (dark) => ({
  border: dark
    ? "1px solid rgba(148,163,184,.18)"
    : "1px solid rgba(15,23,42,.12)",

  background: dark
    ? "rgba(15,23,42,.72)"
    : "white",

  color: dark
    ? "white"
    : "#0f172a",

  borderRadius: "999px",
  padding: "14px 18px",
  cursor: "pointer",
  fontWeight: "900"
});

const returnButton = (dark) => ({
  color: dark
    ? "#e9d5ff"
    : "#6d28d9",

  background: dark
    ? "rgba(139,92,246,.10)"
    : "rgba(124,58,237,.08)",

  border: dark
    ? "1px solid rgba(139,92,246,.28)"
    : "1px solid rgba(124,58,237,.18)",

  padding: "14px 20px",
  borderRadius: "16px",
  textDecoration: "none",
  fontWeight: "900"
});

const grid = {
  flex: 1,
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.35fr) minmax(410px, .9fr)",
  gap: "34px",
  alignItems: "stretch"
};

const visualPanel = (dark) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: "34px",
  minHeight: "750px",

  backgroundImage: `
    linear-gradient(
      90deg,
      rgba(2,6,23,.96),
      rgba(2,6,23,.75),
      rgba(2,6,23,.26)
    ),
    url(
      https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=2200&q=90
    )
  `,

  backgroundSize: "cover",
  backgroundPosition: "center",

  border: dark
    ? "1px solid rgba(139,92,246,.22)"
    : "1px solid rgba(15,23,42,.08)",

  boxShadow:
    "0 40px 120px rgba(0,0,0,.40)"
});

const visualOverlay = () => ({
  position: "absolute",
  inset: 0,

  background: `
    radial-gradient(
      circle at 72% 35%,
      rgba(139,92,246,.34),
      transparent 34%
    ),
    radial-gradient(
      circle at 25% 80%,
      rgba(56,189,248,.20),
      transparent 30%
    ),
    linear-gradient(
      180deg,
      rgba(2,6,23,.08),
      rgba(2,6,23,.38)
    )
  `
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

const internalBadge = {
  width: "fit-content",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 16px",
  marginBottom: "26px",

  borderRadius: "18px",

  background:
    "rgba(15,23,42,.72)",

  border:
    "1px solid rgba(139,92,246,.26)",

  color: "white",

  backdropFilter: "blur(18px)"
};

const eyebrow = {
  color: "#35d0c3",
  letterSpacing: "3px",
  fontWeight: "900",
  fontSize: "14px"
};

const title = () => ({
  fontSize:
    "clamp(52px, 5.2vw, 88px)",

  lineHeight: "1",
  letterSpacing: "-4px",
  margin: "20px 0",
  maxWidth: "780px",
  color: "white"
});

const gradientText = {
  display: "inline",

  background:
    "linear-gradient(90deg, #38bdf8, #8b5cf6, #ec4899)",

  WebkitBackgroundClip: "text",
  color: "transparent"
};

const subtitle = () => ({
  color: "#dbeafe",
  fontSize: "19px",
  lineHeight: "32px",
  maxWidth: "720px"
});

const responsibilityBox = {
  maxWidth: "760px",
  marginTop: "28px",
  padding: "18px 20px",
  display: "flex",
  alignItems: "flex-start",
  gap: "15px",

  color: "#fef3c7",

  background:
    "linear-gradient(135deg, rgba(245,158,11,.14), rgba(124,58,237,.08))",

  border:
    "1px solid rgba(245,158,11,.28)",

  borderRadius: "20px",
  backdropFilter: "blur(16px)"
};

const responsibilityIcon = {
  width: "42px",
  height: "42px",
  flexShrink: 0,
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(245,158,11,.14)"
};

const statsRow = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(120px, 1fr))",

  gap: "14px",
  maxWidth: "860px",
  marginTop: "32px"
};

const statCard = () => ({
  minHeight: "128px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",

  background:
    "rgba(15,23,42,.68)",

  border:
    "1px solid rgba(148,163,184,.16)",

  borderRadius: "22px",
  padding: "18px",
  color: "white",
  backdropFilter: "blur(16px)"
});

const statIcon = {
  fontSize: "25px",
  marginBottom: "8px"
};

const trustBar = () => ({
  marginTop: "26px",
  display: "flex",
  flexWrap: "wrap",
  gap: "16px",
  width: "fit-content",
  padding: "14px 18px",
  borderRadius: "18px",

  background:
    "rgba(15,23,42,.72)",

  border:
    "1px solid rgba(148,163,184,.16)",

  color: "#e5e7eb",
  backdropFilter: "blur(14px)"
});

const card = (dark) => ({
  width: "100%",
  maxWidth: "620px",
  alignSelf: "center",
  justifySelf: "center",

  background: dark
    ? "rgba(15,23,42,.76)"
    : "rgba(255,255,255,.92)",

  border: dark
    ? "1px solid rgba(139,92,246,.26)"
    : "1px solid rgba(15,23,42,.08)",

  borderRadius: "34px",
  padding: "44px",

  color: dark
    ? "white"
    : "#0f172a",

  boxShadow: dark
    ? "0 38px 120px rgba(0,0,0,.38)"
    : "0 38px 120px rgba(15,23,42,.10)",

  backdropFilter: "blur(28px)"
});

const lockIcon = (dark) => ({
  width: "76px",
  height: "76px",
  borderRadius: "26px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 20px",

  background: dark
    ? "linear-gradient(135deg, rgba(56,189,248,.16), rgba(139,92,246,.22))"
    : "linear-gradient(135deg, rgba(56,189,248,.10), rgba(124,58,237,.12))",

  border: dark
    ? "1px solid rgba(139,92,246,.36)"
    : "1px solid rgba(124,58,237,.20)",

  fontSize: "32px"
});

const adminCardBadge = {
  width: "fit-content",
  margin: "0 auto 12px",
  padding: "7px 12px",
  borderRadius: "999px",

  color: "#c4b5fd",

  background:
    "rgba(139,92,246,.12)",

  border:
    "1px solid rgba(139,92,246,.22)",

  fontSize: "12px",
  fontWeight: "950",
  letterSpacing: "1.5px"
};

const cardTitle = (dark) => ({
  color: dark
    ? "white"
    : "#0f172a",

  fontSize: "30px",
  lineHeight: "38px",
  textAlign: "center",
  margin: "0 0 8px"
});

const cardText = (dark) => ({
  color: dark
    ? "#cbd5e1"
    : "#64748b",

  textAlign: "center",
  lineHeight: "24px",
  marginBottom: "30px"
});

const formStyle = {
  display: "grid",
  gap: "14px"
};

const label = (dark) => ({
  color: dark
    ? "#e2e8f0"
    : "#334155",

  fontWeight: "850",
  marginTop: "4px"
});

const inputWrap = (dark) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",

  background: dark
    ? "rgba(2,6,23,.66)"
    : "#f8fafc",

  border: dark
    ? "1px solid rgba(148,163,184,.18)"
    : "1px solid rgba(15,23,42,.10)",

  borderRadius: "16px",
  padding: "0 16px",

  transition:
    "border-color .25s ease, box-shadow .25s ease"
});

const input = (dark) => ({
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: "none",
  outline: "none",

  color: dark
    ? "white"
    : "#0f172a",

  padding: "18px 0",
  fontSize: "15px"
});

const fieldHelp = (dark) => ({
  color: dark
    ? "#64748b"
    : "#64748b",

  lineHeight: "20px",
  marginTop: "-6px"
});

const eyeButton = (dark) => ({
  background: "transparent",
  border: "none",
  cursor: "pointer",

  color: dark
    ? "white"
    : "#0f172a",

  padding: "6px"
});

const formOptions = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  margin: "4px 0 10px"
};

const checkLabel = (dark) => ({
  color: dark
    ? "#cbd5e1"
    : "#475569",

  display: "flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer"
});

const forgotLink = {
  textDecoration: "none",
  color: "#35d0c3",
  fontWeight: "850"
};

const alertBox = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",

  background:
    "rgba(239,68,68,.14)",

  border:
    "1px solid rgba(239,68,68,.35)",

  color: "#fecaca",
  padding: "13px 14px",
  borderRadius: "14px",
  fontWeight: "750",
  lineHeight: "21px"
};

const successBox = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",

  background:
    "rgba(34,197,94,.13)",

  border:
    "1px solid rgba(34,197,94,.34)",

  color: "#bbf7d0",
  padding: "13px 14px",
  borderRadius: "14px",
  fontWeight: "750",
  lineHeight: "21px"
};

const loginSubmit = (loading) => ({
  marginTop: "8px",
  width: "100%",
  border: "none",
  borderRadius: "16px",
  padding: "18px",

  cursor: loading
    ? "not-allowed"
    : "pointer",

  background: loading
    ? "linear-gradient(135deg, #64748b, #475569)"
    : "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",

  color: "white",
  fontWeight: "950",
  fontSize: "16px",
  opacity: loading ? 0.75 : 1,

  boxShadow: loading
    ? "none"
    : "0 18px 50px rgba(139,92,246,.28)"
});

const securityDivider = (dark) => ({
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: "14px",
  alignItems: "center",
  margin: "28px 0 18px",

  color: dark
    ? "#64748b"
    : "#64748b",

  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "1.4px"
});

const adminSecurityGrid = {
  display: "grid",
  gap: "10px"
};

const securityCard = (dark) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",

  padding: "13px 14px",
  borderRadius: "15px",

  background: dark
    ? "rgba(2,6,23,.48)"
    : "#f8fafc",

  border: dark
    ? "1px solid rgba(148,163,184,.13)"
    : "1px solid rgba(15,23,42,.08)",

  transition:
    "border-color .25s ease, background .25s ease"
});

const noAccountBox = (dark) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  marginTop: "18px",
  padding: "14px",

  borderRadius: "15px",

  background: dark
    ? "rgba(14,165,233,.08)"
    : "rgba(14,165,233,.06)",

  border: dark
    ? "1px solid rgba(14,165,233,.20)"
    : "1px solid rgba(14,165,233,.16)",

  color: dark
    ? "#bae6fd"
    : "#075985",

  lineHeight: "21px",
  fontSize: "13px"
});

const warningText = (dark) => ({
  textAlign: "center",
  marginTop: "18px",
  marginBottom: 0,

  color: dark
    ? "#64748b"
    : "#64748b",

  fontSize: "12px",
  lineHeight: "20px"
});

const footer = (dark) => ({
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "center",

  color: dark
    ? "#94a3b8"
    : "#64748b",

  padding: "0 10px 8px"
});

const footerBrand = {
  display: "grid",
  gap: "5px"
};

const safeBadge = (dark) => ({
  display: "flex",
  alignItems: "center",
  gap: "14px",

  background: dark
    ? "rgba(15,23,42,.72)"
    : "white",

  border: dark
    ? "1px solid rgba(148,163,184,.16)"
    : "1px solid rgba(15,23,42,.10)",

  borderRadius: "22px",
  padding: "16px 22px",

  color: dark
    ? "white"
    : "#0f172a"
});

const safeBadgeIcon = {
  width: "42px",
  height: "42px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "14px",

  background:
    "rgba(139,92,246,.12)"
};

export default AdminLogin;