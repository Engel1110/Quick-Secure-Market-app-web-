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

function Dashboard() {
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
            <header className="qsm-dashboard-v3-header">
              <div className="qsm-dashboard-v3-title-block">
                <h1>
                  Hola, {displayFirstName}
                  <span aria-hidden="true"> 👋</span>
                </h1>

                <strong>Resumen de actividades</strong>

                <p>
                  Consulta tu perfil, operaciones de venta, compras,
                  productos, seguridad y estadísticas desde un solo lugar.
                </p>
              </div>

              <button
                type="button"
                className="qsm-dashboard-v3-refresh"
                onClick={() => loadDashboard(false)}
                disabled={loading || refreshing}
              >
                {refreshing ? "Actualizando..." : "↻ Actualizar datos"}
              </button>
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
                tone="cyan"
              />

              <QsmStatCard
                icon="🛒"
                title="Compras"
                value={stats.purchases}
                text="Órdenes registradas"
                tone="blue"
              />

              <QsmStatCard
                icon="$"
                title="Ventas"
                value={stats.sales}
                text="Órdenes como vendedor"
                tone="purple"
              />

              <QsmStatCard
                icon="🛡"
                title="Monto protegido"
                value={formatMoney(stats.protectedAmount)}
                text="Operaciones activas QSM"
                tone="orange"
                compact
              />
            </section>

            <section className="qsm-dashboard-v3-upper">
              <article className="qsm-dashboard-v3-card qsm-dashboard-v3-chart-card">
                <div className="qsm-dashboard-v3-card-header">
                  <div>
                    <h2>Resumen de actividades</h2>
                    <p>Resumen de tus operaciones en los últimos 30 días.</p>
                  </div>

                  <span>Últimos 30 días⌄</span>
                </div>

                <QsmActivityChart
                  purchases={recentPurchases}
                  sales={recentSales}
                  disputes={recentDisputes}
                />
              </article>

              <article className="qsm-dashboard-v3-card qsm-dashboard-v3-quick-card">
                <div className="qsm-dashboard-v3-card-header">
                  <div>
                    <h2>Resumen rápido</h2>
                  </div>
                </div>

                <QsmQuickMetric
                  icon="♡"
                  label="Favoritos"
                  value={stats.favorites}
                  tone="purple"
                />

                <QsmQuickMetric
                  icon="💬"
                  label="Mensajes sin leer"
                  value={stats.messages}
                  tone="blue"
                />

                <QsmQuickMetric
                  icon="⚖"
                  label="Disputas abiertas"
                  value={stats.disputes}
                  tone="red"
                />

                <QsmQuickMetric
                  icon="🛡"
                  label="Confianza QSM"
                  value={`${trustScore}/100`}
                  tone="cyan"
                />

                <Link
                  to="/profile"
                  className="qsm-dashboard-v3-outline-button"
                >
                  Ver mi perfil completo
                </Link>
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

            <section className="qsm-dashboard-v3-actions-card">
              <form
                onSubmit={handleSearch}
                className="qsm-dashboard-v3-market-search"
              >
                <span aria-hidden="true">⌕</span>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar productos en Marketplace..."
                  aria-label="Buscar productos en Marketplace"
                />

                <button type="submit">Buscar</button>
              </form>

              <nav className="qsm-dashboard-v3-actions">
                <Link to="/marketplace" className="primary">
                  ▣ Ir al Marketplace
                </Link>

                <Link to="/new-product">
                  ＋ Publicar producto
                </Link>

                <Link to="/sales">
                  ▣ Mis productos
                </Link>

                <Link to="/orders">
                  ▣ Mis pedidos
                </Link>

                <Link to="/complete-profile">
                  🛡 Verificación QSM
                </Link>
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
  compact = false
}) {
  return (
    <article className={`qsm-dashboard-v3-stat tone-${tone}`}>
      <span className="qsm-dashboard-v3-stat-icon">{icon}</span>

      <div>
        <small>{title}</small>
        <strong className={compact ? "compact" : ""}>{value}</strong>
        <p>{text}</p>
      </div>

      <span className="qsm-dashboard-v3-stat-arrow">›</span>
    </article>
  );
}

function QsmQuickMetric({ icon, label, value, tone }) {
  return (
    <div className={`qsm-dashboard-v3-quick-metric tone-${tone}`}>
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

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
                onError={() => setImageFailed(true)}
              />
            ) : (
              initial
            )}
          </div>

          {isVerified && (
            <span className="qsm-dashboard-v3-avatar-check">✓</span>
          )}
        </div>

        <div className="qsm-dashboard-v3-profile-name">
          <h2>Perfil QSM</h2>
          <strong>{fullName}</strong>
          <span className={isVerified ? "verified" : "pending"}>
            {isVerified ? "Usuario verificado" : "Verificación pendiente"}
          </span>
        </div>

        <QsmProgress label="Perfil completado" value={profileCompletion} />
        <QsmProgress label="Confianza QSM" value={trustScore} />

        <div className="qsm-dashboard-v3-profile-meta">
          <div>
            <span>Estado verificación</span>
            <strong>{
              isVerified
                ? "Verificado"
                : formatVerificationStatus(verificationStatus)
            }</strong>
          </div>

          <div>
            <span>Nivel de confianza</span>
            <strong>{formatTrustLevel(trustScore)}</strong>
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
  return (
    <article className="qsm-dashboard-v3-card qsm-dashboard-v3-recent-panel">
      <header>
        <h3>{title}</h3>
        <Link to={linkTo}>{linkText}</Link>
      </header>

      <div className="qsm-dashboard-v3-recent-list">
        {items.length === 0 ? (
          <div className="qsm-dashboard-v3-empty">{emptyText}</div>
        ) : (
          items.slice(0, 3).map(renderItem)
        )}
      </div>

      <Link
        to={footerTo}
        className="qsm-dashboard-v3-outline-button qsm-dashboard-v3-recent-footer"
      >
        {footerText}
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
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="qsm-dashboard-v3-recent-item">
      <div className="qsm-dashboard-v3-recent-thumb">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={title}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span>{fallback}</span>
        )}
      </div>

      <div className="qsm-dashboard-v3-recent-copy">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>

      <span className="qsm-dashboard-v3-recent-status">{status}</span>
    </div>
  );
}

function QsmActivityChart({ purchases, sales, disputes }) {
  const data = useMemo(
    () => buildChartData({ purchases, sales, disputes }),
    [purchases, sales, disputes]
  );

  const hasActivity = data.some(
    (item) =>
      item.purchases > 0 ||
      item.sales > 0 ||
      item.disputes > 0
  );

  if (!hasActivity) {
    return (
      <div className="qsm-dashboard-v3-chart-empty">
        Aún no hay suficiente actividad registrada para generar la gráfica.
      </div>
    );
  }

  const width = 760;
  const height = 260;
  const padding = {
    top: 18,
    right: 20,
    bottom: 34,
    left: 36
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [
      item.purchases,
      item.sales,
      item.disputes
    ])
  );

  const makePoints = (key) =>
    data
      .map((item, index) => {
        const x =
          padding.left +
          (chartWidth * index) /
            Math.max(1, data.length - 1);

        const y =
          padding.top +
          chartHeight -
          (item[key] / maxValue) * chartHeight;

        return `${x},${y}`;
      })
      .join(" ");

  return (
    <>
      <div className="qsm-dashboard-v3-chart-legend">
        <span><i className="purchases" />Compras</span>
        <span><i className="sales" />Ventas</span>
        <span><i className="disputes" />Reclamos</span>
      </div>

      <div className="qsm-dashboard-v3-chart-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Resumen de actividad de los últimos 30 días"
        >
          {[0, 1, 2, 3, 4].map((step) => {
            const y = padding.top + (chartHeight * step) / 4;
            const value = Math.round(
              maxValue - (maxValue * step) / 4
            );

            return (
              <g key={step}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  className="qsm-dashboard-v3-grid-line"
                />

                <text
                  x="4"
                  y={y + 3}
                  className="qsm-dashboard-v3-axis-label"
                >
                  {value}
                </text>
              </g>
            );
          })}

          <polyline
            points={makePoints("purchases")}
            className="qsm-dashboard-v3-line purchases"
          />

          <polyline
            points={makePoints("sales")}
            className="qsm-dashboard-v3-line sales"
          />

          <polyline
            points={makePoints("disputes")}
            className="qsm-dashboard-v3-line disputes"
          />

          {data.map((item, index) => {
            const x =
              padding.left +
              (chartWidth * index) /
                Math.max(1, data.length - 1);

            return (
              <text
                key={item.label}
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="qsm-dashboard-v3-axis-label"
              >
                {item.label}
              </text>
            );
          })}
        </svg>
      </div>
    </>
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

function buildChartData({ purchases, sales, disputes }) {
  const now = new Date();

  const buckets =
    Array.from(
      { length: 7 },
      (_, index) => {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(
          start.getDate() -
          (6 - index) * 5
        );

        const end = new Date(start);
        end.setDate(end.getDate() + 5);

        return {
          start,
          end,
          label:
            new Intl.DateTimeFormat(
              "es-DO",
              {
                day: "2-digit",
                month: "short"
              }
            ).format(start),
          purchases: 0,
          sales: 0,
          disputes: 0
        };
      }
    );

  const addItems = (items, key) => {
    (Array.isArray(items) ? items : [])
      .forEach((item) => {
        const date =
          new Date(
            item?.createdAt ||
            item?.updatedAt ||
            0
          );

        if (Number.isNaN(date.getTime())) {
          return;
        }

        const bucket =
          buckets.find(
            (entry) =>
              date >= entry.start &&
              date < entry.end
          );

        if (bucket) {
          bucket[key] += 1;
        }
      });
  };

  addItems(purchases, "purchases");
  addItems(sales, "sales");
  addItems(disputes, "disputes");

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
        overflow-x: auto;
      }

      .qsm-dashboard-v3-chart-wrap svg {
        min-width: 560px;
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