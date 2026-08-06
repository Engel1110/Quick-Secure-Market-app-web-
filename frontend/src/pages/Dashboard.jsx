import { API_BASE_URL as QSM_RUNTIME_API_URL } from "../config/runtime";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";

import api from "../api/axios";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

import {
  useSettings
} from "../context/SettingsContext";

/*
|--------------------------------------------------------------------------
| Configuración inicial segura
|--------------------------------------------------------------------------
*/

const DEFAULT_USER = {
  firstName: "Usuario",
  lastName: "QSM",
  email: "usuario@qsm.com",
  phone: "",
  city: "",
  province: "",
  profilePhoto: "",
  avatar: "",
  trustScore: 50,
  verificationStatus:
    "NOT_STARTED",
  isVerified: false,
  favorites: []
};

const DEFAULT_SETTINGS = {
  theme: "dark",
  accentColor: "cyan",
  language: "es",
  density: "comfortable",
  animations: true,
  glassEffect: true,
  compactSidebar: false
};

const TERMINAL_ORDER_STATUSES = [
  "CANCELLED",
  "REJECTED",
  "REFUNDED"
];

/* QSM_FASE15_BLOCK1_EXECUTIVE_HEADER_STATS */

function Dashboard() {
  /*
    QSM_FASE15_BLOCK6_FIX3_DYNAMIC_SIDEBAR_CONNECTION

    Detecta el borde derecho real del Sidebar.
    Funciona abierto, cerrado y durante su transición.
  */
  useEffect(() => {
    let frameId = null;
    let resizeObserver = null;
    let mutationObserver = null;
    let observedSidebar = null;

    const findMainSidebar = () => {
      const selectors = [
        ".qsm-sidebar",
        ".sidebar",
        "[class*='sidebar']",
        "aside"
      ];

      const candidates = [
        ...new Set(
          selectors.flatMap(
            (selector) =>
              Array.from(
                document.querySelectorAll(
                  selector
                )
              )
          )
        )
      ];

      return (
        candidates.find(
          (element) => {
            const rect =
              element.getBoundingClientRect();

            const style =
              window.getComputedStyle(
                element
              );

            const isVisible =
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              Number(style.opacity || 1) > 0;

            const isAtLeft =
              rect.left <= 4;

            const isTall =
              rect.height >=
              window.innerHeight * 0.65;

            const hasUsefulWidth =
              rect.width >= 48;

            return (
              isVisible &&
              isAtLeft &&
              isTall &&
              hasUsefulWidth
            );
          }
        ) || null
      );
    };

    const applySidebarPosition = () => {
      frameId =
        window.requestAnimationFrame(
          () => {
            const isMobile =
              window.innerWidth <= 700;

            if (isMobile) {
              document.documentElement.style.setProperty(
                "--qsm-live-sidebar-right",
                "0px"
              );

              return;
            }

            const sidebar =
              findMainSidebar();

            if (!sidebar) {
              document.documentElement.style.setProperty(
                "--qsm-live-sidebar-right",
                "80px"
              );

              return;
            }

            const rect =
              sidebar.getBoundingClientRect();

            const rightEdge =
              Math.max(
                0,
                Math.round(
                  rect.right
                )
              );

            document.documentElement.style.setProperty(
              "--qsm-live-sidebar-right",
              `${rightEdge}px`
            );

            if (
              observedSidebar !==
              sidebar
            ) {
              resizeObserver?.disconnect();

              observedSidebar =
                sidebar;

              resizeObserver =
                new ResizeObserver(
                  applySidebarPosition
                );

              resizeObserver.observe(
                sidebar
              );
            }
          }
        );
    };

    applySidebarPosition();

    window.addEventListener(
      "resize",
      applySidebarPosition
    );

    /*
      Detecta cambios de clase al abrir o cerrar el Sidebar.
    */
    mutationObserver =
      new MutationObserver(
        applySidebarPosition
      );

    mutationObserver.observe(
      document.body,
      {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: [
          "class",
          "style",
          "aria-expanded"
        ]
      }
    );

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(
          frameId
        );
      }

      resizeObserver?.disconnect();
      mutationObserver?.disconnect();

      window.removeEventListener(
        "resize",
        applySidebarPosition
      );

      document.documentElement.style.removeProperty(
        "--qsm-live-sidebar-right"
      );
    };
  }, []);

  const navigate =
    useNavigate();

  const {
    settings
  } = useSettings();

  /*
  |--------------------------------------------------------------------------
  | Datos guardados localmente
  |--------------------------------------------------------------------------
  */

  const storedUser =
    useMemo(() => {
      return {
        ...DEFAULT_USER,
        ...(
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
        )
      };
    }, []);

  /*
  |--------------------------------------------------------------------------
  | Estados
  |--------------------------------------------------------------------------
  */

  const [
    user,
    setUser
  ] = useState(
    storedUser
  );

  const [
    search,
    setSearch
  ] = useState("");

  const [
    stats,
    setStats
  ] = useState({
    products: 0,
    purchases: 0,
    sales: 0,
    favorites: 0,
    messages: 0,
    disputes: 0,
    protectedAmount: 0
  });

  const [
    recentProducts,
    setRecentProducts
  ] = useState([]);

  const [
    recentPurchases,
    setRecentPurchases
  ] = useState([]);

  const [
    recentSales,
    setRecentSales
  ] = useState([]);

  const [
    recentDisputes,
    setRecentDisputes
  ] = useState([]);

  /* QSM_FASE15_BLOCK2_PROFESSIONAL_ACTIVITY_CHART */

  const [
    activityPurchases,
    setActivityPurchases
  ] = useState([]);

  const [
    activitySales,
    setActivitySales
  ] = useState([]);

  const [
    activityDisputes,
    setActivityDisputes
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    warnings,
    setWarnings
  ] = useState([]);

  /* QSM_FASE15_BLOCK1_EXECUTIVE_HEADER_STATS */

  const [
    dashboardPeriod,
    setDashboardPeriod
  ] = useState("30");

  const [
    lastUpdatedAt,
    setLastUpdatedAt
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Tema y apariencia
  |--------------------------------------------------------------------------
  */

  const theme =
    settings?.theme ||
    "dark";

  const isLight =
    theme === "light";

  const accent =
    getAccentColor(
      settings?.accentColor ||
      "cyan"
    );

  /*
  |--------------------------------------------------------------------------
  | Información normalizada del usuario
  |--------------------------------------------------------------------------
  */

  const displayFirstName =
    useMemo(() => {
      return (
        formatPersonName(
          user?.firstName
        ) ||
        "Usuario"
      );
    }, [
      user?.firstName
    ]);

  const displayLastName =
    useMemo(() => {
      return formatPersonName(
        user?.lastName
      );
    }, [
      user?.lastName
    ]);

  const displayFullName =
    useMemo(() => {
      return [
        displayFirstName,
        displayLastName
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    }, [
      displayFirstName,
      displayLastName
    ]);

  const profilePhoto =
    useMemo(() => {
      return getProfilePhotoUrl(
        user?.profilePhoto ||
        user?.avatar ||
        user?.photo ||
        ""
      );
    }, [
      user?.profilePhoto,
      user?.avatar,
      user?.photo
    ]);

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
    ) ||
    String(
      user?.kycStatus ||
      ""
    ).toUpperCase() ===
      "VERIFIED";

  const trustScore =
    clampNumber(
      user?.trustScore,
      0,
      100,
      50
    );

  const profileCompletion =
    useMemo(() => {
      const checks = [
        Boolean(
          user?.firstName
        ),

        Boolean(
          user?.lastName
        ),

        Boolean(
          user?.email
        ),

        Boolean(
          user?.phone
        ),

        Boolean(
          user?.city ||
          user?.province
        ),

        Boolean(
          profilePhoto
        ),

        isVerified
      ];

      return Math.round(
        (
          checks.filter(
            Boolean
          ).length /
          checks.length
        ) * 100
      );
    }, [
      user,
      profilePhoto,
      isVerified
    ]);

  /*
  |--------------------------------------------------------------------------
  | Cargar Dashboard
  |--------------------------------------------------------------------------
  */

  const loadDashboard =
    useCallback(
      async (
        showMainLoader = true
      ) => {
        try {
          if (
            showMainLoader
          ) {
            setLoading(true);
          } else {
            setRefreshing(
              true
            );
          }

          setError("");
          setWarnings([]);

          const results =
            await Promise.allSettled(
              [
                api.get("/auth/me"),

                Promise.resolve({ data: {} }),

                api.get(
                  "/products/my-products"
                ),

                api.get(
                  "/orders/my-orders"
                ),

                api.get(
                  "/disputes"
                )
              ]
            );

          const [
            userResult,
            summaryResult,
            productsResult,
            ordersResult,
            disputesResult
          ] = results;

          const newWarnings = [];

          /*
          |--------------------------------------------------------------------------
          | Usuario
          |--------------------------------------------------------------------------
          */

          let resolvedUser =
            storedUser;

          if (
            userResult.status ===
            "fulfilled"
          ) {
            const backendUser =
              extractObject(
                userResult.value
                  ?.data,
                [
                  "user",
                  "data"
                ]
              );

            if (
              backendUser &&
              typeof backendUser ===
                "object"
            ) {
              resolvedUser = {
                ...DEFAULT_USER,
                ...backendUser
              };

              setUser(
                resolvedUser
              );

              localStorage.setItem(
                "qsm_user",
                JSON.stringify(
                  resolvedUser
                )
              );

              localStorage.setItem(
                "user",
                JSON.stringify(
                  resolvedUser
                )
              );
            }
          } else {
            newWarnings.push(
              "El perfil está usando información guardada localmente."
            );
          }

          const currentUserId =
            getEntityId(
              resolvedUser
            );

          /*
          |--------------------------------------------------------------------------
          | Resumen general
          |--------------------------------------------------------------------------
          */

          let summaryData = {};

          if (
            summaryResult.status ===
            "fulfilled"
          ) {
            summaryData =
              extractObject(
                summaryResult.value
                  ?.data,
                [
                  "stats",
                  "summary",
                  "data"
                ]
              ) || {};
          } else {
            newWarnings.push(
              "El resumen general será calculado con los datos disponibles."
            );
          }

          /*
          |--------------------------------------------------------------------------
          | Productos
          |--------------------------------------------------------------------------
          */

          let safeProducts = [];

          if (
            productsResult.status ===
            "fulfilled"
          ) {
            safeProducts =
              extractArray(
                productsResult.value
                  ?.data,
                [
                  "products",
                  "myProducts",
                  "data"
                ]
              );

            safeProducts =
              sortByNewest(
                safeProducts
              );

            setRecentProducts(
              safeProducts.slice(
                0,
                4
              )
            );
          } else {
            newWarnings.push(
              "No se pudieron consultar los productos publicados."
            );

            setRecentProducts(
              []
            );
          }

          /*
          |--------------------------------------------------------------------------
          | Órdenes
          |--------------------------------------------------------------------------
          */

          let safeOrders = [];

          if (
            ordersResult.status ===
            "fulfilled"
          ) {
            safeOrders =
              extractArray(
                ordersResult.value
                  ?.data,
                [
                  "orders",
                  "myOrders",
                  "data"
                ]
              );

            safeOrders =
              sortByNewest(
                safeOrders
              );
          } else {
            newWarnings.push(
              "No se pudieron consultar todas las compras y ventas."
            );
          }

          const purchases =
            currentUserId
              ? safeOrders.filter(
                  (order) =>
                    String(
                      getEntityId(
                        order?.buyer
                      ) ||
                      order?.buyerId ||
                      ""
                    ) ===
                    String(
                      currentUserId
                    )
                )
              : safeOrders;

          const sales =
            currentUserId
              ? safeOrders.filter(
                  (order) =>
                    String(
                      getEntityId(
                        order?.seller
                      ) ||
                      order?.sellerId ||
                      ""
                    ) ===
                    String(
                      currentUserId
                    )
                )
              : [];

          setRecentPurchases(
            purchases.slice(
              0,
              4
            )
          );

          setRecentSales(
            sales.slice(
              0,
              4
            )
          );

          setActivityPurchases(
            purchases
          );

          setActivitySales(
            sales
          );

          const protectedAmount =
            safeOrders.reduce(
              (
                total,
                order
              ) => {
                const status =
                  String(
                    order?.status ||
                    ""
                  ).toUpperCase();

                if (
                  TERMINAL_ORDER_STATUSES.includes(
                    status
                  )
                ) {
                  return total;
                }

                return (
                  total +
                  Number(
                    order?.totalAmount ??
                    order?.total ??
                    order?.price ??
                    order?.product
                      ?.price ??
                    0
                  )
                );
              },
              0
            );

          /*
          |--------------------------------------------------------------------------
          | Reclamos
          |--------------------------------------------------------------------------
          */

          let safeDisputes = [];

          if (
            disputesResult.status ===
            "fulfilled"
          ) {
            safeDisputes =
              extractArray(
                disputesResult.value
                  ?.data,
                [
                  "disputes",
                  "data"
                ]
              );

            safeDisputes =
              sortByNewest(
                safeDisputes
              );

            setRecentDisputes(
              safeDisputes.slice(
                0,
                4
              )
            );

            setActivityDisputes(
              safeDisputes
            );
          } else {
            setRecentDisputes(
              []
            );

            setActivityDisputes(
              []
            );

            newWarnings.push(
              "El centro de reclamos todavía no está disponible."
            );
          }

          /*
          |--------------------------------------------------------------------------
          | Estadísticas finales
          |--------------------------------------------------------------------------
          */

          setStats({
            products:
              numberOrFallback(
                summaryData
                  ?.products ??
                summaryData
                  ?.productsCount,
                safeProducts.length
              ),

            purchases:
              numberOrFallback(
                summaryData
                  ?.purchases ??
                summaryData
                  ?.purchasesCount,
                purchases.length
              ),

            sales:
              numberOrFallback(
                summaryData
                  ?.sales ??
                summaryData
                  ?.salesCount,
                sales.length
              ),

            favorites:
              numberOrFallback(
                summaryData
                  ?.favorites ??
                summaryData
                  ?.favoritesCount,
                Array.isArray(
                  resolvedUser?.favorites
                )
                  ? resolvedUser
                      .favorites
                      .length
                  : 0
              ),

            messages:
              numberOrFallback(
                summaryData
                  ?.messages ??
                summaryData
                  ?.messagesCount,
                0
              ),

            disputes:
              numberOrFallback(
                summaryData
                  ?.disputes ??
                summaryData
                  ?.disputesCount,
                safeDisputes.length
              ),

            protectedAmount:
              numberOrFallback(
                summaryData
                  ?.protectedAmount ??
                summaryData
                  ?.escrowAmount,
                protectedAmount
              )
          });

          setWarnings(
            [
              ...new Set(
                newWarnings
              )
            ]
          );

          setLastUpdatedAt(
            new Date()
          );
        } catch (requestError) {
          console.error(
            "Error cargando Dashboard:",
            requestError
          );

          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError
              ?.message ||
            "No se pudo cargar el Dashboard."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        storedUser
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Efectos
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadDashboard(true);
  }, [
    loadDashboard
  ]);

  /*
  |--------------------------------------------------------------------------
  | Buscar productos
  |--------------------------------------------------------------------------
  */

  const dashboardHealth =
    error
      ? {
          label:
            "Requiere atención",
          className:
            "is-critical"
        }
      : warnings.length > 0
        ? {
            label:
              "Información parcial",
            className:
              "is-warning"
          }
        : {
            label:
              "Estable",
            className:
              "is-stable"
          };

  const lastUpdatedLabel =
    lastUpdatedAt
      ? new Intl.DateTimeFormat(
          "es-DO",
          {
            hour:
              "numeric",
            minute:
              "2-digit",
            hour12:
              true
          }
        ).format(
          lastUpdatedAt
        )
      : "Pendiente";

    const handleSearch = (
    event
  ) => {
    event.preventDefault();

    const value =
      search.trim();

    if (!value) {
      navigate(
        "/marketplace"
      );

      return;
    }

    navigate(
      `/marketplace?search=${encodeURIComponent(
        value
      )}`
    );
  };
    return (
      <div
        className="qsm-dashboard-v3"
        data-theme={isLight ? "light" : "dark"}
      >
        <style>{dashboardV3Styles(settings)}</style>

        <div className="qsm-dashboard-v3-sidebar">
          <Sidebar
            counts={{
              purchases: stats.purchases,
              sales: stats.sales,
              favorites: stats.favorites,
              messages: stats.messages,
              disputes: stats.disputes
            }}
          />
        </div>

        <main className="qsm-dashboard-v3-main">
          <Topbar />

          <div className="qsm-dashboard-v3-shell">
            <header className="qsm-dashboard-v3-header qsm-dashboard-v3-header--executive">
              <div className="qsm-dashboard-v3-title-block">
                <h1>
                  Hola, {displayFirstName}
                  <span aria-hidden="true">
                    {" "}👋
                  </span>
                </h1>

                <strong>
                  Aquí tienes el estado de tu cuenta hoy.
                </strong>

                <p>
                  Consulta tus operaciones, seguridad,
                  productos y actividad desde un solo lugar.
                </p>
              </div>

              <div className="qsm-dashboard-v3-header-status">
                <span>
                  <i
                    className="qsm-dashboard-v3-status-dot"
                    aria-hidden="true"
                  />

                  Última actualización:
                  <strong>
                    {lastUpdatedLabel}
                  </strong>
                </span>

                <span>
                  <i
                    className={`qsm-dashboard-v3-health-dot ${dashboardHealth.className}`}
                    aria-hidden="true"
                  />

                  Estado general:
                  <strong
                    className={
                      dashboardHealth.className
                    }
                  >
                    {dashboardHealth.label}
                  </strong>
                </span>
              </div>

              <div className="qsm-dashboard-v3-header-actions">
                <button
                  type="button"
                  className="qsm-dashboard-v3-refresh"
                  onClick={() =>
                    loadDashboard(false)
                  }
                  disabled={
                    loading ||
                    refreshing
                  }
                >
                  {refreshing
                    ? "Actualizando..."
                    : "↻ Actualizar"}
                </button>

                <label className="qsm-dashboard-v3-period-control">
                  <span aria-hidden="true">
                    ▣
                  </span>

                  <select
                    value={
                      dashboardPeriod
                    }
                    onChange={(event) =>
                      setDashboardPeriod(
                        event.target.value
                      )
                    }
                    aria-label="Período del Dashboard"
                  >
                    <option value="7">
                      Últimos 7 días
                    </option>

                    <option value="30">
                      Últimos 30 días
                    </option>

                    <option value="90">
                      Últimos 90 días
                    </option>
                  </select>
                </label>

                <button
                  type="button"
                  className="qsm-dashboard-v3-report-button"
                  onClick={() =>
                    navigate(
                      "/dashboard"
                    )
                  }
                  title="El reporte detallado se integrará en un bloque posterior"
                >
                  ▥ Ver reporte
                </button>
              </div>
            </header>

            {error && (
              <div className="qsm-dashboard-v3-alert qsm-dashboard-v3-alert-error">
                <strong>No se pudo cargar toda la información.</strong>
                <span>{error}</span>
              </div>
            )}

            <section className="qsm-dashboard-v3-stats">
              <QsmStatCard
                icon="▣"
                title="Productos"
                value={stats.products}
                text="Publicaciones activas"
                tone="purple"
                trendLabel="Período actual"
                sparkline={[
                  18,
                  32,
                  25,
                  46,
                  39,
                  58,
                  52
                ]}
              />

              <QsmStatCard
                icon="🛒"
                title="Compras"
                value={stats.purchases}
                text="Órdenes registradas"
                tone="blue"
                trendLabel="Período actual"
                sparkline={[
                  12,
                  26,
                  20,
                  38,
                  29,
                  51,
                  61
                ]}
              />

              <QsmStatCard
                icon="$"
                title="Ventas"
                value={stats.sales}
                text="Órdenes como vendedor"
                tone="green"
                trendLabel="Período actual"
                sparkline={[
                  14,
                  19,
                  16,
                  34,
                  28,
                  43,
                  55
                ]}
              />

              <QsmStatCard
                icon="🛡"
                title="Monto protegido"
                value={formatMoney(stats.protectedAmount)}
                text="Operaciones activas QSM"
                tone="orange"
                compact
                wide
                trendLabel="Operaciones protegidas"
                sparkline={[
                  20,
                  26,
                  23,
                  37,
                  34,
                  49,
                  62
                ]}
              />
            </section>

            <section className="qsm-dashboard-v3-upper">
              <article className="qsm-dashboard-v3-card qsm-dashboard-v3-chart-card">
                <div className="qsm-dashboard-v3-card-header">
                  <div>
                    <h2>Resumen de actividades</h2>
                    <p>Resumen de tus operaciones en los últimos 30 días.</p>
                  </div>

                  <span className="qsm-dashboard-v3-live-indicator">
                    <i aria-hidden="true" />
                    Datos actualizados
                  </span>
                </div>

                <QsmActivityChart
                  purchases={
                    activityPurchases
                  }
                  sales={
                    activitySales
                  }
                  disputes={
                    activityDisputes
                  }
                  period={
                    dashboardPeriod
                  }
                  onPeriodChange={
                    setDashboardPeriod
                  }
                />
              </article>

              <article className="qsm-dashboard-v3-card qsm-dashboard-v3-quick-card qsm-dashboard-v3-quick-card--premium">
                <div className="qsm-dashboard-v3-card-header">
                  <div>
                    <span className="qsm-dashboard-v3-section-eyebrow">
                      Estado de la cuenta
                    </span>

                    <h2>
                      Resumen rápido
                    </h2>

                    <p>
                      Accesos y alertas principales.
                    </p>
                  </div>

                  <Link
                    to="/profile"
                    className="qsm-dashboard-v3-card-link"
                  >
                    Ver todo
                  </Link>
                </div>

                <div className="qsm-dashboard-v3-quick-grid">
                  <QsmQuickMetric
                    icon="♡"
                    label="Favoritos"
                    value={stats.favorites}
                    tone="purple"
                    to="/favorites"
                    status={
                      stats.favorites > 0
                        ? "Guardados"
                        : "Sin favoritos"
                    }
                  />

                  <QsmQuickMetric
                    icon="💬"
                    label="Mensajes"
                    value={stats.messages}
                    tone="blue"
                    to="/messages"
                    status={
                      stats.messages > 0
                        ? "Sin leer"
                        : "Al día"
                    }
                  />

                  <QsmQuickMetric
                    icon="⚖"
                    label="Disputas"
                    value={stats.disputes}
                    tone="red"
                    to="/disputes"
                    status={
                      stats.disputes > 0
                        ? "Requiere atención"
                        : "Sin casos"
                    }
                    alert={
                      stats.disputes > 0
                    }
                  />

                  <QsmQuickMetric
                    icon="🛡"
                    label="Confianza"
                    value={`${trustScore}/100`}
                    tone="cyan"
                    to="/profile"
                    status={
                      formatTrustLevel(
                        trustScore
                      )
                    }
                  />
                </div>

                <div className="qsm-dashboard-v3-quick-footer">
                  <div>
                    <span>
                      Estado general
                    </span>

                    <strong
                      className={
                        dashboardHealth.className
                      }
                    >
                      {dashboardHealth.label}
                    </strong>
                  </div>

                  <Link
                    to="/profile"
                    className="qsm-dashboard-v3-outline-button"
                  >
                    Ver mi perfil completo
                  </Link>
                </div>
              </article>

              <QsmProfileCard
                fullName={displayFullName}
                profilePhoto={profilePhoto}
                isVerified={isVerified}
                trustScore={trustScore}
                profileCompletion={profileCompletion}
                verificationStatus={user?.verificationStatus}
              />
            </section>

            <section className="qsm-dashboard-v3-actions-card qsm-dashboard-v3-actions-card--premium">
              {/* QSM_FASE15_BLOCK4_MARKETPLACE_ACTION_CENTER */}

              <div className="qsm-dashboard-v3-action-center-header">
                <div>
                  <span className="qsm-dashboard-v3-section-eyebrow">
                    Centro de operaciones
                  </span>

                  <h2>
                    ¿Qué deseas hacer?
                  </h2>

                  <p>
                    Busca productos o entra directamente a una función de QSM.
                  </p>
                </div>

                <span className="qsm-dashboard-v3-action-center-status">
                  <i aria-hidden="true" />

                  Marketplace disponible
                </span>
              </div>

              <form
                onSubmit={handleSearch}
                className="qsm-dashboard-v3-market-search qsm-dashboard-v3-market-search--premium"
              >
                <span
                  className="qsm-dashboard-v3-market-search__icon"
                  aria-hidden="true"
                >
                  ⌕
                </span>

                <div className="qsm-dashboard-v3-market-search__field">
                  <label htmlFor="qsm-dashboard-market-search">
                    Buscar en Marketplace
                  </label>

                  <input
                    id="qsm-dashboard-market-search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Producto, categoría, marca o vendedor..."
                    aria-label="Buscar productos en Marketplace"
                  />
                </div>

                {search && (
                  <button
                    type="button"
                    className="qsm-dashboard-v3-market-search__clear"
                    onClick={() =>
                      setSearch("")
                    }
                    aria-label="Limpiar búsqueda"
                  >
                    ×
                  </button>
                )}

                <button
                  type="submit"
                  className="qsm-dashboard-v3-market-search__submit"
                >
                  Buscar
                  <span aria-hidden="true">
                    →
                  </span>
                </button>
              </form>

              <nav
                className="qsm-dashboard-v3-actions qsm-dashboard-v3-actions--premium"
                aria-label="Acciones rápidas del Dashboard"
              >
                <QsmDashboardAction
                  to="/marketplace"
                  icon="⌑"
                  title="Marketplace"
                  text="Explorar productos"
                  tone="cyan"
                  primary
                />

                <QsmDashboardAction
                  to="/new-product"
                  icon="+"
                  title="Publicar"
                  text="Crear una publicación"
                  tone="green"
                />

                <QsmDashboardAction
                  to="/sales"
                  icon="▣"
                  title="Mis productos"
                  text={`${stats.products} activos`}
                  tone="purple"
                />

                <QsmDashboardAction
                  to="/orders"
                  icon="▤"
                  title="Mis pedidos"
                  text={`${stats.purchases} registrados`}
                  tone="orange"
                />

                <QsmDashboardAction
                  to="/messages"
                  icon="●"
                  title="Mis mensajes"
                  text={
                    stats.messages > 0
                      ? `${stats.messages} sin leer`
                      : "Conversaciones"
                  }
                  tone="blue"
                  alert={
                    stats.messages > 0
                  }
                />

                <QsmDashboardAction
                  to={
                    isVerified
                      ? "/profile"
                      : "/complete-profile"
                  }
                  icon="◇"
                  title="Verificación"
                  text={
                    isVerified
                      ? "Identidad validada"
                      : "Completar proceso"
                  }
                  tone="shield"
                  alert={
                    !isVerified
                  }
                />
              </nav>
            </section>

            {loading ? (
              <div className="qsm-dashboard-v3-loading">
                <span>◌</span>
                <strong>Cargando tu Dashboard...</strong>
                <p>QSM está consultando tus datos reales.</p>
              </div>
            ) : (
              <section className="qsm-dashboard-v3-recent-grid">
                <QsmRecentPanel
                  title="Mis productos recientes"
                  linkText="Ver todos"
                  linkTo="/sales"
                  items={recentProducts}
                  emptyText="Todavía no has publicado productos."
                  footerText="Publicar nuevo producto"
                  footerTo="/new-product"
                  renderItem={(product, index) => (
                    <QsmRecentItem
                      key={product?._id || product?.id || index}
                      image={getProductImage(product)}
                      fallback="📦"
                      title={product?.title || "Producto QSM"}
                      subtitle={formatMoney(product?.price)}
                      status={formatStatus(product?.status)}
                    />
                  )}
                />

                <QsmRecentPanel
                  title="Compras recientes"
                  linkText="Ver todas"
                  linkTo="/orders"
                  items={recentPurchases}
                  emptyText="Todavía no tienes compras recientes."
                  footerText="Ver mis compras"
                  footerTo="/orders"
                  renderItem={(order, index) => (
                    <QsmRecentItem
                      key={order?._id || order?.id || index}
                      image={getProductImage(order?.product)}
                      fallback="🛒"
                      title={
                        order?.product?.title ||
                        order?.productTitle ||
                        "Compra QSM"
                      }
                      subtitle={formatMoney(
                        order?.totalAmount ??
                        order?.total ??
                        order?.price ??
                        order?.product?.price ??
                        0
                      )}
                      status={formatStatus(order?.status)}
                    />
                  )}
                />

                <QsmRecentPanel
                  title="Ventas recientes"
                  linkText="Ver todas"
                  linkTo="/sales"
                  items={recentSales}
                  emptyText="Todavía no tienes ventas recientes."
                  footerText="Ver mis ventas"
                  footerTo="/sales"
                  renderItem={(order, index) => (
                    <QsmRecentItem
                      key={order?._id || order?.id || index}
                      image={getProductImage(order?.product)}
                      fallback="💰"
                      title={
                        order?.product?.title ||
                        order?.productTitle ||
                        "Venta QSM"
                      }
                      subtitle={formatMoney(
                        order?.totalAmount ??
                        order?.total ??
                        order?.price ??
                        order?.product?.price ??
                        0
                      )}
                      status={formatStatus(order?.status)}
                    />
                  )}
                />

                <QsmRecentPanel
                  title="Disputas activas"
                  linkText="Ver todos"
                  linkTo="/disputes"
                  items={recentDisputes}
                  emptyText="No tienes disputas activas."
                  footerText="Ver disputas"
                  footerTo="/disputes"
                  renderItem={(dispute, index) => (
                    <QsmRecentItem
                      key={dispute?._id || dispute?.id || index}
                      fallback="⚖"
                      title={
                        dispute?.disputeCode ||
                        dispute?.caseCode ||
                        "Reclamo QSM"
                      }
                      subtitle={
                        dispute?.reason ||
                        dispute?.category ||
                        "Sin descripción"
                      }
                      status={formatStatus(dispute?.status)}
                    />
                  )}
                />
              </section>
            )}

            {warnings.length > 0 && (
              <div className="qsm-dashboard-v3-alert qsm-dashboard-v3-alert-warning qsm-dashboard-v3-warning-bottom">
                <span className="qsm-dashboard-v3-alert-icon">!</span>

                <div>
                  <strong>Información parcial</strong>

                  <ul>
                    {warnings.map((warning, index) => (
                      <li key={`${warning}-${index}`}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </main>

        <AiAssistant pageContext="dashboard" />
      </div>
    );
}

function QsmStatCard({
  icon,
  title,
  value,
  text,
  tone,
  compact = false,
  wide = false,
  trendLabel = "Período actual",
  sparkline = []
}) {
  const safeSparkline =
    Array.isArray(sparkline) &&
    sparkline.length > 1
      ? sparkline
      : [
          18,
          24,
          22,
          31,
          28,
          38,
          44
        ];

  const maximum =
    Math.max(
      1,
      ...safeSparkline
    );

  const sparklinePoints =
    safeSparkline
      .map(
        (
          point,
          index
        ) => {
          const x =
            (
              index /
              Math.max(
                1,
                safeSparkline.length -
                  1
              )
            ) * 100;

          const y =
            34 -
            (
              Number(point || 0) /
              maximum
            ) * 28;

          return `${x},${y}`;
        }
      )
      .join(" ");

  return (
    <article
      className={`qsm-dashboard-v3-stat qsm-dashboard-v3-stat--premium tone-${tone} ${
        wide
          ? "is-wide"
          : ""
      }`}
    >
      <div className="qsm-dashboard-v3-stat-main">
        <span className="qsm-dashboard-v3-stat-icon">
          {icon}
        </span>

        <div className="qsm-dashboard-v3-stat-copy">
          <small>
            {title}
          </small>

          <strong
            className={
              compact
                ? "compact"
                : ""
            }
          >
            {value}
          </strong>

          <p>
            {text}
          </p>
        </div>

        <div
          className="qsm-dashboard-v3-stat-sparkline"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 100 38"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id={`qsm-stat-gradient-${tone}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="currentColor"
                  stopOpacity=".34"
                />

                <stop
                  offset="100%"
                  stopColor="currentColor"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            <polygon
              points={`0,38 ${sparklinePoints} 100,38`}
              fill={`url(#qsm-stat-gradient-${tone})`}
            />

            <polyline
              points={
                sparklinePoints
              }
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="qsm-dashboard-v3-stat-footer">
        <span>
          <i aria-hidden="true">
            ↗
          </i>

          {trendLabel}
        </span>

        <b>
          Ver detalles
        </b>
      </div>
    </article>
  );
}

function QsmQuickMetric({
  icon,
  label,
  value,
  tone,
  to,
  status,
  alert = false
}) {
  const content = (
    <>
      <div className="qsm-dashboard-v3-quick-metric__top">
        <span className="qsm-dashboard-v3-quick-metric__icon">
          {icon}
        </span>

        {alert && (
          <i
            className="qsm-dashboard-v3-quick-alert"
            aria-label="Requiere atención"
          />
        )}
      </div>

      <div className="qsm-dashboard-v3-quick-metric__copy">
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {status}
        </small>
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`qsm-dashboard-v3-quick-metric qsm-dashboard-v3-quick-metric--premium tone-${tone}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={`qsm-dashboard-v3-quick-metric qsm-dashboard-v3-quick-metric--premium tone-${tone}`}
    >
      {content}
    </div>
  );
}

/* QSM_FASE15_BLOCK3_PREMIUM_QUICK_PROFILE */

function QsmProfileCard({
  fullName,
  profilePhoto,
  isVerified,
  trustScore,
  profileCompletion,
  verificationStatus
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = String(fullName || "U").trim().charAt(0).toUpperCase();

  return (
    <aside className="qsm-dashboard-v3-card qsm-dashboard-v3-profile-card">
      <div className="qsm-dashboard-v3-profile-cover" />

      <div className="qsm-dashboard-v3-profile-content">
        <div className="qsm-dashboard-v3-avatar-wrap">
          <div className="qsm-dashboard-v3-avatar">
            {profilePhoto && !imageFailed ? (
              <img
                src={profilePhoto}
                alt={`Foto de ${fullName}`}
                onError={() => setImageFailed(true)} loading="lazy" decoding="async" />
            ) : (
              initial
            )}
          </div>

          {isVerified && (
            <span className="qsm-dashboard-v3-avatar-check">✓</span>
          )}
        </div>

        <div className="qsm-dashboard-v3-profile-identity">
          <div className="qsm-dashboard-v3-profile-name">
            <span className="qsm-dashboard-v3-section-eyebrow">
              Perfil QSM
            </span>

            <strong>
              {fullName}
            </strong>

            <span
              className={
                isVerified
                  ? "verified"
                  : "pending"
              }
            >
              {isVerified
                ? "✓ Usuario verificado"
                : "● Verificación pendiente"}
            </span>
          </div>

          <div className="qsm-dashboard-v3-profile-score">
            <span>
              Confianza QSM
            </span>

            <strong>
              {trustScore}/100
            </strong>

            <small>
              Nivel {
                formatTrustLevel(
                  trustScore
                )
              }
            </small>
          </div>
        </div>

        <QsmProgress
          label="Perfil completado"
          value={profileCompletion}
        />

        <div className="qsm-dashboard-v3-profile-checklist">
          <div
            className={
              userHasBasicIdentity(
                fullName
              )
                ? "is-complete"
                : "is-pending"
            }
          >
            <span>
              Información personal
            </span>

            <strong>
              {userHasBasicIdentity(
                fullName
              )
                ? "✓"
                : "Pendiente"}
            </strong>
          </div>

          <div
            className={
              isVerified
                ? "is-complete"
                : "is-pending"
            }
          >
            <span>
              Verificación de identidad
            </span>

            <strong>
              {isVerified
                ? "✓"
                : "Pendiente"}
            </strong>
          </div>

          <div
            className={
              profileCompletion >= 70
                ? "is-complete"
                : "is-pending"
            }
          >
            <span>
              Datos de contacto
            </span>

            <strong>
              {profileCompletion >= 70
                ? "✓"
                : "Pendiente"}
            </strong>
          </div>

          <div
            className={
              trustScore >= 70
                ? "is-complete"
                : "is-pending"
            }
          >
            <span>
              Nivel de confianza
            </span>

            <strong>
              {trustScore >= 70
                ? "✓"
                : "En progreso"}
            </strong>
          </div>
        </div>

        <Link
          to={isVerified ? "/profile" : "/complete-profile"}
          className="qsm-dashboard-v3-primary-button"
        >
          {isVerified ? "Administrar perfil" : "Completar verificación"}
        </Link>
      </div>
    </aside>
  );
}

function QsmProgress({ label, value }) {
  const safeValue = clampNumber(value, 0, 100, 0);

  return (
    <div className="qsm-dashboard-v3-progress">
      <div>
        <span>{label}</span>
        <strong>{safeValue}/100</strong>
      </div>

      <div className="qsm-dashboard-v3-progress-track">
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function QsmDashboardAction({
  to,
  icon,
  title,
  text,
  tone,
  primary = false,
  alert = false
}) {
  return (
    <Link
      to={to}
      className={`qsm-dashboard-v3-dashboard-action tone-${tone} ${
        primary
          ? "is-primary"
          : ""
      }`}
    >
      <span className="qsm-dashboard-v3-dashboard-action__icon">
        {icon}
      </span>

      <div>
        <strong>
          {title}
        </strong>

        <small>
          {text}
        </small>
      </div>

      {alert ? (
        <i
          className="qsm-dashboard-v3-dashboard-action__alert"
          aria-label="Acción pendiente"
        />
      ) : (
        <b aria-hidden="true">
          →
        </b>
      )}
    </Link>
  );
}

function QsmRecentPanel({
  title,
  linkText,
  linkTo,
  items,
  emptyText,
  renderItem,
  footerText,
  footerTo
}) {
  const safeItems =
    Array.isArray(items)
      ? items
      : [];

  const visual =
    getRecentPanelVisual(
      title
    );

  return (
    <article
      className={`qsm-dashboard-v3-card qsm-dashboard-v3-recent-panel qsm-dashboard-v3-recent-panel--premium tone-${visual.tone}`}
    >
      <header className="qsm-dashboard-v3-recent-header">
        <div className="qsm-dashboard-v3-recent-heading">
          <span
            className="qsm-dashboard-v3-recent-heading__icon"
            aria-hidden="true"
          >
            {visual.icon}
          </span>

          <div>
            <span className="qsm-dashboard-v3-section-eyebrow">
              Actividad reciente
            </span>

            <h3>
              {title}
            </h3>
          </div>
        </div>

        <div className="qsm-dashboard-v3-recent-header__right">
          <span className="qsm-dashboard-v3-recent-count">
            {safeItems.length}
          </span>

          <Link to={linkTo}>
            {linkText}
            <span aria-hidden="true">
              {" "}→
            </span>
          </Link>
        </div>
      </header>

      <div className="qsm-dashboard-v3-recent-list">
        {safeItems.length === 0 ? (
          <div className="qsm-dashboard-v3-empty qsm-dashboard-v3-empty--premium">
            <span aria-hidden="true">
              {visual.emptyIcon}
            </span>

            <strong>
              Sin actividad reciente
            </strong>

            <p>
              {emptyText}
            </p>
          </div>
        ) : (
          safeItems
            .slice(0, 3)
            .map(renderItem)
        )}
      </div>

      <Link
        to={footerTo}
        className="qsm-dashboard-v3-outline-button qsm-dashboard-v3-recent-footer"
      >
        <span>
          {footerText}
        </span>

        <b aria-hidden="true">
          →
        </b>
      </Link>
    </article>
  );
}

function QsmRecentItem({
  image,
  fallback,
  title,
  subtitle,
  status
}) {
  const [
    imageFailed,
    setImageFailed
  ] = useState(false);

  const statusTone =
    getRecentStatusTone(
      status
    );

  return (
    <div className="qsm-dashboard-v3-recent-item qsm-dashboard-v3-recent-item--premium">
      <div className="qsm-dashboard-v3-recent-thumb">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={title}
            onError={() =>
              setImageFailed(true)
            }
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span>
            {fallback}
          </span>
        )}
      </div>

      <div className="qsm-dashboard-v3-recent-copy">
        <strong title={title}>
          {title}
        </strong>

        <span title={subtitle}>
          {subtitle}
        </span>
      </div>

      <span
        className={`qsm-dashboard-v3-recent-status is-${statusTone}`}
      >
        <i aria-hidden="true" />

        {status}
      </span>
    </div>
  );
}

/* QSM_FASE15_BLOCK2_PROFESSIONAL_ACTIVITY_CHART */

function QsmActivityChart({
  purchases,
  sales,
  disputes,
  period = "30",
  onPeriodChange
}) {
  const [
    activeSeries,
    setActiveSeries
  ] = useState({
    purchases: true,
    sales: true,
    disputes: true
  });

  const [
    hoveredPoint,
    setHoveredPoint
  ] = useState(null);

  const data = useMemo(
    () =>
      buildChartData({
        purchases,
        sales,
        disputes,
        period
      }),
    [
      purchases,
      sales,
      disputes,
      period
    ]
  );

  const totals = useMemo(
    () => {
      return data.reduce(
        (
          accumulator,
          item
        ) => ({
          purchases:
            accumulator.purchases +
            item.purchases,

          sales:
            accumulator.sales +
            item.sales,

          disputes:
            accumulator.disputes +
            item.disputes
        }),
        {
          purchases: 0,
          sales: 0,
          disputes: 0
        }
      );
    },
    [data]
  );

  const totalOperations =
    totals.purchases +
    totals.sales +
    totals.disputes;

  const bestBucket =
    useMemo(() => {
      return [...data].sort(
        (
          first,
          second
        ) => {
          const firstTotal =
            first.purchases +
            first.sales +
            first.disputes;

          const secondTotal =
            second.purchases +
            second.sales +
            second.disputes;

          return (
            secondTotal -
            firstTotal
          );
        }
      )[0] || null;
    }, [data]);

  const bestBucketTotal =
    bestBucket
      ? bestBucket.purchases +
        bestBucket.sales +
        bestBucket.disputes
      : 0;

  const hasActivity =
    totalOperations > 0;

  const width = 900;
  const height = 330;

  const padding = {
    top: 32,
    right: 28,
    bottom: 48,
    left: 68
  };

  const chartWidth =
    width -
    padding.left -
    padding.right;

  const chartHeight =
    height -
    padding.top -
    padding.bottom;

  const visibleValues =
    data.flatMap(
      (item) => {
        const values = [];

        if (
          activeSeries.purchases
        ) {
          values.push(
            item.purchases
          );
        }

        if (
          activeSeries.sales
        ) {
          values.push(
            item.sales
          );
        }

        if (
          activeSeries.disputes
        ) {
          values.push(
            item.disputes
          );
        }

        return values;
      }
    );

  const maxValue =
    Math.max(
      1,
      ...visibleValues
    );

  const getX = (
    index
  ) => {
    return (
      padding.left +
      (
        chartWidth *
        index
      ) /
      Math.max(
        1,
        data.length - 1
      )
    );
  };

  const getY = (
    value
  ) => {
    return (
      padding.top +
      chartHeight -
      (
        Number(value || 0) /
        maxValue
      ) *
      chartHeight
    );
  };

  const makePoints = (
    key
  ) => {
    return data
      .map(
        (
          item,
          index
        ) =>
          `${getX(index)},${getY(
            item[key]
          )}`
      )
      .join(" ");
  };

  const makeAreaPoints = (
    key
  ) => {
    return [
      `${padding.left},${
        padding.top +
        chartHeight
      }`,

      makePoints(key),

      `${
        width -
        padding.right
      },${
        padding.top +
        chartHeight
      }`
    ].join(" ");
  };

  const toggleSeries = (
    key
  ) => {
    setHoveredPoint(
      null
    );

    setActiveSeries(
      (current) => ({
        ...current,
        [key]:
          !current[key]
      })
    );
  };

  const series = [
    {
      key: "purchases",
      label: "Compras",
      value: totals.purchases
    },
    {
      key: "sales",
      label: "Ventas",
      value: totals.sales
    },
    {
      key: "disputes",
      label: "Reclamos",
      value: totals.disputes
    }
  ];

  return (
    <div className="qsm-dashboard-v3-activity-premium">
      <div className="qsm-dashboard-v3-activity-toolbar">
        <div className="qsm-dashboard-v3-activity-totals">
          {series.map(
            (item) => (
              <article
                key={item.key}
                className={
                  `is-${item.key}`
                }
              >
                <strong>
                  {item.value}
                </strong>

                <span>
                  {item.label}
                </span>
              </article>
            )
          )}
        </div>

        <div className="qsm-dashboard-v3-period-tabs">
          {[
            ["7", "7 días"],
            ["30", "30 días"],
            ["90", "90 días"]
          ].map(
            (
              [
                value,
                label
              ]
            ) => (
              <button
                key={value}
                type="button"
                className={
                  String(period) ===
                  value
                    ? "is-active"
                    : ""
                }
                onClick={() => {
                  setHoveredPoint(
                    null
                  );

                  onPeriodChange?.(
                    value
                  );
                }}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      <div className="qsm-dashboard-v3-chart-controls">
        {series.map(
          (item) => (
            <button
              key={item.key}
              type="button"
              className={
                `is-${item.key} ${
                  activeSeries[
                    item.key
                  ]
                    ? "is-active"
                    : ""
                }`
              }
              onClick={() =>
                toggleSeries(
                  item.key
                )
              }
              aria-pressed={
                activeSeries[
                  item.key
                ]
              }
            >
              <i aria-hidden="true" />

              {item.label}
            </button>
          )
        )}
      </div>

      {!hasActivity ? (
        <div className="qsm-dashboard-v3-chart-empty qsm-dashboard-v3-chart-empty--premium">
          <span aria-hidden="true">
            ◔
          </span>

          <strong>
            Todavía no hay suficiente actividad
          </strong>

          <p>
            Cuando registres compras, ventas o reclamos,
            aparecerán aquí tus tendencias.
          </p>
        </div>
      ) : (
        <div
          className="qsm-dashboard-v3-chart-wrap qsm-dashboard-v3-chart-wrap--premium"
          onMouseLeave={() =>
            setHoveredPoint(null)
          }
        >
          <svg
            viewBox={
              `0 0 ${width} ${height}`
            }
            preserveAspectRatio="none"
            role="img"
            aria-label={
              `Actividad de los últimos ${period} días`
            }
          >
            <defs>
              <linearGradient
                id="qsm-purchases-area"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#a855f7"
                  stopOpacity=".42"
                />

                <stop
                  offset="100%"
                  stopColor="#a855f7"
                  stopOpacity="0"
                />
              </linearGradient>

              <linearGradient
                id="qsm-sales-area"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#38bdf8"
                  stopOpacity=".34"
                />

                <stop
                  offset="100%"
                  stopColor="#38bdf8"
                  stopOpacity="0"
                />
              </linearGradient>

              <linearGradient
                id="qsm-disputes-area"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#2dd4bf"
                  stopOpacity=".28"
                />

                <stop
                  offset="100%"
                  stopColor="#2dd4bf"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3, 4].map(
              (step) => {
                const y =
                  padding.top +
                  (
                    chartHeight *
                    step
                  ) /
                  4;

                const value =
                  Math.round(
                    maxValue -
                    (
                      maxValue *
                      step
                    ) /
                    4
                  );

                return (
                  <g key={step}>
                    <line
                      x1={
                        padding.left
                      }
                      x2={
                        width -
                        padding.right
                      }
                      y1={y}
                      y2={y}
                      className="qsm-dashboard-v3-grid-line"
                    />

                    <text
                      x={
                        padding.left -
                        15
                      }
                      y={y + 4}
                      textAnchor="end"
                      className="qsm-dashboard-v3-axis-label"
                    >
                      {value}
                    </text>
                  </g>
                );
              }
            )}

            {series.map(
              (item) => {
                if (
                  !activeSeries[
                    item.key
                  ]
                ) {
                  return null;
                }

                return (
                  <g key={item.key}>
                    <polygon
                      points={
                        makeAreaPoints(
                          item.key
                        )
                      }
                      className={
                        `qsm-dashboard-v3-area ${item.key}`
                      }
                    />

                    <polyline
                      points={
                        makePoints(
                          item.key
                        )
                      }
                      className={
                        `qsm-dashboard-v3-line ${item.key}`
                      }
                    />

                    {data.map(
                      (
                        dataItem,
                        index
                      ) => (
                        <circle
                          key={
                            `${item.key}-${dataItem.label}`
                          }
                          cx={
                            getX(index)
                          }
                          cy={
                            getY(
                              dataItem[
                                item.key
                              ]
                            )
                          }
                          r="4.5"
                          className={
                            `qsm-dashboard-v3-point ${item.key}`
                          }
                          onMouseEnter={() =>
                            setHoveredPoint({
                              index,
                              item:
                                dataItem,
                              x:
                                getX(
                                  index
                                ),
                              y:
                                getY(
                                  dataItem[
                                    item.key
                                  ]
                                )
                            })
                          }
                        />
                      )
                    )}
                  </g>
                );
              }
            )}

            {data.map(
              (
                item,
                index
              ) => (
                <text
                  key={
                    item.label
                  }
                  x={
                    getX(index)
                  }
                  y={
                    height -
                    13
                  }
                  textAnchor="middle"
                  className="qsm-dashboard-v3-axis-label qsm-dashboard-v3-axis-label--date"
                >
                  {item.label}
                </text>
              )
            )}

            {hoveredPoint && (
              <line
                x1={
                  hoveredPoint.x
                }
                x2={
                  hoveredPoint.x
                }
                y1={
                  padding.top
                }
                y2={
                  padding.top +
                  chartHeight
                }
                className="qsm-dashboard-v3-hover-line"
              />
            )}
          </svg>

          {hoveredPoint && (
            <div
              className="qsm-dashboard-v3-chart-tooltip"
              style={{
                left:
                  `clamp(
                    92px,
                    ${
                      (
                        hoveredPoint.x /
                        width
                      ) *
                      100
                    }%,
                    calc(100% - 92px)
                  )`,

                top:
                  `clamp(
                    108px,
                    ${
                      Math.max(
                        10,
                        (
                          hoveredPoint.y /
                          height
                        ) *
                        100 -
                        5
                      )
                    }%,
                    calc(100% - 18px)
                  )`
              }}
            >
              <strong>
                {
                  hoveredPoint
                    .item
                    .fullLabel
                }
              </strong>

              <span className="purchases">
                Compras
                <b>
                  {
                    hoveredPoint
                      .item
                      .purchases
                  }
                </b>
              </span>

              <span className="sales">
                Ventas
                <b>
                  {
                    hoveredPoint
                      .item
                      .sales
                  }
                </b>
              </span>

              <span className="disputes">
                Reclamos
                <b>
                  {
                    hoveredPoint
                      .item
                      .disputes
                  }
                </b>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="qsm-dashboard-v3-activity-insights">
        <article>
          <span aria-hidden="true">
            ↗
          </span>

          <div>
            <small>
              Actividad total
            </small>

            <strong>
              {totalOperations}
            </strong>

            <p>
              En el período seleccionado
            </p>
          </div>
        </article>

        <article>
          <span aria-hidden="true">
            ☆
          </span>

          <div>
            <small>
              Mejor período
            </small>

            <strong>
              {
                bestBucket?.label ||
                "Sin datos"
              }
            </strong>

            <p>
              {bestBucketTotal}
              {" "}
              operaciones
            </p>
          </div>
        </article>

        <article>
          <span aria-hidden="true">
            ▥
          </span>

          <div>
            <small>
              Operaciones protegidas
            </small>

            <strong>
              {
                totals.purchases +
                totals.sales
              }
            </strong>

            <p>
              Compras y ventas
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}

function DashboardPanel({
  eyebrow,
  title,
  actionText,
  actionTo,
  children,
  isLight,
  accent,
  settings
}) {
  return (
    <section
      style={panel(
        isLight,
        settings
      )}
    >
      <div style={sectionHeader}>
        <div>
          <p style={label(accent)}>
            {eyebrow}
          </p>

          <h2 style={panelTitle(isLight)}>
            {title}
          </h2>
        </div>
      </div>

      <div style={panelContent}>
        {children}
      </div>

      {actionText &&
        actionTo && (
          <Link
            to={actionTo}
            style={miniLink(accent)}
          >
            {actionText} →
          </Link>
        )}
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| Tarjeta de estadística
|--------------------------------------------------------------------------
*/

function StatCard({
  icon,
  title,
  value,
  text,
  isLight,
  accent,
  compactValue = false
}) {
  return (
    <article style={statCard(isLight)}>
      <div style={statIcon(accent)}>
        {icon}
      </div>

      <div style={statContent}>
        <span style={statTitle(isLight)}>
          {title}
        </span>

        <strong
          style={
            compactValue
              ? statValueCompact(
                  isLight
                )
              : statValue(
                  isLight
                )
          }
        >
          {value}
        </strong>

        <p style={statText(isLight)}>
          {text}
        </p>
      </div>
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| Acción rápida
|--------------------------------------------------------------------------
*/

function QuickAction({
  icon,
  title,
  text,
  to,
  isLight,
  accent
}) {
  return (
    <Link
      to={to}
      style={quickAction(
        isLight,
        accent
      )}
    >
      <div style={quickIcon(accent)}>
        {icon}
      </div>

      <div style={quickContent}>
        <strong style={quickTitle(isLight)}>
          {title}
        </strong>

        <p style={quickText(isLight)}>
          {text}
        </p>
      </div>

      <span style={quickArrow(accent)}>
        →
      </span>
    </Link>
  );
}

/*
|--------------------------------------------------------------------------
| Fila de actividad
|--------------------------------------------------------------------------
*/

function ActivityRow({
  icon,
  title,
  subtitle,
  value,
  isLight,
  textualValue = false
}) {
  return (
    <div
      className="dashboard-activity-row"
      style={activityRow(isLight)}
    >
      <div style={activityIcon}>
        {icon}
      </div>

      <div style={activityContent}>
        <strong style={activityTitle(isLight)}>
          {title}
        </strong>

        <p style={activitySubtitle(isLight)}>
          {subtitle}
        </p>
      </div>

      <span
        className="dashboard-activity-value"
        style={
          textualValue
            ? activityValueText(
                isLight
              )
            : activityValue(
                isLight
              )
        }
      >
        {value}
      </span>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Línea de progreso
|--------------------------------------------------------------------------
*/

function ProgressLine({
  done,
  text,
  isLight
}) {
  return (
    <div style={progressLine(isLight)}>
      <span
        style={
          done
            ? checkDone
            : checkPending
        }
      >
        {done
          ? "✓"
          : "•"}
      </span>

      <p style={progressText(isLight)}>
        {text}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Estado vacío
|--------------------------------------------------------------------------
*/

function EmptyState({
  icon = "○",
  text,
  isLight
}) {
  return (
    <div style={emptyState(isLight)}>
      <div style={emptyStateIcon}>
        {icon}
      </div>

      <p style={emptyStateText(isLight)}>
        {text}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Estado de cuenta
|--------------------------------------------------------------------------
*/

function AccountStatusRow({
  label,
  value,
  isLight,
  accent
}) {
  return (
    <div style={accountStatusRow(isLight)}>
      <span style={accountStatusLabel(isLight)}>
        {label}
      </span>

      <strong style={accountStatusValue(accent)}>
        {value}
      </strong>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Lectura segura de JSON
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
| Identificador genérico
|--------------------------------------------------------------------------
*/

function getEntityId(entity) {
  if (!entity) {
    return "";
  }

  if (
    typeof entity ===
    "string"
  ) {
    return entity;
  }

  return (
    entity?._id ||
    entity?.id ||
    entity?.userId ||
    ""
  );
}

/*
|--------------------------------------------------------------------------
| Normalizar nombre y apellido
|--------------------------------------------------------------------------
*/

function formatPersonName(value) {
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
| Resolver URL de foto de perfil
|--------------------------------------------------------------------------
*/

function getProfilePhotoUrl(value) {
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
      "data:image/"
    )
  ) {
    return cleanValue;
  }

  if (
    cleanValue.startsWith(
      "blob:"
    )
  ) {
    return cleanValue;
  }

  if (
    cleanValue.startsWith(
      "http://"
    ) ||
    cleanValue.startsWith(
      "https://"
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
| Resolver origen del backend
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
| Extraer objeto de respuestas variadas
|--------------------------------------------------------------------------
*/

function extractObject(
  source,
  preferredKeys = []
) {
  if (
    !source ||
    typeof source !==
      "object"
  ) {
    return null;
  }

  for (
    const key of
    preferredKeys
  ) {
    const value =
      source?.[key];

    if (
      value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
    ) {
      return value;
    }
  }

  if (
    !Array.isArray(source)
  ) {
    return source;
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Extraer arreglo de respuestas variadas
|--------------------------------------------------------------------------
*/

function extractArray(
  source,
  preferredKeys = []
) {
  if (
    Array.isArray(source)
  ) {
    return source;
  }

  if (
    !source ||
    typeof source !==
      "object"
  ) {
    return [];
  }

  for (
    const key of
    preferredKeys
  ) {
    const value =
      source?.[key];

    if (
      Array.isArray(value)
    ) {
      return value;
    }
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| Ordenar por fecha más reciente
|--------------------------------------------------------------------------
*/

function sortByNewest(items) {
  if (
    !Array.isArray(items)
  ) {
    return [];
  }

  return [...items].sort(
    (
      first,
      second
    ) => {
      const firstDate =
        new Date(
          first?.updatedAt ||
          first?.createdAt ||
          0
        ).getTime();

      const secondDate =
        new Date(
          second?.updatedAt ||
          second?.createdAt ||
          0
        ).getTime();

      return (
        secondDate -
        firstDate
      );
    }
  );
}

/*
|--------------------------------------------------------------------------
| Número seguro
|--------------------------------------------------------------------------
*/

function numberOrFallback(
  value,
  fallback = 0
) {
  const parsedValue =
    Number(value);

  if (
    Number.isFinite(
      parsedValue
    )
  ) {
    return parsedValue;
  }

  const parsedFallback =
    Number(fallback);

  return Number.isFinite(
    parsedFallback
  )
    ? parsedFallback
    : 0;
}

/*
|--------------------------------------------------------------------------
| Limitar valor numérico
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
| Color principal
|--------------------------------------------------------------------------
*/

function getAccentColor(color) {
  const map = {
    cyan: "#35d0c3",
    purple: "#8b5cf6",
    pink: "#ec4899",
    blue: "#38bdf8",
    green: "#22c55e",
    orange: "#f59e0b"
  };

  return (
    map[
      String(
        color || ""
      ).toLowerCase()
    ] ||
    "#35d0c3"
  );
}

/*
|--------------------------------------------------------------------------
| Formato monetario
|--------------------------------------------------------------------------
*/

function formatMoney(value) {
  return new Intl.NumberFormat(
    "es-DO",
    {
      style: "currency",
      currency: "DOP",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );
}

/*
|--------------------------------------------------------------------------
| Estado general
|--------------------------------------------------------------------------
*/

function formatStatus(status) {
  const normalized =
    String(
      status || ""
    ).toUpperCase();

  const map = {
    ACTIVE:
      "Activo",

    PENDING:
      "Pendiente",

    WAITING_PAYMENT:
      "Esperando pago",

    PAYMENT_UNDER_REVIEW:
      "Pago en revisión",

    PAYMENT_CONFIRMED:
      "Pago confirmado",

    WAITING_SELLER:
      "Esperando vendedor",

    WAITING_WAREHOUSE:
      "Esperando almacén",

    IN_WAREHOUSE:
      "En almacén",

    UNDER_INSPECTION:
      "En inspección",

    READY_FOR_PICKUP:
      "Listo para entrega",

    OUT_FOR_DELIVERY:
      "En camino",

    WAITING_PIN:
      "Esperando PIN",

    DELIVERED:
      "Entregado",

    COMPLETED:
      "Completado",

    CANCELLED:
      "Cancelado",

    REJECTED:
      "Rechazado",

    REFUNDED:
      "Reembolsado",

    HELD:
      "Pago retenido",

    PAID:
      "Pago retenido",

    SHIPPED:
      "Enviado",

    RELEASED:
      "Pago liberado",

    SOLD:
      "Vendido",

    DISABLED:
      "Deshabilitado",

    OPEN:
      "Abierto",

    IN_REVIEW:
      "En revisión",

    WAITING_EVIDENCE:
      "Esperando evidencia",

    CLOSED:
      "Cerrado",

    DISPUTED:
      "En reclamo"
  };

  return (
    map[normalized] ||
    normalized ||
    "Activo"
  );
}

/*
|--------------------------------------------------------------------------
| Estado de la cuenta
|--------------------------------------------------------------------------
*/

function formatAccountStatus(value) {
  const normalized =
    String(
      value || ""
    ).toUpperCase();

  const map = {
    ACTIVE:
      "Activa",

    PENDING:
      "Pendiente",

    SUSPENDED:
      "Suspendida",

    BANNED:
      "Bloqueada",

    DELETED:
      "Eliminada"
  };

  return (
    map[normalized] ||
    "Pendiente"
  );
}

/*
|--------------------------------------------------------------------------
| Estado de verificación
|--------------------------------------------------------------------------
*/

function formatVerificationStatus(value) {
  const normalized =
    String(
      value || ""
    ).toUpperCase();

  const map = {
    NOT_STARTED:
      "No iniciada",

    NOT_SUBMITTED:
      "No iniciada",

    PENDING:
      "Pendiente",

    UNDER_REVIEW:
      "En revisión",

    APPROVED:
      "Aprobada",

    VERIFIED:
      "Verificada",

    REJECTED:
      "Rechazada"
  };

  return (
    map[normalized] ||
    "No iniciada"
  );
}

/*
|--------------------------------------------------------------------------
| Nivel de seguridad
|--------------------------------------------------------------------------
*/

function formatSecurityLevel(value) {
  const normalized =
    String(
      value || ""
    ).toUpperCase();

  const map = {
    NORMAL:
      "Normal",

    ELEVATED:
      "Elevado",

    LOCKED:
      "Bloqueado",

    CRITICAL:
      "Crítico"
  };

  return (
    map[normalized] ||
    "Normal"
  );
}
/*
|--------------------------------------------------------------------------
| Utilidades visuales del Dashboard V3
|--------------------------------------------------------------------------
*/

/* QSM_FASE15_BLOCK5_RECENT_RESPONSIVE_POLISH */

function getRecentPanelVisual(
  title
) {
  const normalized =
    String(
      title || ""
    ).toLocaleLowerCase(
      "es-DO"
    );

  if (
    normalized.includes(
      "producto"
    )
  ) {
    return {
      icon: "▣",
      emptyIcon: "□",
      tone: "purple"
    };
  }

  if (
    normalized.includes(
      "compra"
    )
  ) {
    return {
      icon: "🛒",
      emptyIcon: "○",
      tone: "blue"
    };
  }

  if (
    normalized.includes(
      "venta"
    )
  ) {
    return {
      icon: "$",
      emptyIcon: "◇",
      tone: "green"
    };
  }

  if (
    normalized.includes(
      "disputa"
    )
  ) {
    return {
      icon: "⚖",
      emptyIcon: "✓",
      tone: "red"
    };
  }

  return {
    icon: "◈",
    emptyIcon: "○",
    tone: "cyan"
  };
}

function getRecentStatusTone(
  status
) {
  const normalized =
    String(
      status || ""
    )
      .trim()
      .toLocaleLowerCase(
        "es-DO"
      );

  const successWords = [
    "activo",
    "activa",
    "aprobado",
    "aprobada",
    "completado",
    "completada",
    "entregado",
    "entregada",
    "pagado",
    "vendido",
    "verificado",
    "liberado"
  ];

  const warningWords = [
    "pendiente",
    "esperando",
    "revisión",
    "retenido",
    "camino",
    "inspección"
  ];

  const dangerWords = [
    "cancelado",
    "cancelada",
    "rechazado",
    "rechazada",
    "reembolsado",
    "bloqueado",
    "disputa",
    "reclamo"
  ];

  if (
    successWords.some(
      (word) =>
        normalized.includes(
          word
        )
    )
  ) {
    return "success";
  }

  if (
    dangerWords.some(
      (word) =>
        normalized.includes(
          word
        )
    )
  ) {
    return "danger";
  }

  if (
    warningWords.some(
      (word) =>
        normalized.includes(
          word
        )
    )
  ) {
    return "warning";
  }

  return "neutral";
}

function getProductImage(product) {
  if (!product) {
    return "";
  }

  const firstImage =
    Array.isArray(product?.images)
      ? product.images[0]
      : "";

  const value =
    product?.thumbnail ||
    product?.image ||
    product?.imageUrl ||
    firstImage ||
    "";

  if (!value) {
    return "";
  }

  const rawValue =
    typeof value === "string"
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
      .replaceAll("&#x2F;", "/")
      .replaceAll("&amp;", "&")
      .replace(/\\/g, "/");

  if (
    cleanValue.startsWith("http://") ||
    cleanValue.startsWith("https://") ||
    cleanValue.startsWith("data:image/") ||
    cleanValue.startsWith("blob:")
  ) {
    return cleanValue;
  }

  const apiOrigin = getApiOrigin();

  if (cleanValue.startsWith("/uploads/")) {
    return `${apiOrigin}${cleanValue}`;
  }

  if (cleanValue.startsWith("uploads/")) {
    return `${apiOrigin}/${cleanValue}`;
  }

  return `${apiOrigin}/uploads/products/images/${cleanValue}`;
}

function userHasBasicIdentity(
  fullName
) {
  return Boolean(
    String(
      fullName || ""
    ).trim()
  );
}

function formatTrustLevel(value) {
  const score = clampNumber(value, 0, 100, 0);

  if (score >= 80) {
    return "Alto";
  }

  if (score >= 50) {
    return "Medio";
  }

  return "Inicial";
}

function buildChartData({
  purchases,
  sales,
  disputes,
  period = "30"
}) {
  const totalDays =
    Math.max(
      7,
      Number(period || 30)
    );

  const bucketCount =
    totalDays <= 7
      ? 7
      : totalDays <= 30
        ? 10
        : 12;

  const daysPerBucket =
    Math.ceil(
      totalDays /
      bucketCount
    );

  const now =
    new Date();

  now.setHours(
    23,
    59,
    59,
    999
  );

  const rangeStart =
    new Date(now);

  rangeStart.setDate(
    rangeStart.getDate() -
    totalDays +
    1
  );

  rangeStart.setHours(
    0,
    0,
    0,
    0
  );

  const buckets =
    Array.from(
      {
        length:
          bucketCount
      },
      (
        _,
        index
      ) => {
        const start =
          new Date(
            rangeStart
          );

        start.setDate(
          start.getDate() +
          index *
          daysPerBucket
        );

        const end =
          new Date(start);

        end.setDate(
          end.getDate() +
          daysPerBucket
        );

        if (
          end >
          new Date(
            now.getTime() +
            1
          )
        ) {
          end.setTime(
            now.getTime() +
            1
          );
        }

        return {
          start,
          end,

          label:
            new Intl.DateTimeFormat(
              "es-DO",
              {
                day:
                  "2-digit",
                month:
                  "short"
              }
            ).format(start),

          fullLabel:
            new Intl.DateTimeFormat(
              "es-DO",
              {
                day:
                  "numeric",
                month:
                  "long",
                year:
                  "numeric"
              }
            ).format(start),

          purchases: 0,
          sales: 0,
          disputes: 0
        };
      }
    ).filter(
      (bucket) =>
        bucket.start <= now
    );

  const addItems = (
    items,
    key
  ) => {
    (
      Array.isArray(items)
        ? items
        : []
    ).forEach(
      (item) => {
        const date =
          new Date(
            item?.createdAt ||
            item?.updatedAt ||
            item?.date ||
            0
          );

        if (
          Number.isNaN(
            date.getTime()
          ) ||
          date < rangeStart ||
          date > now
        ) {
          return;
        }

        const bucket =
          buckets.find(
            (entry) =>
              date >=
                entry.start &&
              date <
                entry.end
          );

        if (bucket) {
          bucket[key] += 1;
        }
      }
    );
  };

  addItems(
    purchases,
    "purchases"
  );

  addItems(
    sales,
    "sales"
  );

  addItems(
    disputes,
    "disputes"
  );

  return buckets;
}

function dashboardV3Styles(settings) {
  const animations =
    settings?.animations === false
      ? "none"
      : "all .22s ease";

  return `
    .qsm-dashboard-v3 {
      --v3-sidebar-width:
        ${settings?.compactSidebar ? "96px" : "300px"};

      width: 100%;
      min-height: 100vh;
      color: var(--qsm-text, #f8fafc);
      background:
        radial-gradient(
          circle at 88% 4%,
          rgba(var(--qsm-accent-rgb), .12),
          transparent 28%
        ),
        radial-gradient(
          circle at 8% 14%,
          rgba(56, 189, 248, .08),
          transparent 25%
        ),
        var(--qsm-bg, #020617);
    }

    .qsm-dashboard-v3 *,
    .qsm-dashboard-v3 *::before,
    .qsm-dashboard-v3 *::after {
      box-sizing: border-box;
    }

    .qsm-dashboard-v3-sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      width: var(--v3-sidebar-width);
      height: 100dvh;
      z-index: 740;
    }

    .qsm-dashboard-v3-main {
      width: calc(100% - var(--v3-sidebar-width));
      min-height: 100vh;
      margin-left: var(--v3-sidebar-width);
      padding: 18px clamp(18px, 2.2vw, 34px) 50px;
      transition: ${animations};
    }

    .qsm-dashboard-v3-shell {
      width: min(1660px, 100%);
      margin: 0 auto;
    }

    .qsm-dashboard-v3-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
      margin: 12px 0 18px;
    }

    .qsm-dashboard-v3-title-block h1 {
      margin: 0 0 8px;
      color: var(--qsm-text, #f8fafc);
      font-size: clamp(28px, 2.5vw, 42px);
      line-height: 1;
      letter-spacing: -1.3px;
    }

    .qsm-dashboard-v3-title-block > strong {
      display: block;
      margin-bottom: 5px;
      color: var(--qsm-accent, #35d0c3);
      font-size: 14px;
    }

    .qsm-dashboard-v3-title-block p {
      margin: 0;
      color: var(--qsm-text-secondary, #94a3b8);
      font-size: 12px;
      line-height: 19px;
    }

    .qsm-dashboard-v3-refresh,
    .qsm-dashboard-v3-primary-button,
    .qsm-dashboard-v3-outline-button {
      min-height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 15px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 900;
      text-decoration: none;
      cursor: pointer;
      transition: ${animations};
    }

    .qsm-dashboard-v3-refresh {
      border: 1px solid rgba(var(--qsm-accent-rgb), .4);
      background: rgba(var(--qsm-accent-rgb), .07);
      color: var(--qsm-accent);
    }

    .qsm-dashboard-v3-primary-button {
      width: 100%;
      border: none;
      color: #fff;
      background:
        linear-gradient(
          135deg,
          var(--qsm-accent),
          #38bdf8,
          #8b5cf6
        );
    }

    .qsm-dashboard-v3-outline-button {
      border: 1px solid rgba(var(--qsm-accent-rgb), .34);
      background: transparent;
      color: var(--qsm-accent);
    }

    .qsm-dashboard-v3-refresh:hover,
    .qsm-dashboard-v3-primary-button:hover,
    .qsm-dashboard-v3-outline-button:hover {
      transform:
        ${settings?.animations === false ? "none" : "translateY(-2px)"};
    }

    .qsm-dashboard-v3-alert {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding: 13px 15px;
      border-radius: 14px;
      font-size: 10px;
      line-height: 17px;
    }

    .qsm-dashboard-v3-alert strong,
    .qsm-dashboard-v3-alert span {
      display: block;
    }

    .qsm-dashboard-v3-alert ul {
      margin: 4px 0 0;
      padding-left: 16px;
    }

    .qsm-dashboard-v3-alert-error {
      margin-bottom: 15px;
      border: 1px solid rgba(239, 68, 68, .3);
      background: rgba(127, 29, 29, .18);
      color: #fca5a5;
    }

    .qsm-dashboard-v3-alert-warning {
      border: 1px solid rgba(245, 158, 11, .26);
      background: rgba(245, 158, 11, .07);
      color: var(--qsm-text-secondary);
    }

    .qsm-dashboard-v3-warning-bottom {
      margin-top: 16px;
    }

    .qsm-dashboard-v3-alert-icon {
      width: 29px;
      height: 29px;
      display: grid !important;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 9px;
      background: rgba(245, 158, 11, .16);
      color: #f59e0b;
      font-weight: 950;
    }

    .qsm-dashboard-v3-stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }

    .qsm-dashboard-v3-stat,
    .qsm-dashboard-v3-card,
    .qsm-dashboard-v3-actions-card {
      border: 1px solid var(--qsm-border, rgba(148,163,184,.14));
      background: var(--qsm-surface, rgba(15,23,42,.74));
      box-shadow: var(--qsm-shadow, 0 18px 50px rgba(0,0,0,.14));
      backdrop-filter:
        ${settings?.glassEffect === false ? "none" : "blur(14px)"};
    }

    .qsm-dashboard-v3-stat {
      min-width: 0;
      min-height: 96px;
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr) 15px;
      align-items: center;
      gap: 11px;
      padding: 15px;
      border-radius: 17px;
    }

    .qsm-dashboard-v3-stat-icon {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      border-radius: 13px;
      background: rgba(var(--qsm-accent-rgb), .1);
      color: var(--qsm-accent);
      font-size: 19px;
      font-weight: 950;
    }

    .qsm-dashboard-v3-stat.tone-blue .qsm-dashboard-v3-stat-icon {
      background: rgba(56, 189, 248, .12);
      color: #38bdf8;
    }

    .qsm-dashboard-v3-stat.tone-purple .qsm-dashboard-v3-stat-icon {
      background: rgba(139, 92, 246, .13);
      color: #a78bfa;
    }

    .qsm-dashboard-v3-stat.tone-orange .qsm-dashboard-v3-stat-icon {
      background: rgba(245, 158, 11, .12);
      color: #f59e0b;
    }

    .qsm-dashboard-v3-stat small,
    .qsm-dashboard-v3-stat strong,
    .qsm-dashboard-v3-stat p {
      display: block;
    }

    .qsm-dashboard-v3-stat small {
      color: var(--qsm-text-secondary);
      font-size: 9px;
      font-weight: 800;
    }

    .qsm-dashboard-v3-stat strong {
      margin: 3px 0;
      color: var(--qsm-text);
      font-size: 25px;
      line-height: 27px;
    }

    .qsm-dashboard-v3-stat strong.compact {
      font-size: clamp(16px, 1.4vw, 21px);
    }

    .qsm-dashboard-v3-stat p {
      margin: 0;
      color: var(--qsm-muted);
      font-size: 8px;
    }

    .qsm-dashboard-v3-stat-arrow {
      color: var(--qsm-accent);
      font-size: 17px;
    }

    /* =======================================================
       QSM_FASE15_BLOCK1_EXECUTIVE_HEADER_STATS
    ======================================================= */

    .qsm-dashboard-v3-header--executive {
      display: grid;
      grid-template-columns:
        minmax(300px, 1.15fr)
        minmax(250px, .75fr)
        auto;
      align-items: center;
      gap: 22px;
      padding: 9px 0 4px;
    }

    .qsm-dashboard-v3-header--executive
    .qsm-dashboard-v3-title-block > strong {
      margin-bottom: 6px;
      color: var(--qsm-text);
      font-size: 13px;
    }

    .qsm-dashboard-v3-header-status {
      display: grid;
      gap: 8px;
      padding: 10px 14px;
      border-left:
        1px solid var(--qsm-border);
    }

    .qsm-dashboard-v3-header-status > span {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--qsm-text-secondary);
      font-size: 9px;
      white-space: nowrap;
    }

    .qsm-dashboard-v3-header-status strong {
      color: var(--qsm-text);
      font-size: 9px;
    }

    .qsm-dashboard-v3-status-dot,
    .qsm-dashboard-v3-health-dot {
      width: 7px;
      height: 7px;
      flex: 0 0 7px;
      border-radius: 50%;
    }

    .qsm-dashboard-v3-status-dot {
      background: #38bdf8;
      box-shadow:
        0 0 9px rgba(56, 189, 248, .72);
    }

    .qsm-dashboard-v3-health-dot.is-stable {
      background: #22c55e;
      box-shadow:
        0 0 9px rgba(34, 197, 94, .72);
    }

    .qsm-dashboard-v3-health-dot.is-warning {
      background: #f59e0b;
      box-shadow:
        0 0 9px rgba(245, 158, 11, .7);
    }

    .qsm-dashboard-v3-health-dot.is-critical {
      background: #fb7185;
      box-shadow:
        0 0 9px rgba(251, 113, 133, .7);
    }

    .qsm-dashboard-v3-header-status
    strong.is-stable {
      color: #4ade80;
    }

    .qsm-dashboard-v3-header-status
    strong.is-warning {
      color: #fbbf24;
    }

    .qsm-dashboard-v3-header-status
    strong.is-critical {
      color: #fda4af;
    }

    .qsm-dashboard-v3-header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 9px;
    }

    .qsm-dashboard-v3-period-control,
    .qsm-dashboard-v3-report-button {
      min-height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 12px;
      border:
        1px solid var(--qsm-border);
      border-radius: 12px;
      background:
        rgba(15, 23, 42, .58);
      color: var(--qsm-text-secondary);
      font-size: 9px;
      font-weight: 850;
    }

    .qsm-dashboard-v3-period-control select {
      min-width: 118px;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--qsm-text);
      font-size: 9px;
      font-weight: 850;
      cursor: pointer;
    }

    .qsm-dashboard-v3-period-control option {
      background: #0f172a;
      color: #f8fafc;
    }

    .qsm-dashboard-v3-report-button {
      border-color:
        rgba(139, 92, 246, .36);
      color: #c4b5fd;
      cursor: pointer;
    }

    .qsm-dashboard-v3-stats {
      grid-template-columns:
        repeat(
          3,
          minmax(0, 1fr)
        )
        minmax(0, 1.34fr);
      gap: 13px;
    }

    .qsm-dashboard-v3-stat--premium {
      position: relative;
      min-height: 126px;
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows:
        minmax(0, 1fr)
        auto;
      gap: 0;
      padding: 0;
      overflow: hidden;
      border-radius: 18px;
      isolation: isolate;
      transition:
        transform .2s ease,
        border-color .2s ease,
        box-shadow .2s ease;
    }

    .qsm-dashboard-v3-stat--premium::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: -1;
      opacity: .42;
      background:
        radial-gradient(
          circle at 90% 14%,
          currentColor,
          transparent 35%
        );
      pointer-events: none;
    }

    .qsm-dashboard-v3-stat--premium:hover {
      transform:
        translateY(-3px);
      border-color:
        rgba(125, 211, 252, .28);
      box-shadow:
        0 22px 54px
        rgba(0, 0, 0, .24);
    }

    .qsm-dashboard-v3-stat-main {
      min-width: 0;
      display: grid;
      grid-template-columns:
        48px
        minmax(0, 1fr)
        minmax(74px, .72fr);
      align-items: center;
      gap: 11px;
      padding: 15px 15px 12px;
    }

    .qsm-dashboard-v3-stat-copy {
      min-width: 0;
    }

    .qsm-dashboard-v3-stat--premium
    .qsm-dashboard-v3-stat-icon {
      width: 48px;
      height: 48px;
      border:
        1px solid currentColor;
      box-shadow:
        inset 0 0 18px
        rgba(255, 255, 255, .025);
    }

    .qsm-dashboard-v3-stat--premium
    .qsm-dashboard-v3-stat-copy small {
      font-size: 10px;
    }

    .qsm-dashboard-v3-stat--premium
    .qsm-dashboard-v3-stat-copy strong {
      margin: 4px 0;
      font-size:
        clamp(
          22px,
          1.9vw,
          29px
        );
    }

    .qsm-dashboard-v3-stat--premium
    .qsm-dashboard-v3-stat-copy
    strong.compact {
      font-size:
        clamp(
          18px,
          1.45vw,
          24px
        );
    }

    .qsm-dashboard-v3-stat--premium
    .qsm-dashboard-v3-stat-copy p {
      font-size: 8px;
    }

    .qsm-dashboard-v3-stat-sparkline {
      width: 100%;
      height: 48px;
      align-self: center;
      color: var(--qsm-accent);
      filter:
        drop-shadow(
          0 0 7px
          rgba(var(--qsm-accent-rgb), .34)
        );
    }

    .qsm-dashboard-v3-stat-sparkline svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .qsm-dashboard-v3-stat.tone-purple {
      color: #a855f7;
    }

    .qsm-dashboard-v3-stat.tone-blue {
      color: #3b82f6;
    }

    .qsm-dashboard-v3-stat.tone-green {
      color: #14b8a6;
    }

    .qsm-dashboard-v3-stat.tone-orange {
      color: #f59e0b;
    }

    .qsm-dashboard-v3-stat.tone-purple
    .qsm-dashboard-v3-stat-icon,
    .qsm-dashboard-v3-stat.tone-purple
    .qsm-dashboard-v3-stat-sparkline {
      color: #a855f7;
    }

    .qsm-dashboard-v3-stat.tone-blue
    .qsm-dashboard-v3-stat-icon,
    .qsm-dashboard-v3-stat.tone-blue
    .qsm-dashboard-v3-stat-sparkline {
      color: #3b82f6;
    }

    .qsm-dashboard-v3-stat.tone-green
    .qsm-dashboard-v3-stat-icon,
    .qsm-dashboard-v3-stat.tone-green
    .qsm-dashboard-v3-stat-sparkline {
      color: #14b8a6;
    }

    .qsm-dashboard-v3-stat.tone-orange
    .qsm-dashboard-v3-stat-icon,
    .qsm-dashboard-v3-stat.tone-orange
    .qsm-dashboard-v3-stat-sparkline {
      color: #f59e0b;
    }

    .qsm-dashboard-v3-stat-footer {
      min-height: 34px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 15px;
      border-top:
        1px solid var(--qsm-border);
      background:
        rgba(2, 6, 23, .18);
    }

    .qsm-dashboard-v3-stat-footer span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #4ade80;
      font-size: 8px;
      font-weight: 850;
    }

    .qsm-dashboard-v3-stat-footer i {
      font-style: normal;
    }

    .qsm-dashboard-v3-stat-footer b {
      color: var(--qsm-muted);
      font-size: 7px;
      font-weight: 750;
    }

    @media (max-width: 1500px) {
      .qsm-dashboard-v3-header--executive {
        grid-template-columns:
          minmax(280px, 1fr)
          auto;
      }

      .qsm-dashboard-v3-header-status {
        display: none;
      }

      .qsm-dashboard-v3-stats {
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
      }

      .qsm-dashboard-v3-stat.is-wide {
        grid-column:
          span 1;
      }
    }

    @media (max-width: 1050px) {
      .qsm-dashboard-v3-header--executive {
        grid-template-columns:
          minmax(0, 1fr);
        align-items: stretch;
      }

      .qsm-dashboard-v3-header-actions {
        justify-content:
          flex-start;
        flex-wrap: wrap;
      }
    }

    @media (max-width: 650px) {
      .qsm-dashboard-v3-header-actions {
        display: grid;
        grid-template-columns:
          1fr;
      }

      .qsm-dashboard-v3-header-actions > *,
      .qsm-dashboard-v3-period-control {
        width: 100%;
      }

      .qsm-dashboard-v3-period-control select {
        width: 100%;
      }

      .qsm-dashboard-v3-stats {
        grid-template-columns:
          minmax(0, 1fr);
      }

      .qsm-dashboard-v3-stat-main {
        grid-template-columns:
          48px
          minmax(0, 1fr)
          88px;
      }
    }

    .qsm-dashboard-v3-upper {
      display: grid;
      grid-template-columns:
        minmax(0, 1.8fr)
        minmax(250px, .85fr)
        minmax(280px, .9fr);
      grid-template-areas:
        "chart quick profile";
      gap: 14px;
      margin-bottom: 14px;
      align-items: start;
    }


    .qsm-dashboard-v3-card {
      min-width: 0;
      border-radius: 19px;
    }

    .qsm-dashboard-v3-chart-card {
      grid-area: chart;
      padding: 18px;
    }

    .qsm-dashboard-v3-quick-card {
      grid-area: quick;
      padding: 18px;
    }

    .qsm-dashboard-v3-profile-card {
      grid-area: profile;
      overflow: hidden;
    }

    .qsm-dashboard-v3-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .qsm-dashboard-v3-card-header h2 {
      margin: 0 0 5px;
      color: var(--qsm-text);
      font-size: 15px;
    }

    .qsm-dashboard-v3-card-header p {
      margin: 0;
      color: var(--qsm-muted);
      font-size: 9px;
    }

    .qsm-dashboard-v3-card-header > span {
      padding: 8px 10px;
      border: 1px solid var(--qsm-border);
      border-radius: 9px;
      color: var(--qsm-text-secondary);
      font-size: 8px;
      font-weight: 800;
      white-space: nowrap;
    }

    .qsm-dashboard-v3-chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 13px;
      margin-bottom: 6px;
    }

    .qsm-dashboard-v3-chart-legend span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--qsm-text-secondary);
      font-size: 8px;
    }

    .qsm-dashboard-v3-chart-legend i {
      width: 13px;
      height: 3px;
      border-radius: 99px;
    }

    .qsm-dashboard-v3-chart-legend .purchases {
      background: #8b5cf6;
    }

    .qsm-dashboard-v3-chart-legend .sales {
      background: var(--qsm-accent);
    }

    .qsm-dashboard-v3-chart-legend .disputes {
      background: #38bdf8;
    }

    .qsm-dashboard-v3-chart-wrap {
      min-height: 235px;
      display: grid;
      place-items: center;
    }

    .qsm-dashboard-v3-chart-wrap svg {
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .qsm-dashboard-v3-grid-line {
      stroke: var(--qsm-border);
      stroke-width: 1;
    }

    .qsm-dashboard-v3-axis-label {
      fill: var(--qsm-muted);
      font-size: 8px;
    }

    .qsm-dashboard-v3-line {
      fill: none;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .qsm-dashboard-v3-line.purchases {
      stroke: #8b5cf6;
    }

    .qsm-dashboard-v3-line.sales {
      stroke: var(--qsm-accent);
    }

    .qsm-dashboard-v3-line.disputes {
      stroke: #38bdf8;
    }

    .qsm-dashboard-v3-chart-empty {
      min-height: 235px;
      display: grid;
      place-items: center;
      padding: 20px;
      color: var(--qsm-muted);
      font-size: 10px;
      text-align: center;
    }

    /* =======================================================
       QSM_FASE15_BLOCK2_PROFESSIONAL_ACTIVITY_CHART
    ======================================================= */

    .qsm-dashboard-v3-live-indicator {
      display: inline-flex !important;
      align-items: center;
      gap: 7px;
    }

    .qsm-dashboard-v3-live-indicator i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow:
        0 0 9px rgba(34, 197, 94, .65);
    }

    .qsm-dashboard-v3-chart-card {
      min-height: 470px;
      padding: 19px;
    }

    .qsm-dashboard-v3-activity-premium {
      display: grid;
      gap: 12px;
    }

    .qsm-dashboard-v3-activity-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .qsm-dashboard-v3-activity-totals {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .qsm-dashboard-v3-activity-totals article {
      min-width: 76px;
      display: grid;
      gap: 2px;
      padding: 6px 12px;
      border-right:
        1px solid var(--qsm-border);
      text-align: center;
    }

    .qsm-dashboard-v3-activity-totals article:last-child {
      border-right: 0;
    }

    .qsm-dashboard-v3-activity-totals strong {
      font-size: 21px;
      line-height: 23px;
    }

    .qsm-dashboard-v3-activity-totals span {
      color: var(--qsm-text-secondary);
      font-size: 9px;
      font-weight: 800;
    }

    .qsm-dashboard-v3-activity-totals
    .is-purchases strong {
      color: #c084fc;
    }

    .qsm-dashboard-v3-activity-totals
    .is-sales strong {
      color: #60a5fa;
    }

    .qsm-dashboard-v3-activity-totals
    .is-disputes strong {
      color: #2dd4bf;
    }

    .qsm-dashboard-v3-period-tabs {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px;
      border: 1px solid var(--qsm-border);
      border-radius: 12px;
      background: rgba(2, 6, 23, .25);
    }

    .qsm-dashboard-v3-period-tabs button {
      min-height: 32px;
      padding: 6px 13px;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: var(--qsm-text-secondary);
      font-size: 9px;
      font-weight: 850;
      cursor: pointer;
    }

    .qsm-dashboard-v3-period-tabs button.is-active {
      color: #fff;
      background:
        linear-gradient(
          135deg,
          rgba(59, 130, 246, .64),
          rgba(139, 92, 246, .72)
        );
      box-shadow:
        0 8px 22px
        rgba(91, 33, 182, .23);
    }

    .qsm-dashboard-v3-chart-controls {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 7px;
    }

    .qsm-dashboard-v3-chart-controls button {
      min-height: 29px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 9px;
      border: 1px solid var(--qsm-border);
      border-radius: 9px;
      background: rgba(2, 6, 23, .22);
      color: var(--qsm-muted);
      font-size: 8px;
      font-weight: 800;
      cursor: pointer;
      opacity: .54;
    }

    .qsm-dashboard-v3-chart-controls button.is-active {
      color: var(--qsm-text);
      opacity: 1;
    }

    .qsm-dashboard-v3-chart-controls i {
      width: 9px;
      height: 9px;
      border-radius: 3px;
    }

    .qsm-dashboard-v3-chart-controls
    .is-purchases i {
      background: #a855f7;
    }

    .qsm-dashboard-v3-chart-controls
    .is-sales i {
      background: #3b82f6;
    }

    .qsm-dashboard-v3-chart-controls
    .is-disputes i {
      background: #14b8a6;
    }

    .qsm-dashboard-v3-chart-wrap--premium {
      position: relative;
      min-height: 285px;
      overflow: visible;
      border-top:
        1px solid rgba(148, 163, 184, .05);
      border-bottom:
        1px solid rgba(148, 163, 184, .05);
    }

    .qsm-dashboard-v3-chart-wrap--premium svg {
      width: 100%;
      height: 285px;
      overflow: visible;
    }

    .qsm-dashboard-v3-grid-line {
      stroke:
        rgba(148, 163, 184, .13);
      stroke-width: 1;
      stroke-dasharray: 4 5;
    }

    .qsm-dashboard-v3-axis-label {
      fill:
        var(--qsm-text-secondary);
      font-size: 10px;
      font-weight: 700;
    }

    .qsm-dashboard-v3-axis-label--date {
      fill:
        #94a3b8;
      font-size: 9px;
    }

    .qsm-dashboard-v3-line {
      fill: none;
      stroke-width: 3.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      filter:
        drop-shadow(
          0 0 5px
          rgba(255, 255, 255, .12)
        );
    }

    .qsm-dashboard-v3-line.purchases {
      stroke: #a855f7;
    }

    .qsm-dashboard-v3-line.sales {
      stroke: #3b82f6;
    }

    .qsm-dashboard-v3-line.disputes {
      stroke: #14b8a6;
    }

    .qsm-dashboard-v3-area.purchases {
      fill:
        url(#qsm-purchases-area);
    }

    .qsm-dashboard-v3-area.sales {
      fill:
        url(#qsm-sales-area);
    }

    .qsm-dashboard-v3-area.disputes {
      fill:
        url(#qsm-disputes-area);
    }

    .qsm-dashboard-v3-point {
      stroke: #081226;
      stroke-width: 2;
      cursor: pointer;
      transition: r .14s ease;
    }

    .qsm-dashboard-v3-point:hover {
      r: 7;
    }

    .qsm-dashboard-v3-point.purchases {
      fill: #a855f7;
    }

    .qsm-dashboard-v3-point.sales {
      fill: #3b82f6;
    }

    .qsm-dashboard-v3-point.disputes {
      fill: #14b8a6;
    }

    .qsm-dashboard-v3-hover-line {
      stroke:
        rgba(226, 232, 240, .38);
      stroke-width: 1;
      stroke-dasharray: 4 4;
    }

    .qsm-dashboard-v3-chart-tooltip {
      position: absolute;
      z-index: 20;
      width: 150px;
      display: grid;
      gap: 6px;
      padding: 10px 11px;
      transform:
        translate(-50%, -100%);
      border:
        1px solid
        rgba(125, 211, 252, .22);
      border-radius: 12px;
      background:
        rgba(5, 12, 28, .97);
      box-shadow:
        0 18px 50px
        rgba(0, 0, 0, .45);
      pointer-events: none;
    }

    .qsm-dashboard-v3-chart-tooltip > strong {
      padding-bottom: 5px;
      border-bottom:
        1px solid var(--qsm-border);
      color: #f8fafc;
      font-size: 9px;
    }

    .qsm-dashboard-v3-chart-tooltip > span {
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 8px;
    }

    .qsm-dashboard-v3-chart-tooltip
    span.purchases b {
      color: #c084fc;
    }

    .qsm-dashboard-v3-chart-tooltip
    span.sales b {
      color: #60a5fa;
    }

    .qsm-dashboard-v3-chart-tooltip
    span.disputes b {
      color: #2dd4bf;
    }

    .qsm-dashboard-v3-activity-insights {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap: 9px;
    }

    .qsm-dashboard-v3-activity-insights article {
      min-width: 0;
      display: grid;
      grid-template-columns:
        40px minmax(0, 1fr);
      align-items: center;
      gap: 9px;
      padding: 10px;
      border: 1px solid var(--qsm-border);
      border-radius: 13px;
      background:
        rgba(2, 6, 23, .23);
    }

    .qsm-dashboard-v3-activity-insights
    article > span {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border-radius: 11px;
      background:
        linear-gradient(
          135deg,
          rgba(56, 189, 248, .12),
          rgba(139, 92, 246, .16)
        );
      color: #7dd3fc;
      font-size: 17px;
    }

    .qsm-dashboard-v3-activity-insights small,
    .qsm-dashboard-v3-activity-insights strong,
    .qsm-dashboard-v3-activity-insights p {
      display: block;
    }

    .qsm-dashboard-v3-activity-insights small {
      color: var(--qsm-muted);
      font-size: 7px;
    }

    .qsm-dashboard-v3-activity-insights strong {
      margin: 3px 0;
      overflow: hidden;
      color: var(--qsm-text);
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .qsm-dashboard-v3-activity-insights p {
      margin: 0;
      color: var(--qsm-text-secondary);
      font-size: 7px;
    }

    .qsm-dashboard-v3-chart-empty--premium {
      min-height: 285px;
      align-content: center;
      gap: 7px;
      border:
        1px dashed
        rgba(148, 163, 184, .16);
      border-radius: 15px;
      background:
        radial-gradient(
          circle at center,
          rgba(56, 189, 248, .05),
          transparent 65%
        );
    }

    .qsm-dashboard-v3-chart-empty--premium > span {
      color: #38bdf8;
      font-size: 34px;
    }

    .qsm-dashboard-v3-chart-empty--premium strong {
      color: var(--qsm-text);
      font-size: 12px;
    }

    .qsm-dashboard-v3-chart-empty--premium p {
      max-width: 360px;
      margin: 0;
      color: var(--qsm-muted);
      font-size: 9px;
      line-height: 15px;
    }

    @media (max-width: 1100px) {
      .qsm-dashboard-v3-activity-toolbar {
        align-items: flex-start;
        flex-direction: column;
      }

      .qsm-dashboard-v3-period-tabs {
        width: 100%;
      }

      .qsm-dashboard-v3-period-tabs button {
        flex: 1;
      }

      .qsm-dashboard-v3-chart-controls {
        justify-content: flex-start;
      }
    }

    @media (max-width: 650px) {
      .qsm-dashboard-v3-activity-totals {
        width: 100%;
      }

      .qsm-dashboard-v3-activity-totals article {
        min-width: 0;
        flex: 1;
        padding:
          5px 7px;
      }

      .qsm-dashboard-v3-activity-totals strong {
        font-size: 17px;
      }

      .qsm-dashboard-v3-chart-wrap--premium svg {
        height: 235px;
      }

      .qsm-dashboard-v3-activity-insights {
        grid-template-columns: 1fr;
      }

      .qsm-dashboard-v3-chart-tooltip {
        display: none;
      }
    }

    .qsm-dashboard-v3-quick-metric {
      display: grid;
      grid-template-columns: 37px minmax(0, 1fr) auto;
      align-items: center;
      gap: 9px;
      padding: 10px 0;
      border-bottom: 1px solid var(--qsm-border);
    }

    .qsm-dashboard-v3-quick-metric > span {
      width: 37px;
      height: 37px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: rgba(var(--qsm-accent-rgb), .09);
      color: var(--qsm-accent);
    }

    .qsm-dashboard-v3-quick-metric.tone-purple > span {
      background: rgba(139, 92, 246, .12);
      color: #a78bfa;
    }

    .qsm-dashboard-v3-quick-metric.tone-blue > span {
      background: rgba(56, 189, 248, .12);
      color: #38bdf8;
    }

    .qsm-dashboard-v3-quick-metric.tone-red > span {
      background: rgba(239, 68, 68, .11);
      color: #f87171;
    }

    .qsm-dashboard-v3-quick-metric p {
      margin: 0;
      color: var(--qsm-text-secondary);
      font-size: 9px;
    }

    .qsm-dashboard-v3-quick-metric strong {
      color: var(--qsm-text);
      font-size: 11px;
    }

    .qsm-dashboard-v3-quick-card .qsm-dashboard-v3-outline-button {
      width: 100%;
      margin-top: 14px;
    }

    /* =======================================================
       QSM_FASE15_BLOCK3_PREMIUM_QUICK_PROFILE
    ======================================================= */

    .qsm-dashboard-v3-upper {
      grid-template-columns:
        minmax(0, 1.72fr)
        minmax(260px, .72fr)
        minmax(340px, .96fr);
      align-items: stretch;
    }

    .qsm-dashboard-v3-chart-card,
    .qsm-dashboard-v3-quick-card,
    .qsm-dashboard-v3-profile-card {
      height: 100%;
      min-height: 540px;
    }

    .qsm-dashboard-v3-section-eyebrow {
      display: block;
      margin-bottom: 5px;
      color: var(--qsm-accent);
      font-size: 7px;
      font-weight: 950;
      letter-spacing: 1.35px;
      text-transform: uppercase;
    }

    .qsm-dashboard-v3-card-link {
      color: #67e8f9;
      font-size: 8px;
      font-weight: 850;
      text-decoration: none;
      white-space: nowrap;
    }

    /* RESUMEN RÁPIDO */

    .qsm-dashboard-v3-quick-card--premium {
      display: flex;
      flex-direction: column;
      padding: 17px;
      overflow: hidden;
      background:
        radial-gradient(
          circle at top right,
          rgba(139, 92, 246, .11),
          transparent 34%
        ),
        var(
          --qsm-surface,
          rgba(15, 23, 42, .74)
        );
    }

    .qsm-dashboard-v3-quick-card--premium
    .qsm-dashboard-v3-card-header {
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom:
        1px solid var(--qsm-border);
    }

    .qsm-dashboard-v3-quick-grid {
      display: grid;
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
      gap: 9px;
    }

    .qsm-dashboard-v3-quick-metric--premium {
      position: relative;
      min-width: 0;
      min-height: 116px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 10px;
      padding: 12px;
      overflow: hidden;
      border:
        1px solid var(--qsm-border);
      border-radius: 14px;
      background:
        rgba(2, 6, 23, .3);
      color: var(--qsm-text);
      text-decoration: none;
      transition:
        transform .18s ease,
        border-color .18s ease,
        background .18s ease;
    }

    .qsm-dashboard-v3-quick-metric--premium::before {
      content: "";
      position: absolute;
      top: -40px;
      right: -40px;
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background:
        currentColor;
      opacity: .07;
      filter: blur(7px);
      pointer-events: none;
    }

    .qsm-dashboard-v3-quick-metric--premium:hover {
      transform:
        translateY(-2px);
      border-color:
        rgba(125, 211, 252, .28);
      background:
        rgba(15, 23, 42, .62);
    }

    .qsm-dashboard-v3-quick-metric__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .qsm-dashboard-v3-quick-metric__icon {
      width: 37px;
      height: 37px;
      display: grid;
      place-items: center;
      border-radius: 11px;
      background:
        rgba(139, 92, 246, .12);
      color: currentColor;
      font-size: 17px;
    }

    .qsm-dashboard-v3-quick-alert {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fb7185;
      box-shadow:
        0 0 9px
        rgba(251, 113, 133, .7);
    }

    .qsm-dashboard-v3-quick-metric__copy {
      min-width: 0;
      display: grid;
      gap: 3px;
    }

    .qsm-dashboard-v3-quick-metric__copy > span {
      overflow: hidden;
      color: var(--qsm-text-secondary);
      font-size: 8px;
      font-weight: 800;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .qsm-dashboard-v3-quick-metric__copy strong {
      color: var(--qsm-text);
      font-size: 19px;
      line-height: 21px;
    }

    .qsm-dashboard-v3-quick-metric__copy small {
      overflow: hidden;
      color: var(--qsm-muted);
      font-size: 7px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .qsm-dashboard-v3-quick-metric--premium.tone-purple {
      color: #a78bfa;
    }

    .qsm-dashboard-v3-quick-metric--premium.tone-blue {
      color: #60a5fa;
    }

    .qsm-dashboard-v3-quick-metric--premium.tone-red {
      color: #fb7185;
    }

    .qsm-dashboard-v3-quick-metric--premium.tone-cyan {
      color: #2dd4bf;
    }

    .qsm-dashboard-v3-quick-footer {
      display: grid;
      gap: 11px;
      margin-top: auto;
      padding-top: 14px;
    }

    .qsm-dashboard-v3-quick-footer > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 11px;
      border:
        1px solid var(--qsm-border);
      border-radius: 12px;
      background:
        rgba(2, 6, 23, .24);
    }

    .qsm-dashboard-v3-quick-footer span {
      color: var(--qsm-muted);
      font-size: 8px;
    }

    .qsm-dashboard-v3-quick-footer strong {
      font-size: 8px;
    }

    .qsm-dashboard-v3-quick-footer
    strong.is-stable {
      color: #4ade80;
    }

    .qsm-dashboard-v3-quick-footer
    strong.is-warning {
      color: #fbbf24;
    }

    .qsm-dashboard-v3-quick-footer
    strong.is-critical {
      color: #fda4af;
    }

    .qsm-dashboard-v3-quick-footer
    .qsm-dashboard-v3-outline-button {
      margin-top: 0;
    }

    /* PERFIL PREMIUM */

    .qsm-dashboard-v3-profile-card {
      display: flex;
      flex-direction: column;
      background:
        radial-gradient(
          circle at 85% 8%,
          rgba(139, 92, 246, .22),
          transparent 34%
        ),
        var(
          --qsm-surface,
          rgba(15, 23, 42, .74)
        );
    }

    .qsm-dashboard-v3-profile-cover {
      height: 72px;
      flex: 0 0 72px;
      background:
        radial-gradient(
          circle at 85% 40%,
          rgba(255,255,255,.16),
          transparent 24%
        ),
        linear-gradient(
          110deg,
          #22d3ee,
          #3b82f6,
          #8b5cf6
        );
    }

    .qsm-dashboard-v3-profile-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding:
        0 16px 16px;
    }

    .qsm-dashboard-v3-avatar-wrap {
      width: 68px;
      height: 68px;
      margin-top: -34px;
    }

    .qsm-dashboard-v3-avatar {
      width: 68px;
      height: 68px;
      font-size: 27px;
    }

    .qsm-dashboard-v3-profile-identity {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        105px;
      align-items: center;
      gap: 11px;
      margin:
        10px 0 9px;
    }

    .qsm-dashboard-v3-profile-name {
      min-width: 0;
      margin: 0;
    }

    .qsm-dashboard-v3-profile-name > strong {
      display: block;
      overflow: hidden;
      color: var(--qsm-text);
      font-size: 14px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .qsm-dashboard-v3-profile-name > span:last-child {
      display: block;
      margin-top: 5px;
      font-size: 8px;
      font-weight: 850;
    }

    .qsm-dashboard-v3-profile-score {
      display: grid;
      gap: 3px;
      padding: 9px;
      border:
        1px solid
        rgba(56, 189, 248, .18);
      border-radius: 12px;
      background:
        rgba(2, 6, 23, .34);
      text-align: center;
    }

    .qsm-dashboard-v3-profile-score span {
      color: #67e8f9;
      font-size: 7px;
      font-weight: 850;
    }

    .qsm-dashboard-v3-profile-score strong {
      color: #f8fafc;
      font-size: 15px;
    }

    .qsm-dashboard-v3-profile-score small {
      color: var(--qsm-muted);
      font-size: 7px;
    }

    .qsm-dashboard-v3-profile-checklist {
      display: grid;
      gap: 2px;
      margin: 9px 0 13px;
      padding:
        8px 0;
      border-top:
        1px solid var(--qsm-border);
      border-bottom:
        1px solid var(--qsm-border);
    }

    .qsm-dashboard-v3-profile-checklist > div {
      min-height: 31px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding:
        5px 3px;
    }

    .qsm-dashboard-v3-profile-checklist span {
      color: var(--qsm-text-secondary);
      font-size: 8px;
    }

    .qsm-dashboard-v3-profile-checklist strong {
      font-size: 8px;
    }

    .qsm-dashboard-v3-profile-checklist
    .is-complete strong {
      color: #2dd4bf;
    }

    .qsm-dashboard-v3-profile-checklist
    .is-pending strong {
      color: #fbbf24;
    }

    .qsm-dashboard-v3-profile-card
    .qsm-dashboard-v3-primary-button {
      margin-top: auto;
    }

    @media (max-width: 1500px) {
      .qsm-dashboard-v3-upper {
        grid-template-columns:
          minmax(0, 1.5fr)
          minmax(255px, .72fr);
        grid-template-areas:
          "chart quick"
          "profile profile";
      }

      .qsm-dashboard-v3-profile-card {
        max-width: none;
        min-height: 420px;
      }
    }

    @media (max-width: 820px) {
      .qsm-dashboard-v3-chart-card,
      .qsm-dashboard-v3-quick-card,
      .qsm-dashboard-v3-profile-card {
        min-height: auto;
      }

      .qsm-dashboard-v3-quick-grid {
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
      }
    }

    @media (max-width: 480px) {
      .qsm-dashboard-v3-quick-grid {
        grid-template-columns:
          minmax(0, 1fr);
      }

      .qsm-dashboard-v3-quick-metric--premium {
        min-height: 92px;
      }

      .qsm-dashboard-v3-profile-identity {
        grid-template-columns:
          minmax(0, 1fr);
      }

      .qsm-dashboard-v3-profile-score {
        text-align: left;
      }
    }

    .qsm-dashboard-v3-profile-cover {
      height: 58px;
      background:
        linear-gradient(
          135deg,
          var(--qsm-accent),
          #38bdf8,
          #8b5cf6
        );
    }

    .qsm-dashboard-v3-profile-content {
      padding: 0 16px 16px;
    }

    .qsm-dashboard-v3-avatar-wrap {
      position: relative;
      width: 62px;
      height: 62px;
      margin-top: -31px;
    }

    .qsm-dashboard-v3-avatar {
      width: 62px;
      height: 62px;
      display: grid;
      place-items: center;
      overflow: hidden;
      border-radius: 50%;
      border: 3px solid var(--qsm-surface-strong, #0f172a);
      background:
        linear-gradient(
          135deg,
          var(--qsm-accent),
          #8b5cf6
        );
      color: #fff;
      font-size: 25px;
      font-weight: 950;
    }

    .qsm-dashboard-v3-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .qsm-dashboard-v3-avatar-check {
      position: absolute;
      right: 0;
      bottom: 2px;
      width: 20px;
      height: 20px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      border: 2px solid var(--qsm-surface-strong, #0f172a);
      background: #22c55e;
      color: #fff;
      font-size: 8px;
    }

    .qsm-dashboard-v3-profile-name {
      margin: 9px 0 12px;
    }

    .qsm-dashboard-v3-profile-name h2 {
      margin: 0 0 5px;
      color: var(--qsm-text-secondary);
      font-size: 14px;
    }

    .qsm-dashboard-v3-profile-name > strong {
      display: block;
      color: var(--qsm-text);
      font-size: 13px;
    }

    .qsm-dashboard-v3-profile-name > span {
      display: block;
      margin-top: 4px;
      font-size: 8px;
      font-weight: 850;
    }

    .qsm-dashboard-v3-profile-name .verified {
      color: #22c55e;
    }

    .qsm-dashboard-v3-profile-name .pending {
      color: #f59e0b;
    }

    .qsm-dashboard-v3-progress {
      margin: 10px 0;
    }

    .qsm-dashboard-v3-progress > div:first-child {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }

    .qsm-dashboard-v3-progress span {
      color: var(--qsm-text-secondary);
      font-size: 8px;
    }

    .qsm-dashboard-v3-progress strong {
      color: var(--qsm-text);
      font-size: 9px;
    }

    .qsm-dashboard-v3-progress-track {
      height: 6px;
      overflow: hidden;
      border-radius: 99px;
      background: var(--qsm-border);
    }

    .qsm-dashboard-v3-progress-track span {
      display: block;
      height: 100%;
      border-radius: 99px;
      background:
        linear-gradient(
          90deg,
          var(--qsm-accent),
          #38bdf8,
          #8b5cf6
        );
    }

    .qsm-dashboard-v3-profile-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 12px 0;
    }

    .qsm-dashboard-v3-profile-meta div {
      padding: 10px 8px;
      border-radius: 11px;
      background: var(--qsm-surface-soft, rgba(148,163,184,.06));
      text-align: center;
    }

    .qsm-dashboard-v3-profile-meta span,
    .qsm-dashboard-v3-profile-meta strong {
      display: block;
    }

    .qsm-dashboard-v3-profile-meta span {
      color: var(--qsm-muted);
      font-size: 7px;
    }

    .qsm-dashboard-v3-profile-meta strong {
      margin-top: 4px;
      color: var(--qsm-text);
      font-size: 9px;
    }

    .qsm-dashboard-v3-actions-card {
      padding: 8px;
      border-radius: 17px;
      margin-bottom: 14px;
    }

    .qsm-dashboard-v3-market-search {
      min-height: 42px;
      display: grid;
      grid-template-columns: 25px minmax(0, 1fr) 100px;
      align-items: center;
      gap: 8px;
      padding: 4px 5px 4px 11px;
      border: 1px solid var(--qsm-border);
      border-radius: 11px;
      background: var(--qsm-surface-soft, rgba(2,6,23,.25));
    }

    .qsm-dashboard-v3-market-search > span {
      color: var(--qsm-accent);
      font-size: 17px;
    }

    .qsm-dashboard-v3-market-search input {
      width: 100%;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--qsm-text);
      font-size: 10px;
    }

    .qsm-dashboard-v3-market-search button {
      height: 34px;
      border: none;
      border-radius: 9px;
      background:
        linear-gradient(
          135deg,
          var(--qsm-accent),
          #38bdf8,
          #8b5cf6
        );
      color: #fff;
      font-size: 9px;
      font-weight: 900;
      cursor: pointer;
    }

    .qsm-dashboard-v3-actions {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 7px;
      margin-top: 7px;
    }

    .qsm-dashboard-v3-actions a {
      min-height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      border: 1px solid var(--qsm-border);
      border-radius: 10px;
      color: var(--qsm-text-secondary);
      font-size: 8px;
      font-weight: 850;
      text-align: center;
      text-decoration: none;
    }

    .qsm-dashboard-v3-actions a.primary {
      border-color: transparent;
      color: #fff;
      background:
        linear-gradient(
          135deg,
          var(--qsm-accent),
          #38bdf8,
          #8b5cf6
        );
    }

    /* =======================================================
       QSM_FASE15_BLOCK4_MARKETPLACE_ACTION_CENTER
    ======================================================= */

    .qsm-dashboard-v3-actions-card--premium {
      position: relative;
      display: grid;
      gap: 12px;
      padding: 15px;
      overflow: hidden;
      border-radius: 19px;
      background:
        radial-gradient(
          circle at 93% 15%,
          rgba(139, 92, 246, .13),
          transparent 25%
        ),
        radial-gradient(
          circle at 8% 90%,
          rgba(45, 212, 191, .08),
          transparent 26%
        ),
        var(
          --qsm-surface,
          rgba(15, 23, 42, .74)
        );
    }

    .qsm-dashboard-v3-action-center-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 18px;
    }

    .qsm-dashboard-v3-action-center-header h2 {
      margin: 2px 0 4px;
      color: var(--qsm-text);
      font-size: 15px;
    }

    .qsm-dashboard-v3-action-center-header p {
      margin: 0;
      color: var(--qsm-muted);
      font-size: 8px;
    }

    .qsm-dashboard-v3-action-center-status {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 10px;
      border:
        1px solid
        rgba(34, 197, 94, .18);
      border-radius: 999px;
      background:
        rgba(22, 101, 52, .1);
      color: #86efac;
      font-size: 8px;
      font-weight: 800;
      white-space: nowrap;
    }

    .qsm-dashboard-v3-action-center-status i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow:
        0 0 9px
        rgba(34, 197, 94, .75);
    }

    /* BUSCADOR */

    .qsm-dashboard-v3-market-search--premium {
      min-height: 62px;
      grid-template-columns:
        42px
        minmax(0, 1fr)
        auto
        124px;
      gap: 10px;
      padding: 7px;
      border:
        1px solid
        rgba(56, 189, 248, .22);
      border-radius: 15px;
      background:
        linear-gradient(
          90deg,
          rgba(2, 6, 23, .48),
          rgba(15, 23, 42, .68)
        );
      box-shadow:
        inset 0 0 0 1px
        rgba(255, 255, 255, .015);
      transition:
        border-color .18s ease,
        box-shadow .18s ease;
    }

    .qsm-dashboard-v3-market-search--premium:focus-within {
      border-color:
        rgba(56, 189, 248, .48);
      box-shadow:
        0 0 0 3px
        rgba(56, 189, 248, .07),
        inset 0 0 0 1px
        rgba(139, 92, 246, .06);
    }

    .qsm-dashboard-v3-market-search__icon {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background:
        linear-gradient(
          135deg,
          rgba(45, 212, 191, .14),
          rgba(59, 130, 246, .14)
        );
      color: #67e8f9 !important;
      font-size: 20px !important;
    }

    .qsm-dashboard-v3-market-search__field {
      min-width: 0;
      display: grid;
      align-content: center;
      gap: 3px;
    }

    .qsm-dashboard-v3-market-search__field label {
      color: #67e8f9;
      font-size: 7px;
      font-weight: 900;
      letter-spacing: .65px;
      text-transform: uppercase;
    }

    .qsm-dashboard-v3-market-search__field input {
      height: 23px;
      padding: 0;
      font-size: 10px;
    }

    .qsm-dashboard-v3-market-search__clear {
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 9px;
      background:
        rgba(148, 163, 184, .08);
      color: var(--qsm-text-secondary);
      font-size: 17px;
      cursor: pointer;
    }

    .qsm-dashboard-v3-market-search__submit {
      width: 124px;
      height: 46px !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 12px !important;
      font-size: 10px !important;
      box-shadow:
        0 12px 32px
        rgba(59, 130, 246, .16);
    }

    /* ACCIONES */

    .qsm-dashboard-v3-actions--premium {
      grid-template-columns:
        repeat(
          6,
          minmax(0, 1fr)
        );
      gap: 8px;
      margin-top: 0;
    }

    .qsm-dashboard-v3-dashboard-action {
      position: relative;
      min-width: 0;
      min-height: 77px;
      display: grid !important;
      grid-template-columns:
        38px
        minmax(0, 1fr)
        18px;
      align-items: center !important;
      justify-content: initial !important;
      gap: 9px;
      padding: 10px !important;
      overflow: hidden;
      border:
        1px solid
        var(--qsm-border) !important;
      border-radius: 13px !important;
      background:
        rgba(2, 6, 23, .25) !important;
      color: var(--qsm-text) !important;
      text-align: left !important;
      transition:
        transform .18s ease,
        border-color .18s ease,
        background .18s ease,
        box-shadow .18s ease;
    }

    .qsm-dashboard-v3-dashboard-action::before {
      content: "";
      position: absolute;
      top: -35px;
      right: -35px;
      width: 75px;
      height: 75px;
      border-radius: 50%;
      background: currentColor;
      opacity: .06;
      filter: blur(8px);
      pointer-events: none;
    }

    .qsm-dashboard-v3-dashboard-action:hover {
      transform:
        translateY(-2px);
      border-color:
        rgba(125, 211, 252, .3) !important;
      background:
        rgba(15, 23, 42, .66) !important;
      box-shadow:
        0 13px 30px
        rgba(0, 0, 0, .18);
    }

    .qsm-dashboard-v3-dashboard-action__icon {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border:
        1px solid currentColor;
      border-radius: 11px;
      background:
        rgba(255, 255, 255, .025);
      color: currentColor;
      font-size: 16px;
      font-weight: 900;
    }

    .qsm-dashboard-v3-dashboard-action > div {
      min-width: 0;
      display: grid;
      gap: 4px;
    }

    .qsm-dashboard-v3-dashboard-action strong,
    .qsm-dashboard-v3-dashboard-action small {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .qsm-dashboard-v3-dashboard-action strong {
      color: var(--qsm-text);
      font-size: 9px;
    }

    .qsm-dashboard-v3-dashboard-action small {
      color: var(--qsm-muted);
      font-size: 7px;
    }

    .qsm-dashboard-v3-dashboard-action > b {
      color: currentColor;
      font-size: 12px;
    }

    .qsm-dashboard-v3-dashboard-action__alert {
      width: 8px;
      height: 8px;
      justify-self: center;
      border-radius: 50%;
      background: #fbbf24;
      box-shadow:
        0 0 9px
        rgba(251, 191, 36, .68);
    }

    .qsm-dashboard-v3-dashboard-action.tone-cyan {
      color: #22d3ee !important;
    }

    .qsm-dashboard-v3-dashboard-action.tone-green {
      color: #2dd4bf !important;
    }

    .qsm-dashboard-v3-dashboard-action.tone-purple {
      color: #a78bfa !important;
    }

    .qsm-dashboard-v3-dashboard-action.tone-orange {
      color: #fbbf24 !important;
    }

    .qsm-dashboard-v3-dashboard-action.tone-blue {
      color: #60a5fa !important;
    }

    .qsm-dashboard-v3-dashboard-action.tone-shield {
      color: #818cf8 !important;
    }

    .qsm-dashboard-v3-dashboard-action.is-primary {
      border-color:
        rgba(56, 189, 248, .34) !important;
      background:
        linear-gradient(
          135deg,
          rgba(14, 165, 233, .14),
          rgba(139, 92, 246, .16)
        ) !important;
    }

    @media (max-width: 1380px) {
      .qsm-dashboard-v3-actions--premium {
        grid-template-columns:
          repeat(
            3,
            minmax(0, 1fr)
          );
      }
    }

    @media (max-width: 820px) {
      .qsm-dashboard-v3-action-center-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .qsm-dashboard-v3-market-search--premium {
        grid-template-columns:
          42px
          minmax(0, 1fr)
          auto;
      }

      .qsm-dashboard-v3-market-search__submit {
        width: 100% !important;
        grid-column: 1 / -1;
      }

      .qsm-dashboard-v3-actions--premium {
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
      }
    }

    @media (max-width: 500px) {
      .qsm-dashboard-v3-actions-card--premium {
        padding: 11px;
      }

      .qsm-dashboard-v3-action-center-status {
        display: none;
      }

      .qsm-dashboard-v3-market-search--premium {
        grid-template-columns:
          38px
          minmax(0, 1fr)
          auto;
      }

      .qsm-dashboard-v3-market-search__icon {
        width: 38px;
        height: 38px;
      }

      .qsm-dashboard-v3-actions--premium {
        grid-template-columns:
          minmax(0, 1fr);
      }

      .qsm-dashboard-v3-dashboard-action {
        min-height: 68px;
      }
    }

    .qsm-dashboard-v3-recent-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 11px;
    }

    .qsm-dashboard-v3-recent-panel {
      min-height: 250px;
      display: flex;
      flex-direction: column;
      padding: 14px;
    }

    .qsm-dashboard-v3-recent-panel > header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }

    .qsm-dashboard-v3-recent-panel h3 {
      margin: 0;
      color: var(--qsm-text);
      font-size: 11px;
    }

    .qsm-dashboard-v3-recent-panel header a {
      color: var(--qsm-accent);
      font-size: 7px;
      text-decoration: none;
    }

    .qsm-dashboard-v3-recent-list {
      display: grid;
      flex: 1;
    }

    .qsm-dashboard-v3-recent-item {
      min-width: 0;
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--qsm-border);
    }

    .qsm-dashboard-v3-recent-thumb {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      overflow: hidden;
      border-radius: 10px;
      background: var(--qsm-surface-soft, rgba(148,163,184,.06));
    }

    .qsm-dashboard-v3-recent-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .qsm-dashboard-v3-recent-copy {
      min-width: 0;
    }

    .qsm-dashboard-v3-recent-copy strong,
    .qsm-dashboard-v3-recent-copy span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .qsm-dashboard-v3-recent-copy strong {
      color: var(--qsm-text);
      font-size: 8px;
    }

    .qsm-dashboard-v3-recent-copy span {
      margin-top: 3px;
      color: var(--qsm-muted);
      font-size: 7px;
    }

    .qsm-dashboard-v3-recent-status {
      max-width: 72px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 4px 6px;
      border-radius: 99px;
      background: rgba(var(--qsm-accent-rgb), .09);
      color: var(--qsm-accent);
      font-size: 6px;
      font-weight: 850;
    }

    .qsm-dashboard-v3-recent-footer {
      width: 100%;
      min-height: 36px;
      margin-top: 9px;
      font-size: 8px;
    }

    /* =======================================================
       QSM_FASE15_BLOCK5_RECENT_RESPONSIVE_POLISH
       PANELES RECIENTES Y PULIDO RESPONSIVE
    ======================================================= */

    .qsm-dashboard-v3-recent-grid {
      align-items: stretch;
      gap: 12px;
    }

    .qsm-dashboard-v3-recent-panel--premium {
      position: relative;
      min-height: 310px;
      padding: 15px;
      overflow: hidden;
      isolation: isolate;
      transition:
        transform .2s ease,
        border-color .2s ease,
        box-shadow .2s ease;
    }

    .qsm-dashboard-v3-recent-panel--premium::before {
      content: "";
      position: absolute;
      top: -85px;
      right: -65px;
      z-index: -1;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: currentColor;
      opacity: .055;
      filter: blur(10px);
      pointer-events: none;
    }

    .qsm-dashboard-v3-recent-panel--premium:hover {
      transform: translateY(-2px);
      border-color:
        rgba(125, 211, 252, .22);
      box-shadow:
        0 22px 52px
        rgba(0, 0, 0, .2);
    }

    .qsm-dashboard-v3-recent-panel--premium.tone-purple {
      color: #a78bfa;
    }

    .qsm-dashboard-v3-recent-panel--premium.tone-blue {
      color: #60a5fa;
    }

    .qsm-dashboard-v3-recent-panel--premium.tone-green {
      color: #2dd4bf;
    }

    .qsm-dashboard-v3-recent-panel--premium.tone-red {
      color: #fb7185;
    }

    .qsm-dashboard-v3-recent-header {
      min-height: 51px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 7px !important;
      padding-bottom: 11px;
      border-bottom:
        1px solid var(--qsm-border);
    }

    .qsm-dashboard-v3-recent-heading {
      min-width: 0;
      display: grid;
      grid-template-columns:
        38px minmax(0, 1fr);
      align-items: center;
      gap: 9px;
    }

    .qsm-dashboard-v3-recent-heading__icon {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border:
        1px solid currentColor;
      border-radius: 11px;
      background:
        rgba(255, 255, 255, .025);
      color: currentColor;
      font-size: 15px;
      font-weight: 900;
    }

    .qsm-dashboard-v3-recent-heading > div {
      min-width: 0;
    }

    .qsm-dashboard-v3-recent-heading h3 {
      overflow: hidden;
      color: var(--qsm-text);
      font-size: 10px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .qsm-dashboard-v3-recent-header__right {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .qsm-dashboard-v3-recent-count {
      min-width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      padding: 0 5px;
      border:
        1px solid var(--qsm-border);
      border-radius: 999px;
      background:
        rgba(2, 6, 23, .28);
      color: var(--qsm-text-secondary);
      font-size: 8px;
      font-weight: 900;
    }

    .qsm-dashboard-v3-recent-header__right a {
      color: currentColor !important;
      font-size: 7px !important;
      font-weight: 850;
    }

    .qsm-dashboard-v3-recent-list {
      min-height: 162px;
      display: flex;
      flex: 1;
      flex-direction: column;
    }

    .qsm-dashboard-v3-recent-item--premium {
      position: relative;
      min-height: 58px;
      display: grid;
      grid-template-columns:
        42px minmax(0, 1fr) auto;
      gap: 9px;
      padding: 8px 3px;
      border-bottom:
        1px solid var(--qsm-border);
      border-radius: 9px;
      transition:
        background .17s ease,
        transform .17s ease;
    }

    .qsm-dashboard-v3-recent-item--premium:hover {
      padding-left: 6px;
      background:
        rgba(148, 163, 184, .035);
      transform:
        translateX(2px);
    }

    .qsm-dashboard-v3-recent-thumb {
      width: 42px;
      height: 42px;
      border:
        1px solid
        rgba(148, 163, 184, .12);
      border-radius: 11px;
      background:
        linear-gradient(
          135deg,
          rgba(56, 189, 248, .07),
          rgba(139, 92, 246, .09)
        );
    }

    .qsm-dashboard-v3-recent-thumb img {
      transition:
        transform .22s ease;
    }

    .qsm-dashboard-v3-recent-item--premium:hover
    .qsm-dashboard-v3-recent-thumb img {
      transform:
        scale(1.06);
    }

    .qsm-dashboard-v3-recent-copy strong {
      color: var(--qsm-text);
      font-size: 8px;
      line-height: 13px;
    }

    .qsm-dashboard-v3-recent-copy span {
      color: var(--qsm-muted);
      font-size: 7px;
      line-height: 12px;
    }

    .qsm-dashboard-v3-recent-status {
      min-height: 23px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      align-self: center;
      padding: 4px 7px;
      border:
        1px solid
        rgba(148, 163, 184, .14);
      border-radius: 999px;
      background:
        rgba(148, 163, 184, .07);
      color: var(--qsm-text-secondary);
      font-size: 6px;
      font-weight: 900;
    }

    .qsm-dashboard-v3-recent-status i {
      width: 6px;
      height: 6px;
      flex: 0 0 6px;
      border-radius: 50%;
      background: currentColor;
      box-shadow:
        0 0 7px currentColor;
    }

    .qsm-dashboard-v3-recent-status.is-success {
      border-color:
        rgba(34, 197, 94, .2);
      background:
        rgba(22, 101, 52, .12);
      color: #4ade80;
    }

    .qsm-dashboard-v3-recent-status.is-warning {
      border-color:
        rgba(245, 158, 11, .22);
      background:
        rgba(146, 64, 14, .12);
      color: #fbbf24;
    }

    .qsm-dashboard-v3-recent-status.is-danger {
      border-color:
        rgba(251, 113, 133, .22);
      background:
        rgba(159, 18, 57, .12);
      color: #fb7185;
    }

    .qsm-dashboard-v3-recent-status.is-neutral {
      color: #60a5fa;
    }

    .qsm-dashboard-v3-empty--premium {
      min-height: 162px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 16px;
      border:
        1px dashed
        rgba(148, 163, 184, .14);
      border-radius: 13px;
      background:
        radial-gradient(
          circle at center,
          rgba(56, 189, 248, .04),
          transparent 70%
        );
    }

    .qsm-dashboard-v3-empty--premium > span {
      width: 39px;
      height: 39px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background:
        rgba(148, 163, 184, .07);
      color: currentColor;
      font-size: 17px;
    }

    .qsm-dashboard-v3-empty--premium strong {
      color: var(--qsm-text);
      font-size: 9px;
    }

    .qsm-dashboard-v3-empty--premium p {
      max-width: 220px;
      margin: 0;
      color: var(--qsm-muted);
      font-size: 7px;
      line-height: 13px;
      text-align: center;
    }

    .qsm-dashboard-v3-recent-footer {
      min-height: 39px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 10px;
      padding:
        8px 11px;
      color: currentColor;
    }

    .qsm-dashboard-v3-recent-footer b {
      font-size: 12px;
    }

    /* Enfoque accesible */

    .qsm-dashboard-v3 a:focus-visible,
    .qsm-dashboard-v3 button:focus-visible,
    .qsm-dashboard-v3 select:focus-visible,
    .qsm-dashboard-v3 input:focus-visible {
      outline:
        2px solid
        rgba(56, 189, 248, .78);
      outline-offset: 3px;
    }

    /* Ajuste final para pantallas grandes */

    @media (min-width: 1650px) {
      .qsm-dashboard-v3-shell {
        max-width: 1740px;
      }

      .qsm-dashboard-v3-upper {
        grid-template-columns:
          minmax(0, 1.8fr)
          minmax(275px, .72fr)
          minmax(365px, 1fr);
      }

      .qsm-dashboard-v3-recent-panel--premium {
        min-height: 325px;
      }
    }

    /* Laptop */

    @media (max-width: 1450px) {
      .qsm-dashboard-v3-recent-grid {
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
      }

      .qsm-dashboard-v3-recent-panel--premium {
        min-height: 300px;
      }
    }

    /* Tablet */

    @media (max-width: 900px) {
      .qsm-dashboard-v3-main {
        padding:
          14px 14px 46px;
      }

      .qsm-dashboard-v3-header--executive {
        margin-top: 8px;
      }

      .qsm-dashboard-v3-title-block h1 {
        font-size:
          clamp(
            29px,
            7vw,
            38px
          );
      }

      .qsm-dashboard-v3-stat--premium {
        min-height: 118px;
      }

      .qsm-dashboard-v3-upper {
        gap: 12px;
      }

      .qsm-dashboard-v3-chart-card,
      .qsm-dashboard-v3-quick-card,
      .qsm-dashboard-v3-profile-card {
        height: auto;
      }

      .qsm-dashboard-v3-recent-grid {
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
      }
    }

    /* Móvil */

    @media (max-width: 620px) {
      .qsm-dashboard-v3-main {
        padding:
          10px 9px 42px;
      }

      .qsm-dashboard-v3-title-block h1 {
        font-size: 29px;
      }

      .qsm-dashboard-v3-title-block p {
        font-size: 10px;
        line-height: 16px;
      }

      .qsm-dashboard-v3-stats,
      .qsm-dashboard-v3-recent-grid {
        grid-template-columns:
          minmax(0, 1fr);
      }

      .qsm-dashboard-v3-stat-main {
        grid-template-columns:
          45px
          minmax(0, 1fr)
          92px;
      }

      .qsm-dashboard-v3-stat-sparkline {
        height: 42px;
      }

      .qsm-dashboard-v3-chart-card {
        padding: 13px;
      }

      .qsm-dashboard-v3-activity-totals {
        overflow-x: auto;
      }

      .qsm-dashboard-v3-chart-controls {
        overflow-x: auto;
        flex-wrap: nowrap;
        padding-bottom: 4px;
      }

      .qsm-dashboard-v3-chart-controls button {
        flex: 0 0 auto;
      }

      .qsm-dashboard-v3-recent-panel--premium {
        min-height: 290px;
        padding: 13px;
      }

      .qsm-dashboard-v3-recent-item--premium {
        grid-template-columns:
          40px minmax(0, 1fr);
      }

      .qsm-dashboard-v3-recent-status {
        grid-column: 2;
        justify-self: start;
        margin-top: -2px;
      }
    }

    /* Evitar mareos y animaciones innecesarias */


    /* =======================================================
       QSM_FASE15_BLOCK6_WIDTH_AXIS_TOOLTIP_FIX
       ANCHO COMPLETO, EJE VISIBLE Y TOOLTIP SEGURO
    ======================================================= */

    /*
      El contenedor deja de estar centrado con un ancho máximo.
      Así desaparece la franja vacía situada después del menú.
    */

    .qsm-dashboard-v3-shell {
      width: 100% !important;
      max-width: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }

    .qsm-dashboard-v3-main {
      width: 100% !important;
      max-width: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;

      padding-left:
        clamp(
          14px,
          1.3vw,
          22px
        ) !important;

      padding-right:
        clamp(
          14px,
          1.3vw,
          22px
        ) !important;

      overflow-x: clip;
    }

    .qsm-dashboard-v3 {
      width: 100%;
      max-width: none;
      overflow-x: clip;
    }

    /*
      Algunos wrappers anteriores podrían estar centrando el
      Dashboard mediante align-items o justify-content.
    */

    .qsm-dashboard-v3-page,
    .qsm-dashboard-v3-content,
    .qsm-dashboard-v3-container {
      width: 100% !important;
      max-width: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }

    /*
      La cuadrícula debe ocupar exactamente el ancho disponible
      sin generar un desplazamiento horizontal.
    */

    .qsm-dashboard-v3-stats,
    .qsm-dashboard-v3-upper,
    .qsm-dashboard-v3-actions-card,
    .qsm-dashboard-v3-recent-grid {
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }

    .qsm-dashboard-v3-stats > *,
    .qsm-dashboard-v3-upper > *,
    .qsm-dashboard-v3-recent-grid > * {
      min-width: 0;
    }

    /*
      El SVG y su contenedor conservan espacio para las cifras
      del eje vertical.
    */

    .qsm-dashboard-v3-chart-wrap--premium {
      min-width: 0;
      padding-left: 2px;
      overflow: visible !important;
    }

    .qsm-dashboard-v3-chart-wrap--premium svg {
      display: block;
      width: 100%;
      max-width: 100%;
      overflow: visible !important;
    }

    .qsm-dashboard-v3-axis-label {
      fill: #cbd5e1 !important;
      font-size: 11px !important;
      font-weight: 850 !important;
      paint-order: stroke;
      stroke:
        rgba(2, 6, 23, .88);
      stroke-width: 2px;
      stroke-linejoin: round;
    }

    .qsm-dashboard-v3-axis-label--date {
      fill: #94a3b8 !important;
      font-size: 9px !important;
      font-weight: 750 !important;
      stroke-width: 1.5px;
    }

    /*
      El tooltip deja de quedar atrapado encima del eje o de las
      métricas superiores.
    */

    .qsm-dashboard-v3-chart-tooltip {
      z-index: 80 !important;
      width: 168px;
      max-width:
        calc(100% - 20px);

      transform:
        translate(
          -50%,
          calc(-100% - 12px)
        );

      border-color:
        rgba(125, 211, 252, .36);

      background:
        linear-gradient(
          145deg,
          rgba(7, 15, 34, .99),
          rgba(16, 24, 49, .99)
        );

      box-shadow:
        0 20px 55px
        rgba(0, 0, 0, .58),
        0 0 0 1px
        rgba(255, 255, 255, .025);
    }

    /*
      Cuando el cursor abandona el gráfico, el tooltip también
      desaparece mediante el nuevo onMouseLeave.
    */

    .qsm-dashboard-v3-chart-wrap--premium:hover
    .qsm-dashboard-v3-point {
      pointer-events: auto;
    }

    /*
      Líneas de la cuadrícula más visibles, pero discretas.
    */

    .qsm-dashboard-v3-grid-line {
      stroke:
        rgba(148, 163, 184, .18) !important;

      stroke-width:
        1 !important;
    }

    /*
      En pantallas grandes se elimina el antiguo máximo de
      1740px que volvía a centrar el contenido.
    */

    @media (min-width: 1650px) {
      .qsm-dashboard-v3-shell {
        max-width: none !important;
      }
    }

    @media (max-width: 900px) {
      .qsm-dashboard-v3-main {
        padding-left:
          12px !important;

        padding-right:
          12px !important;
      }

      .qsm-dashboard-v3-chart-tooltip {
        width: 150px;
      }
    }

    @media (max-width: 620px) {
      .qsm-dashboard-v3-main {
        padding-left:
          8px !important;

        padding-right:
          8px !important;
      }

      .qsm-dashboard-v3-chart-wrap--premium {
        overflow-x: auto !important;
        overflow-y: visible !important;
      }

      .qsm-dashboard-v3-axis-label {
        font-size:
          10px !important;
      }

      .qsm-dashboard-v3-chart-tooltip {
        display: none !important;
      }
    }


    /* =======================================================
       QSM_FASE15_BLOCK6_FIX_SIDEBAR_SPACING
       SEPARACIÓN CORRECTA ENTRE SIDEBAR Y DASHBOARD
    ======================================================= */

    /*
      El Bloque 6 anterior eliminó completamente el espacio
      reservado para el sidebar. Esta corrección recupera
      únicamente ese ancho y mantiene una separación pequeña.
    */

    .qsm-dashboard-v3-main {
      width:
        calc(
          100% - 72px
        ) !important;

      max-width:
        calc(
          100% - 72px
        ) !important;

      margin-left:
        72px !important;

      margin-right:
        0 !important;

      padding-left:
        12px !important;

      padding-right:
        clamp(
          14px,
          1.3vw,
          22px
        ) !important;

      box-sizing:
        border-box !important;

      overflow-x:
        clip;
    }

    .qsm-dashboard-v3-shell {
      width:
        100% !important;

      max-width:
        none !important;

      margin-left:
        0 !important;

      margin-right:
        0 !important;
    }

    .qsm-dashboard-v3 {
      width:
        100% !important;

      max-width:
        100% !important;

      overflow-x:
        clip;
    }

    /*
      Evita que reglas anteriores vuelvan a colocar el contenido
      debajo del menú lateral.
    */

    .qsm-dashboard-v3-page,
    .qsm-dashboard-v3-content,
    .qsm-dashboard-v3-container {
      width:
        100% !important;

      max-width:
        100% !important;

      margin-left:
        0 !important;

      margin-right:
        0 !important;
    }

    /*
      Mantiene la pequeña línea visual entre el sidebar y el
      contenido principal.
    */

    .qsm-dashboard-v3-main::before {
      content:
        "";

      position:
        fixed;

      top:
        0;

      bottom:
        0;

      left:
        71px;

      width:
        1px;

      z-index:
        20;

      background:
        linear-gradient(
          180deg,
          transparent,
          rgba(56, 189, 248, .18) 14%,
          rgba(139, 92, 246, .15) 52%,
          rgba(56, 189, 248, .12) 86%,
          transparent
        );

      pointer-events:
        none;
    }

    /*
      Laptop con sidebar compacto.
    */

    @media (max-width: 1200px) {
      .qsm-dashboard-v3-main {
        width:
          calc(
            100% - 68px
          ) !important;

        max-width:
          calc(
            100% - 68px
          ) !important;

        margin-left:
          68px !important;

        padding-left:
          10px !important;

        padding-right:
          12px !important;
      }

      .qsm-dashboard-v3-main::before {
        left:
          67px;
      }
    }

    /*
      En móvil el sidebar deja de ocupar una columna fija.
    */

    @media (max-width: 700px) {
      .qsm-dashboard-v3-main {
        width:
          100% !important;

        max-width:
          100% !important;

        margin-left:
          0 !important;

        padding-left:
          8px !important;

        padding-right:
          8px !important;
      }

      .qsm-dashboard-v3-main::before {
        display:
          none;
      }
    }


    /* =======================================================
       QSM_FASE15_BLOCK6_FIX2_SIDEBAR_CONNECTION
       CONEXIÓN FINAL ENTRE SIDEBAR Y DASHBOARD
    ======================================================= */

    /*
      Sidebar de escritorio: 72px.
      Dejamos solamente 4px de separación física y 8px
      internos para que el contenido no quede cortado.
    */

    .qsm-dashboard-v3-main {
      position: relative !important;

      width:
        calc(
          100% - 76px
        ) !important;

      max-width:
        calc(
          100% - 76px
        ) !important;

      margin-left:
        76px !important;

      margin-right:
        0 !important;

      padding-left:
        8px !important;

      padding-right:
        clamp(
          12px,
          1.15vw,
          20px
        ) !important;

      box-sizing:
        border-box !important;

      overflow-x:
        clip !important;
    }

    /*
      El contenido interno comienza exactamente después
      del pequeño espacio reservado junto al sidebar.
    */

    .qsm-dashboard-v3-shell {
      width:
        100% !important;

      max-width:
        none !important;

      margin:
        0 !important;

      padding-left:
        0 !important;

      box-sizing:
        border-box !important;
    }

    .qsm-dashboard-v3 {
      width:
        100% !important;

      max-width:
        100% !important;

      margin:
        0 !important;

      box-sizing:
        border-box !important;

      overflow-x:
        clip !important;
    }

    /*
      Evitar que otros wrappers vuelvan a mover el
      Dashboard debajo del sidebar.
    */

    .qsm-dashboard-v3-page,
    .qsm-dashboard-v3-content,
    .qsm-dashboard-v3-container {
      width:
        100% !important;

      max-width:
        100% !important;

      margin-left:
        0 !important;

      margin-right:
        0 !important;

      padding-left:
        0 !important;

      box-sizing:
        border-box !important;
    }

    /*
      Línea fina conectada al borde derecho del sidebar.
      No queda flotando ni crea una franja adicional.
    */

    .qsm-dashboard-v3-main::before {
      content:
        "";

      position:
        fixed;

      top:
        0;

      bottom:
        0;

      left:
        72px;

      width:
        1px;

      z-index:
        30;

      background:
        linear-gradient(
          180deg,
          rgba(56, 189, 248, .08),
          rgba(56, 189, 248, .24) 18%,
          rgba(139, 92, 246, .2) 52%,
          rgba(56, 189, 248, .16) 82%,
          rgba(56, 189, 248, .05)
        );

      box-shadow:
        1px 0 10px
        rgba(56, 189, 248, .07);

      pointer-events:
        none;
    }

    /*
      Garantiza que el saludo y las tarjetas nunca se
      desplacen hacia la izquierda.
    */

    .qsm-dashboard-v3-header--executive,
    .qsm-dashboard-v3-stats,
    .qsm-dashboard-v3-upper,
    .qsm-dashboard-v3-actions-card,
    .qsm-dashboard-v3-recent-grid {
      width:
        100% !important;

      max-width:
        100% !important;

      margin-left:
        0 !important;

      box-sizing:
        border-box !important;
    }

    /*
      Laptop: sidebar ligeramente más estrecho.
    */

    @media (max-width: 1200px) {
      .qsm-dashboard-v3-main {
        width:
          calc(
            100% - 72px
          ) !important;

        max-width:
          calc(
            100% - 72px
          ) !important;

        margin-left:
          72px !important;

        padding-left:
          7px !important;

        padding-right:
          11px !important;
      }

      .qsm-dashboard-v3-main::before {
        left:
          68px;
      }
    }

    /*
      En tablet y móvil no se reserva una columna fija.
    */

    @media (max-width: 700px) {
      .qsm-dashboard-v3-main {
        width:
          100% !important;

        max-width:
          100% !important;

        margin-left:
          0 !important;

        padding-left:
          8px !important;

        padding-right:
          8px !important;
      }

      .qsm-dashboard-v3-main::before {
        display:
          none !important;
      }
    }


    /* =======================================================
       QSM_FASE15_BLOCK6_FIX3_DYNAMIC_SIDEBAR_CONNECTION
       SIDEBAR ABIERTO/CERRADO + 8PX DE SEPARACIÓN
    ======================================================= */

    /*
      Esta regla reemplaza los márgenes fijos de los FIX
      anteriores. El valor proviene del Sidebar real.
    */

    .qsm-dashboard-v3-main {
      --qsm-sidebar-gap:
        8px;

      position:
        relative !important;

      width:
        calc(
          100vw -
          var(
            --qsm-live-sidebar-right,
            80px
          ) -
          var(
            --qsm-sidebar-gap
          ) -
          10px
        ) !important;

      max-width:
        calc(
          100vw -
          var(
            --qsm-live-sidebar-right,
            80px
          ) -
          var(
            --qsm-sidebar-gap
          ) -
          10px
        ) !important;

      margin-left:
        calc(
          var(
            --qsm-live-sidebar-right,
            80px
          ) +
          var(
            --qsm-sidebar-gap
          )
        ) !important;

      margin-right:
        10px !important;

      padding-left:
        0 !important;

      padding-right:
        0 !important;

      box-sizing:
        border-box !important;

      overflow-x:
        clip !important;

      transition:
        margin-left .24s ease,
        width .24s ease,
        max-width .24s ease !important;
    }

    /*
      El Dashboard ocupa todo el espacio disponible dentro
      de su área, sin volver a crear una franja interna.
    */

    .qsm-dashboard-v3,
    .qsm-dashboard-v3-shell {
      width:
        100% !important;

      max-width:
        100% !important;

      margin-left:
        0 !important;

      margin-right:
        0 !important;

      padding-left:
        0 !important;

      box-sizing:
        border-box !important;

      overflow-x:
        clip !important;
    }

    /*
      Anula wrappers agregados durante los FIX anteriores.
    */

    .qsm-dashboard-v3-page,
    .qsm-dashboard-v3-content,
    .qsm-dashboard-v3-container {
      width:
        100% !important;

      max-width:
        100% !important;

      margin:
        0 !important;

      padding-left:
        0 !important;

      box-sizing:
        border-box !important;
    }

    /*
      Línea elegante exactamente en el borde del Sidebar.
      Se mueve junto con él.
    */

    .qsm-dashboard-v3-main::before {
      content:
        "";

      position:
        fixed;

      top:
        0;

      bottom:
        0;

      left:
        var(
          --qsm-live-sidebar-right,
          80px
        );

      width:
        1px;

      z-index:
        30;

      background:
        linear-gradient(
          180deg,
          transparent,
          rgba(56, 189, 248, .22) 15%,
          rgba(139, 92, 246, .18) 50%,
          rgba(56, 189, 248, .14) 85%,
          transparent
        );

      box-shadow:
        2px 0 10px
        rgba(56, 189, 248, .06);

      pointer-events:
        none;

      transition:
        left .24s ease;
    }

    /*
      Todas las secciones quedan dentro del borde real.
    */

    .qsm-dashboard-v3-header--executive,
    .qsm-dashboard-v3-stats,
    .qsm-dashboard-v3-upper,
    .qsm-dashboard-v3-actions-card,
    .qsm-dashboard-v3-recent-grid {
      width:
        100% !important;

      max-width:
        100% !important;

      min-width:
        0 !important;

      margin-left:
        0 !important;

      margin-right:
        0 !important;

      box-sizing:
        border-box !important;
    }

    /*
      Móvil: el Sidebar funciona como panel flotante.
    */

    @media (max-width: 700px) {
      .qsm-dashboard-v3-main {
        width:
          calc(
            100% - 16px
          ) !important;

        max-width:
          calc(
            100% - 16px
          ) !important;

        margin-left:
          8px !important;

        margin-right:
          8px !important;

        padding-left:
          0 !important;

        padding-right:
          0 !important;
      }

      .qsm-dashboard-v3-main::before {
        display:
          none !important;
      }
    }

    @media (
      prefers-reduced-motion:
      reduce
    ) {
      .qsm-dashboard-v3 *,
      .qsm-dashboard-v3 *::before,
      .qsm-dashboard-v3 *::after {
        scroll-behavior: auto !important;
        animation-duration:
          .01ms !important;
        animation-iteration-count:
          1 !important;
        transition-duration:
          .01ms !important;
      }
    }

    .qsm-dashboard-v3-empty {
      min-height: 110px;
      display: grid;
      place-items: center;
      padding: 14px;
      color: var(--qsm-muted);
      font-size: 9px;
      line-height: 15px;
      text-align: center;
    }

    .qsm-dashboard-v3-loading {
      min-height: 260px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 1px solid var(--qsm-border);
      border-radius: 18px;
      background: var(--qsm-surface);
      color: var(--qsm-text-secondary);
      text-align: center;
    }

    .qsm-dashboard-v3-loading > span {
      font-size: 30px;
    }

    .qsm-dashboard-v3-loading p {
      margin: 0;
      color: var(--qsm-muted);
      font-size: 9px;
    }

    @media (max-width: 1450px) {
      .qsm-dashboard-v3-upper {
        grid-template-columns: minmax(0, 1.55fr) minmax(245px, .8fr);
        grid-template-areas:
          "chart quick"
          "profile profile";
      }

      .qsm-dashboard-v3-profile-card {
        max-width: 520px;
      }
    }

    @media (max-width: 1180px) {
      .qsm-dashboard-v3-stats,
      .qsm-dashboard-v3-recent-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 1100px) {
      .qsm-dashboard-v3-sidebar {
        display: none;
      }

      .qsm-dashboard-v3-main {
        width: 100%;
        margin-left: 0;
      }
    }

    @media (max-width: 820px) {
      .qsm-dashboard-v3-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .qsm-dashboard-v3-refresh {
        width: 100%;
      }

      .qsm-dashboard-v3-upper {
        grid-template-columns: 1fr;
        grid-template-areas:
          "chart"
          "quick"
          "profile";
      }

      .qsm-dashboard-v3-profile-card {
        max-width: none;
      }

      .qsm-dashboard-v3-actions {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 560px) {
      .qsm-dashboard-v3-main {
        padding: 14px 12px 42px;
      }

      .qsm-dashboard-v3-stats,
      .qsm-dashboard-v3-recent-grid {
        grid-template-columns: 1fr;
      }

      .qsm-dashboard-v3-market-search {
        grid-template-columns: 24px minmax(0, 1fr);
      }

      .qsm-dashboard-v3-market-search button {
        grid-column: 1 / -1;
      }

      .qsm-dashboard-v3-actions {
        grid-template-columns: 1fr;
      }

      .qsm-dashboard-v3-chart-wrap {
        width: 100%;
        max-width: 100%;
        min-height: clamp(180px, 58vw, 235px);
        overflow: hidden;
      }

      .qsm-dashboard-v3-chart-wrap svg {
        display: block;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        height: auto;
      }
    }
  `;
}

/*
|--------------------------------------------------------------------------
| Página general
|--------------------------------------------------------------------------
*/

const page = (isLight) => ({
  width: "100%",
  minHeight: "100vh",

  color:
    isLight
      ? "#0f172a"
      : "#f8fafc",

  background:
    isLight
      ? `
        radial-gradient(
          circle at 92% 4%,
          rgba(53, 208, 195, .14),
          transparent 28%
        ),
        radial-gradient(
          circle at 10% 12%,
          rgba(56, 189, 248, .10),
          transparent 26%
        ),
        #f8fafc
      `
      : `
        radial-gradient(
          circle at 92% 4%,
          rgba(139, 92, 246, .15),
          transparent 30%
        ),
        radial-gradient(
          circle at 12% 16%,
          rgba(53, 208, 195, .09),
          transparent 27%
        ),
        #020617
      `
});

/*
|--------------------------------------------------------------------------
| Layout principal
|--------------------------------------------------------------------------
*/

const layout = (settings) => ({
  width: "100%",
  minHeight: "100vh",

  display: "grid",

  gridTemplateColumns:
    settings?.compactSidebar
      ? "96px minmax(0, 1fr)"
      : "300px minmax(0, 1fr)",

  alignItems: "start",
  overflowX: "hidden"
});

const main = (settings) => ({
  width: "100%",
  minWidth: 0,
  minHeight: "100vh",

  padding:
    settings?.density ===
    "compact"
      ? "18px 24px 44px"
      : settings?.density ===
        "spacious"
      ? "32px 42px 72px"
      : "24px 32px 62px",

  overflowX: "hidden"
});

const contentContainer = {
  width: "100%",
  maxWidth: "1640px",
  margin: "0 auto"
};

/*
|--------------------------------------------------------------------------
| Barra superior del contenido
|--------------------------------------------------------------------------
*/

const dashboardToolbar = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-end",
  gap: "24px",
  margin: "22px 0 18px"
};

const toolbarEyebrow = (
  accent
) => ({
  margin: 0,

  color: accent,

  fontSize: "10px",
  fontWeight: "950",
  letterSpacing: "3.5px",
  textTransform: "uppercase"
});

const toolbarTitle = (
  isLight
) => ({
  margin: "7px 0 5px",

  color:
    isLight
      ? "#0f172a"
      : "#f8fafc",

  fontSize:
    "clamp(23px, 2vw, 31px)",

  lineHeight: "1.12",
  letterSpacing: "-.5px"
});

const toolbarText = (
  isLight
) => ({
  maxWidth: "720px",
  margin: 0,

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "13px",
  lineHeight: "21px"
});

const refreshButton = (
  isLight,
  accent
) => ({
  minHeight: "46px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "11px 17px",

  borderRadius: "14px",

  border:
    `1px solid ${accent}55`,

  background:
    isLight
      ? `${accent}12`
      : `${accent}16`,

  color: accent,

  fontSize: "12px",
  fontWeight: "950",

  cursor: "pointer",

  whiteSpace: "nowrap"
});

/*
|--------------------------------------------------------------------------
| Mensajes de error y advertencia
|--------------------------------------------------------------------------
*/

const errorBox = {
  display: "grid",
  gap: "4px",

  marginBottom: "16px",
  padding: "14px 17px",

  borderRadius: "15px",

  border:
    "1px solid rgba(248, 113, 113, .32)",

  background:
    "rgba(127, 29, 29, .23)",

  color: "#fecaca",

  fontSize: "12px",
  lineHeight: "19px"
};

const warningBox = (
  isLight
) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",

  marginBottom: "16px",
  padding: "14px 17px",

  borderRadius: "15px",

  border:
    isLight
      ? "1px solid rgba(245, 158, 11, .25)"
      : "1px solid rgba(245, 158, 11, .28)",

  background:
    isLight
      ? "rgba(255, 251, 235, .90)"
      : "rgba(120, 53, 15, .16)",

  color:
    isLight
      ? "#92400e"
      : "#fde68a",

  fontSize: "12px",
  lineHeight: "19px"
});

const warningIcon = {
  width: "32px",
  height: "32px",
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "10px",

  background:
    "rgba(245, 158, 11, .16)",

  color: "#f59e0b",

  fontWeight: "950"
};

const warningList = {
  margin: "6px 0 0",
  paddingLeft: "18px"
};

/*
|--------------------------------------------------------------------------
| Hero
|--------------------------------------------------------------------------
*/

const heroGrid = {
  display: "grid",

  gridTemplateColumns:
    "minmax(0, 1fr) 350px",

  gap: "18px",

  marginBottom: "18px"
};

const heroCard = (
  isLight,
  settings,
  accent
) => ({
  position: "relative",

  minWidth: 0,
  minHeight: "385px",

  display: "flex",
  flexDirection: "column",
  justifyContent: "center",

  overflow: "hidden",

  padding: "30px",

  borderRadius: "28px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(56, 189, 248, .15)",

  background:
    isLight
      ? "rgba(255, 255, 255, .88)"
      : "rgba(15, 23, 42, .74)",

  boxShadow:
    isLight
      ? "0 22px 65px rgba(15, 23, 42, .07)"
      : "0 24px 80px rgba(0, 0, 0, .22)",

  backdropFilter:
    settings?.glassEffect ===
    false
      ? "none"
      : "blur(16px)",

  animation:
    settings?.animations ===
    false
      ? "none"
      : "fadeUp .35s ease"
});

const heroGlow = (
  accent
) => ({
  position: "absolute",
  top: "-130px",
  right: "-100px",

  width: "330px",
  height: "330px",

  borderRadius: "50%",

  background:
    `radial-gradient(
      circle,
      ${accent}34,
      transparent 67%
    )`,

  pointerEvents: "none"
});

const label = (
  accent
) => ({
  margin: 0,

  color: accent,

  fontSize: "10px",
  fontWeight: "950",
  letterSpacing: "3.5px",
  textTransform: "uppercase"
});

const title = (
  isLight
) => ({
  maxWidth: "900px",

  margin: "10px 0 12px",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  fontSize:
    "clamp(42px, 4.1vw, 68px)",

  lineHeight: ".98",
  letterSpacing: "-2.2px"
});

const subtitle = (
  isLight
) => ({
  maxWidth: "820px",

  margin: 0,

  color:
    isLight
      ? "#475569"
      : "#cbd5e1",

  fontSize: "15px",
  lineHeight: "26px"
});

/*
|--------------------------------------------------------------------------
| Buscador
|--------------------------------------------------------------------------
*/

const searchBox = (
  isLight
) => ({
  width: "100%",
  maxWidth: "900px",
  minHeight: "60px",

  display: "grid",

  gridTemplateColumns:
    "30px minmax(0, 1fr) 116px",

  alignItems: "center",
  gap: "10px",

  margin: "22px 0",

  padding: "7px 9px 7px 15px",

  borderRadius: "17px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .10)"
      : "1px solid rgba(148, 163, 184, .14)",

  background:
    isLight
      ? "rgba(248, 250, 252, .92)"
      : "rgba(2, 6, 23, .54)"
});

const searchIcon = {
  color: "#38bdf8",
  fontSize: "22px",
  lineHeight: 1
};

const searchInput = (
  isLight
) => ({
  width: "100%",
  height: "46px",
  minWidth: 0,

  border: "none",
  outline: "none",
  background:
    "transparent",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  fontSize: "13px"
});

const searchButton = (
  accent
) => ({
  width: "100%",
  height: "44px",

  border: "none",
  borderRadius: "13px",

  background:
    `linear-gradient(
      135deg,
      ${accent},
      #38bdf8,
      #8b5cf6
    )`,

  color: "#ffffff",

  fontSize: "12px",
  fontWeight: "950",

  cursor: "pointer",

  boxShadow:
    `0 12px 35px ${accent}30`
});

/*
|--------------------------------------------------------------------------
| Acciones del Hero
|--------------------------------------------------------------------------
*/

const heroActions = {
  width: "100%",
  maxWidth: "850px",

  display: "grid",

  gridTemplateColumns:
    "1.2fr 1fr 1fr",

  gap: "10px"
};

const primaryButton = (
  accent
) => ({
  minHeight: "46px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "12px 16px",

  border: "none",
  borderRadius: "13px",

  background:
    `linear-gradient(
      135deg,
      ${accent},
      #38bdf8,
      #8b5cf6
    )`,

  color: "#ffffff",

  textDecoration: "none",
  textAlign: "center",

  fontSize: "12px",
  fontWeight: "950",

  cursor: "pointer",

  boxShadow:
    `0 15px 44px ${accent}28`
});

const outlineButton = (
  isLight
) => ({
  minHeight: "46px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "12px 16px",

  borderRadius: "13px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .10)"
      : "1px solid rgba(148, 163, 184, .15)",

  background:
    isLight
      ? "rgba(255, 255, 255, .72)"
      : "rgba(15, 23, 42, .58)",

  color:
    isLight
      ? "#0f172a"
      : "#e2e8f0",

  textDecoration: "none",
  textAlign: "center",

  fontSize: "12px",
  fontWeight: "900"
});

/*
|--------------------------------------------------------------------------
| Tarjeta de perfil
|--------------------------------------------------------------------------
*/

const profileCard = (
  isLight,
  settings
) => ({
  minWidth: 0,

  display: "grid",
  alignContent: "start",
  gap: "14px",

  padding: "23px",

  borderRadius: "28px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(56, 189, 248, .15)",

  background:
    isLight
      ? "rgba(255, 255, 255, .88)"
      : "rgba(15, 23, 42, .74)",

  boxShadow:
    isLight
      ? "0 22px 65px rgba(15, 23, 42, .07)"
      : "0 24px 80px rgba(0, 0, 0, .22)",

  backdropFilter:
    settings?.glassEffect ===
    false
      ? "none"
      : "blur(16px)"
});

const avatar = (
  accent
) => ({
  width: "88px",
  height: "88px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  overflow: "hidden",

  borderRadius: "25px",

  border:
    `2px solid ${accent}70`,

  background:
    `linear-gradient(
      135deg,
      ${accent},
      #8b5cf6
    )`,

  color: "#ffffff",

  fontSize: "34px",
  fontWeight: "950",

  boxShadow:
    `0 14px 40px ${accent}25`
});

const profileImage = {
  width: "100%",
  height: "100%",
  display: "block",

  objectFit: "cover",
  objectPosition: "center"
};

const profileIdentity = {
  minWidth: 0
};

const profileLabel = (
  accent
) => ({
  margin: 0,

  color: accent,

  fontSize: "9px",
  fontWeight: "950",
  letterSpacing: "2.5px"
});

const panelTitle = (
  isLight
) => ({
  margin: "6px 0",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  fontSize: "20px",
  lineHeight: "25px",
  wordBreak: "break-word"
});

const profileEmail = (
  isLight
) => ({
  margin: 0,

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "11px",
  lineHeight: "18px",
  wordBreak: "break-word"
});

const badgeRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",

  marginTop: "11px"
};

const verifiedBadge = (
  verified
) => ({
  padding: "7px 10px",

  borderRadius: "999px",

  border:
    verified
      ? "1px solid rgba(34, 197, 94, .30)"
      : "1px solid rgba(245, 158, 11, .30)",

  background:
    verified
      ? "rgba(34, 197, 94, .12)"
      : "rgba(245, 158, 11, .12)",

  color:
    verified
      ? "#86efac"
      : "#fde68a",

  fontSize: "10px",
  fontWeight: "900"
});

const trustBadge = (
  accent
) => ({
  padding: "7px 10px",

  borderRadius: "999px",

  border:
    `1px solid ${accent}55`,

  background:
    `${accent}16`,

  color: accent,

  fontSize: "10px",
  fontWeight: "900"
});

const profileActions = {
  display: "grid",
  gap: "10px"
};

const profileProgressHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "12px"
};

const muted = (
  isLight
) => ({
  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "11px",
  lineHeight: "18px"
});

const profilePercentage = (
  accent
) => ({
  color: accent,
  fontSize: "12px"
});

const scoreBar = (
  isLight
) => ({
  width: "100%",
  height: "8px",

  overflow: "hidden",

  borderRadius: "999px",

  background:
    isLight
      ? "rgba(15, 23, 42, .09)"
      : "rgba(148, 163, 184, .14)"
});

const scoreFill = (
  accent
) => ({
  height: "100%",

  borderRadius: "999px",

  background:
    `linear-gradient(
      90deg,
      ${accent},
      #38bdf8,
      #8b5cf6
    )`,

  transition:
    "width .45s ease"
});

const trustRow = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "12px",

  marginTop: "3px"
};

/*
|--------------------------------------------------------------------------
| Estado de carga
|--------------------------------------------------------------------------
*/

const centerCard = (
  isLight
) => ({
  minHeight: "290px",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",

  padding: "36px",

  borderRadius: "24px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(56, 189, 248, .14)",

  background:
    isLight
      ? "rgba(255, 255, 255, .86)"
      : "rgba(15, 23, 42, .70)",

  color:
    isLight
      ? "#475569"
      : "#cbd5e1",

  textAlign: "center"
});

const loadingIcon = {
  width: "62px",
  height: "62px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  marginBottom: "12px",

  borderRadius: "19px",

  background:
    "linear-gradient(135deg, rgba(53, 208, 195, .18), rgba(139, 92, 246, .20))",

  fontSize: "31px",

  animation:
    "softPulse 1.5s infinite"
};

/*
|--------------------------------------------------------------------------
| Estadísticas
|--------------------------------------------------------------------------
*/

const statsGrid = {
  display: "grid",

  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",

  gap: "14px",

  marginBottom: "18px"
};

const statCard = (
  isLight
) => ({
  minWidth: 0,
  minHeight: "112px",

  display: "flex",
  alignItems: "center",
  gap: "13px",

  padding: "18px",

  borderRadius: "20px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(56, 189, 248, .13)",

  background:
    isLight
      ? "rgba(255, 255, 255, .86)"
      : "rgba(15, 23, 42, .72)",

  boxShadow:
    isLight
      ? "0 16px 42px rgba(15, 23, 42, .05)"
      : "0 16px 46px rgba(0, 0, 0, .13)"
});

const statIcon = (
  accent
) => ({
  width: "49px",
  height: "49px",
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "15px",

  border:
    `1px solid ${accent}35`,

  background:
    `${accent}17`,

  fontSize: "22px"
});

const statContent = {
  minWidth: 0
};

const statTitle = (
  isLight
) => ({
  display: "block",

  marginBottom: "4px",

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "11px",
  fontWeight: "800"
});

const statValue = (
  isLight
) => ({
  display: "block",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  fontSize: "27px",
  lineHeight: "30px",

  wordBreak: "break-word"
});

const statValueCompact = (
  isLight
) => ({
  ...statValue(isLight),

  fontSize:
    "clamp(17px, 1.5vw, 23px)",

  lineHeight: "27px"
});

const statText = (
  isLight
) => ({
  margin: "5px 0 0",

  color:
    isLight
      ? "#94a3b8"
      : "#64748b",

  fontSize: "9px",
  lineHeight: "15px"
});

/*
|--------------------------------------------------------------------------
| Acciones rápidas
|--------------------------------------------------------------------------
*/

const quickGrid = {
  display: "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",

  gap: "12px",

  marginBottom: "18px"
};

const quickAction = (
  isLight,
  accent
) => ({
  position: "relative",

  minWidth: 0,
  minHeight: "118px",

  display: "grid",

  gridTemplateColumns:
    "44px minmax(0, 1fr) 22px",

  alignItems: "center",
  gap: "11px",

  padding: "16px",

  overflow: "hidden",

  borderRadius: "19px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(56, 189, 248, .13)",

  background:
    isLight
      ? "rgba(255, 255, 255, .86)"
      : "rgba(15, 23, 42, .72)",

  color:
    isLight
      ? "#0f172a"
      : "#ffffff",

  textDecoration: "none",

  boxShadow:
    isLight
      ? "0 15px 38px rgba(15, 23, 42, .05)"
      : "0 15px 42px rgba(0, 0, 0, .12)",

  borderTop:
    `3px solid ${accent}`
});

const quickIcon = (
  accent
) => ({
  width: "44px",
  height: "44px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "14px",

  background:
    `${accent}16`,

  color: accent,

  fontSize: "20px"
});

const quickContent = {
  minWidth: 0
};

const quickTitle = (
  isLight
) => ({
  display: "block",

  color:
    isLight
      ? "#0f172a"
      : "#f8fafc",

  fontSize: "13px"
});

const quickText = (
  isLight
) => ({
  margin: "5px 0 0",

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "10px",
  lineHeight: "16px"
});

const quickArrow = (
  accent
) => ({
  color: accent,
  fontSize: "18px",
  fontWeight: "950"
});

/*
|--------------------------------------------------------------------------
| Cuadrícula de paneles
|--------------------------------------------------------------------------
*/

const dashboardGrid = {
  display: "grid",

  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",

  gap: "18px",

  alignItems: "start"
};

const panel = (
  isLight,
  settings
) => ({
  minWidth: 0,

  padding: "21px",

  borderRadius: "23px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .08)"
      : "1px solid rgba(56, 189, 248, .14)",

  background:
    isLight
      ? "rgba(255, 255, 255, .86)"
      : "rgba(15, 23, 42, .72)",

  boxShadow:
    isLight
      ? "0 18px 52px rgba(15, 23, 42, .06)"
      : "0 20px 62px rgba(0, 0, 0, .16)",

  backdropFilter:
    settings?.glassEffect ===
    false
      ? "none"
      : "blur(14px)"
});

const sectionHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "14px",

  marginBottom: "14px"
};

const panelContent = {
  minHeight: "130px"
};

/*
|--------------------------------------------------------------------------
| Filas de actividad
|--------------------------------------------------------------------------
*/

const activityRow = (
  isLight
) => ({
  minWidth: 0,

  display: "grid",

  gridTemplateColumns:
    "44px minmax(0, 1fr) minmax(80px, auto)",

  alignItems: "center",
  gap: "11px",

  padding: "11px 0",

  borderBottom:
    isLight
      ? "1px solid rgba(15, 23, 42, .07)"
      : "1px solid rgba(148, 163, 184, .09)"
});

const activityIcon = {
  width: "44px",
  height: "44px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "14px",

  background:
    "rgba(53, 208, 195, .13)",

  fontSize: "19px"
};

const activityContent = {
  minWidth: 0
};

const activityTitle = (
  isLight
) => ({
  display: "block",

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color:
    isLight
      ? "#0f172a"
      : "#e2e8f0",

  fontSize: "12px"
});

const activitySubtitle = (
  isLight
) => ({
  margin: "4px 0 0",

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "9px"
});

const activityValue = (
  isLight
) => ({
  color:
    isLight
      ? "#0f766e"
      : "#5eead4",

  fontSize: "11px",
  fontWeight: "900",
  textAlign: "right",
  whiteSpace: "nowrap"
});

const activityValueText = (
  isLight
) => ({
  maxWidth: "150px",

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color:
    isLight
      ? "#475569"
      : "#cbd5e1",

  fontSize: "10px",
  textAlign: "right"
});

/*
|--------------------------------------------------------------------------
| Progreso
|--------------------------------------------------------------------------
*/

const progressLine = (
  isLight
) => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",

  padding: "9px 0",

  borderBottom:
    isLight
      ? "1px solid rgba(15, 23, 42, .07)"
      : "1px solid rgba(148, 163, 184, .09)"
});

const progressText = (
  isLight
) => ({
  margin: 0,

  color:
    isLight
      ? "#475569"
      : "#cbd5e1",

  fontSize: "11px"
});

const checkDone = {
  width: "25px",
  height: "25px",
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  background: "#35d0c3",

  color: "#020617",

  fontSize: "11px",
  fontWeight: "950"
};

const checkPending = {
  ...checkDone,

  background:
    "rgba(148, 163, 184, .14)",

  color: "#64748b"
};

/*
|--------------------------------------------------------------------------
| Estado vacío
|--------------------------------------------------------------------------
*/

const emptyState = (
  isLight
) => ({
  minHeight: "125px",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",

  gap: "8px",

  padding: "18px",

  borderRadius: "16px",

  border:
    isLight
      ? "1px solid rgba(15, 23, 42, .07)"
      : "1px solid rgba(148, 163, 184, .09)",

  background:
    isLight
      ? "rgba(248, 250, 252, .82)"
      : "rgba(2, 6, 23, .30)",

  textAlign: "center"
});

const emptyStateIcon = {
  fontSize: "25px"
};

const emptyStateText = (
  isLight
) => ({
  margin: 0,

  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "11px",
  lineHeight: "18px"
});

/*
|--------------------------------------------------------------------------
| Estado de cuenta
|--------------------------------------------------------------------------
*/

const accountStatusRow = (
  isLight
) => ({
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "18px",

  padding: "11px 0",

  borderBottom:
    isLight
      ? "1px solid rgba(15, 23, 42, .07)"
      : "1px solid rgba(148, 163, 184, .09)"
});

const accountStatusLabel = (
  isLight
) => ({
  color:
    isLight
      ? "#64748b"
      : "#94a3b8",

  fontSize: "11px"
});

const accountStatusValue = (
  accent
) => ({
  color: accent,

  fontSize: "11px",
  textAlign: "right"
});

/*
|--------------------------------------------------------------------------
| Enlaces pequeños
|--------------------------------------------------------------------------
*/

const miniLink = (
  accent
) => ({
  display: "inline-flex",

  marginTop: "14px",

  color: accent,

  textDecoration: "none",

  fontSize: "11px",
  fontWeight: "950"
});

export default Dashboard;
