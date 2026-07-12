import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  adminMenuItems,
  dashboardMetrics,
  orderTrendData,
  orderStatusData,
  recentActivities,
  importantAlerts,
  departmentData,
  attentionOrders,
  quickActions,
  notifications
} from "./adminDashboard.data";

import "./adminDashboard.css";

const PERIODS = [
  {
    id: "today",
    label: "Hoy"
  },
  {
    id: "7days",
    label: "Últimos 7 días"
  },
  {
    id: "30days",
    label: "Últimos 30 días"
  },
  {
    id: "year",
    label: "Este año"
  }
];

function AdminDashboard() {
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const [selectedMetric, setSelectedMetric] = useState("orders");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [readNotifications, setReadNotifications] = useState([]);

  const currentUser = {
    id: "usr-super-admin",
    name: "Engel Feliz",
    email: "superadmin.qsm@gmail.com",
    role: "SUPER_ADMIN",
    roleLabel: "Super Administrador",
    initials: "EF",
    online: true,
    permissions: ["*"]
  };

  useEffect(() => {
    const loadingTimer = window.setTimeout(() => {
      setLoading(false);
    }, 900);

    return () => {
      window.clearTimeout(loadingTimer);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      setSearchOpen(false);
      setNotificationOpen(false);
      setProfileOpen(false);
      setMobileSidebarOpen(false);
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const filteredSearchResults = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    if (!normalizedTerm) {
      return [];
    }

    const users = [
      {
        type: "Usuario",
        title: "Carlos Pérez",
        subtitle: "carlos@gmail.com",
        route: "/admin/users/carlos"
      },
      {
        type: "Usuario",
        title: "María Rodríguez",
        subtitle: "maria.almacen.qsm@gmail.com",
        route: "/admin/users/maria"
      }
    ];

    const orders = attentionOrders.map((order) => ({
      type: "Orden",
      title: order.orderNumber,
      subtitle: `${order.buyer} · ${order.statusLabel}`,
      route: `/admin/orders/${order.orderNumber}`
    }));

    const products = [
      {
        type: "Producto",
        title: "iPhone 15 Pro",
        subtitle: "Tech Store",
        route: "/admin/products/iphone-15-pro"
      },
      {
        type: "Producto",
        title: "MacBook Air M3",
        subtitle: "Global Shop",
        route: "/admin/products/macbook-air-m3"
      }
    ];

    return [...users, ...orders, ...products]
      .filter((item) => {
        const searchableText = `
          ${item.type}
          ${item.title}
          ${item.subtitle}
        `.toLowerCase();

        return searchableText.includes(normalizedTerm);
      })
      .slice(0, 8);
  }, [searchTerm]);

  const unreadNotificationCount = notifications.filter(
    (notification) => !readNotifications.includes(notification.id)
  ).length;

  const handleRefresh = () => {
    setLoading(true);

    window.setTimeout(() => {
      setLoading(false);
      setLastUpdated(new Date());
    }, 850);
  };

  const handleLogout = () => {
    localStorage.removeItem("qsm_admin_token");
    localStorage.removeItem("qsm_admin_user");

    navigate("/admin/login");
  };

  const handleMenuClick = (menuItem) => {
    setActiveMenu(menuItem.id);
    setMobileSidebarOpen(false);

    if (menuItem.route) {
      navigate(menuItem.route);
    }
  };

  const handleSearchSelect = (result) => {
    setSearchOpen(false);
    setSearchTerm("");

    navigate(result.route);
  };

  const handleMarkNotificationRead = (notificationId) => {
    setReadNotifications((current) => {
      if (current.includes(notificationId)) {
        return current;
      }

      return [...current, notificationId];
    });
  };

  const handleMarkAllNotificationsRead = () => {
    setReadNotifications(notifications.map((notification) => notification.id));
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="qsm-admin-shell">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        activeMenu={activeMenu}
        currentUser={currentUser}
        onCollapse={() => setSidebarCollapsed((current) => !current)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onMenuClick={handleMenuClick}
        onLogout={handleLogout}
      />

      {mobileSidebarOpen && (
        <button
          type="button"
          className="qsm-admin-mobile-overlay"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <main
        className={`qsm-admin-main ${
          sidebarCollapsed ? "qsm-admin-main--collapsed" : ""
        }`}
      >
        <AdminHeader
          currentUser={currentUser}
          searchTerm={searchTerm}
          searchOpen={searchOpen}
          notificationOpen={notificationOpen}
          profileOpen={profileOpen}
          unreadNotificationCount={unreadNotificationCount}
          filteredSearchResults={filteredSearchResults}
          readNotifications={readNotifications}
          onSearchChange={(event) => {
            setSearchTerm(event.target.value);
            setSearchOpen(Boolean(event.target.value.trim()));
          }}
          onSearchFocus={() => {
            if (searchTerm.trim()) {
              setSearchOpen(true);
            }
          }}
          onSearchSelect={handleSearchSelect}
          onToggleNotifications={() => {
            setNotificationOpen((current) => !current);
            setProfileOpen(false);
            setSearchOpen(false);
          }}
          onToggleProfile={() => {
            setProfileOpen((current) => !current);
            setNotificationOpen(false);
            setSearchOpen(false);
          }}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <div className="qsm-admin-content">
          <DashboardWelcome
            currentUser={currentUser}
            selectedPeriod={selectedPeriod}
            lastUpdated={lastUpdated}
            onPeriodChange={setSelectedPeriod}
            onRefresh={handleRefresh}
          />

          <MetricGrid metrics={dashboardMetrics} />

          <section className="qsm-admin-dashboard-grid qsm-admin-dashboard-grid--charts">
            <TrendChart
              data={orderTrendData}
              selectedMetric={selectedMetric}
              onMetricChange={setSelectedMetric}
            />

            <OrderStatusChart data={orderStatusData} />
          </section>

          <section className="qsm-admin-dashboard-grid qsm-admin-dashboard-grid--activity">
            <RecentActivity activities={recentActivities} />

            <ImportantAlerts alerts={importantAlerts} />
          </section>

          <DepartmentOverview departments={departmentData} />

          <section className="qsm-admin-dashboard-grid qsm-admin-dashboard-grid--operations">
            <AttentionOrdersTable orders={attentionOrders} />

            <QuickActions
              actions={quickActions}
              onAction={(action) => navigate(action.route)}
            />
          </section>

          <footer className="qsm-admin-dashboard-footer">
            <div>
              <strong>QSM BackOffice Empresarial</strong>
              <span>Centro de Operaciones y Administración</span>
            </div>

            <div>
              <span>
                Última actualización:{" "}
                {lastUpdated.toLocaleTimeString("es-DO", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>

              <span>Versión 1.0.0</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Sidebar({
  collapsed,
  mobileOpen,
  activeMenu,
  currentUser,
  onCollapse,
  onCloseMobile,
  onMenuClick,
  onLogout
}) {
  return (
    <aside
      className={[
        "qsm-admin-sidebar",
        collapsed ? "qsm-admin-sidebar--collapsed" : "",
        mobileOpen ? "qsm-admin-sidebar--mobile-open" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="qsm-admin-sidebar__brand">
        <Link to="/" className="qsm-admin-sidebar__logo">
          <span className="qsm-admin-sidebar__logo-icon">Q</span>

          {!collapsed && (
            <span className="qsm-admin-sidebar__logo-text">
              <strong>QSM</strong>
              <small>BackOffice</small>
            </span>
          )}
        </Link>

        <button
          type="button"
          className="qsm-admin-sidebar__mobile-close"
          onClick={onCloseMobile}
          aria-label="Cerrar menú"
        >
          ×
        </button>
      </div>

      <div className="qsm-admin-sidebar__profile">
        <div className="qsm-admin-sidebar__avatar">
          {currentUser.initials}
        </div>

        {!collapsed && (
          <div className="qsm-admin-sidebar__profile-info">
            <strong>{currentUser.name}</strong>
            <span>{currentUser.roleLabel}</span>

            <small>
              <i className="qsm-admin-online-dot" />
              En línea
            </small>
          </div>
        )}
      </div>

      <nav className="qsm-admin-sidebar__nav">
        <span className="qsm-admin-sidebar__section-title">
          {!collapsed ? "MENÚ PRINCIPAL" : "•••"}
        </span>

        {adminMenuItems.map((item) => {
          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={[
                "qsm-admin-sidebar__menu-item",
                isActive ? "qsm-admin-sidebar__menu-item--active" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onMenuClick(item)}
              title={collapsed ? item.label : undefined}
            >
              <span className="qsm-admin-sidebar__menu-icon">
                {item.icon}
              </span>

              {!collapsed && (
                <>
                  <span className="qsm-admin-sidebar__menu-label">
                    {item.label}
                  </span>

                  {item.badge ? (
                    <span
                      className={`qsm-admin-sidebar__badge qsm-admin-sidebar__badge--${item.badgeType}`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div className="qsm-admin-sidebar__bottom">
        <button
          type="button"
          className="qsm-admin-sidebar__collapse"
          onClick={onCollapse}
        >
          <span>{collapsed ? "→" : "←"}</span>

          {!collapsed && <span>Contraer menú</span>}
        </button>

        <button
          type="button"
          className="qsm-admin-sidebar__logout"
          onClick={onLogout}
        >
          <span>⇥</span>

          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}

function AdminHeader({
  currentUser,
  searchTerm,
  searchOpen,
  notificationOpen,
  profileOpen,
  unreadNotificationCount,
  filteredSearchResults,
  readNotifications,
  onSearchChange,
  onSearchFocus,
  onSearchSelect,
  onToggleNotifications,
  onToggleProfile,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenMobileSidebar,
  onLogout
}) {
  return (
    <header className="qsm-admin-header">
      <div className="qsm-admin-header__left">
        <button
          type="button"
          className="qsm-admin-header__mobile-menu"
          onClick={onOpenMobileSidebar}
          aria-label="Abrir menú"
        >
          ☰
        </button>

        <div className="qsm-admin-search">
          <span className="qsm-admin-search__icon">⌕</span>

          <input
            type="search"
            value={searchTerm}
            onChange={onSearchChange}
            onFocus={onSearchFocus}
            placeholder="Buscar usuarios, órdenes, productos..."
            aria-label="Buscar en QSM"
          />

          <kbd>Ctrl K</kbd>

          {searchOpen && (
            <div className="qsm-admin-search__results">
              <div className="qsm-admin-search__results-header">
                <strong>Resultados</strong>
                <span>{filteredSearchResults.length}</span>
              </div>

              {filteredSearchResults.length > 0 ? (
                filteredSearchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.title}`}
                    type="button"
                    className="qsm-admin-search__result"
                    onClick={() => onSearchSelect(result)}
                  >
                    <span className="qsm-admin-search__result-icon">
                      {getResultIcon(result.type)}
                    </span>

                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.subtitle}</small>
                    </span>

                    <em>{result.type}</em>
                  </button>
                ))
              ) : (
                <div className="qsm-admin-search__empty">
                  No encontramos resultados para “{searchTerm}”.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="qsm-admin-header__right">
        <button
          type="button"
          className="qsm-admin-header__icon-button"
          title="Ayuda"
        >
          ?
        </button>

        <div className="qsm-admin-header__dropdown-wrapper">
          <button
            type="button"
            className="qsm-admin-header__icon-button"
            onClick={onToggleNotifications}
            title="Notificaciones"
          >
            🔔

            {unreadNotificationCount > 0 && (
              <span className="qsm-admin-header__notification-badge">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <NotificationDropdown
              readNotifications={readNotifications}
              onMarkRead={onMarkNotificationRead}
              onMarkAllRead={onMarkAllNotificationsRead}
            />
          )}
        </div>

        <div className="qsm-admin-header__divider" />

        <div className="qsm-admin-header__dropdown-wrapper">
          <button
            type="button"
            className="qsm-admin-header__profile-button"
            onClick={onToggleProfile}
          >
            <span className="qsm-admin-header__profile-avatar">
              {currentUser.initials}
            </span>

            <span className="qsm-admin-header__profile-info">
              <strong>{currentUser.name}</strong>
              <small>{currentUser.roleLabel}</small>
            </span>

            <span className="qsm-admin-header__chevron">⌄</span>
          </button>

          {profileOpen && (
            <div className="qsm-admin-profile-dropdown">
              <div className="qsm-admin-profile-dropdown__header">
                <span className="qsm-admin-profile-dropdown__avatar">
                  {currentUser.initials}
                </span>

                <div>
                  <strong>{currentUser.name}</strong>
                  <span>{currentUser.email}</span>
                </div>
              </div>

              <div className="qsm-admin-profile-dropdown__role">
                <span>Rol actual</span>
                <strong>{currentUser.roleLabel}</strong>
              </div>

              <button type="button">👤 Mi perfil</button>
              <button type="button">🔐 Seguridad</button>
              <button type="button">🖥 Sesiones activas</button>
              <button type="button">⚙ Preferencias</button>

              <hr />

              <button
                type="button"
                className="qsm-admin-profile-dropdown__logout"
                onClick={onLogout}
              >
                ⇥ Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationDropdown({
  readNotifications,
  onMarkRead,
  onMarkAllRead
}) {
  return (
    <div className="qsm-admin-notifications">
      <div className="qsm-admin-notifications__header">
        <div>
          <strong>Notificaciones</strong>
          <span>Actividad importante de QSM</span>
        </div>

        <button type="button" onClick={onMarkAllRead}>
          Marcar todas
        </button>
      </div>

      <div className="qsm-admin-notifications__list">
        {notifications.map((notification) => {
          const isRead = readNotifications.includes(notification.id);

          return (
            <button
              key={notification.id}
              type="button"
              className={[
                "qsm-admin-notifications__item",
                isRead ? "qsm-admin-notifications__item--read" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onMarkRead(notification.id)}
            >
              <span
                className={`qsm-admin-notifications__icon qsm-admin-notifications__icon--${notification.type}`}
              >
                {notification.icon}
              </span>

              <span className="qsm-admin-notifications__content">
                <strong>{notification.title}</strong>
                <small>{notification.message}</small>
                <time>{notification.time}</time>
              </span>

              {!isRead && (
                <i className="qsm-admin-notifications__unread-dot" />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="qsm-admin-notifications__footer"
      >
        Ver todas las notificaciones
      </button>
    </div>
  );
}

function DashboardWelcome({
  currentUser,
  selectedPeriod,
  lastUpdated,
  onPeriodChange,
  onRefresh
}) {
  const firstName = currentUser.name.split(" ")[0];

  return (
    <section className="qsm-admin-welcome">
      <div className="qsm-admin-welcome__text">
        <span className="qsm-admin-welcome__eyebrow">
          CENTRO DE OPERACIONES
        </span>

        <h1>
          Buenos días, <span>{firstName}</span>
        </h1>

        <p>
          Aquí tienes el estado general y las operaciones más importantes
          de Quick Secure Market.
        </p>

        <small>
          Actualizado a las{" "}
          {lastUpdated.toLocaleTimeString("es-DO", {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </small>
      </div>

      <div className="qsm-admin-welcome__actions">
        <select
          value={selectedPeriod}
          onChange={(event) => onPeriodChange(event.target.value)}
          aria-label="Seleccionar período"
        >
          {PERIODS.map((period) => (
            <option key={period.id} value={period.id}>
              {period.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="qsm-admin-button qsm-admin-button--secondary"
          onClick={onRefresh}
        >
          ↻ Actualizar
        </button>

        <button
          type="button"
          className="qsm-admin-button qsm-admin-button--primary"
        >
          ⇩ Exportar reporte
        </button>
      </div>
    </section>
  );
}

function MetricGrid({ metrics }) {
  return (
    <section className="qsm-admin-metrics">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </section>
  );
}

function MetricCard({ metric }) {
  const isPositive = metric.change >= 0;

  return (
    <article className="qsm-admin-metric-card">
      <div className="qsm-admin-metric-card__header">
        <div
          className={`qsm-admin-metric-card__icon qsm-admin-metric-card__icon--${metric.color}`}
        >
          {metric.icon}
        </div>

        <span
          className={[
            "qsm-admin-metric-card__change",
            isPositive
              ? "qsm-admin-metric-card__change--positive"
              : "qsm-admin-metric-card__change--negative"
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isPositive ? "↗" : "↘"} {Math.abs(metric.change)}%
        </span>
      </div>

      <div className="qsm-admin-metric-card__body">
        <span>{metric.label}</span>
        <strong>{metric.value}</strong>
        <small>{metric.description}</small>
      </div>

      <div className="qsm-admin-metric-card__details">
        {metric.details.map((detail) => (
          <div key={detail.label}>
            <span>{detail.label}</span>
            <strong>{detail.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function TrendChart({
  data,
  selectedMetric,
  onMetricChange
}) {
  const maxValue = Math.max(
    ...data.map((item) => Number(item[selectedMetric]) || 0)
  );

  const points = data
    .map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const value = Number(item[selectedMetric]) || 0;
      const y = 100 - (value / maxValue) * 78 - 8;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <article className="qsm-admin-panel qsm-admin-trend">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            ANÁLISIS OPERATIVO
          </span>

          <h2>Tendencia de la plataforma</h2>
          <p>Comportamiento comparado durante el período seleccionado.</p>
        </div>

        <select
          value={selectedMetric}
          onChange={(event) => onMetricChange(event.target.value)}
        >
          <option value="orders">Órdenes</option>
          <option value="sales">Ventas</option>
          <option value="users">Usuarios</option>
          <option value="disputes">Disputas</option>
        </select>
      </div>

      <div className="qsm-admin-trend__summary">
        <div>
          <span>Total del período</span>
          <strong>{formatMetricTotal(data, selectedMetric)}</strong>
        </div>

        <div>
          <span>Promedio diario</span>
          <strong>{formatMetricAverage(data, selectedMetric)}</strong>
        </div>

        <div>
          <span>Crecimiento</span>
          <strong className="qsm-text-positive">+12.4%</strong>
        </div>
      </div>

      <div className="qsm-admin-line-chart">
        <div className="qsm-admin-line-chart__horizontal-lines">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <svg
          className="qsm-admin-line-chart__svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label="Gráfico de tendencia"
        >
          <defs>
            <linearGradient
              id="qsmChartArea"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#7c3aed"
                stopOpacity="0.45"
              />
              <stop
                offset="100%"
                stopColor="#7c3aed"
                stopOpacity="0"
              />
            </linearGradient>

            <linearGradient
              id="qsmChartLine"
              x1="0"
              x2="1"
              y1="0"
              y2="0"
            >
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="48%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>

          <polygon
            points={`0,100 ${points} 100,100`}
            fill="url(#qsmChartArea)"
          />

          <polyline
            points={points}
            fill="none"
            stroke="url(#qsmChartLine)"
            strokeWidth="2.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="qsm-admin-line-chart__points">
          {data.map((item, index) => {
            const value = Number(item[selectedMetric]) || 0;
            const left = (index / (data.length - 1)) * 100;
            const top = 100 - (value / maxValue) * 78 - 8;

            return (
              <button
                key={item.date}
                type="button"
                className="qsm-admin-line-chart__point"
                style={{
                  left: `${left}%`,
                  top: `${top}%`
                }}
                title={`${item.date}: ${formatValueByMetric(
                  value,
                  selectedMetric
                )}`}
              >
                <span />
              </button>
            );
          })}
        </div>

        <div className="qsm-admin-line-chart__labels">
          {data.map((item) => (
            <span key={item.date}>{item.shortDate}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

function OrderStatusChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  let currentOffset = 0;

  const circumference = 2 * Math.PI * 52;

  return (
    <article className="qsm-admin-panel qsm-admin-order-status">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            DISTRIBUCIÓN
          </span>

          <h2>Órdenes por estado</h2>
          <p>Estado general de todas las órdenes registradas.</p>
        </div>

        <button type="button" className="qsm-admin-panel__more">
          •••
        </button>
      </div>

      <div className="qsm-admin-order-status__content">
        <div className="qsm-admin-donut-chart">
          <svg viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="rgba(148,163,184,.12)"
              strokeWidth="13"
            />

            {data.map((item) => {
              const segmentLength =
                (item.value / total) * circumference;

              const circle = (
                <circle
                  key={item.id}
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="13"
                  strokeDasharray={`${segmentLength} ${
                    circumference - segmentLength
                  }`}
                  strokeDashoffset={-currentOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
              );

              currentOffset += segmentLength;

              return circle;
            })}
          </svg>

          <div className="qsm-admin-donut-chart__center">
            <strong>{total.toLocaleString("en-US")}</strong>
            <span>Total</span>
          </div>
        </div>

        <div className="qsm-admin-order-status__legend">
          {data.map((item) => (
            <button
              key={item.id}
              type="button"
              className="qsm-admin-order-status__legend-item"
            >
              <i style={{ background: item.color }} />

              <span>
                <strong>{item.label}</strong>
                <small>{item.percentage}% del total</small>
              </span>

              <em>{item.value.toLocaleString("en-US")}</em>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="qsm-admin-panel__footer-link"
      >
        Ver todas las órdenes →
      </button>
    </article>
  );
}

function RecentActivity({ activities }) {
  return (
    <article className="qsm-admin-panel qsm-admin-activity">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            TIEMPO REAL
          </span>

          <h2>Actividad reciente</h2>
          <p>Últimos cambios realizados dentro de QSM.</p>
        </div>

        <button type="button" className="qsm-admin-panel__more">
          •••
        </button>
      </div>

      <div className="qsm-admin-activity__list">
        {activities.map((activity) => (
          <button
            key={activity.id}
            type="button"
            className="qsm-admin-activity__item"
          >
            <span
              className={`qsm-admin-activity__icon qsm-admin-activity__icon--${activity.type}`}
            >
              {activity.icon}
            </span>

            <span className="qsm-admin-activity__content">
              <strong>{activity.title}</strong>

              <small>
                {activity.description}
              </small>

              <span>
                {activity.user} · {activity.time}
              </span>
            </span>

            <em>→</em>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="qsm-admin-panel__footer-link"
      >
        Ver historial completo →
      </button>
    </article>
  );
}

function ImportantAlerts({ alerts }) {
  return (
    <article className="qsm-admin-panel qsm-admin-alerts">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            REQUIERE ATENCIÓN
          </span>

          <h2>Alertas importantes</h2>
          <p>Casos que podrían afectar las operaciones.</p>
        </div>

        <span className="qsm-admin-alerts__count">
          {alerts.length}
        </span>
      </div>

      <div className="qsm-admin-alerts__list">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`qsm-admin-alerts__item qsm-admin-alerts__item--${alert.level}`}
          >
            <span className="qsm-admin-alerts__icon">
              {alert.icon}
            </span>

            <span className="qsm-admin-alerts__content">
              <strong>{alert.title}</strong>
              <small>{alert.description}</small>

              <span>
                <em>{alert.levelLabel}</em>
                <time>{alert.time}</time>
              </span>
            </span>

            <button type="button">
              Revisar
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="qsm-admin-panel__footer-link"
      >
        Abrir centro de alertas →
      </button>
    </article>
  );
}

function DepartmentOverview({ departments }) {
  return (
    <section className="qsm-admin-departments">
      <div className="qsm-admin-section-heading">
        <div>
          <span>OPERACIONES POR DEPARTAMENTO</span>
          <h2>Estado general de las áreas</h2>
          <p>
            Consulta el rendimiento de cada departamento desde una sola
            pantalla.
          </p>
        </div>

        <button
          type="button"
          className="qsm-admin-button qsm-admin-button--secondary"
        >
          Ver reporte operativo
        </button>
      </div>

      <div className="qsm-admin-departments__grid">
        {departments.map((department) => (
          <article
            key={department.id}
            className="qsm-admin-department-card"
          >
            <div className="qsm-admin-department-card__header">
              <span
                className={`qsm-admin-department-card__icon qsm-admin-department-card__icon--${department.color}`}
              >
                {department.icon}
              </span>

              <div>
                <strong>{department.name}</strong>
                <small>{department.description}</small>
              </div>

              <span
                className={`qsm-admin-department-card__status qsm-admin-department-card__status--${department.status}`}
              >
                {department.statusLabel}
              </span>
            </div>

            <div className="qsm-admin-department-card__metrics">
              {department.metrics.map((metric) => (
                <div key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>

            <div className="qsm-admin-department-card__progress">
              <span>
                <strong>{department.progressLabel}</strong>
                <em>{department.progress}%</em>
              </span>

              <div>
                <i
                  style={{
                    width: `${department.progress}%`
                  }}
                />
              </div>
            </div>

            <button type="button">
              Entrar a {department.name} →
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AttentionOrdersTable({ orders }) {
  const [selectedStatus, setSelectedStatus] = useState("all");

  const visibleOrders = useMemo(() => {
    if (selectedStatus === "all") {
      return orders;
    }

    return orders.filter(
      (order) => order.category === selectedStatus
    );
  }, [orders, selectedStatus]);

  return (
    <article className="qsm-admin-panel qsm-admin-orders-table">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            CASOS PRIORITARIOS
          </span>

          <h2>Órdenes que requieren atención</h2>
          <p>
            Pedidos detenidos, con riesgo o esperando intervención.
          </p>
        </div>

        <select
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
        >
          <option value="all">Todas</option>
          <option value="warehouse">Almacén</option>
          <option value="delivery">Delivery</option>
          <option value="dispute">Disputas</option>
          <option value="payment">Pagos</option>
        </select>
      </div>

      <div className="qsm-admin-table-wrapper">
        <table className="qsm-admin-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Comprador</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Detenida</th>
              <th>Riesgo</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {visibleOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>{order.orderNumber}</strong>
                  <span>{order.product}</span>
                </td>

                <td>
                  <strong>{order.buyer}</strong>
                  <span>{order.seller}</span>
                </td>

                <td>
                  <strong>{order.amount}</strong>
                </td>

                <td>
                  <span
                    className={`qsm-admin-status-badge qsm-admin-status-badge--${order.status}`}
                  >
                    {order.statusLabel}
                  </span>
                </td>

                <td>
                  <strong>{order.waitingTime}</strong>
                </td>

                <td>
                  <span
                    className={`qsm-admin-risk-badge qsm-admin-risk-badge--${order.risk}`}
                  >
                    {order.riskLabel}
                  </span>
                </td>

                <td>
                  <button type="button">
                    Revisar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="qsm-admin-panel__footer-link"
      >
        Ver todas las órdenes →
      </button>
    </article>
  );
}

function QuickActions({ actions, onAction }) {
  return (
    <article className="qsm-admin-panel qsm-admin-quick-actions">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            ACCESO DIRECTO
          </span>

          <h2>Acciones rápidas</h2>
          <p>Ejecuta las tareas administrativas más frecuentes.</p>
        </div>
      </div>

      <div className="qsm-admin-quick-actions__grid">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action)}
            className={`qsm-admin-quick-actions__item qsm-admin-quick-actions__item--${action.color}`}
          >
            <span>{action.icon}</span>

            <div>
              <strong>{action.label}</strong>
              <small>{action.description}</small>
            </div>

            <em>→</em>
          </button>
        ))}
      </div>

      <div className="qsm-admin-system-status">
        <div className="qsm-admin-system-status__header">
          <strong>Estado del sistema</strong>
          <span>
            <i />
            Todos los servicios operativos
          </span>
        </div>

        <div className="qsm-admin-system-status__services">
          <span>
            <i className="is-online" />
            API
          </span>

          <span>
            <i className="is-online" />
            MongoDB
          </span>

          <span>
            <i className="is-online" />
            Socket.IO
          </span>

          <span>
            <i className="is-online" />
            Pagos
          </span>
        </div>
      </div>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="qsm-admin-skeleton-page">
      <aside className="qsm-admin-skeleton-sidebar">
        <div className="qsm-skeleton qsm-skeleton--logo" />

        <div className="qsm-skeleton qsm-skeleton--profile" />

        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="qsm-skeleton qsm-skeleton--menu"
          />
        ))}
      </aside>

      <main className="qsm-admin-skeleton-main">
        <header className="qsm-admin-skeleton-header">
          <div className="qsm-skeleton qsm-skeleton--search" />
          <div className="qsm-skeleton qsm-skeleton--avatar" />
        </header>

        <div className="qsm-admin-skeleton-content">
          <div className="qsm-skeleton qsm-skeleton--welcome" />

          <div className="qsm-admin-skeleton-metrics">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="qsm-skeleton qsm-skeleton--metric"
              />
            ))}
          </div>

          <div className="qsm-admin-skeleton-panels">
            <div className="qsm-skeleton qsm-skeleton--panel" />
            <div className="qsm-skeleton qsm-skeleton--panel" />
          </div>

          <div className="qsm-admin-skeleton-panels">
            <div className="qsm-skeleton qsm-skeleton--panel" />
            <div className="qsm-skeleton qsm-skeleton--panel" />
          </div>
        </div>
      </main>
    </div>
  );
}

function getResultIcon(type) {
  const icons = {
    Usuario: "👤",
    Orden: "📦",
    Producto: "🛍",
    Disputa: "⚖"
  };

  return icons[type] || "⌕";
}

function formatMetricTotal(data, metric) {
  const total = data.reduce(
    (sum, item) => sum + (Number(item[metric]) || 0),
    0
  );

  return formatValueByMetric(total, metric);
}

function formatMetricAverage(data, metric) {
  if (!data.length) {
    return "0";
  }

  const total = data.reduce(
    (sum, item) => sum + (Number(item[metric]) || 0),
    0
  );

  return formatValueByMetric(
    Math.round(total / data.length),
    metric
  );
}

function formatValueByMetric(value, metric) {
  if (metric === "sales") {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      maximumFractionDigits: 0
    }).format(value);
  }

  return new Intl.NumberFormat("en-US").format(value);
}

export default AdminDashboard;