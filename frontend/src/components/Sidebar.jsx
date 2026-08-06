import { API_BASE_URL as QSM_RUNTIME_API_URL } from "../config/runtime";
import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  NavLink,
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  useAuth
} from "../context/AuthContext";

import {
  useSettings
} from "../context/SettingsContext";

const DEFAULT_USER = {
  firstName: "Usuario",
  lastName: "QSM",
  email: "usuario@qsm.com",
  role: "USER",
  trustScore: 50,
  isVerified: false,
  verificationStatus: "NOT_STARTED",
  profilePhoto: "",
  avatar: ""
};

const INTERNAL_ROLES = [
  "ADMIN",
  "SENIOR_ADMIN",
  "AUDITOR",
  "DISPUTE_AGENT",
  "VERIFICATION_AGENT",
  "WAREHOUSE",
  "WAREHOUSE_MANAGER",
  "DELIVERY",
  "DELIVERY_MANAGER",
  "FINANCE",
  "FINANCE_MANAGER",
  "SECURITY",
  "SUPPORT"
];

/* QSM_FASE16_BLOCK1_SIDEBAR_RESTRUCTURE */

function Sidebar({
  counts = {
    purchases: 0,
    sales: 0,
    favorites: 0,
    messages: 0,
    disputes: 0
  }
}) {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    user: authUser,
    logout
  } = useAuth();

  const {
    settings,
    updateSetting,
    saveSettings
  } = useSettings();

  const savedUser =
    useMemo(() => {
      return (
        safeJson(
          localStorage.getItem(
            "qsm_user"
          )
        ) ||
        safeJson(
          localStorage.getItem(
            "user"
          )
        ) ||
        {}
      );
    }, []);

  const user =
    useMemo(() => {
      return {
        ...DEFAULT_USER,
        ...savedUser,
        ...(authUser || {})
      };
    }, [
      authUser,
      savedUser
    ]);

  const collapsed =
    Boolean(
      settings.compactSidebar
    );

  const desktopSidebarWidth =
    collapsed
      ? 96
      : 300;

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--qsm-sidebar-width",
      `${desktopSidebarWidth}px`
    );

    window.dispatchEvent(
      new CustomEvent(
        "qsm-sidebar-width-change",
        {
          detail: {
            width:
              desktopSidebarWidth,
            collapsed
          }
        }
      )
    );
  }, [
    collapsed,
    desktopSidebarWidth
  ]);

  const [
    mobileOpen,
    setMobileOpen
  ] = useState(false);

  const firstName =
    formatPersonName(
      user?.firstName
    ) || "Usuario";

  const lastName =
    formatPersonName(
      user?.lastName
    );

  const fullName =
    [
      firstName,
      lastName
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  const trustScore =
    clampNumber(
      user?.trustScore,
      0,
      100,
      50
    );

  const profilePhoto =
    getProfilePhotoUrl(
      user?.profilePhoto ||
      user?.avatar ||
      user?.photo ||
      ""
    );

  const role =
    String(
      user?.role ||
      "USER"
    ).toUpperCase();

  const isInternalUser =
    INTERNAL_ROLES.includes(
      role
    );

  const isVerified =
    Boolean(
      user?.isVerified
    ) ||
    [
      "APPROVED",
      "VERIFIED"
    ].includes(
      String(
        user?.verificationStatus ||
        ""
      ).toUpperCase()
    );

  const toggleCollapsed = () => {
    const nextValue =
      !collapsed;

    updateSetting(
      "compactSidebar",
      nextValue
    );

    saveSettings({
      ...settings,
      compactSidebar:
        nextValue
    }).catch(
      (error) => {
        console.error(
          "No se pudo guardar el estado del Sidebar:",
          error
        );
      }
    );
  };

  const closeMobile = () => {
    setMobileOpen(false);
  };

  const handleLogout = () => {
    [
      "token",
      "qsm_token",
      "qsm_user",
      "user",
      "admin_token",
      "admin_user"
    ].forEach(
      (key) =>
        localStorage.removeItem(
          key
        )
    );

    if (
      typeof logout ===
      "function"
    ) {
      logout();
    }

    navigate("/", {
      replace: true
    });
  };

  useEffect(() => {
    closeMobile();
  }, [
    location.pathname
  ]);

  useEffect(() => {
    const handleResize = () => {
      if (
        window.innerWidth >
        1100
      ) {
        setMobileOpen(false);
      }
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);
    return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .qsm-sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .qsm-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .qsm-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(var(--qsm-accent-rgb), .22);
          border-radius: 999px;
        }

        .qsm-sidebar-link:hover {
          background:
            linear-gradient(
              135deg,
              rgba(var(--qsm-accent-rgb), .10),
              rgba(139, 92, 246, .10)
            ) !important;

          border-color:
            rgba(var(--qsm-accent-rgb), .20) !important;

          transform:
            translateX(3px);
        }

        .qsm-sidebar-collapsed-link:hover {
          transform:
            translateY(-2px) !important;
        }

        /* QSM_FASE16_BLOCK1_SIDEBAR_RESTRUCTURE */

        .qsm-sidebar-layout-toggle:hover {
          transform:
            translateY(-2px);

          border-color:
            rgba(56, 189, 248, .48) !important;

          background:
            linear-gradient(
              135deg,
              rgba(8, 145, 178, .24),
              rgba(79, 70, 229, .22)
            ) !important;

          box-shadow:
            0 14px 34px
            rgba(2, 132, 199, .14) !important;
        }

        .qsm-sidebar-layout-toggle:hover
        .qsm-sidebar-layout-toggle__icon {
          transform:
            translateX(-2px);
        }

        .qsm-sidebar-layout-toggle__icon {
          transition:
            transform .2s ease;
        }

        /* ===================================================
           QSM_FASE16_BLOCK2_PREMIUM_SVG_ICONS
        =================================================== */

        .qsm-sidebar-brand-icon {
          color: #67e8f9;
          transition:
            transform .24s ease,
            filter .24s ease;
        }

        .qsm-sidebar-brand-icon:hover {
          transform:
            rotate(-5deg)
            scale(1.06);

          filter:
            drop-shadow(
              0 0 10px
              rgba(56, 189, 248, .65)
            );
        }

        .qsm-sidebar-menu-icon {
          position: relative;
          isolation: isolate;
          transition:
            transform .22s ease,
            color .22s ease,
            background .22s ease,
            box-shadow .22s ease;
        }

        .qsm-sidebar-menu-icon::before {
          content: "";
          position: absolute;
          inset: 3px;
          z-index: -1;
          border-radius: inherit;
          background: currentColor;
          opacity: .08;
          filter: blur(7px);
          transition:
            opacity .22s ease,
            transform .22s ease;
        }

        .qsm-sidebar-link:hover
        .qsm-sidebar-menu-icon,
        .qsm-sidebar-collapsed-link:hover
        .qsm-sidebar-menu-icon {
          transform:
            translateY(-2px)
            rotate(-4deg)
            scale(1.08);

          box-shadow:
            0 10px 28px
            rgba(0, 0, 0, .22);
        }

        .qsm-sidebar-link:hover
        .qsm-sidebar-menu-icon::before,
        .qsm-sidebar-collapsed-link:hover
        .qsm-sidebar-menu-icon::before {
          opacity: .22;
          transform: scale(1.2);
        }

        .qsm-sidebar-menu-icon.tone-cyan {
          color: #22d3ee !important;
          background:
            rgba(34, 211, 238, .10) !important;
        }

        .qsm-sidebar-menu-icon.tone-purple {
          color: #a78bfa !important;
          background:
            rgba(167, 139, 250, .10) !important;
        }

        .qsm-sidebar-menu-icon.tone-green {
          color: #34d399 !important;
          background:
            rgba(52, 211, 153, .10) !important;
        }

        .qsm-sidebar-menu-icon.tone-blue {
          color: #60a5fa !important;
          background:
            rgba(96, 165, 250, .10) !important;
        }

        .qsm-sidebar-menu-icon.tone-gold {
          color: #fbbf24 !important;
          background:
            rgba(251, 191, 36, .10) !important;
        }

        .qsm-sidebar-menu-icon.tone-pink {
          color: #f472b6 !important;
          background:
            rgba(244, 114, 182, .10) !important;
        }

        .qsm-sidebar-menu-icon.tone-sky {
          color: #38bdf8 !important;
          background:
            rgba(56, 189, 248, .10) !important;
        }

        .qsm-sidebar-menu-icon.tone-teal {
          color: #2dd4bf !important;
          background:
            rgba(45, 212, 191, .10) !important;
        }

        .qsm-sidebar-menu-icon.tone-red {
          color: #fb7185 !important;
          background:
            rgba(251, 113, 133, .10) !important;
        }

        .qsm-sidebar-menu-icon.tone-slate {
          color: #cbd5e1 !important;
          background:
            rgba(203, 213, 225, .08) !important;
        }

        .qsm-sidebar-menu-icon.tone-violet {
          color: #c084fc !important;
          background:
            rgba(192, 132, 252, .10) !important;
        }

        /* ===================================================
           QSM_FASE16_BLOCK3_PREMIUM_PROFILE_SECURITY
           PERFIL Y SEGURIDAD
        =================================================== */

        .qsm-sidebar-user-card {
          position: relative;
          overflow: hidden;
          isolation: isolate;

          transition:
            transform .22s ease,
            border-color .22s ease,
            box-shadow .22s ease,
            background .22s ease;
        }

        .qsm-sidebar-user-card::before {
          content: "";
          position: absolute;
          top: -55px;
          right: -45px;
          z-index: -1;

          width: 120px;
          height: 120px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(56, 189, 248, .22),
              rgba(139, 92, 246, .10) 42%,
              transparent 72%
            );

          pointer-events: none;
        }

        .qsm-sidebar-user-card::after {
          content: "";
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: 0;

          height: 1px;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(56, 189, 248, .42),
              rgba(139, 92, 246, .34),
              transparent
            );

          opacity: .65;
        }

        .qsm-sidebar-user-card:hover {
          transform:
            translateY(-2px);

          border-color:
            rgba(56, 189, 248, .38) !important;

          background:
            linear-gradient(
              135deg,
              rgba(15, 23, 42, .94),
              rgba(30, 27, 75, .54)
            ) !important;

          box-shadow:
            0 20px 50px
            rgba(0, 0, 0, .25),
            0 0 28px
            rgba(56, 189, 248, .07) !important;
        }

        .qsm-sidebar-user-card:hover
        [style*="border-radius: 50%"] {
          filter:
            drop-shadow(
              0 0 9px
              rgba(56, 189, 248, .34)
            );
        }

        .qsm-sidebar-profile-status {
          width: fit-content;
          max-width: 100%;

          display: inline-flex;
          align-items: center;
          gap: 5px;

          margin-top: 1px;
          padding: 3px 7px;

          border-radius: 999px;

          font-size: 7px;
          line-height: 10px;
          font-weight: 850;
        }

        .qsm-sidebar-profile-status > span {
          width: 13px;
          height: 13px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          font-size: 7px;
          font-weight: 950;
        }

        .qsm-sidebar-profile-status > strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .qsm-sidebar-profile-status.is-verified {
          border:
            1px solid
            rgba(34, 197, 94, .24);

          background:
            rgba(22, 101, 52, .13);

          color:
            #86efac;
        }

        .qsm-sidebar-profile-status.is-verified
        > span {
          background:
            rgba(34, 197, 94, .22);

          color:
            #bbf7d0;
        }

        .qsm-sidebar-profile-status.is-pending {
          border:
            1px solid
            rgba(245, 158, 11, .24);

          background:
            rgba(146, 64, 14, .12);

          color:
            #fbbf24;
        }

        .qsm-sidebar-profile-status.is-pending
        > span {
          background:
            rgba(245, 158, 11, .20);

          color:
            #fde68a;
        }


        /* ===================================================
           QSM_FASE16_BLOCK4_FOOTER_CONTROLS_POLISH
           CONTROLES INFERIORES
        =================================================== */

        .qsm-sidebar-footer-controls {
          position: relative;

          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;

          width: 100%;

          padding: 8px;

          border:
            1px solid rgba(148, 163, 184, .10);

          border-radius: 17px;

          background:
            linear-gradient(
              145deg,
              rgba(15, 23, 42, .72),
              rgba(2, 6, 23, .58)
            );

          box-shadow:
            inset 0 0 18px
            rgba(56, 189, 248, .018);
        }

        .qsm-sidebar-footer-action {
          position: relative;

          width: 100% !important;
          min-height: 48px !important;

          display: flex !important;
          align-items: center !important;

          border-radius: 13px !important;

          overflow: visible;

          transition:
            transform .2s ease,
            border-color .2s ease,
            background .2s ease,
            box-shadow .2s ease !important;
        }

        .qsm-sidebar-footer-action:hover {
          transform:
            translateY(-2px);
        }

        .qsm-sidebar-footer-action--logout:hover {
          border-color:
            rgba(248, 113, 113, .48) !important;

          background:
            linear-gradient(
              135deg,
              rgba(153, 27, 27, .30),
              rgba(76, 5, 25, .25)
            ) !important;

          box-shadow:
            0 13px 32px
            rgba(127, 29, 29, .18) !important;
        }

        .qsm-sidebar-footer-action--toggle:hover {
          border-color:
            rgba(56, 189, 248, .50) !important;

          background:
            linear-gradient(
              135deg,
              rgba(8, 145, 178, .25),
              rgba(79, 70, 229, .23)
            ) !important;

          box-shadow:
            0 13px 32px
            rgba(2, 132, 199, .15) !important;
        }

        .qsm-sidebar-footer-tooltip {
          position: absolute;

          top: 50%;
          left: calc(100% + 14px);

          min-width: 132px;

          padding: 8px 10px;

          transform:
            translate(-7px, -50%);

          border:
            1px solid
            rgba(56, 189, 248, .22);

          border-radius: 10px;

          background:
            rgba(5, 12, 28, .98);

          color:
            #e2e8f0;

          font-size:
            9px;

          font-weight:
            850;

          text-align:
            center;

          white-space:
            nowrap;

          opacity: 0;
          visibility: hidden;

          box-shadow:
            0 17px 40px
            rgba(0, 0, 0, .42);

          pointer-events:
            none;

          transition:
            opacity .18s ease,
            visibility .18s ease,
            transform .18s ease;

          z-index: 2100;
        }

        .qsm-sidebar-footer-action:hover
        .qsm-sidebar-footer-tooltip {
          opacity: 1;
          visibility: visible;

          transform:
            translate(0, -50%);
        }

        /*
          En modo cerrado los dos botones conservan exactamente
          la misma medida y alineación.
        */

        .qsm-desktop-sidebar[style*="96px"]
        .qsm-sidebar-footer-controls {
          padding: 6px;
          gap: 7px;
        }

        .qsm-desktop-sidebar[style*="96px"]
        .qsm-sidebar-footer-action {
          min-height: 52px !important;

          justify-content:
            center !important;

          padding:
            10px !important;

          border-radius:
            15px !important;
        }

        @media (max-width: 1100px) {
          .qsm-sidebar-footer-tooltip {
            display: none;
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .qsm-sidebar-footer-action,
          .qsm-sidebar-footer-tooltip {
            transition:
              none !important;

            transform:
              none !important;
          }
        }

        .qsm-sidebar-security-banner {
          position: relative;
          overflow: hidden;
          isolation: isolate;

          transition:
            transform .2s ease,
            border-color .2s ease,
            background .2s ease;
        }

        .qsm-sidebar-security-banner::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;

          background:
            linear-gradient(
              110deg,
              transparent,
              rgba(56, 189, 248, .055),
              rgba(139, 92, 246, .07),
              transparent
            );

          transform:
            translateX(-100%);

          transition:
            transform .65s ease;
        }

        .qsm-sidebar-security-banner:hover {
          transform:
            translateY(-1px);

          border-color:
            rgba(56, 189, 248, .24) !important;

          background:
            rgba(14, 116, 144, .075) !important;
        }

        .qsm-sidebar-security-banner:hover::before {
          transform:
            translateX(100%);
        }

        .qsm-sidebar-security-banner__icon {
          color:
            #67e8f9;

          box-shadow:
            inset 0 0 15px
            rgba(56, 189, 248, .08);

          transition:
            transform .22s ease,
            filter .22s ease;
        }

        .qsm-sidebar-security-banner:hover
        .qsm-sidebar-security-banner__icon {
          transform:
            rotate(-5deg)
            scale(1.06);

          filter:
            drop-shadow(
              0 0 8px
              rgba(56, 189, 248, .48)
            );
        }

        .qsm-sidebar-security-banner strong {
          display: block;

          color:
            #cbd5e1;

          font-size:
            8px;

          line-height:
            12px;
        }

        .qsm-sidebar-security-banner p {
          margin:
            3px 0 0;

          color:
            #64748b;

          font-size:
            7px;

          line-height:
            11px;
        }

        .qsm-sidebar-user-card--mobile {
          min-height: 94px;
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .qsm-sidebar-user-card,
          .qsm-sidebar-security-banner,
          .qsm-sidebar-security-banner::before,
          .qsm-sidebar-security-banner__icon {
            transition:
              none !important;

            transform:
              none !important;
          }
        }

        .qsm-sidebar-link[aria-current="page"]
        .qsm-sidebar-menu-icon,
        .qsm-sidebar-collapsed-link[aria-current="page"]
        .qsm-sidebar-menu-icon {
          box-shadow:
            0 0 0 1px
            currentColor,
            0 0 20px
            color-mix(
              in srgb,
              currentColor 34%,
              transparent
            );
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .qsm-sidebar-brand-icon,
          .qsm-sidebar-menu-icon,
          .qsm-sidebar-menu-icon::before {
            transition: none !important;
            transform: none !important;
          }
        }

        .qsm-mobile-sidebar-close-action:hover {
          border-color:
            rgba(56, 189, 248, .48) !important;

          background:
            linear-gradient(
              135deg,
              rgba(8, 145, 178, .23),
              rgba(79, 70, 229, .22)
            ) !important;
        }

        .qsm-sidebar-tooltip {
          opacity: 0;
          visibility: hidden;
          transform: translateX(-6px);
          transition:
            opacity .2s ease,
            visibility .2s ease,
            transform .2s ease;
        }

        .qsm-sidebar-tooltip-wrapper:hover
        .qsm-sidebar-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateX(0);
        }

        @media (max-width: 1100px) {
          .qsm-desktop-sidebar {
            display: none !important;
          }

          .qsm-mobile-sidebar-button {
            display: flex !important;
          }
        }

        @media (min-width: 1101px) {
          .qsm-mobile-sidebar-button,
          .qsm-mobile-sidebar-overlay,
          .qsm-mobile-sidebar-panel {
            display: none !important;
          }
        }

        @media (max-width: 560px) {
          .qsm-mobile-sidebar-panel {
            width: calc(100vw - 24px) !important;
            left: 12px !important;
            top: 12px !important;
            bottom: 12px !important;
            border-radius: 24px !important;
          }
        }
      `}</style>

      <aside
        className="qsm-desktop-sidebar"
        style={sidebar(collapsed)}
      >
        <div style={sidebarTop}>
          <Link
            to="/dashboard"
            style={brand(collapsed)}
            onClick={closeMobile}
          >
            <div
              className="qsm-sidebar-brand-icon"
              style={brandIcon(collapsed)}
            >
              <SidebarIcon
                name="shield"
                size={
                  collapsed
                    ? 29
                    : 30
                }
              />
            </div>

            {!collapsed && (
              <div style={brandText}>
                <strong style={brandTitle}>
                  QSM
                </strong>

                <span style={brandSub}>
                  Quick Secure Market
                </span>
              </div>
            )}
          </Link>
        </div>

        <div
          className="qsm-sidebar-scroll"
          style={sidebarScroll}
        >
          <SidebarSection
            title="NAVEGACIÓN PRINCIPAL"
            collapsed={collapsed}
          >
            <SidebarLink
              to="/dashboard"
              icon="home"
              tone="cyan"
              label="Inicio"
              description="Dashboard"
              collapsed={collapsed}
            />

            <SidebarLink
              to="/marketplace"
              icon="store"
              tone="purple"
              label="Marketplace"
              description="Explorar productos"
              collapsed={collapsed}
            />

            <SidebarLink
              to="/new-product"
              icon="plusBox"
              tone="green"
              label="Publicar producto"
              description="Vender de forma segura"
              collapsed={collapsed}
            />
          </SidebarSection>

          <SidebarDivider
            collapsed={collapsed}
          />

          <SidebarSection
            title="COMPRAS Y VENTAS"
            collapsed={collapsed}
          >
            <SidebarLink
              to="/orders"
              icon="package"
              tone="blue"
              label="Mis compras"
              description="Órdenes y envíos"
              count={counts?.purchases}
              collapsed={collapsed}
            />

            <SidebarLink
              to="/sales"
              icon="trend"
              tone="gold"
              label="Mis ventas"
              description="Tus publicaciones"
              count={counts?.sales}
              collapsed={collapsed}
            />

            <SidebarLink
              to="/favorites"
              icon="heart"
              tone="pink"
              label="Favoritos"
              description="Productos guardados"
              count={counts?.favorites}
              collapsed={collapsed}
            />

            <SidebarLink
              to="/messages"
              icon="message"
              tone="sky"
              label="Messenger"
              description="Centro de conversaciones"
              count={counts?.messages}
              collapsed={collapsed}
            />
          </SidebarSection>

          <SidebarDivider
            collapsed={collapsed}
          />

          <SidebarSection
            title="SEGURIDAD QSM"
            collapsed={collapsed}
          >
            <SidebarLink
              to="/complete-profile"
              icon="verified"
              tone="teal"
              label="Verificación QSM"
              description="Completa tu perfil"
              badge={
                isVerified
                  ? "LISTO"
                  : "NUEVO"
              }
              badgeType={
                isVerified
                  ? "success"
                  : "purple"
              }
              collapsed={collapsed}
            />

            <SidebarLink
              to="/disputes"
              icon="scale"
              tone="red"
              label="Centro de reclamos"
              description="Disputas y mediación"
              count={counts?.disputes}
              countType="warning"
              collapsed={collapsed}
            />

            <SidebarLink
              to="/settings"
              icon="settings"
              tone="slate"
              label="Configuración"
              description="Cuenta y privacidad"
              collapsed={collapsed}
            />
          </SidebarSection>

          {isInternalUser && (
            <>
              <SidebarDivider
                collapsed={collapsed}
              />

              <SidebarSection
                title="BACKOFFICE"
                collapsed={collapsed}
              >
                <SidebarLink
                  to="/admin"
                  icon="command"
              tone="violet"
                  label="BackOffice QSM"
                  description={formatRole(role)}
                  badge="INTERNO"
                  badgeType="danger"
                  collapsed={collapsed}
                  highlighted
                />
              </SidebarSection>
            </>
          )}
        </div>

        <div style={sidebarBottom}>
          <Link
            to="/profile"
            className="qsm-sidebar-user-card"
            style={userCard(collapsed)}
            title={
              collapsed
                ? fullName
                : undefined
            }
          >
            <SidebarAvatar
              photo={profilePhoto}
              name={fullName}
              verified={isVerified}
              size={
                collapsed
                  ? 48
                  : 58
              }
            />

            {!collapsed && (
              <div style={userInfo}>
                <div style={userNameRow}>
                  <strong style={userName}>
                    {fullName}
                  </strong>

                  {isVerified && (
                    <span
                      style={verifiedMiniBadge}
                      title="Usuario verificado"
                    >
                      ✓
                    </span>
                  )}
                </div>

                <span style={userRole}>
                  {formatRole(role)}
                </span>

                <div
                  className={
                    `qsm-sidebar-profile-status ${
                      isVerified
                        ? "is-verified"
                        : "is-pending"
                    }`
                  }
                >
                  <span aria-hidden="true">
                    {isVerified
                      ? "✓"
                      : "!"}
                  </span>

                  <strong>
                    {isVerified
                      ? "Identidad verificada"
                      : "Verificación pendiente"}
                  </strong>
                </div>

                <div style={trustHeader}>
                  <span style={userMeta}>
                    Confianza
                  </span>

                  <strong style={trustValue}>
                    {trustScore}/100
                  </strong>
                </div>

                <div style={trustBar}>
                  <div
                    style={{
                      ...trustFill,
                      width:
                        `${trustScore}%`
                    }}
                  />
                </div>
              </div>
            )}

            {!collapsed && (
              <span style={userArrow}>
                ›
              </span>
            )}
          </Link>

          <div className="qsm-sidebar-footer-controls">
          <button
            type="button"
            onClick={handleLogout}
            className="qsm-sidebar-footer-action qsm-sidebar-footer-action--logout"
            style={logoutButton(collapsed)}
            title={
              collapsed
                ? "Cerrar sesión"
                : undefined
            }
          >
            <span style={logoutIcon}>
              <SidebarIcon
                name="logout"
                size={19}
              />
            </span>

            {!collapsed && (
              <span>
                Cerrar sesión
              </span>
            )}

            {collapsed && (
              <span className="qsm-sidebar-footer-tooltip">
                Cerrar sesión
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={toggleCollapsed}
            className="qsm-sidebar-footer-action qsm-sidebar-layout-toggle qsm-sidebar-footer-action--toggle"
            style={sidebarToggleButton(collapsed)}
            title={
              collapsed
                ? "Desplegar menú"
                : "Cerrar menú"
            }
            aria-label={
              collapsed
                ? "Desplegar menú lateral"
                : "Cerrar menú lateral"
            }
            aria-expanded={
              !collapsed
            }
          >
            <span
              className="qsm-sidebar-layout-toggle__icon"
              style={sidebarToggleIcon}
              aria-hidden="true"
            >
              <SidebarIcon
                name={
                  collapsed
                    ? "expand"
                    : "collapse"
                }
                size={20}
              />
            </span>

            {!collapsed && (
              <span>
                Cerrar menú
              </span>
            )}

            {collapsed && (
              <span className="qsm-sidebar-footer-tooltip">
                Desplegar menú
              </span>
            )}
          </button>
        </div>

          {!collapsed && (
            <div
              className="qsm-sidebar-security-banner"
              style={securityMessage}
            >
              <span
                className="qsm-sidebar-security-banner__icon"
                style={securityMessageIcon}
              >
                <SidebarIcon
                  name="shield"
                  size={18}
                />
              </span>

              <div>
                <strong>
                  QSM protege tus operaciones
                </strong>

                <p>
                  Tu seguridad es nuestra prioridad.
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <button
        type="button"
        className="qsm-mobile-sidebar-button"
        onClick={() =>
          setMobileOpen(true)
        }
        style={mobileMenuButton}
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {mobileOpen && (
        <>
          <div
            className="qsm-mobile-sidebar-overlay"
            style={mobileOverlay}
            onClick={closeMobile}
          />

          <aside
            className="qsm-mobile-sidebar-panel"
            style={mobileSidebar}
          >
            <div style={mobileHeader}>
              <Link
                to="/dashboard"
                style={mobileBrand}
                onClick={closeMobile}
              >
                <div
                  className="qsm-sidebar-brand-icon"
                  style={mobileBrandIcon}
                >
                  <SidebarIcon
                    name="shield"
                    size={24}
                  />
                </div>

                <div>
                  <strong style={mobileBrandTitle}>
                    QSM
                  </strong>

                  <span style={mobileBrandSub}>
                    Quick Secure Market
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={closeMobile}
                style={mobileCloseButton}
                aria-label="Cerrar menú"
              >
                ×
              </button>
            </div>

            <div
              className="qsm-sidebar-scroll"
              style={mobileScroll}
            >
              <SidebarSection
                title="NAVEGACIÓN PRINCIPAL"
                collapsed={false}
              >
                <SidebarLink
                  to="/dashboard"
                  icon="home"
              tone="cyan"
                  label="Inicio"
                  description="Dashboard"
                  collapsed={false}
                  onNavigate={closeMobile}
                />

                <SidebarLink
                  to="/marketplace"
                  icon="store"
              tone="purple"
                  label="Marketplace"
                  description="Explorar productos"
                  collapsed={false}
                  onNavigate={closeMobile}
                />

                <SidebarLink
                  to="/new-product"
                  icon="plusBox"
              tone="green"
                  label="Publicar producto"
                  description="Vender de forma segura"
                  collapsed={false}
                  onNavigate={closeMobile}
                />
              </SidebarSection>

              <SidebarDivider
                collapsed={false}
              />

              <SidebarSection
                title="COMPRAS Y VENTAS"
                collapsed={false}
              >
                <SidebarLink
                  to="/orders"
                  icon="package"
              tone="blue"
                  label="Mis compras"
                  description="Órdenes y envíos"
                  count={counts?.purchases}
                  collapsed={false}
                  onNavigate={closeMobile}
                />

                <SidebarLink
                  to="/sales"
                  icon="trend"
              tone="gold"
                  label="Mis ventas"
                  description="Tus publicaciones"
                  count={counts?.sales}
                  collapsed={false}
                  onNavigate={closeMobile}
                />

                <SidebarLink
                  to="/favorites"
                  icon="heart"
              tone="pink"
                  label="Favoritos"
                  description="Productos guardados"
                  count={counts?.favorites}
                  collapsed={false}
                  onNavigate={closeMobile}
                />

                <SidebarLink
                  to="/messages"
                  icon="message"
              tone="sky"
                  label="Messenger"
                  description="Centro de conversaciones"
                  count={counts?.messages}
                  collapsed={false}
                  onNavigate={closeMobile}
                />
              </SidebarSection>

              <SidebarDivider
                collapsed={false}
              />

              <SidebarSection
                title="SEGURIDAD QSM"
                collapsed={false}
              >
                <SidebarLink
                  to="/complete-profile"
                  icon="verified"
              tone="teal"
                  label="Verificación QSM"
                  description="Completa tu perfil"
                  badge={
                    isVerified
                      ? "LISTO"
                      : "NUEVO"
                  }
                  badgeType={
                    isVerified
                      ? "success"
                      : "purple"
                  }
                  collapsed={false}
                  onNavigate={closeMobile}
                />

                <SidebarLink
                  to="/disputes"
                  icon="scale"
              tone="red"
                  label="Centro de reclamos"
                  description="Disputas y mediación"
                  count={counts?.disputes}
                  countType="warning"
                  collapsed={false}
                  onNavigate={closeMobile}
                />

                <SidebarLink
                  to="/settings"
                  icon="settings"
              tone="slate"
                  label="Configuración"
                  description="Cuenta y privacidad"
                  collapsed={false}
                  onNavigate={closeMobile}
                />
              </SidebarSection>

              {isInternalUser && (
                <>
                  <SidebarDivider
                    collapsed={false}
                  />

                  <SidebarSection
                    title="BACKOFFICE"
                    collapsed={false}
                  >
                    <SidebarLink
                      to="/admin"
                      icon="command"
              tone="violet"
                      label="BackOffice QSM"
                      description={formatRole(role)}
                      badge="INTERNO"
                      badgeType="danger"
                      collapsed={false}
                      highlighted
                      onNavigate={closeMobile}
                    />
                  </SidebarSection>
                </>
              )}
            </div>

            <div style={mobileBottom}>
              <Link
                to="/profile"
                className="qsm-sidebar-user-card qsm-sidebar-user-card--mobile"
                style={mobileUserCard}
                onClick={closeMobile}
              >
                <SidebarAvatar
                  photo={profilePhoto}
                  name={fullName}
                  verified={isVerified}
                  size={54}
                />

                <div style={userInfo}>
                  <div style={userNameRow}>
                    <strong style={userName}>
                      {fullName}
                    </strong>

                    {isVerified && (
                      <span style={verifiedMiniBadge}>
                        ✓
                      </span>
                    )}
                  </div>

                  <span style={userRole}>
                    {formatRole(role)}
                  </span>

                  <div
                    className={
                      `qsm-sidebar-profile-status ${
                        isVerified
                          ? "is-verified"
                          : "is-pending"
                      }`
                    }
                  >
                    <span aria-hidden="true">
                      {isVerified
                        ? "✓"
                        : "!"}
                    </span>

                    <strong>
                      {isVerified
                        ? "Identidad verificada"
                        : "Verificación pendiente"}
                    </strong>
                  </div>

                  <div style={trustHeader}>
                    <span style={userMeta}>
                      Confianza
                    </span>

                    <strong style={trustValue}>
                      {trustScore}/100
                    </strong>
                  </div>

                  <div style={trustBar}>
                    <div
                      style={{
                        ...trustFill,
                        width:
                          `${trustScore}%`
                      }}
                    />
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                style={mobileLogoutButton}
              >
                <span aria-hidden="true">
                  ⇥
                </span>

                <span>
                  Cerrar sesión
                </span>
              </button>

              <button
                type="button"
                onClick={closeMobile}
                className="qsm-mobile-sidebar-close-action"
                style={mobileSidebarCloseAction}
              >
                <span aria-hidden="true">
                  «
                </span>

                <span>
                  Cerrar menú
                </span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
/*
|--------------------------------------------------------------------------
| Sección del menú
|--------------------------------------------------------------------------
*/

function SidebarSection({
  title,
  collapsed,
  children
}) {
  return (
    <section style={sectionWrapper}>
      {!collapsed && (
        <p style={sectionTitle}>
          {title}
        </p>
      )}

      <div style={sectionLinks}>
        {children}
      </div>
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| Separador
|--------------------------------------------------------------------------
*/

function SidebarDivider({
  collapsed
}) {
  return (
    <div
      style={
        collapsed
          ? collapsedDivider
          : divider
      }
    />
  );
}

/*
|--------------------------------------------------------------------------
| Enlace del Sidebar
|--------------------------------------------------------------------------
*/

function SidebarLink({
  to,
  icon,
  label,
  description,
  count = 0,
  countType = "default",
  badge = "",
  badgeType = "default",
  collapsed = false,
  highlighted = false,
  tone = "cyan",
  onNavigate
}) {
  const safeCount =
    Number(count || 0);

  return (
    <div
      className={
        collapsed
          ? "qsm-sidebar-tooltip-wrapper"
          : ""
      }
      style={linkWrapper}
    >
      <NavLink
        to={to}
        onClick={onNavigate}
        className={
          collapsed
            ? "qsm-sidebar-collapsed-link"
            : "qsm-sidebar-link"
        }
        style={({ isActive }) => ({
          ...menuItem(collapsed),

          ...(isActive
            ? activeMenuItem(
                collapsed
              )
            : {}),

          ...(highlighted
            ? highlightedMenuItem
            : {})
        })}
        title={
          collapsed
            ? label
            : undefined
        }
      >
        <span
          className={`qsm-sidebar-menu-icon tone-${tone}`}
          style={menuIcon(collapsed)}
        >
          <SidebarIcon
            name={icon}
            size={
              collapsed
                ? 22
                : 20
            }
          />
        </span>

        {!collapsed && (
          <>
            <div style={menuText}>
              <strong style={menuLabel}>
                {label}
              </strong>

              {description && (
                <span style={menuDescription}>
                  {description}
                </span>
              )}
            </div>

            <div style={menuRight}>
              {safeCount > 0 && (
                <span
                  style={countBadge(
                    countType
                  )}
                >
                  {safeCount > 99
                    ? "99+"
                    : safeCount}
                </span>
              )}

              {badge && (
                <span
                  style={textBadge(
                    badgeType
                  )}
                >
                  {badge}
                </span>
              )}

              <span style={menuArrow}>
                ›
              </span>
            </div>
          </>
        )}

        {collapsed &&
          safeCount > 0 && (
            <span
              style={collapsedCountBadge(
                countType
              )}
            >
              {safeCount > 9
                ? "9+"
                : safeCount}
            </span>
          )}
      </NavLink>

      {collapsed && (
        <div
          className="qsm-sidebar-tooltip"
          style={sidebarTooltip}
        >
          <strong style={tooltipTitle}>
            {label}
          </strong>

          {description && (
            <span style={tooltipText}>
              {description}
            </span>
          )}

          {safeCount > 0 && (
            <span style={tooltipCount}>
              {safeCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Avatar del Sidebar
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| QSM_FASE16_BLOCK2_PREMIUM_SVG_ICONS
| Iconos SVG internos del Sidebar
|--------------------------------------------------------------------------
*/

/* QSM_FASE16_BLOCK2_PREMIUM_SVG_ICONS */

function SidebarIcon({
  name,
  size = 20
}) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: false
  };

  const icons = {
    shield: (
      <svg {...commonProps}>
        <path d="M12 3 20 6v5c0 5.1-3.2 8.6-8 10-4.8-1.4-8-4.9-8-10V6l8-3Z" />
        <path d="m9.2 12 1.8 1.8 4-4.2" />
      </svg>
    ),

    home: (
      <svg {...commonProps}>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),

    store: (
      <svg {...commonProps}>
        <path d="M4 9h16l-1.3-5H5.3L4 9Z" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
        <path d="M4 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3" />
      </svg>
    ),

    plusBox: (
      <svg {...commonProps}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),

    package: (
      <svg {...commonProps}>
        <path d="m4 7 8-4 8 4-8 4-8-4Z" />
        <path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z" />
        <path d="M12 11v10" />
      </svg>
    ),

    trend: (
      <svg {...commonProps}>
        <path d="M4 18V6" />
        <path d="M4 18h16" />
        <path d="m7 14 4-4 3 3 5-6" />
        <path d="M16 7h3v3" />
      </svg>
    ),

    heart: (
      <svg {...commonProps}>
        <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
      </svg>
    ),

    message: (
      <svg {...commonProps}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    ),

    verified: (
      <svg {...commonProps}>
        <path d="M12 3 20 6v5c0 5.1-3.2 8.6-8 10-4.8-1.4-8-4.9-8-10V6l8-3Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </svg>
    ),

    scale: (
      <svg {...commonProps}>
        <path d="M12 3v18M5 6h14" />
        <path d="m7 6-4 7h8L7 6Z" />
        <path d="m17 6-4 7h8l-4-7Z" />
        <path d="M8 21h8" />
      </svg>
    ),

    settings: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </svg>
    ),

    command: (
      <svg {...commonProps}>
        <path d="M9 6V5a3 3 0 1 0-3 3h1" />
        <path d="M15 6V5a3 3 0 1 1 3 3h-1" />
        <path d="M9 18v1a3 3 0 1 1-3-3h1" />
        <path d="M15 18v1a3 3 0 1 0 3-3h-1" />
        <rect x="8" y="8" width="8" height="8" rx="2" />
      </svg>
    ),

    logout: (
      <svg {...commonProps}>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
      </svg>
    ),

    collapse: (
      <svg {...commonProps}>
        <path d="m13 17-5-5 5-5" />
        <path d="m18 17-5-5 5-5" />
      </svg>
    ),

    expand: (
      <svg {...commonProps}>
        <path d="m6 7 5 5-5 5" />
        <path d="m11 7 5 5-5 5" />
      </svg>
    )
  };

  return (
    icons[name] ||
    icons.shield
  );
}

/* QSM_FASE16_BLOCK3_PREMIUM_PROFILE_SECURITY */

function SidebarAvatar({
  photo,
  name,
  verified,
  size = 58
}) {
  const [
    imageError,
    setImageError
  ] = useState(false);

  const safeName =
    String(
      name || "Usuario"
    ).trim();

  const initials =
    getInitials(
      safeName
    );

  return (
    <div
      style={{
        ...sidebarAvatar,
        width: size,
        height: size,
        minWidth: size,
        fontSize:
          Math.max(
            15,
            Math.round(
              size * 0.31
            )
          )
      }}
    >
      {photo &&
      !imageError ? (
        <img
          src={photo}
          alt={`Foto de perfil de ${safeName}`}
          style={sidebarAvatarImage}
          onError={() =>
            setImageError(true)
          }
        />
      ) : (
        initials
      )}

      {verified && (
        <span style={avatarVerified}>
          ✓
        </span>
      )}

      <span style={onlineIndicator} />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| JSON seguro
|--------------------------------------------------------------------------
*/

function safeJson(value) {
  try {
    return value
      ? JSON.parse(value)
      : null;
  } catch {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Nombre capitalizado
|--------------------------------------------------------------------------
*/

function formatPersonName(
  value
) {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase(
      "es-DO"
    )
    .replace(
      /(^|[\s'-])\p{L}/gu,
      (letter) =>
        letter.toLocaleUpperCase(
          "es-DO"
        )
    );
}

/*
|--------------------------------------------------------------------------
| Iniciales
|--------------------------------------------------------------------------
*/

function getInitials(
  value
) {
  const words =
    String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length === 0
  ) {
    return "U";
  }

  if (
    words.length === 1
  ) {
    return words[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    words[0]
      .charAt(0)
      .toUpperCase() +
    words[
      words.length - 1
    ]
      .charAt(0)
      .toUpperCase()
  );
}

/*
|--------------------------------------------------------------------------
| Número seguro
|--------------------------------------------------------------------------
*/

function clampNumber(
  value,
  minimum,
  maximum,
  fallback = 0
) {
  const parsedValue =
    Number(value);

  if (
    !Number.isFinite(
      parsedValue
    )
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      parsedValue
    )
  );
}

/*
|--------------------------------------------------------------------------
| Foto de perfil persistente
|--------------------------------------------------------------------------
*/

function getProfilePhotoUrl(
  value
) {
  if (!value) {
    return "";
  }

  const rawValue =
    typeof value ===
    "string"
      ? value
      : value?.url ||
        value?.path ||
        value?.secure_url ||
        value?.imageUrl ||
        "";

  if (!rawValue) {
    return "";
  }

  const cleanValue =
    String(rawValue)
      .trim()
      .replaceAll(
        "&#x2F;",
        "/"
      )
      .replaceAll(
        "&amp;",
        "&"
      )
      .replace(/\\/g, "/");

  if (
    cleanValue.startsWith(
      "http://"
    ) ||
    cleanValue.startsWith(
      "https://"
    ) ||
    cleanValue.startsWith(
      "data:image/"
    ) ||
    cleanValue.startsWith(
      "blob:"
    )
  ) {
    return cleanValue;
  }

  const apiOrigin =
    getApiOrigin();

  if (
    cleanValue.startsWith(
      "/uploads/"
    )
  ) {
    return `${apiOrigin}${cleanValue}`;
  }

  if (
    cleanValue.startsWith(
      "uploads/"
    )
  ) {
    return `${apiOrigin}/${cleanValue}`;
  }

  return `${apiOrigin}/uploads/profiles/${cleanValue}`;
}

/*
|--------------------------------------------------------------------------
| Origen del backend
|--------------------------------------------------------------------------
*/

function getApiOrigin() {
  const configuredUrl =
    import.meta.env
      .VITE_API_URL ||
    QSM_RUNTIME_API_URL;

  return String(
    configuredUrl
  )
    .trim()
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
}

/*
|--------------------------------------------------------------------------
| Rol legible
|--------------------------------------------------------------------------
*/

function formatRole(
  value
) {
  const role =
    String(
      value || "USER"
    ).toUpperCase();

  const map = {
    USER:
      "Usuario QSM",

    ADMIN:
      "Administrador",

    SENIOR_ADMIN:
      "Senior Admin",

    AUDITOR:
      "Auditor",

    DISPUTE_AGENT:
      "Agente de disputas",

    VERIFICATION_AGENT:
      "Agente de verificación",

    WAREHOUSE:
      "Agente de almacén",

    WAREHOUSE_MANAGER:
      "Encargado de almacén",

    DELIVERY:
      "Agente de delivery",

    DELIVERY_MANAGER:
      "Encargado de delivery",

    FINANCE:
      "Agente de finanzas",

    FINANCE_MANAGER:
      "Encargado de finanzas",

    SECURITY:
      "Seguridad",

    SUPPORT:
      "Soporte"
  };

  return (
    map[role] ||
    role
  );
}

/*
|--------------------------------------------------------------------------
| Color del contador
|--------------------------------------------------------------------------
*/

function countBadge(
  type
) {
  const map = {
    warning: {
      background:
        "rgba(245, 158, 11, .16)",
      border:
        "1px solid rgba(245, 158, 11, .30)",
      color:
        "#fbbf24"
    },

    danger: {
      background:
        "rgba(239, 68, 68, .16)",
      border:
        "1px solid rgba(239, 68, 68, .30)",
      color:
        "#fca5a5"
    },

    success: {
      background:
        "rgba(34, 197, 94, .16)",
      border:
        "1px solid rgba(34, 197, 94, .30)",
      color:
        "#86efac"
    },

    default: {
      background:
        "rgba(var(--qsm-accent-rgb), .16)",
      border:
        "1px solid rgba(var(--qsm-accent-rgb), .30)",
      color:
        "var(--qsm-accent)"
    }
  };

  return {
    minWidth: "24px",
    height: "22px",

    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",

    padding: "0 7px",

    borderRadius: "8px",

    fontSize: "9px",
    fontWeight: "950",

    ...(map[type] ||
      map.default)
  };
}

/*
|--------------------------------------------------------------------------
| Badge de texto
|--------------------------------------------------------------------------
*/

function textBadge(
  type
) {
  const map = {
    purple: {
      background:
        "linear-gradient(135deg, #7c3aed, #8b5cf6)",
      color: "#ffffff",
      border:
        "1px solid rgba(167, 139, 250, .36)"
    },

    success: {
      background:
        "rgba(34, 197, 94, .15)",
      color:
        "#86efac",
      border:
        "1px solid rgba(34, 197, 94, .30)"
    },

    danger: {
      background:
        "rgba(239, 68, 68, .14)",
      color:
        "#fca5a5",
      border:
        "1px solid rgba(239, 68, 68, .30)"
    },

    default: {
      background:
        "rgba(var(--qsm-accent-rgb), .14)",
      color:
        "var(--qsm-accent)",
      border:
        "1px solid rgba(var(--qsm-accent-rgb), .28)"
    }
  };

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",

    minHeight: "21px",

    padding: "0 7px",

    borderRadius: "7px",

    fontSize: "7px",
    fontWeight: "950",
    letterSpacing: ".4px",

    ...(map[type] ||
      map.default)
  };
}

/*
|--------------------------------------------------------------------------
| Contador en modo colapsado
|--------------------------------------------------------------------------
*/

function collapsedCountBadge(
  type
) {
  const styles =
    countBadge(type);

  return {
    ...styles,

    position: "absolute",

    top: "4px",
    right: "3px",

    minWidth: "18px",
    height: "18px",

    padding: "0 4px",

    borderRadius: "999px",

    fontSize: "7px",

    boxShadow:
      "0 6px 18px rgba(0, 0, 0, .28)"
  };
}
/*
|--------------------------------------------------------------------------
| Sidebar principal
|--------------------------------------------------------------------------
*/

const sidebar = (
  collapsed
) => ({
  width:
    collapsed
      ? "96px"
      : "300px",

  minWidth:
    collapsed
      ? "96px"
      : "300px",

  height: "100dvh",

  position: "fixed",
  top: 0,
  left: 0,
  bottom: 0,

  display: "flex",
  flexDirection: "column",

  overflow: "visible",

  padding:
    collapsed
      ? "18px 12px"
      : "20px 16px",

  borderRight:
    "1px solid rgba(56, 189, 248, .16)",

  background:
    `
      radial-gradient(
        circle at 15% 5%,
        rgba(var(--qsm-accent-rgb), .12),
        transparent 24%
      ),
      radial-gradient(
        circle at 88% 4%,
        rgba(139, 92, 246, .15),
        transparent 28%
      ),
      linear-gradient(
        180deg,
        rgba(8, 17, 35, .98),
        rgba(2, 6, 23, .995)
      )
    `,

  color: "#ffffff",

  boxShadow:
    "18px 0 60px rgba(0, 0, 0, .18)",

  transition:
    "width var(--qsm-transition), min-width var(--qsm-transition), padding var(--qsm-transition)",

  willChange:
    "width, min-width",

  zIndex: 700
});

/*
|--------------------------------------------------------------------------
| Parte superior
|--------------------------------------------------------------------------
*/

const sidebarTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",

  marginBottom: "12px"
};

const brand = (
  collapsed
) => ({
  minWidth: 0,

  display: "flex",
  alignItems: "center",
  justifyContent:
    collapsed
      ? "center"
      : "flex-start",

  gap: "12px",

  padding:
    collapsed
      ? "4px"
      : "4px 6px",

  color: "#ffffff",

  textDecoration: "none"
});

const brandIcon = (
  collapsed
) => ({
  width:
    collapsed
      ? "56px"
      : "58px",

  height:
    collapsed
      ? "56px"
      : "58px",

  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius:
    collapsed
      ? "18px"
      : "19px",

  border:
    "1px solid rgba(var(--qsm-accent-rgb), .32)",

  background:
    `
      linear-gradient(
        135deg,
        rgba(var(--qsm-accent-rgb), .28),
        rgba(56, 189, 248, .24),
        rgba(139, 92, 246, .28)
      )
    `,

  fontSize:
    collapsed
      ? "28px"
      : "29px",

  boxShadow:
    "0 0 34px rgba(56, 189, 248, .20)"
});

const brandText = {
  minWidth: 0,

  display: "grid",
  gap: "3px"
};

const brandTitle = {
  display: "block",

  color: "#ffffff",

  fontSize: "28px",
  lineHeight: "28px",

  fontWeight: "950",
  letterSpacing: "-1px"
};

const brandSub = {
  color: "var(--qsm-muted)",

  fontSize: "10px",
  fontWeight: "700",

  whiteSpace: "nowrap"
};

const collapseButton = {
  width: "34px",
  height: "34px",
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "11px",

  border:
    "1px solid rgba(139, 92, 246, .24)",

  background:
    "rgba(15, 23, 42, .82)",

  color: "#c4b5fd",

  fontSize: "17px",
  fontWeight: "950",

  cursor: "pointer",

  boxShadow:
    "0 10px 28px rgba(0, 0, 0, .20)"
};

/*
|--------------------------------------------------------------------------
| Scroll del menú
|--------------------------------------------------------------------------
*/

const sidebarScroll = {
  minHeight: 0,
  flex: 1,

  overflowY: "auto",
  overflowX: "hidden",

  padding:
    "8px 2px 12px"
};

const sectionWrapper = {
  display: "grid",
  gap: "8px"
};

const sectionTitle = {
  margin:
    "8px 12px 5px",

  color: "var(--qsm-accent)",

  fontSize: "9px",
  fontWeight: "950",

  letterSpacing: "2.2px",
  textTransform: "uppercase"
};

const sectionLinks = {
  display: "grid",
  gap: "6px"
};

/*
|--------------------------------------------------------------------------
| Enlaces
|--------------------------------------------------------------------------
*/

const linkWrapper = {
  position: "relative"
};

const menuItem = (
  collapsed
) => ({
  position: "relative",

  width: "100%",
  minHeight:
    collapsed
      ? "58px"
      : "58px",

  display: "flex",
  alignItems: "center",
  justifyContent:
    collapsed
      ? "center"
      : "flex-start",

  gap: "11px",

  padding:
    collapsed
      ? "8px"
      : "9px 11px",

  borderRadius:
    collapsed
      ? "16px"
      : "15px",

  border:
    "1px solid transparent",

  background:
    "transparent",

  color: "var(--qsm-text-secondary)",

  textDecoration: "none",

  transition:
    "transform .22s ease, background .22s ease, border-color .22s ease, color .22s ease"
});

const activeMenuItem = (
  collapsed
) => ({
  color: "#ffffff",

  border:
    "1px solid rgba(var(--qsm-accent-rgb), .36)",

  background:
    `
      linear-gradient(
        135deg,
        rgba(var(--qsm-accent-rgb), .26),
        rgba(56, 189, 248, .22),
        rgba(139, 92, 246, .26)
      )
    `,

  boxShadow:
    collapsed
      ? "0 0 30px rgba(var(--qsm-accent-rgb), .18)"
      : "0 14px 40px rgba(var(--qsm-accent-rgb), .12), inset 0 0 22px rgba(139, 92, 246, .08)"
});

const highlightedMenuItem = {
  border:
    "1px solid rgba(248, 113, 113, .24)",

  background:
    "linear-gradient(135deg, rgba(139, 92, 246, .15), rgba(239, 68, 68, .10))"
};

const menuIcon = (
  collapsed
) => ({
  width:
    collapsed
      ? "38px"
      : "34px",

  height:
    collapsed
      ? "38px"
      : "34px",

  flexShrink: 0,

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius:
    collapsed
      ? "12px"
      : "11px",

  background:
    "rgba(var(--qsm-accent-rgb), .08)",

  color: "inherit",

  fontSize:
    collapsed
      ? "21px"
      : "19px",

  fontWeight: "900",

  overflow: "visible"
});

const menuText = {
  minWidth: 0,
  flex: 1,

  display: "grid",
  gap: "3px"
};

const menuLabel = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "inherit",

  fontSize: "12px",
  fontWeight: "900"
};

const menuDescription = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "#64748b",

  fontSize: "9px"
};

const menuRight = {
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  gap: "6px"
};

const menuArrow = {
  color: "#64748b",

  fontSize: "16px"
};

/*
|--------------------------------------------------------------------------
| Separadores
|--------------------------------------------------------------------------
*/

const divider = {
  height: "1px",

  margin: "13px 10px",

  background:
    "linear-gradient(90deg, transparent, rgba(148, 163, 184, .18), transparent)"
};

const collapsedDivider = {
  height: "1px",

  margin: "13px 15px",

  background:
    "rgba(148, 163, 184, .15)"
};

/*
|--------------------------------------------------------------------------
| Tooltip del modo colapsado
|--------------------------------------------------------------------------
*/

const sidebarTooltip = {
  position: "absolute",

  top: "50%",
  left: "calc(100% + 13px)",

  minWidth: "180px",

  display: "grid",
  gap: "4px",

  transform:
    "translate(-6px, -50%)",

  padding: "11px 13px",

  borderRadius: "12px",

  border:
    "1px solid rgba(var(--qsm-accent-rgb), .20)",

  background:
    "rgba(8, 19, 37, .98)",

  boxShadow:
    "0 20px 55px rgba(0, 0, 0, .44)",

  pointerEvents: "none",

  zIndex: 2000
};

const tooltipTitle = {
  color: "var(--qsm-text)",

  fontSize: "11px"
};

const tooltipText = {
  color: "var(--qsm-muted)",

  fontSize: "9px"
};

const tooltipCount = {
  width: "fit-content",

  marginTop: "3px",
  padding: "3px 7px",

  borderRadius: "7px",

  background:
    "rgba(var(--qsm-accent-rgb), .14)",

  color: "var(--qsm-accent)",

  fontSize: "8px",
  fontWeight: "950"
};

/*
|--------------------------------------------------------------------------
| Parte inferior
|--------------------------------------------------------------------------
*/

/* QSM_FASE16_BLOCK4_FOOTER_CONTROLS_POLISH */

const sidebarBottom = {
  position:
    "relative",

  flexShrink:
    0,

  display:
    "grid",

  gap:
    "10px",

  paddingTop:
    "10px",

  borderTop:
    "1px solid rgba(148, 163, 184, .08)",

  background:
    "linear-gradient(180deg, rgba(2, 6, 23, 0), rgba(2, 6, 23, .80) 16%)"
};

const userCard = (
  collapsed
) => ({
  minWidth: 0,

  display: "flex",
  alignItems: "center",
  justifyContent:
    collapsed
      ? "center"
      : "flex-start",

  gap: "12px",

  padding:
    collapsed
      ? "10px"
      : "13px",

  borderRadius:
    collapsed
      ? "18px"
      : "19px",

  border:
    "1px solid rgba(56, 189, 248, .18)",

  background:
    "linear-gradient(135deg, rgba(15, 23, 42, .92), rgba(30, 27, 75, .48))",

  color: "#ffffff",

  textDecoration: "none",

  boxShadow:
    "0 17px 48px rgba(0, 0, 0, .20), inset 0 0 22px rgba(56, 189, 248, .025)"
});

const sidebarAvatar = {
  position: "relative",

  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  overflow: "visible",

  borderRadius: "50%",

  border:
    "2px solid rgba(var(--qsm-accent-rgb), .62)",

  background:
    "linear-gradient(135deg, var(--qsm-accent), #38bdf8, #8b5cf6)",

  color: "#ffffff",

  fontWeight: "950",

  boxShadow:
    "0 0 0 4px rgba(139, 92, 246, .12), 0 0 22px rgba(56, 189, 248, .19), 0 14px 38px rgba(var(--qsm-accent-rgb), .20)",

  transition:
    "transform .22s ease, filter .22s ease"
};

const sidebarAvatarImage = {
  width: "100%",
  height: "100%",

  display: "block",

  borderRadius: "50%",

  objectFit: "cover",
  objectPosition: "center"
};

const avatarVerified = {
  position: "absolute",

  right: "-3px",
  bottom: "5px",

  width: "18px",
  height: "18px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  border:
    "2px solid #081123",

  background: "var(--qsm-accent)",

  color: "#020617",

  fontSize: "9px",
  fontWeight: "950"
};

const onlineIndicator = {
  position: "absolute",

  left: "2px",
  bottom: "2px",

  width: "12px",
  height: "12px",

  borderRadius: "50%",

  border:
    "2px solid #081123",

  background: "#22c55e",

  boxShadow:
    "0 0 12px rgba(34, 197, 94, .65)"
};

const userInfo = {
  minWidth: 0,
  flex: 1,

  display: "grid",
  gap: "4px"
};

const userNameRow = {
  minWidth: 0,

  display: "flex",
  alignItems: "center",
  gap: "6px"
};

const userName = {
  minWidth: 0,

  display: "block",

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "var(--qsm-text)",

  fontSize: "12px",
  fontWeight: "950"
};

const verifiedMiniBadge = {
  width: "17px",
  height: "17px",
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  background: "#38bdf8",

  color: "#020617",

  fontSize: "8px",
  fontWeight: "950"
};

const userRole = {
  color: "var(--qsm-accent)",

  fontSize: "8px",
  fontWeight: "800"
};

const trustHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px"
};

const userMeta = {
  color: "var(--qsm-muted)",

  fontSize: "8px"
};

const trustValue = {
  color: "var(--qsm-accent)",

  fontSize: "9px"
};

const trustBar = {
  width: "100%",
  height: "6px",

  overflow: "hidden",

  borderRadius: "999px",

  background:
    "rgba(148, 163, 184, .15)"
};

const trustFill = {
  height: "100%",

  borderRadius: "999px",

  background:
    "linear-gradient(90deg, var(--qsm-accent), #38bdf8, #8b5cf6)",

  transition:
    "width .4s ease"
};

const userArrow = {
  flexShrink: 0,

  color: "#64748b",

  fontSize: "20px"
};

/*
|--------------------------------------------------------------------------
| Cerrar sesión
|--------------------------------------------------------------------------
*/

const logoutButton = (
  collapsed
) => ({
  width: "100%",
  minHeight:
    collapsed
      ? "52px"
      : "48px",

  display: "flex",
  alignItems: "center",
  justifyContent:
    collapsed
      ? "center"
      : "flex-start",

  gap: "10px",

  lineHeight:
    "1",

  padding:
    collapsed
      ? "10px"
      : "11px 14px",

  borderRadius:
    collapsed
      ? "16px"
      : "14px",

  border:
    "1px solid rgba(248, 113, 113, .28)",

  background:
    "linear-gradient(135deg, rgba(127, 29, 29, .22), rgba(76, 5, 25, .18))",

  color: "#fca5a5",

  fontSize: "11px",
  fontWeight: "900",

  cursor: "pointer"
});

const logoutIcon = {
  fontSize: "19px"
};

/*
|--------------------------------------------------------------------------
| QSM_FASE16_BLOCK1_SIDEBAR_RESTRUCTURE
| Control inferior del Sidebar
|--------------------------------------------------------------------------
*/

const sidebarToggleButton = (
  collapsed
) => ({
  width: "100%",

  minHeight:
    collapsed
      ? "52px"
      : "48px",

  display: "flex",
  alignItems: "center",

  justifyContent:
    collapsed
      ? "center"
      : "flex-start",

  gap: "10px",

  padding:
    collapsed
      ? "10px"
      : "11px 14px",

  borderRadius:
    collapsed
      ? "16px"
      : "14px",

  border:
    "1px solid rgba(56, 189, 248, .26)",

  background:
    "linear-gradient(135deg, rgba(8, 145, 178, .15), rgba(79, 70, 229, .14))",

  color:
    "#7dd3fc",

  fontSize:
    "11px",

  fontWeight:
    "900",

  cursor:
    "pointer",

  boxShadow:
    "0 10px 30px rgba(2, 132, 199, .08)",

  transition:
    "transform .2s ease, border-color .2s ease, background .2s ease, box-shadow .2s ease"
});

const sidebarToggleIcon = {
  minWidth:
    "19px",

  display:
    "inline-flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  color:
    "#67e8f9",

  fontSize:
    "19px",

  fontWeight:
    "950"
};

/*
|--------------------------------------------------------------------------
| Mensaje de seguridad
|--------------------------------------------------------------------------
*/

const securityMessage = {
  display: "grid",

  gridTemplateColumns:
    "34px minmax(0, 1fr)",

  alignItems:
    "center",

  gap: "10px",

  padding:
    "10px 11px",

  borderRadius:
    "14px",

  border:
    "1px solid rgba(56, 189, 248, .15)",

  background:
    "linear-gradient(135deg, rgba(8, 145, 178, .065), rgba(79, 70, 229, .055))",

  color:
    "var(--qsm-muted)",

  boxShadow:
    "inset 0 0 18px rgba(56, 189, 248, .018)"
};

const securityMessageIcon = {
  width:
    "34px",

  height:
    "34px",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  borderRadius:
    "11px",

  border:
    "1px solid rgba(56, 189, 248, .15)",

  background:
    "linear-gradient(135deg, rgba(34, 211, 238, .10), rgba(139, 92, 246, .10))"
};

/*
|--------------------------------------------------------------------------
| Botón móvil
|--------------------------------------------------------------------------
*/

const mobileMenuButton = {
  position: "fixed",

  top: "16px",
  left: "16px",

  width: "48px",
  height: "48px",

  display: "none",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "15px",

  border:
    "1px solid rgba(var(--qsm-accent-rgb), .28)",

  background:
    "rgba(8, 19, 37, .96)",

  color: "#ffffff",

  fontSize: "21px",

  cursor: "pointer",

  boxShadow:
    "0 18px 50px rgba(0, 0, 0, .36)",

  zIndex: 3000
};

const mobileOverlay = {
  position: "fixed",
  inset: 0,

  display: "block",

  background:
    "rgba(2, 6, 23, .76)",

  backdropFilter: "blur(5px)",

  zIndex: 2998
};

const mobileSidebar = {
  position: "fixed",

  top: "12px",
  bottom: "12px",
  left: "12px",

  width: "330px",

  display: "flex",
  flexDirection: "column",

  overflow: "hidden",

  borderRadius: "25px",

  border:
    "1px solid rgba(56, 189, 248, .22)",

  background:
    `
      radial-gradient(
        circle at 12% 5%,
        rgba(var(--qsm-accent-rgb), .14),
        transparent 25%
      ),
      linear-gradient(
        180deg,
        rgba(8, 17, 35, .995),
        rgba(2, 6, 23, .995)
      )
    `,

  boxShadow:
    "0 35px 120px rgba(0, 0, 0, .68)",

  zIndex: 2999
};

const mobileHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",

  padding: "16px",

  borderBottom:
    "1px solid rgba(148, 163, 184, .10)"
};

const mobileBrand = {
  display: "flex",
  alignItems: "center",
  gap: "11px",

  color: "#ffffff",

  textDecoration: "none"
};

const mobileBrandIcon = {
  width: "45px",
  height: "45px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "14px",

  background:
    "linear-gradient(135deg, rgba(var(--qsm-accent-rgb),.26), rgba(139,92,246,.28))",

  fontSize: "23px"
};

const mobileBrandTitle = {
  display: "block",

  color: "#ffffff",

  fontSize: "20px",
  lineHeight: "21px"
};

const mobileBrandSub = {
  display: "block",

  marginTop: "3px",

  color: "var(--qsm-muted)",

  fontSize: "8px"
};

const mobileCloseButton = {
  width: "36px",
  height: "36px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "11px",

  border:
    "1px solid rgba(148, 163, 184, .14)",

  background:
    "rgba(15, 23, 42, .76)",

  color: "var(--qsm-text-secondary)",

  fontSize: "21px",

  cursor: "pointer"
};

const mobileScroll = {
  minHeight: 0,
  flex: 1,

  overflowY: "auto",

  padding: "12px"
};

const mobileBottom = {
  display: "grid",
  gap: "10px",

  padding: "12px",

  borderTop:
    "1px solid rgba(148, 163, 184, .10)"
};

const mobileUserCard = {
  display: "flex",
  alignItems: "center",
  gap: "11px",

  padding: "12px",

  borderRadius: "16px",

  border:
    "1px solid rgba(56, 189, 248, .18)",

  background:
    "rgba(15, 23, 42, .74)",

  color: "#ffffff",

  textDecoration: "none"
};

const mobileLogoutButton = {
  minHeight: "46px",

  borderRadius: "14px",

  border:
    "1px solid rgba(248, 113, 113, .27)",

  background:
    "rgba(127, 29, 29, .18)",

  color: "#fca5a5",

  fontSize: "11px",
  fontWeight: "900",

  cursor: "pointer"
};

const mobileSidebarCloseAction = {
  minHeight:
    "46px",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  gap:
    "9px",

  borderRadius:
    "14px",

  border:
    "1px solid rgba(56, 189, 248, .25)",

  background:
    "linear-gradient(135deg, rgba(8, 145, 178, .14), rgba(79, 70, 229, .14))",

  color:
    "#7dd3fc",

  fontSize:
    "11px",

  fontWeight:
    "900",

  cursor:
    "pointer"
};

export default Sidebar;
