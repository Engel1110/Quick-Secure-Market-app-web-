import {
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

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
  notifications,
  searchableUsers,
  searchableProducts,
  searchableDisputes,
  systemServices,
  filterMenuByPermissions,
  getRoleLabel
} from "./adminDashboard.data";

import "./adminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [readNotifications, setReadNotifications] =
    useState([]);

  const currentUser = useMemo(
    () => getCurrentAdminUser(),
    []
  );

  const visibleMenuItems = useMemo(
    () =>
      filterMenuByPermissions(
        adminMenuItems,
        currentUser
      ),
    [currentUser]
  );

  const searchResults = useMemo(() => {
    const normalizedSearch =
      searchTerm
        .trim()
        .toLowerCase();

    if (!normalizedSearch) {
      return [];
    }

    const allItems = [
      ...searchableUsers,
      ...searchableProducts,
      ...searchableDisputes
    ];

    return allItems
      .filter((item) => {
        const searchableText = [
          item.type,
          item.title,
          item.subtitle
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          normalizedSearch
        );
      })
      .slice(0, 8);
  }, [searchTerm]);

  const unreadNotifications =
    notifications.filter(
      (notification) =>
        !readNotifications.includes(
          notification.id
        )
    );

  const handleNavigation = (route) => {
    if (!route) {
      return;
    }

    setSearchTerm("");
    setNotificationsOpen(false);
    setProfileOpen(false);
    setMobileSidebarOpen(false);

    navigate(route);
  };

  const handleNotification = (
    notification
  ) => {
    setReadNotifications((current) => {
      if (
        current.includes(
          notification.id
        )
      ) {
        return current;
      }

      return [
        ...current,
        notification.id
      ];
    });

    handleNavigation(
      notification.route
    );
  };

  const markAllNotificationsAsRead =
    () => {
      setReadNotifications(
        notifications.map(
          (notification) =>
            notification.id
        )
      );
    };

  const handleLogout = () => {
    clearAdminSession();

    navigate(
      "/admin/login",
      {
        replace: true
      }
    );
  };

  return (
    <div className="qsm-admin-shell">
      {mobileSidebarOpen && (
        <button
          type="button"
          className="qsm-admin-mobile-overlay"
          aria-label="Cerrar menú"
          onClick={() =>
            setMobileSidebarOpen(false)
          }
        />
      )}

      <aside
        className={[
          "qsm-admin-sidebar",
          sidebarCollapsed
            ? "qsm-admin-sidebar--collapsed"
            : "",
          mobileSidebarOpen
            ? "qsm-admin-sidebar--mobile-open"
            : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="qsm-admin-sidebar__brand">
          <button
            type="button"
            className="qsm-admin-sidebar__logo"
            onClick={() =>
              handleNavigation(
                "/admin/dashboard"
              )
            }
          >
            <span className="qsm-admin-sidebar__logo-icon">
              Q
            </span>

            {!sidebarCollapsed && (
              <span className="qsm-admin-sidebar__logo-text">
                <strong>QSM</strong>
                <small>BackOffice</small>
              </span>
            )}
          </button>

          <button
            type="button"
            className="qsm-admin-sidebar__mobile-close"
            onClick={() =>
              setMobileSidebarOpen(false)
            }
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <div className="qsm-admin-sidebar__profile">
          <span className="qsm-admin-sidebar__avatar">
            {currentUser.initials}
          </span>

          {!sidebarCollapsed && (
            <div className="qsm-admin-sidebar__profile-info">
              <strong>
                {currentUser.name}
              </strong>

              <span>
                {currentUser.roleLabel}
              </span>

              <small>
                <i className="qsm-admin-online-dot" />
                Sesión activa
              </small>
            </div>
          )}
        </div>

        <nav className="qsm-admin-sidebar__nav">
          {!sidebarCollapsed && (
            <span className="qsm-admin-sidebar__section-title">
              Menú principal
            </span>
          )}

          {visibleMenuItems.map(
            (item) => (
              <button
                key={item.id}
                type="button"
                title={
                  sidebarCollapsed
                    ? item.label
                    : undefined
                }
                className={[
                  "qsm-admin-sidebar__menu-item",
                  item.route ===
                  "/admin/dashboard"
                    ? "qsm-admin-sidebar__menu-item--active"
                    : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  handleNavigation(
                    item.route
                  )
                }
              >
                <span className="qsm-admin-sidebar__menu-icon">
                  {item.icon}
                </span>

                {!sidebarCollapsed && (
                  <>
                    <span className="qsm-admin-sidebar__menu-label">
                      {item.label}
                    </span>

                    {item.badge && (
                      <span
                        className={`qsm-admin-sidebar__badge qsm-admin-sidebar__badge--${item.badgeType}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          )}
        </nav>

        <div className="qsm-admin-sidebar__bottom">
          <button
            type="button"
            className="qsm-admin-sidebar__collapse"
            onClick={() =>
              setSidebarCollapsed(
                (current) =>
                  !current
              )
            }
          >
            <span>
              {sidebarCollapsed
                ? "→"
                : "←"}
            </span>

            {!sidebarCollapsed && (
              <span>
                Contraer menú
              </span>
            )}
          </button>

          <button
            type="button"
            className="qsm-admin-sidebar__logout"
            onClick={handleLogout}
          >
            <span>↪</span>

            {!sidebarCollapsed && (
              <span>
                Cerrar sesión
              </span>
            )}
          </button>
        </div>
      </aside>

      <div
        className={
          sidebarCollapsed
            ? "qsm-admin-main qsm-admin-main--collapsed"
            : "qsm-admin-main"
        }
      >
        <header className="qsm-admin-header">
          <div className="qsm-admin-header__left">
            <button
              type="button"
              className="qsm-admin-header__mobile-menu"
              onClick={() =>
                setMobileSidebarOpen(true)
              }
              aria-label="Abrir menú"
            >
              ☰
            </button>

            <div className="qsm-admin-search">
              <span className="qsm-admin-search__icon">
                ⌕
              </span>

              <input
                type="search"
                value={searchTerm}
                placeholder="Buscar usuarios, productos, disputas..."
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
              />

              <kbd>Ctrl + K</kbd>

              {searchTerm && (
                <div className="qsm-admin-search__results">
                  <div className="qsm-admin-search__results-header">
                    <strong>
                      Resultados
                    </strong>

                    <span>
                      {
                        searchResults.length
                      }
                    </span>
                  </div>

                  {searchResults.length >
                  0 ? (
                    searchResults.map(
                      (result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          type="button"
                          className="qsm-admin-search__result"
                          onClick={() =>
                            handleNavigation(
                              result.route
                            )
                          }
                        >
                          <span className="qsm-admin-search__result-icon">
                            {getSearchIcon(
                              result.type
                            )}
                          </span>

                          <span>
                            <strong>
                              {
                                result.title
                              }
                            </strong>

                            <small>
                              {
                                result.subtitle
                              }
                            </small>
                          </span>

                          <em>
                            {result.type}
                          </em>
                        </button>
                      )
                    )
                  ) : (
                    <div className="qsm-admin-search__empty">
                      No se encontraron
                      resultados para “
                      {searchTerm}”.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="qsm-admin-header__right">
            <div className="qsm-admin-header__dropdown-wrapper">
              <button
                type="button"
                title="Notificaciones"
                className="qsm-admin-header__icon-button"
                onClick={() => {
                  setNotificationsOpen(
                    (current) =>
                      !current
                  );

                  setProfileOpen(false);
                }}
              >
                ♢

                {unreadNotifications.length >
                  0 && (
                  <span className="qsm-admin-header__notification-badge">
                    {
                      unreadNotifications.length
                    }
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="qsm-admin-notifications">
                  <div className="qsm-admin-notifications__header">
                    <div>
                      <strong>
                        Notificaciones
                      </strong>

                      <span>
                        {
                          unreadNotifications.length
                        }{" "}
                        sin leer
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={
                        markAllNotificationsAsRead
                      }
                    >
                      Marcar todas
                    </button>
                  </div>

                  <div className="qsm-admin-notifications__list">
                    {notifications.map(
                      (
                        notification
                      ) => {
                        const isRead =
                          readNotifications.includes(
                            notification.id
                          );

                        return (
                          <button
                            key={
                              notification.id
                            }
                            type="button"
                            className={[
                              "qsm-admin-notifications__item",
                              isRead
                                ? "qsm-admin-notifications__item--read"
                                : ""
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                " "
                              )}
                            onClick={() =>
                              handleNotification(
                                notification
                              )
                            }
                          >
                            <span
                              className={`qsm-admin-notifications__icon qsm-admin-notifications__icon--${notification.type}`}
                            >
                              {
                                notification.icon
                              }
                            </span>

                            <span className="qsm-admin-notifications__content">
                              <strong>
                                {
                                  notification.title
                                }
                              </strong>

                              <small>
                                {
                                  notification.message
                                }
                              </small>

                              <time>
                                {
                                  notification.time
                                }
                              </time>
                            </span>

                            {!isRead && (
                              <i className="qsm-admin-notifications__unread-dot" />
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>

                  <button
                    type="button"
                    className="qsm-admin-notifications__footer"
                    onClick={() =>
                      handleNavigation(
                        "/admin/security"
                      )
                    }
                  >
                    Abrir centro de
                    notificaciones
                  </button>
                </div>
              )}
            </div>

            <span className="qsm-admin-header__divider" />

            <div className="qsm-admin-header__dropdown-wrapper">
              <button
                type="button"
                className="qsm-admin-header__profile-button"
                onClick={() => {
                  setProfileOpen(
                    (current) =>
                      !current
                  );

                  setNotificationsOpen(false);
                }}
              >
                <span className="qsm-admin-header__profile-avatar">
                  {currentUser.initials}
                </span>

                <span className="qsm-admin-header__profile-info">
                  <strong>
                    {currentUser.name}
                  </strong>

                  <small>
                    {
                      currentUser.roleLabel
                    }
                  </small>
                </span>

                <span className="qsm-admin-header__chevron">
                  ⌄
                </span>
              </button>

              {profileOpen && (
                <div className="qsm-admin-profile-dropdown">
                  <div className="qsm-admin-profile-dropdown__header">
                    <span className="qsm-admin-profile-dropdown__avatar">
                      {
                        currentUser.initials
                      }
                    </span>

                    <div>
                      <strong>
                        {
                          currentUser.name
                        }
                      </strong>

                      <span>
                        {
                          currentUser.email
                        }
                      </span>
                    </div>
                  </div>

                  <div className="qsm-admin-profile-dropdown__role">
                    <span>Rol</span>

                    <strong>
                      {
                        currentUser.roleLabel
                      }
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleNavigation(
                        "/admin/select-area"
                      )
                    }
                  >
                    ◈ Seleccionar área
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleNavigation(
                        "/admin/security"
                      )
                    }
                  >
                    ♢ Seguridad
                  </button>

                  <hr />

                  <button
                    type="button"
                    className="qsm-admin-profile-dropdown__logout"
                    onClick={handleLogout}
                  >
                    ↪ Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="qsm-admin-content">
          <section className="qsm-admin-welcome">
            <div className="qsm-admin-welcome__text">
              <span className="qsm-admin-welcome__eyebrow">
                CENTRO DE OPERACIONES
              </span>

              <h1>
                Bienvenido,{" "}
                <span>
                  {
                    currentUser.firstName
                  }
                </span>
              </h1>

              <p>
                Supervisa usuarios,
                órdenes, ventas,
                disputas, almacén,
                delivery, finanzas y
                seguridad desde un solo
                lugar.
              </p>

              <small>
                Datos temporales de
                desarrollo. La conexión
                real con el backend se
                realizará posteriormente.
              </small>
            </div>

            <div className="qsm-admin-welcome__actions">
              <button
                type="button"
                className="qsm-admin-button qsm-admin-button--secondary"
                onClick={() =>
                  handleNavigation(
                    "/admin/select-area"
                  )
                }
              >
                Cambiar de área
              </button>

              <button
                type="button"
                className="qsm-admin-button qsm-admin-button--primary"
                onClick={() =>
                  handleNavigation(
                    "/admin/internal-users"
                  )
                }
              >
                + Crear usuario interno
              </button>
            </div>
          </section>

          <section className="qsm-admin-metrics">
            {dashboardMetrics.map(
              (metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                />
              )
            )}
          </section>

          <section className="qsm-admin-dashboard-grid qsm-admin-dashboard-grid--charts">
            <TrendPanel />

            <OrderStatusPanel
              onNavigate={
                handleNavigation
              }
            />
          </section>

          <section className="qsm-admin-dashboard-grid qsm-admin-dashboard-grid--activity">
            <RecentActivityPanel
              onNavigate={
                handleNavigation
              }
            />

            <AlertsPanel
              onNavigate={
                handleNavigation
              }
            />
          </section>

          <section className="qsm-admin-departments">
            <div className="qsm-admin-section-heading">
              <div>
                <span>
                  OPERACIÓN GENERAL
                </span>

                <h2>
                  Estado de departamentos
                </h2>

                <p>
                  Consulta rápidamente el
                  rendimiento y las
                  alertas principales de
                  cada área.
                </p>
              </div>

              <button
                type="button"
                className="qsm-admin-button qsm-admin-button--secondary"
                onClick={() =>
                  handleNavigation(
                    "/admin/select-area"
                  )
                }
              >
                Ver todas las áreas
              </button>
            </div>

            <div className="qsm-admin-departments__grid">
              {departmentData.map(
                (department) => (
                  <DepartmentCard
                    key={
                      department.id
                    }
                    department={
                      department
                    }
                    onNavigate={
                      handleNavigation
                    }
                  />
                )
              )}
            </div>
          </section>

          <section className="qsm-admin-dashboard-grid qsm-admin-dashboard-grid--operations">
            <AttentionOrdersPanel
              onNavigate={
                handleNavigation
              }
            />

            <QuickActionsPanel
              onNavigate={
                handleNavigation
              }
            />
          </section>

          <footer className="qsm-admin-dashboard-footer">
            <div>
              <strong>
                Quick Secure Market
              </strong>

              <span>
                QSM BackOffice
                Empresarial
              </span>
            </div>

            <div>
              <strong>
                Modo de desarrollo
              </strong>

              <span>
                Datos simulados · Versión
                1.0.0
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function MetricCard({ metric }) {
  const isPositive =
    Number(metric.change) >= 0;

  return (
    <article className="qsm-admin-metric-card">
      <div className="qsm-admin-metric-card__header">
        <span
          className={`qsm-admin-metric-card__icon qsm-admin-metric-card__icon--${metric.color}`}
        >
          {metric.icon}
        </span>

        <span
          className={[
            "qsm-admin-metric-card__change",
            isPositive
              ? "qsm-admin-metric-card__change--positive"
              : "qsm-admin-metric-card__change--negative"
          ].join(" ")}
        >
          {isPositive ? "↑" : "↓"}{" "}
          {Math.abs(metric.change)}%
        </span>
      </div>

      <div className="qsm-admin-metric-card__body">
        <span>{metric.label}</span>

        <strong>
          {metric.value}
        </strong>

        <small>
          {metric.description}
        </small>
      </div>

      <div className="qsm-admin-metric-card__details">
        {metric.details.map(
          (detail) => (
            <div
              key={detail.label}
            >
              <span>
                {detail.label}
              </span>

              <strong>
                {detail.value}
              </strong>
            </div>
          )
        )}
      </div>
    </article>
  );
}

function TrendPanel() {
  const maximumOrders = Math.max(
    ...orderTrendData.map(
      (item) => item.orders
    ),
    1
  );

  const points =
    orderTrendData.map(
      (item, index) => {
        const x =
          orderTrendData.length > 1
            ? (index /
                (orderTrendData.length -
                  1)) *
              100
            : 50;

        const y =
          100 -
          (item.orders /
            maximumOrders) *
            80 -
          10;

        return {
          ...item,
          x,
          y
        };
      }
    );

  const polylinePoints =
    points
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

  return (
    <article className="qsm-admin-panel">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            ANÁLISIS OPERATIVO
          </span>

          <h2>
            Tendencia de órdenes
          </h2>

          <p>
            Movimiento diario de órdenes
            durante el período actual.
          </p>
        </div>
      </div>

      <div className="qsm-admin-trend__summary">
        <div>
          <span>
            Órdenes del período
          </span>

          <strong>
            {orderTrendData
              .reduce(
                (total, item) =>
                  total +
                  item.orders,
                0
              )
              .toLocaleString()}
          </strong>
        </div>

        <div>
          <span>
            Promedio diario
          </span>

          <strong>
            {Math.round(
              orderTrendData.reduce(
                (total, item) =>
                  total +
                  item.orders,
                0
              ) /
                orderTrendData.length
            ).toLocaleString()}
          </strong>
        </div>

        <div>
          <span>
            Mejor día
          </span>

          <strong>
            {
              [...orderTrendData].sort(
                (a, b) =>
                  b.orders -
                  a.orders
              )[0]?.shortDate
            }
          </strong>
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
          aria-label="Tendencia de órdenes"
        >
          <defs>
            <linearGradient
              id="qsmTrendGradient"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop
                offset="0%"
                stopColor="#38bdf8"
              />

              <stop
                offset="52%"
                stopColor="#8b5cf6"
              />

              <stop
                offset="100%"
                stopColor="#ec4899"
              />
            </linearGradient>
          </defs>

          <polyline
            points={
              polylinePoints
            }
            fill="none"
            stroke="url(#qsmTrendGradient)"
            strokeWidth="2.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="qsm-admin-line-chart__points">
          {points.map(
            (point) => (
              <button
                key={point.date}
                type="button"
                className="qsm-admin-line-chart__point"
                title={`${point.date}: ${point.orders} órdenes`}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`
                }}
              />
            )
          )}
        </div>

        <div className="qsm-admin-line-chart__labels">
          {orderTrendData.map(
            (item) => (
              <span
                key={item.date}
              >
                {item.shortDate}
              </span>
            )
          )}
        </div>
      </div>
    </article>
  );
}

function OrderStatusPanel({
  onNavigate
}) {
  const total =
    orderStatusData.reduce(
      (sum, item) =>
        sum + item.value,
      0
    );

  let accumulatedPercentage = 0;

  return (
    <article className="qsm-admin-panel">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            DISTRIBUCIÓN
          </span>

          <h2>
            Órdenes por estado
          </h2>

          <p>
            Distribución general de
            órdenes registradas.
          </p>
        </div>
      </div>

      <div className="qsm-admin-order-status__content">
        <div className="qsm-admin-donut-chart">
          <svg viewBox="0 0 42 42">
            <circle
              cx="21"
              cy="21"
              r="15.9155"
              fill="transparent"
              stroke="rgba(148,163,184,.08)"
              strokeWidth="7"
            />

            {orderStatusData.map(
              (item) => {
                const offset =
                  25 -
                  accumulatedPercentage;

                accumulatedPercentage +=
                  item.percentage;

                return (
                  <circle
                    key={item.id}
                    cx="21"
                    cy="21"
                    r="15.9155"
                    fill="transparent"
                    stroke={
                      item.color
                    }
                    strokeWidth="7"
                    strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
                    strokeDashoffset={
                      offset
                    }
                  />
                );
              }
            )}
          </svg>

          <div className="qsm-admin-donut-chart__center">
            <strong>
              {total.toLocaleString()}
            </strong>

            <span>Total</span>
          </div>
        </div>

        <div className="qsm-admin-order-status__legend">
          {orderStatusData.map(
            (item) => (
              <button
                key={item.id}
                type="button"
                className="qsm-admin-order-status__legend-item"
                onClick={() =>
                  onNavigate(
                    item.route
                  )
                }
              >
                <i
                  style={{
                    background:
                      item.color,
                    color:
                      item.color
                  }}
                />

                <span>
                  <strong>
                    {item.label}
                  </strong>

                  <small>
                    {item.value.toLocaleString()}{" "}
                    órdenes
                  </small>
                </span>

                <em>
                  {item.percentage}%
                </em>
              </button>
            )
          )}
        </div>
      </div>
    </article>
  );
}

function RecentActivityPanel({
  onNavigate
}) {
  return (
    <article className="qsm-admin-panel">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            TRAZABILIDAD
          </span>

          <h2>
            Actividad reciente
          </h2>

          <p>
            Últimos movimientos
            registrados en la
            plataforma.
          </p>
        </div>
      </div>

      <div className="qsm-admin-activity__list">
        {recentActivities.map(
          (activity) => (
            <button
              key={activity.id}
              type="button"
              className="qsm-admin-activity__item"
              onClick={() =>
                onNavigate(
                  activity.route
                )
              }
            >
              <span
                className={`qsm-admin-activity__icon qsm-admin-activity__icon--${activity.type}`}
              >
                {activity.icon}
              </span>

              <span className="qsm-admin-activity__content">
                <strong>
                  {activity.title}
                </strong>

                <small>
                  {
                    activity.description
                  }
                </small>

                <span>
                  {activity.user} ·{" "}
                  {activity.time}
                </span>
              </span>

              <em>→</em>
            </button>
          )
        )}
      </div>
    </article>
  );
}

function AlertsPanel({
  onNavigate
}) {
  return (
    <article className="qsm-admin-panel">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            ATENCIÓN
          </span>

          <h2>
            Alertas importantes
          </h2>

          <p>
            Situaciones que requieren
            revisión administrativa.
          </p>
        </div>

        <span className="qsm-admin-alerts__count">
          {importantAlerts.length}
        </span>
      </div>

      <div className="qsm-admin-alerts__list">
        {importantAlerts.map(
          (alert) => (
            <div
              key={alert.id}
              className={`qsm-admin-alerts__item qsm-admin-alerts__item--${alert.level}`}
            >
              <span className="qsm-admin-alerts__icon">
                {alert.icon}
              </span>

              <span className="qsm-admin-alerts__content">
                <strong>
                  {alert.title}
                </strong>

                <small>
                  {alert.description}
                </small>

                <span>
                  <em>
                    {
                      alert.levelLabel
                    }
                  </em>

                  <time>
                    {alert.time}
                  </time>
                </span>
              </span>

              <button
                type="button"
                onClick={() =>
                  onNavigate(
                    alert.route
                  )
                }
              >
                Revisar
              </button>
            </div>
          )
        )}
      </div>
    </article>
  );
}

function DepartmentCard({
  department,
  onNavigate
}) {
  return (
    <article className="qsm-admin-department-card">
      <div className="qsm-admin-department-card__header">
        <span
          className={`qsm-admin-department-card__icon qsm-admin-department-card__icon--${department.color}`}
        >
          {department.icon}
        </span>

        <div>
          <strong>
            {department.name}
          </strong>

          <small>
            {
              department.description
            }
          </small>
        </div>

        <span
          className={`qsm-admin-department-card__status qsm-admin-department-card__status--${department.status}`}
        >
          {
            department.statusLabel
          }
        </span>
      </div>

      <div className="qsm-admin-department-card__metrics">
        {department.metrics.map(
          (metric) => (
            <div
              key={metric.label}
            >
              <span>
                {metric.label}
              </span>

              <strong>
                {metric.value}
              </strong>
            </div>
          )
        )}
      </div>

      <div className="qsm-admin-department-card__progress">
        <span>
          <strong>
            {
              department.progressLabel
            }
          </strong>

          <em>
            {department.progress}%
          </em>
        </span>

        <div>
          <i
            style={{
              width: `${department.progress}%`
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          onNavigate(
            department.route
          )
        }
      >
        Entrar a{" "}
        {department.name} →
      </button>
    </article>
  );
}

function AttentionOrdersPanel({
  onNavigate
}) {
  return (
    <article className="qsm-admin-panel qsm-admin-orders-table">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            PRIORIDAD OPERATIVA
          </span>

          <h2>
            Órdenes que requieren
            atención
          </h2>

          <p>
            Pedidos retrasados,
            retenidos o con riesgo.
          </p>
        </div>
      </div>

      <div className="qsm-admin-table-wrapper">
        <table className="qsm-admin-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Producto</th>
              <th>Comprador</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Espera</th>
              <th>Riesgo</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {attentionOrders.map(
              (order) => (
                <tr key={order.id}>
                  <td>
                    <strong>
                      {
                        order.orderNumber
                      }
                    </strong>

                    <span>
                      {order.seller}
                    </span>
                  </td>

                  <td>
                    {order.product}
                  </td>

                  <td>
                    {order.buyer}
                  </td>

                  <td>
                    {order.amount}
                  </td>

                  <td>
                    <span
                      className={`qsm-admin-status-badge qsm-admin-status-badge--${order.status}`}
                    >
                      {
                        order.statusLabel
                      }
                    </span>
                  </td>

                  <td>
                    {
                      order.waitingTime
                    }
                  </td>

                  <td>
                    <span
                      className={`qsm-admin-risk-badge qsm-admin-risk-badge--${order.risk}`}
                    >
                      {
                        order.riskLabel
                      }
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(
                          order.route
                        )
                      }
                    >
                      Revisar
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function QuickActionsPanel({
  onNavigate
}) {
  return (
    <article className="qsm-admin-panel">
      <div className="qsm-admin-panel__header">
        <div>
          <span className="qsm-admin-panel__eyebrow">
            ACCESO DIRECTO
          </span>

          <h2>
            Acciones rápidas
          </h2>

          <p>
            Herramientas frecuentes del
            BackOffice.
          </p>
        </div>
      </div>

      <div className="qsm-admin-quick-actions__grid">
        {quickActions.map(
          (action) => (
            <button
              key={action.id}
              type="button"
              className={`qsm-admin-quick-actions__item qsm-admin-quick-actions__item--${action.color}`}
              onClick={() =>
                onNavigate(
                  action.route
                )
              }
            >
              <span>
                {action.icon}
              </span>

              <div>
                <strong>
                  {action.label}
                </strong>

                <small>
                  {
                    action.description
                  }
                </small>
              </div>

              <em>→</em>
            </button>
          )
        )}
      </div>

      <SystemStatus />
    </article>
  );
}

function SystemStatus() {
  return (
    <div className="qsm-admin-system-status">
      <div className="qsm-admin-system-status__header">
        <strong>
          Estado del sistema
        </strong>

        <span>
          <i />
          Servicios disponibles
        </span>
      </div>

      <div className="qsm-admin-system-status__services">
        {systemServices.map(
          (service) => (
            <span key={service.id}>
              <i
                className={
                  service.status ===
                  "online"
                    ? "is-online"
                    : ""
                }
              />

              {service.name}:{" "}
              {service.statusLabel}
            </span>
          )
        )}
      </div>
    </div>
  );
}

function getCurrentAdminUser() {
  const rawUser =
    localStorage.getItem(
      "qsm_admin_user"
    ) ||
    sessionStorage.getItem(
      "qsm_admin_user"
    );

  let user = {};

  try {
    user = rawUser
      ? JSON.parse(rawUser)
      : {};
  } catch {
    user = {};
  }

  const firstName =
    user.firstName ||
    user.name
      ?.trim()
      .split(/\s+/)[0] ||
    "Usuario";

  const lastName =
    user.lastName ||
    user.name
      ?.trim()
      .split(/\s+/)
      .slice(1)
      .join(" ") ||
    "";

  const name =
    user.fullName ||
    user.name ||
    `${firstName} ${lastName}`.trim();

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`
      .toUpperCase() ||
    "QA";

  return {
    ...user,
    firstName,
    lastName,
    name,
    initials,
    email:
      user.email || "",
    role:
      user.role ||
      "INTERNAL_USER",
    roleLabel:
      user.roleLabel ||
      getRoleLabel(
        user.role
      ),
    permissions:
      Array.isArray(
        user.permissions
      )
        ? user.permissions
        : []
  };
}

function clearAdminSession() {
  [
    "qsm_admin_token",
    "qsm_admin_user",
    "qsm_admin_remember"
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function getSearchIcon(type) {
  const icons = {
    Usuario: "♙",
    Producto: "▣",
    Disputa: "⚖"
  };

  return icons[type] || "⌕";
}

export default AdminDashboard;