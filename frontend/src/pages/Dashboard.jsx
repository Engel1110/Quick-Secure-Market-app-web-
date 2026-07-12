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

function Dashboard() {
  const navigate =
    useNavigate();

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

  const storedSettings =
    useMemo(() => {
      return {
        ...DEFAULT_SETTINGS,
        ...(
          safeJson(
            localStorage.getItem(
              "qsm_settings"
            )
          ) ||
          {}
        ),

        theme:
          localStorage.getItem(
            "qsm_theme"
          ) ||
          safeJson(
            localStorage.getItem(
              "qsm_settings"
            )
          )?.theme ||
          DEFAULT_SETTINGS.theme,

        accentColor:
          localStorage.getItem(
            "qsm_accent"
          ) ||
          safeJson(
            localStorage.getItem(
              "qsm_settings"
            )
          )?.accentColor ||
          DEFAULT_SETTINGS.accentColor,

        language:
          localStorage.getItem(
            "qsm_language"
          ) ||
          safeJson(
            localStorage.getItem(
              "qsm_settings"
            )
          )?.language ||
          DEFAULT_SETTINGS.language
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
    settings,
    setSettings
  ] = useState(
    storedSettings
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
                api.get(
                  "/users/me"
                ),

                api.get(
                  "/dashboard/summary"
                ),

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
          } else {
            setRecentDisputes(
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
  | Cargar configuración
  |--------------------------------------------------------------------------
  */

  const loadSettings =
    useCallback(
      async () => {
        try {
          const response =
            await api.get(
              "/settings/me"
            );

          const backendSettings =
            extractObject(
              response?.data,
              [
                "settings",
                "data"
              ]
            );

          if (
            backendSettings &&
            typeof backendSettings ===
              "object"
          ) {
            const mergedSettings = {
              ...DEFAULT_SETTINGS,
              ...storedSettings,
              ...backendSettings
            };

            setSettings(
              mergedSettings
            );

            localStorage.setItem(
              "qsm_settings",
              JSON.stringify(
                mergedSettings
              )
            );
          }
        } catch {
          setSettings(
            storedSettings
          );
        }
      },
      [
        storedSettings
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Efectos
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadDashboard(true);
    loadSettings();
  }, [
    loadDashboard,
    loadSettings
  ]);

  useEffect(() => {
    applySettings(
      settings
    );
  }, [
    settings
  ]);

  /*
  |--------------------------------------------------------------------------
  | Buscar productos
  |--------------------------------------------------------------------------
  */

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
    <div style={page(isLight)}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background:
            ${isLight
              ? "#f8fafc"
              : "#020617"};
          font-family:
            Inter,
            "Plus Jakarta Sans",
            system-ui,
            sans-serif;
        }

        input::placeholder {
          color:
            ${isLight
              ? "#94a3b8"
              : "#64748b"};
        }

        input,
        select,
        button,
        a {
          font-family: inherit;
        }

        button,
        a {
          transition:
            ${settings.animations === false
              ? "none"
              : "transform .24s ease, opacity .24s ease, border-color .24s ease, background .24s ease"};
        }

        button:hover,
        a:hover {
          transform:
            ${settings.animations === false
              ? "none"
              : "translateY(-2px)"};
        }

        button:disabled {
          transform: none !important;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes softPulse {
          0% {
            opacity: .7;
          }

          50% {
            opacity: 1;
          }

          100% {
            opacity: .7;
          }
        }

        @media (max-width: 1480px) {
          .dashboard-hero-grid {
            grid-template-columns:
              minmax(0, 1fr) 320px
              !important;
          }

          .dashboard-quick-grid {
            grid-template-columns:
              repeat(3, minmax(180px, 1fr))
              !important;
          }
        }

        @media (max-width: 1240px) {
          .dashboard-page {
            grid-template-columns:
              1fr !important;
          }

          .sidebar-wrapper {
            display:
              none !important;
          }

          .dashboard-hero-grid {
            grid-template-columns:
              1fr !important;
          }

          .dashboard-stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr))
              !important;
          }

          .dashboard-main-grid {
            grid-template-columns:
              1fr !important;
          }
        }

        @media (max-width: 840px) {
          .dashboard-main-content {
            padding:
              18px !important;
          }

          .dashboard-hero-actions {
            grid-template-columns:
              1fr !important;
          }

          .dashboard-quick-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr))
              !important;
          }

          .dashboard-profile-card {
            grid-template-columns:
              90px minmax(0, 1fr)
              !important;
            align-items:
              center !important;
          }

          .dashboard-profile-actions {
            grid-column:
              1 / -1 !important;
          }
        }

        @media (max-width: 560px) {
          .dashboard-stats-grid,
          .dashboard-quick-grid {
            grid-template-columns:
              1fr !important;
          }

          .dashboard-search-box {
            grid-template-columns:
              28px minmax(0, 1fr)
              !important;
            height:
              auto !important;
            padding:
              12px !important;
          }

          .dashboard-search-button {
            grid-column:
              1 / -1 !important;
            width:
              100% !important;
          }

          .dashboard-profile-card {
            grid-template-columns:
              1fr !important;
            text-align:
              center !important;
          }

          .dashboard-profile-avatar {
            margin:
              0 auto !important;
          }

          .dashboard-badge-row {
            justify-content:
              center !important;
          }

          .dashboard-activity-row {
            grid-template-columns:
              44px minmax(0, 1fr)
              !important;
          }

          .dashboard-activity-value {
            grid-column:
              2 !important;
            text-align:
              left !important;
          }
        }
      `}</style>

      <div
        className="dashboard-page"
        style={layout(settings)}
      >
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main
          className="dashboard-main-content"
          style={main(settings)}
        >
          <Topbar />

          <div style={contentContainer}>
            <section
              style={dashboardToolbar}
            >
              <div>
                <p style={toolbarEyebrow(accent)}>
                  PANEL PRINCIPAL
                </p>

                <h2 style={toolbarTitle(isLight)}>
                  Resumen de tu actividad
                </h2>

                <p style={toolbarText(isLight)}>
                  Consulta tu perfil, operaciones,
                  ventas, productos y seguridad desde
                  un solo lugar.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadDashboard(false)
                }
                disabled={
                  loading ||
                  refreshing
                }
                style={{
                  ...refreshButton(
                    isLight,
                    accent
                  ),
                  opacity:
                    refreshing
                      ? 0.68
                      : 1,
                  cursor:
                    refreshing
                      ? "not-allowed"
                      : "pointer"
                }}
              >
                {refreshing
                  ? "Actualizando..."
                  : "↻ Actualizar datos"}
              </button>
            </section>

            {error && (
              <div style={errorBox}>
                <strong>
                  No se pudo cargar todo el Dashboard.
                </strong>

                <span>
                  {error}
                </span>
              </div>
            )}

            {warnings.length > 0 && (
              <div style={warningBox(isLight)}>
                <div style={warningIcon}>
                  !
                </div>

                <div>
                  <strong>
                    Información parcial
                  </strong>

                  <ul style={warningList}>
                    {warnings.map(
                      (
                        warning,
                        index
                      ) => (
                        <li
                          key={`${warning}-${index}`}
                        >
                          {warning}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            )}

            <section
              className="dashboard-hero-grid"
              style={heroGrid}
            >
              <div
                style={heroCard(
                  isLight,
                  settings,
                  accent
                )}
              >
                <div style={heroGlow(accent)} />

                <p style={label(accent)}>
                  INICIO QSM
                </p>

                <h1 style={title(isLight)}>
                  Hola,{" "}
                  {displayFirstName}.
                </h1>

                <p style={subtitle(isLight)}>
                  Este es tu centro principal para
                  comprar, vender, publicar productos,
                  revisar mensajes, favoritos,
                  reclamos y seguridad.
                </p>

                <form
                  onSubmit={handleSearch}
                  className="dashboard-search-box"
                  style={searchBox(isLight)}
                >
                  <span style={searchIcon}>
                    ⌕
                  </span>

                  <input
                    value={search}
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Buscar productos en Marketplace..."
                    aria-label="Buscar productos en Marketplace"
                    style={searchInput(isLight)}
                  />

                  <button
                    type="submit"
                    className="dashboard-search-button"
                    style={searchButton(accent)}
                  >
                    Buscar
                  </button>
                </form>

                <div
                  className="dashboard-hero-actions"
                  style={heroActions}
                >
                  <Link
                    to="/marketplace"
                    style={primaryButton(accent)}
                  >
                    🛒 Ir al Marketplace
                  </Link>

                  <Link
                    to="/new-product"
                    style={outlineButton(isLight)}
                  >
                    ＋ Publicar producto
                  </Link>

                  <Link
                    to="/complete-profile"
                    style={outlineButton(isLight)}
                  >
                    🛡 Verificación QSM
                  </Link>
                </div>
              </div>

              <aside
                className="dashboard-profile-card"
                style={profileCard(
                  isLight,
                  settings
                )}
              >
                <div
                  className="dashboard-profile-avatar"
                  style={avatar(accent)}
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={`Foto de perfil de ${displayFullName}`}
                      style={profileImage}
                      onError={(
                        event
                      ) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  ) : (
                    displayFirstName
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                <div style={profileIdentity}>
                  <p style={profileLabel(accent)}>
                    PERFIL QSM
                  </p>

                  <h2 style={panelTitle(isLight)}>
                    {displayFullName}
                  </h2>

                  <p style={profileEmail(isLight)}>
                    {user?.email ||
                      "usuario@qsm.com"}
                  </p>

                  <div
                    className="dashboard-badge-row"
                    style={badgeRow}
                  >
                    <span
                      style={verifiedBadge(
                        isVerified
                      )}
                    >
                      {isVerified
                        ? "✓ Verificado"
                        : "● Pendiente"}
                    </span>

                    <span
                      style={trustBadge(accent)}
                    >
                      Confianza{" "}
                      {trustScore}/100
                    </span>
                  </div>
                </div>

                <div
                  className="dashboard-profile-actions"
                  style={profileActions}
                >
                  <div style={profileProgressHeader}>
                    <span style={muted(isLight)}>
                      Perfil completado
                    </span>

                    <strong style={profilePercentage(accent)}>
                      {profileCompletion}%
                    </strong>
                  </div>

                  <div style={scoreBar(isLight)}>
                    <div
                      style={{
                        ...scoreFill(accent),
                        width:
                          `${profileCompletion}%`
                      }}
                    />
                  </div>

                  <div style={trustRow}>
                    <span style={muted(isLight)}>
                      Nivel de confianza
                    </span>

                    <strong>
                      {trustScore}/100
                    </strong>
                  </div>

                  <div style={scoreBar(isLight)}>
                    <div
                      style={{
                        ...scoreFill(accent),
                        width:
                          `${trustScore}%`
                      }}
                    />
                  </div>

                  <Link
                    to="/profile"
                    style={primaryButton(accent)}
                  >
                    Editar perfil
                  </Link>
                </div>
              </aside>
            </section>

            {loading ? (
              <div style={centerCard(isLight)}>
                <div style={loadingIcon}>
                  ◌
                </div>

                <h2>
                  Cargando inicio...
                </h2>

                <p>
                  QSM está consultando tus datos.
                </p>
              </div>
            ) : (
              <>
                <section
                  className="dashboard-stats-grid"
                  style={statsGrid}
                >
                  <StatCard
                    icon="📦"
                    title="Productos"
                    value={stats.products}
                    text="Publicaciones activas"
                    isLight={isLight}
                    accent={accent}
                  />

                  <StatCard
                    icon="🛒"
                    title="Compras"
                    value={stats.purchases}
                    text="Órdenes registradas"
                    isLight={isLight}
                    accent={accent}
                  />

                  <StatCard
                    icon="💰"
                    title="Ventas"
                    value={stats.sales}
                    text="Operaciones como vendedor"
                    isLight={isLight}
                    accent={accent}
                  />

                  <StatCard
                    icon="🛡"
                    title="Monto protegido"
                    value={formatMoney(
                      stats.protectedAmount
                    )}
                    text="Operaciones activas QSM"
                    isLight={isLight}
                    accent={accent}
                    compactValue
                  />
                </section>

                <section
                  className="dashboard-quick-grid"
                  style={quickGrid}
                >
                  <QuickAction
                    icon="🛒"
                    title="Marketplace"
                    text="Explorar productos seguros."
                    to="/marketplace"
                    isLight={isLight}
                    accent={accent}
                  />

                  <QuickAction
                    icon="＋"
                    title="Publicar"
                    text="Vender con verificación QSM."
                    to="/new-product"
                    isLight={isLight}
                    accent={accent}
                  />

                  <QuickAction
                    icon="♥"
                    title="Favoritos"
                    text={`${stats.favorites} productos guardados.`}
                    to="/favorites"
                    isLight={isLight}
                    accent={accent}
                  />

                  <QuickAction
                    icon="💬"
                    title="Mensajes"
                    text={
                      stats.messages > 0
                        ? `${stats.messages} mensajes pendientes.`
                        : "Hablar con compradores o vendedores."
                    }
                    to="/messages"
                    isLight={isLight}
                    accent={accent}
                  />

                  <QuickAction
                    icon="⚖"
                    title="Reclamos"
                    text={
                      stats.disputes > 0
                        ? `${stats.disputes} reclamos registrados.`
                        : "Resolver disputas protegidas."
                    }
                    to="/disputes"
                    isLight={isLight}
                    accent={accent}
                  />

                  <QuickAction
                    icon="⚙"
                    title="Configuración"
                    text="Tema, idioma y seguridad."
                    to="/settings"
                    isLight={isLight}
                    accent={accent}
                  />
                </section>

                <section
                  className="dashboard-main-grid"
                  style={dashboardGrid}
                >
                  <DashboardPanel
                    eyebrow="COMPRAS"
                    title="Compras recientes"
                    actionText="Ver mis compras"
                    actionTo="/orders"
                    isLight={isLight}
                    accent={accent}
                    settings={settings}
                  >
                    {recentPurchases.length === 0 ? (
                      <EmptyState
                        icon="🛒"
                        text="Todavía no tienes compras recientes."
                        isLight={isLight}
                      />
                    ) : (
                      recentPurchases.map(
                        (
                          order,
                          index
                        ) => (
                          <ActivityRow
                            key={
                              order?._id ||
                              order?.id ||
                              index
                            }
                            icon="🛒"
                            title={
                              order?.product
                                ?.title ||
                              order
                                ?.productTitle ||
                              "Compra QSM"
                            }
                            subtitle={
                              order?.orderCode ||
                              formatStatus(
                                order?.status
                              )
                            }
                            value={formatMoney(
                              order
                                ?.totalAmount ??
                              order?.total ??
                              order?.price ??
                              order?.product
                                ?.price ??
                              0
                            )}
                            isLight={isLight}
                          />
                        )
                      )
                    )}
                  </DashboardPanel>

                  <DashboardPanel
                    eyebrow="VENTAS"
                    title="Ventas recientes"
                    actionText="Ver mis ventas"
                    actionTo="/sales"
                    isLight={isLight}
                    accent={accent}
                    settings={settings}
                  >
                    {recentSales.length === 0 ? (
                      <EmptyState
                        icon="💰"
                        text="Todavía no tienes ventas recientes."
                        isLight={isLight}
                      />
                    ) : (
                      recentSales.map(
                        (
                          order,
                          index
                        ) => (
                          <ActivityRow
                            key={
                              order?._id ||
                              order?.id ||
                              index
                            }
                            icon="💰"
                            title={
                              order?.product
                                ?.title ||
                              order
                                ?.productTitle ||
                              "Venta QSM"
                            }
                            subtitle={
                              order?.orderCode ||
                              formatStatus(
                                order?.status
                              )
                            }
                            value={formatMoney(
                              order
                                ?.totalAmount ??
                              order?.total ??
                              order?.price ??
                              order?.product
                                ?.price ??
                              0
                            )}
                            isLight={isLight}
                          />
                        )
                      )
                    )}
                  </DashboardPanel>

                  <DashboardPanel
                    eyebrow="PUBLICACIONES"
                    title="Productos publicados"
                    actionText="Gestionar publicaciones"
                    actionTo="/sales"
                    isLight={isLight}
                    accent={accent}
                    settings={settings}
                  >
                    {recentProducts.length === 0 ? (
                      <EmptyState
                        icon="📦"
                        text="Publica tu primer producto para verlo aquí."
                        isLight={isLight}
                      />
                    ) : (
                      recentProducts.map(
                        (
                          product,
                          index
                        ) => (
                          <ActivityRow
                            key={
                              product?._id ||
                              product?.id ||
                              index
                            }
                            icon="📦"
                            title={
                              product?.title ||
                              "Producto QSM"
                            }
                            subtitle={
                              formatStatus(
                                product?.status
                              ) ||
                              product?.category ||
                              "Marketplace"
                            }
                            value={formatMoney(
                              product?.price
                            )}
                            isLight={isLight}
                          />
                        )
                      )
                    )}
                  </DashboardPanel>

                  <DashboardPanel
                    eyebrow="SEGURIDAD"
                    title="Progreso QSM"
                    actionText="Completar verificación"
                    actionTo="/complete-profile"
                    isLight={isLight}
                    accent={accent}
                    settings={settings}
                  >
                    <ProgressLine
                      done={Boolean(
                        user?.firstName &&
                        user?.lastName &&
                        user?.email
                      )}
                      text="Información básica"
                      isLight={isLight}
                    />

                    <ProgressLine
                      done={Boolean(
                        user?.phone
                      )}
                      text="Número de teléfono"
                      isLight={isLight}
                    />

                    <ProgressLine
                      done={Boolean(
                        user?.city ||
                        user?.province
                      )}
                      text="Ubicación registrada"
                      isLight={isLight}
                    />

                    <ProgressLine
                      done={Boolean(
                        profilePhoto
                      )}
                      text="Foto de perfil"
                      isLight={isLight}
                    />

                    <ProgressLine
                      done={isVerified}
                      text="Verificación de identidad"
                      isLight={isLight}
                    />

                    <ProgressLine
                      done={
                        stats.products > 0
                      }
                      text="Primer producto publicado"
                      isLight={isLight}
                    />

                    <ProgressLine
                      done={
                        stats.purchases > 0 ||
                        stats.sales > 0
                      }
                      text="Primera operación protegida"
                      isLight={isLight}
                    />
                  </DashboardPanel>

                  <DashboardPanel
                    eyebrow="RECLAMOS"
                    title="Centro de reclamos"
                    actionText="Ver reclamos"
                    actionTo="/disputes"
                    isLight={isLight}
                    accent={accent}
                    settings={settings}
                  >
                    {recentDisputes.length === 0 ? (
                      <EmptyState
                        icon="⚖"
                        text="No tienes reclamos activos."
                        isLight={isLight}
                      />
                    ) : (
                      recentDisputes.map(
                        (
                          dispute,
                          index
                        ) => (
                          <ActivityRow
                            key={
                              dispute?._id ||
                              dispute?.id ||
                              index
                            }
                            icon="⚖"
                            title={
                              dispute
                                ?.disputeCode ||
                              dispute
                                ?.caseCode ||
                              "Reclamo QSM"
                            }
                            subtitle={formatStatus(
                              dispute?.status
                            )}
                            value={
                              dispute?.reason ||
                              dispute
                                ?.category ||
                              "Disputa"
                            }
                            isLight={isLight}
                            textualValue
                          />
                        )
                      )
                    )}
                  </DashboardPanel>

                  <DashboardPanel
                    eyebrow="CUENTA"
                    title="Estado de tu cuenta"
                    actionText="Ver configuración"
                    actionTo="/settings"
                    isLight={isLight}
                    accent={accent}
                    settings={settings}
                  >
                    <AccountStatusRow
                      label="Estado"
                      value={formatAccountStatus(
                        user?.status
                      )}
                      isLight={isLight}
                      accent={accent}
                    />

                    <AccountStatusRow
                      label="Verificación"
                      value={
                        isVerified
                          ? "Aprobada"
                          : formatVerificationStatus(
                              user?.verificationStatus
                            )
                      }
                      isLight={isLight}
                      accent={accent}
                    />

                    <AccountStatusRow
                      label="Compras habilitadas"
                      value={
                        user?.buyerEnabled ===
                        false
                          ? "No"
                          : "Sí"
                      }
                      isLight={isLight}
                      accent={accent}
                    />

                    <AccountStatusRow
                      label="Ventas habilitadas"
                      value={
                        user?.sellerEnabled ===
                        false
                          ? "No"
                          : "Sí"
                      }
                      isLight={isLight}
                      accent={accent}
                    />

                    <AccountStatusRow
                      label="Seguridad"
                      value={formatSecurityLevel(
                        user?.securityLevel
                      )}
                      isLight={isLight}
                      accent={accent}
                    />
                  </DashboardPanel>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      <AiAssistant
        pageContext="dashboard"
      />
    </div>
  );
}
/*
|--------------------------------------------------------------------------
| Panel reutilizable del Dashboard
|--------------------------------------------------------------------------
*/

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
    "http://localhost:5000/api";

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
| Aplicar configuración
|--------------------------------------------------------------------------
*/

function applySettings(settings) {
  const safeSettings = {
    ...DEFAULT_SETTINGS,
    ...(
      settings || {}
    )
  };

  const accent =
    getAccentColor(
      safeSettings
        .accentColor
    );

  document
    .documentElement
    .style
    .setProperty(
      "--qsm-accent",
      accent
    );

  document.body.dataset.qsmTheme =
    safeSettings.theme ||
    "dark";

  localStorage.setItem(
    "qsm_theme",
    safeSettings.theme ||
    "dark"
  );

  localStorage.setItem(
    "qsm_accent",
    safeSettings
      .accentColor ||
    "cyan"
  );

  localStorage.setItem(
    "qsm_language",
    safeSettings.language ||
    "es"
  );

  localStorage.setItem(
    "qsm_settings",
    JSON.stringify(
      safeSettings
    )
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
      ? "230px minmax(0, 1fr)"
      : "280px minmax(0, 1fr)",

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