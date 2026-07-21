/*
|--------------------------------------------------------------------------
| Sales.jsx — ENTREGA 1 DE 3
|--------------------------------------------------------------------------
| Incluye imports, estados, hooks, carga de datos, Sidebar/Topbar/Settings,
| dashboard, estadísticas, filtros, tabs y render principal.
|
| La Entrega 2 agrega SaleOrderCard, SellerProductCard y modales.
|--------------------------------------------------------------------------
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

const ACTIVE_SALE_STATUSES = [
  "PENDING",
  "WAITING_PAYMENT",
  "PAYMENT_UNDER_REVIEW",
  "PAYMENT_CONFIRMED",
  "WAITING_SELLER",
  "WAITING_WAREHOUSE",
  "IN_WAREHOUSE",
  "UNDER_INSPECTION",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "WAITING_PIN",
  "DELIVERED",
  "DISPUTED"
];

const ORDER_FILTERS = [
  ["ALL", "Todos los estados"],
  ["PENDING", "Pendiente"],
  ["WAITING_PAYMENT", "Esperando pago"],
  ["PAYMENT_UNDER_REVIEW", "Pago en revisión"],
  ["PAYMENT_CONFIRMED", "Pago confirmado"],
  ["WAITING_SELLER", "Acción del vendedor"],
  ["WAITING_WAREHOUSE", "Esperando almacén"],
  ["IN_WAREHOUSE", "En almacén"],
  ["UNDER_INSPECTION", "En inspección"],
  ["READY_FOR_PICKUP", "Listo para entregar"],
  ["OUT_FOR_DELIVERY", "En delivery"],
  ["WAITING_PIN", "Esperando PIN"],
  ["DELIVERED", "Entregado"],
  ["COMPLETED", "Completado"],
  ["DISPUTED", "En reclamo"],
  ["CANCELLED", "Cancelado"],
  ["REFUNDED", "Reembolsado"],
  ["REJECTED", "Rechazado"]
];

const PRODUCT_FILTERS = [
  ["ALL", "Todos los productos"],
  ["ACTIVE", "Activos"],
  ["PENDING", "Pendientes"],
  ["SOLD", "Vendidos"],
  ["DISABLED", "Desactivados"]
];

const DEFAULT_VISUAL_SETTINGS = {
  appearance: "dark",
  accentColor: "#35d0c3",
  density: "comfortable",
  animations: true,
  glassEffect: true,
  showHero: true,
  showStats: true,
  showQuickSummary: true,
  reducedMotion: false
};

function Sales() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = useMemo(() => readCurrentUser(), []);
  const currentUserId =
    currentUser?._id || currentUser?.id || currentUser?.userId || "";

  const initialUrlState = useMemo(
    () => readSalesUrlState(location.search),
    []
  );

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  const [activeView, setActiveView] = useState(initialUrlState.view);
  const [orderStatusFilter, setOrderStatusFilter] = useState(
    initialUrlState.orderStatus
  );
  const [productStatusFilter, setProductStatusFilter] = useState(
    initialUrlState.productStatus
  );
  const [search, setSearch] = useState(initialUrlState.search);
  const [sortBy, setSortBy] = useState(initialUrlState.sort);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);

  const [cancelModal, setCancelModal] = useState({
    open: false,
    order: null
  });
  const [cancelReason, setCancelReason] = useState("");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    readSidebarCollapsed
  );
  const [visualSettings, setVisualSettings] = useState(
    readVisualSettings
  );

  const isLight = visualSettings.appearance === "light";
  const accent = normalizeAccent(visualSettings.accentColor);

  useEffect(() => {
    const state = readSalesUrlState(location.search);

    setActiveView(state.view);
    setOrderStatusFilter(state.orderStatus);
    setProductStatusFilter(state.productStatus);
    setSearch(state.search);
    setSortBy(state.sort);
  }, [location.search]);

  useEffect(() => {
    const handleSidebar = (event) => {
      const collapsed = event?.detail?.collapsed;
      setSidebarCollapsed(
        typeof collapsed === "boolean"
          ? collapsed
          : readSidebarCollapsed()
      );
    };

    const handleSettings = () => {
      setVisualSettings(readVisualSettings());
    };

    const handleStorage = (event) => {
      if (event?.key === "qsm_sidebar_collapsed") {
        setSidebarCollapsed(readSidebarCollapsed());
      }

      if (isVisualSettingsKey(event?.key)) {
        handleSettings();
      }
    };

    window.addEventListener("qsm-sidebar-changed", handleSidebar);
    window.addEventListener("qsm-settings-changed", handleSettings);
    window.addEventListener("qsm-theme-changed", handleSettings);
    window.addEventListener("qsm-appearance-changed", handleSettings);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("qsm-sidebar-changed", handleSidebar);
      window.removeEventListener("qsm-settings-changed", handleSettings);
      window.removeEventListener("qsm-theme-changed", handleSettings);
      window.removeEventListener("qsm-appearance-changed", handleSettings);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const loadSellerOrders = async () => {
    try {
      return await api.get("/orders/my-sales");
    } catch (requestError) {
      if (requestError?.response?.status !== 404) {
        throw requestError;
      }

      return api.get("/orders/my-orders");
    }
  };

  const loadSalesData = useCallback(
    async ({ initial = false } = {}) => {
      try {
        initial ? setLoading(true) : setRefreshing(true);

        setError("");
        setWarnings([]);

        const [ordersResult, productsResult] = await Promise.allSettled([
          loadSellerOrders(),
          api.get("/products/my-products")
        ]);

        const newWarnings = [];

        const rawOrders =
          ordersResult.status === "fulfilled"
            ? extractArray(ordersResult.value?.data, [
                "orders",
                "sales",
                "mySales",
                "myOrders",
                "data"
              ])
            : [];

        const rawProducts =
          productsResult.status === "fulfilled"
            ? extractArray(productsResult.value?.data, [
                "products",
                "myProducts",
                "data"
              ])
            : [];

        if (ordersResult.status === "rejected") {
          newWarnings.push(
            ordersResult.reason?.response?.data?.message ||
              "No fue posible consultar las órdenes de venta."
          );
        }

        if (productsResult.status === "rejected") {
          newWarnings.push(
            productsResult.reason?.response?.data?.message ||
              "No fue posible consultar tus publicaciones."
          );
        }

        setOrders(
          rawOrders
            .filter((order) => isSellerOrder(order, currentUserId))
            .map(normalizeOrder)
            .filter(Boolean)
        );

        setProducts(
          rawProducts
            .filter((product) => isSellerProduct(product, currentUserId))
            .map(normalizeProduct)
            .filter(Boolean)
        );

        setWarnings(newWarnings);

        if (
          ordersResult.status === "rejected" &&
          productsResult.status === "rejected"
        ) {
          setError(
            "No se pudieron cargar las ventas ni los productos publicados."
          );
        }
      } catch (requestError) {
        console.error("Error cargando Centro de Ventas:", requestError);

        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "No se pudo cargar el Centro de Ventas."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUserId]
  );

  useEffect(() => {
    loadSalesData({ initial: true });
  }, [loadSalesData]);

  const updateUrl = (overrides = {}) => {
    const values = {
      view: activeView,
      orderStatus: orderStatusFilter,
      productStatus: productStatusFilter,
      search,
      sort: sortBy,
      ...overrides
    };

    const params = new URLSearchParams();
    params.set("view", values.view);

    if (values.view === "orders" && values.orderStatus !== "ALL") {
      params.set("status", values.orderStatus);
    }

    if (values.view === "products" && values.productStatus !== "ALL") {
      params.set("productStatus", values.productStatus);
    }

    if (String(values.search || "").trim()) {
      params.set("search", String(values.search).trim());
    }

    if (values.sort !== "recent") {
      params.set("sort", values.sort);
    }

    navigate(`/sales?${params.toString()}`, { replace: true });
  };

  const changeView = (view) => {
    setActiveView(view);
    setError("");
    setMessage("");

    updateUrl({
      view,
      orderStatus: "ALL",
      productStatus: "ALL"
    });
  };

  const clearFilters = () => {
    setSearch("");
    setSortBy("recent");
    setOrderStatusFilter("ALL");
    setProductStatusFilter("ALL");

    navigate(`/sales?view=${activeView}`, { replace: true });
  };

  const filteredOrders = useMemo(() => {
    const term = normalizeSearch(search);

    const result = orders.filter((order) => {
      const status = normalizeStatus(order?.status);
      const product = order?.product || {};
      const buyer = order?.buyer || {};

      const matchesStatus =
        orderStatusFilter === "ALL" || status === orderStatusFilter;

      const searchable = normalizeSearch(
        [
          getOrderId(order),
          order?.orderCode,
          product?.title,
          product?.category,
          buyer?.firstName,
          buyer?.lastName,
          buyer?.email,
          order?.paymentMethod,
          order?.deliveryMethod,
          status
        ]
          .filter(Boolean)
          .join(" ")
      );

      return matchesStatus && (!term || searchable.includes(term));
    });

    result.sort(getOrderSortFunction(sortBy));

    return result;
  }, [orders, search, orderStatusFilter, sortBy]);

  const filteredProducts = useMemo(() => {
    const term = normalizeSearch(search);

    const result = products.filter((product) => {
      const status = normalizeStatus(product?.status);

      const matchesStatus =
        productStatusFilter === "ALL" || status === productStatusFilter;

      const searchable = normalizeSearch(
        [
          product?._id,
          product?.title,
          product?.category,
          product?.description,
          product?.condition,
          product?.location,
          product?.brand,
          product?.model,
          status
        ]
          .filter(Boolean)
          .join(" ")
      );

      return matchesStatus && (!term || searchable.includes(term));
    });

    result.sort(getProductSortFunction(sortBy));

    return result;
  }, [products, search, productStatusFilter, sortBy]);

  const stats = useMemo(() => {
    const activeOrders = orders.filter((order) =>
      ACTIVE_SALE_STATUSES.includes(normalizeStatus(order?.status))
    );

    const completedOrders = orders.filter((order) =>
      ["COMPLETED", "DELIVERED"].includes(
        normalizeStatus(order?.status)
      )
    );

    const disputedOrders = orders.filter(
      (order) => normalizeStatus(order?.status) === "DISPUTED"
    );

    const protectedOrders = orders.filter((order) => {
      const escrowStatus = normalizeStatus(order?.escrowStatus);

      return (
        ["HELD", "FUNDED", "UNDER_REVIEW", "READY_TO_RELEASE"].includes(
          escrowStatus
        ) ||
        !["CANCELLED", "REJECTED", "REFUNDED"].includes(
          normalizeStatus(order?.status)
        )
      );
    });

    return {
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length,
      disputedOrders: disputedOrders.length,
      activeProducts: products.filter(
        (product) => normalizeStatus(product?.status) === "ACTIVE"
      ).length,
      soldProducts: products.filter(
        (product) => normalizeStatus(product?.status) === "SOLD"
      ).length,
      completedAmount: completedOrders.reduce(
        (total, order) => total + getOrderAmount(order),
        0
      ),
      protectedAmount: protectedOrders.reduce(
        (total, order) => total + getOrderAmount(order),
        0
      )
    };
  }, [orders, products]);

  const quickSummary = useMemo(
    () => ({
      actionRequired: orders.filter((order) =>
        ["PAYMENT_CONFIRMED", "WAITING_SELLER"].includes(
          normalizeStatus(order?.status)
        )
      ).length,

      warehouse: orders.filter((order) =>
        ["WAITING_WAREHOUSE", "IN_WAREHOUSE", "UNDER_INSPECTION"].includes(
          normalizeStatus(order?.status)
        )
      ).length,

      deliveries: orders.filter((order) =>
        ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "WAITING_PIN"].includes(
          normalizeStatus(order?.status)
        )
      ).length
    }),
    [orders]
  );

  const goToTracking = (order) => {
    const orderId = getOrderId(order);

    if (!orderId) {
      setError("La venta no tiene un identificador válido.");
      return;
    }

    navigate(`/orders/${orderId}`, {
      state: {
        order,
        role: "seller"
      }
    });
  };

  const openCancelModal = (order) => {
    setError("");
    setMessage("");
    setCancelReason("");
    setCancelModal({ open: true, order });
  };

  const cssVariables = {
    "--sales-accent": accent,
    "--sales-accent-soft": hexToRgba(accent, 0.14),
    "--sales-accent-border": hexToRgba(accent, 0.38),
    "--sales-card": isLight
      ? "rgba(255,255,255,.90)"
      : "rgba(15,23,42,.76)",
    "--sales-text": isLight ? "#0f172a" : "#f8fafc",
    "--sales-muted": isLight ? "#64748b" : "#94a3b8",
    "--sales-border": isLight
      ? "rgba(15,23,42,.12)"
      : "rgba(148,163,184,.15)"
  };

  return (
    <div style={{ ...salesPage(isLight, accent), ...cssVariables }}>
      <style>{buildSalesCss(visualSettings)}</style>

      <div
        className="sales-layout"
        style={salesLayout(sidebarCollapsed)}
      >
        <div className="sales-sidebar">
          <Sidebar />
        </div>

        <main
          className="sales-main"
          style={salesMain(visualSettings)}
        >
          <Topbar />

          {visualSettings.showHero && (
            <section className="sales-hero" style={salesHero}>
              <div>
                <p style={salesEyebrow}>CENTRO DE VENTAS QSM</p>

                <h1 style={salesTitle}>
                  Gestiona tus{" "}
                  <span style={salesGradientText}>ventas</span>
                </h1>

                <p style={salesSubtitle}>
                  Revisa órdenes, publicaciones, fondos protegidos, entregas,
                  almacén y acciones pendientes desde un solo lugar.
                </p>
              </div>

              <div style={salesHeroActions}>
                <button
                  type="button"
                  onClick={() => loadSalesData()}
                  disabled={loading || refreshing}
                  style={salesOutlineButton}
                >
                  {refreshing ? "Actualizando..." : "Actualizar"}
                </button>

                <Link to="/new-product" style={salesPrimaryButton}>
                  + Publicar producto
                </Link>
              </div>
            </section>
          )}

          {visualSettings.showStats && (
            <section className="sales-stats" style={salesStatsGrid}>
              <StatCard
                icon="💰"
                title="Ingresos completados"
                value={formatMoney(stats.completedAmount)}
                text="Monto de ventas finalizadas."
              />

              <StatCard
                icon="🛡"
                title="Fondos protegidos"
                value={formatMoney(stats.protectedAmount)}
                text="Valor retenido o protegido por QSM."
              />

              <StatCard
                icon="📋"
                title="Ventas activas"
                value={stats.activeOrders}
                text="Operaciones actualmente en proceso."
              />

              <StatCard
                icon="📦"
                title="Productos activos"
                value={stats.activeProducts}
                text="Publicaciones disponibles."
              />

              <StatCard
                icon="✅"
                title="Productos vendidos"
                value={stats.soldProducts}
                text="Publicaciones marcadas como vendidas."
              />

              <StatCard
                icon="⚠"
                title="Reclamos abiertos"
                value={stats.disputedOrders}
                text="Operaciones actualmente en disputa."
              />
            </section>
          )}

          {visualSettings.showQuickSummary && (
            <section
              className="sales-quick-summary"
              style={quickSummaryGrid}
            >
              <QuickSummaryCard
                icon="🔔"
                title="Acción requerida"
                value={quickSummary.actionRequired}
                text="Ventas que esperan una respuesta tuya."
                tone="warning"
              />

              <QuickSummaryCard
                icon="🏬"
                title="En almacén"
                value={quickSummary.warehouse}
                text="Productos en recepción o inspección."
                tone="info"
              />

              <QuickSummaryCard
                icon="🚚"
                title="En logística"
                value={quickSummary.deliveries}
                text="Órdenes listas o en proceso de entrega."
                tone="success"
              />
            </section>
          )}

          <section style={salesControlPanel}>
            <div className="sales-tabs" style={salesTabs}>
              <button
                type="button"
                onClick={() => changeView("orders")}
                style={
                  activeView === "orders"
                    ? salesActiveTab
                    : salesTab
                }
              >
                🧾 Órdenes de venta
              </button>

              <button
                type="button"
                onClick={() => changeView("products")}
                style={
                  activeView === "products"
                    ? salesActiveTab
                    : salesTab
                }
              >
                📦 Productos publicados
              </button>
            </div>

            <form
              className="sales-filters"
              onSubmit={(event) => {
                event.preventDefault();
                updateUrl();
              }}
              style={salesFilters}
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  activeView === "orders"
                    ? "Buscar por producto, comprador u orden..."
                    : "Buscar publicación por título, categoría o marca..."
                }
                style={salesSearchInput}
              />

              {activeView === "orders" ? (
                <select
                  value={orderStatusFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    setOrderStatusFilter(value);
                    updateUrl({
                      view: "orders",
                      orderStatus: value
                    });
                  }}
                  style={salesSelect}
                >
                  {ORDER_FILTERS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={productStatusFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    setProductStatusFilter(value);
                    updateUrl({
                      view: "products",
                      productStatus: value
                    });
                  }}
                  style={salesSelect}
                >
                  {PRODUCT_FILTERS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={sortBy}
                onChange={(event) => {
                  const value = event.target.value;
                  setSortBy(value);
                  updateUrl({ sort: value });
                }}
                style={salesSelect}
              >
                <option value="recent">Más recientes</option>
                <option value="oldest">Más antiguas</option>
                <option value="amount-high">Mayor monto</option>
                <option value="amount-low">Menor monto</option>
              </select>

              <button
                type="button"
                onClick={clearFilters}
                style={salesClearButton}
              >
                Limpiar
              </button>
            </form>
          </section>

          {warnings.length > 0 && (
            <div style={salesWarningBox}>
              <strong>Algunas áreas no pudieron cargarse</strong>

              {warnings.map((warning, index) => (
                <p key={`${warning}-${index}`}>{warning}</p>
              ))}
            </div>
          )}

          {message && <div style={salesSuccessBox}>{message}</div>}
          {error && <div style={salesErrorBox}>{error}</div>}

          {loading && <SalesLoadingState />}

          {!loading &&
            activeView === "orders" &&
            filteredOrders.length === 0 && (
              <SalesEmptyState
                icon="🧾"
                title="No hay ventas para mostrar"
                text="Todavía no tienes ventas o los filtros no encontraron resultados."
                actionLabel="Publicar producto"
                actionTo="/new-product"
              />
            )}

          {!loading &&
            activeView === "products" &&
            filteredProducts.length === 0 && (
              <SalesEmptyState
                icon="📦"
                title="No hay productos publicados"
                text="Publica tu primer producto para iniciar tu historial."
                actionLabel="Crear publicación"
                actionTo="/new-product"
              />
            )}

          {!loading &&
            activeView === "orders" &&
            filteredOrders.length > 0 && (
              <section className="sales-list" style={salesCardsGrid}>
                {filteredOrders.map((order, index) => (
                  <SaleOrderCard
                    key={getOrderId(order) || index}
                    order={order}
                    actionLoading={actionLoading}
                    onTracking={goToTracking}
                    onCancel={openCancelModal}
                  />
                ))}
              </section>
            )}

          {!loading &&
            activeView === "products" &&
            filteredProducts.length > 0 && (
              <section className="sales-list" style={salesCardsGrid}>
                {filteredProducts.map((product, index) => (
                  <SellerProductCard
                    key={product?._id || product?.id || index}
                    product={product}
                    actionLoading={actionLoading}
                    setActionLoading={setActionLoading}
                    onRefresh={loadSalesData}
                    onMessage={setMessage}
                    onError={setError}
                  />
                ))}
              </section>
            )}
        </main>
      </div>

      <AiAssistant pageContext="sales" />

      {cancelModal.open && (
        <CancelSaleModal
          order={cancelModal.order}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          actionLoading={actionLoading}
          onClose={() => {
            if (!actionLoading) {
              setCancelModal({
                open: false,
                order: null
              });
              setCancelReason("");
            }
          }}
          onConfirm={() => {}}
        />
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Componentes básicos incluidos en Entrega 1
|--------------------------------------------------------------------------
*/

function StatCard({ icon, title, value, text }) {
  return (
    <article style={statCard}>
      <div style={statIcon}>{icon}</div>

      <div>
        <span style={statLabel}>{title}</span>
        <strong style={statValue}>{value}</strong>
        <p style={statText}>{text}</p>
      </div>
    </article>
  );
}

function QuickSummaryCard({ icon, title, value, text, tone }) {
  return (
    <article style={quickSummaryCard(tone)}>
      <div style={quickSummaryIcon}>{icon}</div>

      <div>
        <strong>{title}</strong>
        <h3>{value}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

function SalesLoadingState() {
  return (
    <div style={salesCenterCard}>
      <div style={salesCenterIcon}>💰</div>
      <h2>Cargando tu Centro de Ventas</h2>
      <p>QSM está consultando tus órdenes y publicaciones.</p>
    </div>
  );
}

function SalesEmptyState({
  icon,
  title,
  text,
  actionLabel,
  actionTo
}) {
  return (
    <div style={salesCenterCard}>
      <div style={salesCenterIcon}>{icon}</div>
      <h2>{title}</h2>
      <p>{text}</p>

      <Link to={actionTo} style={salesPrimaryButton}>
        {actionLabel}
      </Link>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Helpers incluidos en Entrega 1
|--------------------------------------------------------------------------
*/

function readCurrentUser() {
  return (
    safeJson(localStorage.getItem("qsm_user")) ||
    safeJson(sessionStorage.getItem("qsm_user")) ||
    safeJson(localStorage.getItem("user")) ||
    safeJson(sessionStorage.getItem("user")) ||
    {}
  );
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function extractArray(source, keys = []) {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== "object") return [];

  for (const key of keys) {
    if (Array.isArray(source?.[key])) {
      return source[key];
    }
  }

  return [];
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function normalizeSearch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isSellerOrder(order, currentUserId) {
  const sellerId =
    order?.seller?._id ||
    order?.seller?.id ||
    order?.seller ||
    order?.product?.seller?._id ||
    order?.product?.seller?.id ||
    order?.product?.seller ||
    order?.sellerId ||
    "";

  return !currentUserId || String(sellerId) === String(currentUserId);
}

function isSellerProduct(product, currentUserId) {
  const sellerId =
    product?.seller?._id ||
    product?.seller?.id ||
    product?.seller ||
    product?.sellerId ||
    "";

  return !currentUserId || String(sellerId) === String(currentUserId);
}

function normalizeOrder(order) {
  return order && typeof order === "object"
    ? {
        ...order,
        status: normalizeStatus(order?.status),
        paymentStatus: normalizeStatus(
          order?.paymentStatus || "PENDING"
        ),
        escrowStatus: normalizeStatus(
          order?.escrowStatus || "NOT_FUNDED"
        )
      }
    : null;
}

function normalizeProduct(product) {
  return product && typeof product === "object"
    ? {
        ...product,
        status: normalizeStatus(product?.status || "ACTIVE")
      }
    : null;
}

function getOrderId(order) {
  return order?._id || order?.id || order?.orderId || "";
}

function getOrderAmount(order) {
  return Number(
    order?.totalAmount ||
      order?.amount ||
      order?.price ||
      order?.product?.price ||
      0
  );
}

function getTimestamp(item) {
  const value = new Date(
    item?.updatedAt || item?.createdAt || 0
  ).getTime();

  return Number.isFinite(value) ? value : 0;
}

function getOrderSortFunction(sort) {
  if (sort === "oldest") {
    return (a, b) => getTimestamp(a) - getTimestamp(b);
  }

  if (sort === "amount-high") {
    return (a, b) => getOrderAmount(b) - getOrderAmount(a);
  }

  if (sort === "amount-low") {
    return (a, b) => getOrderAmount(a) - getOrderAmount(b);
  }

  return (a, b) => getTimestamp(b) - getTimestamp(a);
}

function getProductSortFunction(sort) {
  if (sort === "oldest") {
    return (a, b) => getTimestamp(a) - getTimestamp(b);
  }

  if (sort === "amount-high") {
    return (a, b) => Number(b?.price || 0) - Number(a?.price || 0);
  }

  if (sort === "amount-low") {
    return (a, b) => Number(a?.price || 0) - Number(b?.price || 0);
  }

  return (a, b) => getTimestamp(b) - getTimestamp(a);
}

function formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "RD$ 0";

  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(number);
}

function readSalesUrlState(searchString) {
  const params = new URLSearchParams(searchString);

  const view =
    params.get("view") === "products" ? "products" : "orders";

  return {
    view,
    orderStatus: params.get("status") || "ALL",
    productStatus: params.get("productStatus") || "ALL",
    search: params.get("search") || "",
    sort: params.get("sort") || "recent"
  };
}

function storageValue(key) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function readSidebarCollapsed() {
  return storageValue("qsm_sidebar_collapsed") === "true";
}

function readVisualSettings() {
  const settings =
    safeJson(storageValue("qsm_settings")) ||
    safeJson(storageValue("qsm_user_settings")) ||
    safeJson(storageValue("qsm_preferences")) ||
    {};

  const sales =
    settings?.sales ||
    settings?.sellerCenter ||
    settings?.visual?.sales ||
    {};

  return {
    ...DEFAULT_VISUAL_SETTINGS,
    ...sales,
    appearance: String(
      sales?.appearance ||
        settings?.appearance ||
        storageValue("qsm_appearance") ||
        storageValue("qsm_theme") ||
        "dark"
    )
      .toLowerCase()
      .includes("light")
      ? "light"
      : "dark",

    accentColor: normalizeAccent(
      sales?.accentColor ||
        settings?.accentColor ||
        settings?.accent ||
        storageValue("qsm_accent_color") ||
        "#35d0c3"
    )
  };
}

function isVisualSettingsKey(key) {
  return [
    "qsm_settings",
    "qsm_user_settings",
    "qsm_preferences",
    "qsm_appearance",
    "qsm_theme",
    "qsm_accent",
    "qsm_accent_color"
  ].includes(String(key || ""));
}

function normalizeAccent(value) {
  const colors = {
    cyan: "#35d0c3",
    purple: "#8b5cf6",
    pink: "#ec4899",
    blue: "#38bdf8",
    green: "#22c55e",
    orange: "#f59e0b"
  };

  const candidate = String(value || "").trim();

  if (/^#[0-9a-f]{6}$/i.test(candidate)) {
    return candidate;
  }

  return colors[candidate.toLowerCase()] || "#35d0c3";
}

function hexToRgba(hex, alpha) {
  const value = Number.parseInt(String(hex).replace("#", ""), 16);

  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${
    value & 255
  },${alpha})`;
}

/*
|--------------------------------------------------------------------------
| CSS y estilos base
|--------------------------------------------------------------------------
*/

function buildSalesCss(settings) {
  const noMotion =
    settings?.reducedMotion || settings?.animations === false;

  return `
    * { box-sizing: border-box; }

    html, body, #root {
      width: 100%;
      min-height: 100%;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
    }

    input, select, textarea, button, a {
      font-family: inherit;
    }

    button, a {
      transition: ${
        noMotion
          ? "none"
          : "transform .24s ease, opacity .24s ease, background .24s ease"
      };
    }

    button:hover, a:hover {
      transform: ${noMotion ? "none" : "translateY(-2px)"};
    }

    button:disabled {
      opacity: .58;
      cursor: not-allowed;
      transform: none !important;
    }

    @media (max-width: 1240px) {
      .sales-layout { grid-template-columns: 1fr !important; }
      .sales-sidebar { display: none !important; }
      .sales-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      .sales-filters { grid-template-columns: 1fr 1fr !important; }
    }

    @media (max-width: 760px) {
      .sales-main { padding: 18px 14px 58px !important; }
      .sales-hero,
      .sales-stats,
      .sales-quick-summary,
      .sales-tabs,
      .sales-filters,
      .sales-list {
        grid-template-columns: 1fr !important;
      }
    }
  `;
}

const salesPage = (light, accent) => ({
  width: "100%",
  minHeight: "100vh",
  color: "var(--sales-text)",
  background: light
    ? `radial-gradient(circle at 88% 5%, ${hexToRgba(
        accent,
        0.12
      )}, transparent 30%), #edf4ff`
    : `radial-gradient(circle at 88% 5%, rgba(139,92,246,.16), transparent 31%),
       radial-gradient(circle at 12% 10%, ${hexToRgba(
         accent,
         0.10
       )}, transparent 27%), #020617`
});

const salesLayout = (collapsed) => ({
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: collapsed
    ? "96px minmax(0, 1fr)"
    : "300px minmax(0, 1fr)",
  overflowX: "hidden",
  transition: "grid-template-columns .28s ease"
});

const salesMain = (settings) => ({
  minWidth: 0,
  minHeight: "100vh",
  padding:
    settings?.density === "compact"
      ? "20px 24px 48px"
      : "26px 34px 58px",
  overflowX: "hidden"
});

const salesHero = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "end",
  gap: "20px",
  margin: "20px 0 22px",
  padding: "26px",
  borderRadius: "28px",
  border: "1px solid var(--sales-border)",
  background: "var(--sales-card)"
};

const salesHeroActions = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: "10px"
};

const salesEyebrow = {
  margin: 0,
  color: "var(--sales-accent)",
  fontSize: "9px",
  fontWeight: "950",
  letterSpacing: "3px"
};

const salesTitle = {
  margin: "8px 0",
  fontSize: "clamp(38px, 4vw, 62px)",
  lineHeight: "1.02",
  letterSpacing: "-2px"
};

const salesGradientText = {
  background:
    "linear-gradient(90deg, var(--sales-accent), #38bdf8, #8b5cf6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent"
};

const salesSubtitle = {
  maxWidth: "780px",
  margin: 0,
  color: "var(--sales-muted)",
  fontSize: "13px",
  lineHeight: "22px"
};

const salesStatsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "13px",
  marginBottom: "15px"
};

const statCard = {
  display: "grid",
  gridTemplateColumns: "48px minmax(0, 1fr)",
  gap: "12px",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid var(--sales-border)",
  background: "var(--sales-card)"
};

const statIcon = {
  width: "48px",
  height: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "14px",
  background: "var(--sales-accent-soft)",
  fontSize: "21px"
};

const statLabel = {
  display: "block",
  color: "var(--sales-muted)",
  fontSize: "9px"
};

const statValue = {
  display: "block",
  marginTop: "4px",
  fontSize: "21px"
};

const statText = {
  margin: "5px 0 0",
  color: "var(--sales-muted)",
  fontSize: "8px"
};

const quickSummaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "16px"
};

const quickSummaryCard = (tone) => ({
  display: "grid",
  gridTemplateColumns: "46px minmax(0, 1fr)",
  gap: "11px",
  padding: "15px",
  borderRadius: "17px",
  border:
    tone === "warning"
      ? "1px solid rgba(245,158,11,.28)"
      : tone === "success"
      ? "1px solid rgba(34,197,94,.28)"
      : "1px solid rgba(56,189,248,.28)",
  background:
    tone === "warning"
      ? "rgba(245,158,11,.10)"
      : tone === "success"
      ? "rgba(34,197,94,.10)"
      : "rgba(56,189,248,.10)"
});

const quickSummaryIcon = {
  width: "46px",
  height: "46px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "14px",
  background: "rgba(255,255,255,.07)",
  fontSize: "20px"
};

const salesControlPanel = {
  marginBottom: "17px",
  padding: "15px",
  borderRadius: "20px",
  border: "1px solid var(--sales-border)",
  background: "var(--sales-card)"
};

const salesTabs = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "9px",
  marginBottom: "12px"
};

const salesTab = {
  minHeight: "43px",
  borderRadius: "12px",
  border: "1px solid var(--sales-border)",
  background: "rgba(2,6,23,.18)",
  color: "var(--sales-muted)",
  fontWeight: "900",
  cursor: "pointer"
};

const salesActiveTab = {
  ...salesTab,
  border: "1px solid var(--sales-accent-border)",
  background: "var(--sales-accent-soft)",
  color: "var(--sales-accent)"
};

const salesFilters = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 180px 160px auto",
  gap: "9px"
};

const salesSearchInput = {
  minHeight: "52px",
  padding: "0 12px",
  borderRadius: "14px",
  border: "1px solid var(--sales-border)",
  background: "rgba(2,6,23,.18)",
  color: "var(--sales-text)"
};

const salesSelect = {
  minHeight: "52px",
  padding: "0 12px",
  borderRadius: "14px",
  border: "1px solid var(--sales-border)",
  background: "rgba(2,6,23,.18)",
  color: "var(--sales-text)"
};

const salesClearButton = {
  minHeight: "52px",
  padding: "0 14px",
  borderRadius: "14px",
  border: "1px solid var(--sales-border)",
  background: "rgba(2,6,23,.18)",
  color: "var(--sales-muted)",
  fontWeight: "900",
  cursor: "pointer"
};

const salesCardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "16px"
};

const salesPrimaryButton = {
  minHeight: "44px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 17px",
  border: "none",
  borderRadius: "13px",
  background:
    "linear-gradient(135deg, var(--sales-accent, #35d0c3), #38bdf8, #8b5cf6)",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: "950",
  cursor: "pointer"
};

const salesOutlineButton = {
  minHeight: "44px",
  padding: "10px 17px",
  borderRadius: "13px",
  border: "1px solid var(--sales-border)",
  background: "var(--sales-card)",
  color: "var(--sales-text)",
  fontWeight: "900",
  cursor: "pointer"
};

const salesWarningBox = {
  marginBottom: "14px",
  padding: "13px 15px",
  borderRadius: "14px",
  border: "1px solid rgba(245,158,11,.30)",
  background: "rgba(245,158,11,.10)",
  color: "#fde68a"
};

const salesSuccessBox = {
  marginBottom: "14px",
  padding: "13px 15px",
  borderRadius: "14px",
  border: "1px solid rgba(34,197,94,.30)",
  background: "rgba(34,197,94,.11)",
  color: "#bbf7d0"
};

const salesErrorBox = {
  marginBottom: "14px",
  padding: "13px 15px",
  borderRadius: "14px",
  border: "1px solid rgba(248,113,113,.30)",
  background: "rgba(127,29,29,.18)",
  color: "#fecaca"
};

const salesCenterCard = {
  minHeight: "360px",
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  gap: "9px",
  padding: "28px",
  borderRadius: "23px",
  border: "1px solid var(--sales-border)",
  background: "var(--sales-card)",
  color: "var(--sales-muted)",
  textAlign: "center"
};

const salesCenterIcon = {
  fontSize: "48px"
};

/*
|--------------------------------------------------------------------------
| CONTINÚA EN ENTREGA 2
|--------------------------------------------------------------------------
| Se agregarán:
| - SaleOrderCard
| - SellerProductCard
| - CancelSaleModal
| - Acciones de almacén, delivery, estado y eliminación
|--------------------------------------------------------------------------
*/
/*
|--------------------------------------------------------------------------
| Sales.jsx — ENTREGA 2 DE 3
|--------------------------------------------------------------------------
| PEGA ESTA PARTE INMEDIATAMENTE DEBAJO DE LA ENTREGA 1.
|
| Incluye:
| - SaleOrderCard
| - SellerProductCard
| - CancelSaleModal
| - Acciones de órdenes
| - Acciones de publicaciones
| - Helpers de estados, imágenes, fechas y permisos
| - Estilos de tarjetas y modal
| - Exportación final
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Tarjeta de orden de venta
|--------------------------------------------------------------------------
*/

function SaleOrderCard({
  order,
  actionLoading,
  onTracking,
  onCancel
}) {
  const [expanded, setExpanded] =
    useState(false);

  const [localAction, setLocalAction] =
    useState("");

  const [localMessage, setLocalMessage] =
    useState("");

  const [localError, setLocalError] =
    useState("");

  const orderId =
    getOrderId(order);

  const product =
    order?.product &&
    typeof order.product === "object"
      ? order.product
      : {};

  const buyer =
    order?.buyer &&
    typeof order.buyer === "object"
      ? order.buyer
      : {};

  const productId =
    product?._id ||
    product?.id ||
    order?.productId ||
    "";

  const status =
    normalizeStatus(
      order?.status
    );

  const paymentStatus =
    normalizeStatus(
      order?.paymentStatus
    );

  const escrowStatus =
    normalizeStatus(
      order?.escrowStatus
    );

  const deliveryStatus =
    normalizeStatus(
      order?.deliveryStatus ||
      order?.warehouseStatus
    );

  const statusInfo =
    getOrderStatusInfo(
      status
    );

  const productImage =
    getSalesProductImage(
      product
    );

  const buyerName =
    formatPerson(
      buyer,
      "Comprador QSM"
    );

  const amount =
    getOrderAmount(
      order
    );

  const busy =
    Boolean(
      actionLoading ||
      localAction
    );

  const canSendWarehouse =
    [
      "PAYMENT_CONFIRMED",
      "WAITING_SELLER"
    ].includes(status);

  const canRequestDelivery =
    [
      "PAYMENT_CONFIRMED",
      "WAITING_SELLER",
      "READY_FOR_PICKUP"
    ].includes(status);

  const canCancel =
    ![
      "COMPLETED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
      "REJECTED"
    ].includes(status);

  const runOrderAction =
    async ({
      key,
      endpoint,
      confirmation,
      successMessage
    }) => {
      if (!orderId) {
        setLocalError(
          "La orden no tiene un identificador válido."
        );

        return;
      }

      if (
        confirmation &&
        !window.confirm(
          confirmation
        )
      ) {
        return;
      }

      try {
        setLocalAction(key);
        setLocalError("");
        setLocalMessage("");

        await api.patch(
          endpoint
        );

        setLocalMessage(
          successMessage
        );

        window.setTimeout(
          () => {
            window.location.reload();
          },
          650
        );
      } catch (
        requestError
      ) {
        setLocalError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "No se pudo completar la acción."
        );
      } finally {
        setLocalAction("");
      }
    };

  const sendToWarehouse =
    () =>
      runOrderAction({
        key:
          "warehouse",

        endpoint:
          `/orders/${orderId}/send-to-warehouse`,

        confirmation:
          "¿Confirmas que el producto fue enviado o entregado al almacén QSM?",

        successMessage:
          "El envío al almacén fue registrado correctamente."
      });

  const requestDelivery =
    () =>
      runOrderAction({
        key:
          "delivery",

        endpoint:
          `/orders/${orderId}/request-delivery`,

        confirmation:
          "¿Deseas solicitar un Delivery QSM verificado para esta orden?",

        successMessage:
          "La solicitud de Delivery QSM fue registrada."
      });

  return (
    <article
      className="sale-order-card"
      style={saleOrderCard}
    >
      <div
        style={saleOrderHeader}
      >
        <div
          style={saleOrderIdentity}
        >
          <img
            src={productImage}
            alt={
              product?.title ||
              "Producto QSM"
            }
            style={saleOrderImage}
            onError={
              handleSalesImageError
            }
          />

          <div
            style={{
              minWidth: 0
            }}
          >
            <p
              style={salesCardEyebrow}
            >
              ORDEN{" "}
              {formatOrderReference(
                order
              )}
            </p>

            <h3
              style={salesCardTitle}
            >
              {product?.title ||
                "Producto QSM"}
            </h3>

            <p
              style={salesCardMuted}
            >
              {formatDate(
                order?.createdAt
              )}
            </p>
          </div>
        </div>

        <span
          style={orderStatusBadge(
            statusInfo
          )}
        >
          {statusInfo.icon}{" "}
          {statusInfo.label}
        </span>
      </div>

      <div
        style={saleOrderAmountRow}
      >
        <div>
          <span
            style={salesCardMuted}
          >
            Total de la venta
          </span>

          <strong
            style={saleOrderAmount}
          >
            {formatMoney(
              amount
            )}
          </strong>
        </div>

        <div
          style={saleOrderBuyer}
        >
          <span>
            Comprador
          </span>

          <strong>
            {buyerName}
          </strong>
        </div>
      </div>

      <div
        style={saleOrderProgress}
      >
        <OrderProgressStep
          label="Pago"
          done={
            [
              "PAID",
              "CONFIRMED",
              "VERIFIED",
              "COMPLETED"
            ].includes(
              paymentStatus
            ) ||
            [
              "PAYMENT_CONFIRMED",
              "WAITING_SELLER",
              "WAITING_WAREHOUSE",
              "IN_WAREHOUSE",
              "UNDER_INSPECTION",
              "READY_FOR_PICKUP",
              "OUT_FOR_DELIVERY",
              "WAITING_PIN",
              "DELIVERED",
              "COMPLETED"
            ].includes(
              status
            )
          }
        />

        <OrderProgressStep
          label="Escrow"
          done={
            [
              "HELD",
              "FUNDED",
              "UNDER_REVIEW",
              "READY_TO_RELEASE",
              "RELEASED"
            ].includes(
              escrowStatus
            )
          }
        />

        <OrderProgressStep
          label="Logística"
          done={
            [
              "IN_WAREHOUSE",
              "UNDER_INSPECTION",
              "READY_FOR_PICKUP",
              "OUT_FOR_DELIVERY",
              "WAITING_PIN",
              "DELIVERED",
              "COMPLETED"
            ].includes(
              status
            )
          }
        />

        <OrderProgressStep
          label="Entrega"
          done={
            [
              "DELIVERED",
              "COMPLETED"
            ].includes(
              status
            )
          }
        />
      </div>

      {localMessage && (
        <div
          style={saleLocalSuccess}
        >
          {localMessage}
        </div>
      )}

      {localError && (
        <div
          style={saleLocalError}
        >
          {localError}
        </div>
      )}

      <div
        style={salePrimaryActions}
      >
        <button
          type="button"
          onClick={() =>
            onTracking(
              order
            )
          }
          disabled={busy}
          style={salePrimaryAction}
        >
          Ver seguimiento
        </button>

        <button
          type="button"
          onClick={() =>
            setExpanded(
              (
                current
              ) =>
                !current
            )
          }
          disabled={busy}
          style={saleSecondaryAction}
        >
          {expanded
            ? "Ocultar detalles"
            : "Ver detalles"}
        </button>
      </div>

      {expanded && (
        <div
          style={saleExpandedArea}
        >
          <div
            className="sale-order-detail-grid"
            style={saleDetailGrid}
          >
            <SaleDetail
              label="Pago"
              value={formatPaymentStatus(
                paymentStatus
              )}
            />

            <SaleDetail
              label="Escrow"
              value={formatEscrowStatus(
                escrowStatus
              )}
            />

            <SaleDetail
              label="Entrega"
              value={formatDeliveryStatus(
                deliveryStatus
              )}
            />

            <SaleDetail
              label="Método"
              value={formatDeliveryMethodForSales(
                order
                  ?.deliveryMethod
              )}
            />

            <SaleDetail
              label="Producto"
              value={
                product?.category ||
                "No especificada"
              }
            />

            <SaleDetail
              label="Ubicación"
              value={
                order
                  ?.deliveryAddress
                  ?.city ||
                order
                  ?.deliveryAddress
                  ?.province ||
                product
                  ?.location ||
                "No especificada"
              }
            />
          </div>

          <div
            style={saleSecurityNotice}
          >
            <strong>
              🛡 Operación protegida
            </strong>

            <p>
              Mantén el pago, el chat, la evidencia y la entrega dentro de QSM.
            </p>
          </div>

          <div
            className="sale-order-secondary-actions"
            style={saleSecondaryActions}
          >
            {productId && (
              <Link
                to={`/product/${productId}`}
                style={saleSmallLink}
              >
                Ver producto
              </Link>
            )}

            {canSendWarehouse && (
              <button
                type="button"
                onClick={
                  sendToWarehouse
                }
                disabled={busy}
                style={saleSmallButton}
              >
                {localAction ===
                "warehouse"
                  ? "Registrando..."
                  : "Enviar a almacén"}
              </button>
            )}

            {canRequestDelivery && (
              <button
                type="button"
                onClick={
                  requestDelivery
                }
                disabled={busy}
                style={saleSmallButton}
              >
                {localAction ===
                "delivery"
                  ? "Solicitando..."
                  : "Solicitar delivery"}
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() =>
                  onCancel(
                    order
                  )
                }
                disabled={busy}
                style={saleDangerSmallButton}
              >
                Cancelar venta
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| Progreso de orden
|--------------------------------------------------------------------------
*/

function OrderProgressStep({
  label,
  done
}) {
  return (
    <div
      style={saleProgressItem}
    >
      <div
        style={saleProgressCircle(
          done
        )}
      >
        {done
          ? "✓"
          : ""}
      </div>

      <span>
        {label}
      </span>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Detalle pequeño
|--------------------------------------------------------------------------
*/

function SaleDetail({
  label,
  value
}) {
  return (
    <div
      style={saleDetailBox}
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Tarjeta de publicación del vendedor
|--------------------------------------------------------------------------
*/

function SellerProductCard({
  product,
  actionLoading,
  setActionLoading,
  onRefresh,
  onMessage,
  onError
}) {
  const [
    menuOpen,
    setMenuOpen
  ] = useState(false);

  const productId =
    product?._id ||
    product?.id ||
    "";

  const status =
    normalizeStatus(
      product?.status ||
      "ACTIVE"
    );

  const statusInfo =
    getProductStatusInfo(
      status
    );

  const image =
    getSalesProductImage(
      product
    );

  const busy =
    actionLoading ===
      `product-${productId}`;

  const risk =
    getProductRiskInfo(
      product
        ?.riskLevel
    );

  const score =
    clampSalesNumber(
      product
        ?.publicationScore ??
      product
        ?.confidenceScore,
      0,
      100,
      0
    );

  const runProductAction =
    async ({
      method,
      endpoint,
      data,
      confirmation,
      successMessage
    }) => {
      if (!productId) {
        onError(
          "El producto no tiene un identificador válido."
        );

        return;
      }

      if (
        confirmation &&
        !window.confirm(
          confirmation
        )
      ) {
        return;
      }

      try {
        setActionLoading(
          `product-${productId}`
        );

        onError("");
        onMessage("");

        await api.request({
          method,
          url:
            endpoint,
          data
        });

        onMessage(
          successMessage
        );

        setMenuOpen(false);

        await onRefresh();
      } catch (
        requestError
      ) {
        onError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "No se pudo actualizar la publicación."
        );
      } finally {
        setActionLoading("");
      }
    };

  const updateStatus =
    (
      nextStatus
    ) => {
      const messages = {
        ACTIVE:
          "La publicación fue reactivada.",

        SOLD:
          "El producto fue marcado como vendido.",

        DISABLED:
          "La publicación fue pausada."
      };

      return runProductAction({
        method:
          "patch",

        endpoint:
          `/products/${productId}/status`,

        data: {
          status:
            nextStatus
        },

        confirmation:
          nextStatus ===
          "SOLD"
            ? "¿Seguro que deseas marcar este producto como vendido?"
            : nextStatus ===
              "DISABLED"
            ? "¿Deseas pausar esta publicación?"
            : "¿Deseas reactivar esta publicación?",

        successMessage:
          messages[
            nextStatus
          ]
      });
    };

  const deletePublication =
    () =>
      runProductAction({
        method:
          "delete",

        endpoint:
          `/products/${productId}`,

        confirmation:
          "¿Seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer.",

        successMessage:
          "La publicación fue eliminada."
      });

  const duplicatePublication =
    () =>
      runProductAction({
        method:
          "post",

        endpoint:
          `/products/${productId}/duplicate`,

        confirmation:
          "¿Deseas crear una copia de esta publicación?",

        successMessage:
          "La publicación fue duplicada."
      });

  return (
    <article
      className="seller-product-card"
      style={sellerProductCard}
    >
      <div
        style={sellerProductImageWrap}
      >
        <img
          src={image}
          alt={
            product?.title ||
            "Producto QSM"
          }
          style={sellerProductImage}
          onError={
            handleSalesImageError
          }
        />

        <span
          style={sellerProductStatusBadge(
            statusInfo
          )}
        >
          {statusInfo.label}
        </span>

        <button
          type="button"
          onClick={() =>
            setMenuOpen(
              (
                current
              ) =>
                !current
            )
          }
          disabled={busy}
          style={sellerProductMenuButton}
          aria-label="Abrir acciones"
        >
          ⋮
        </button>

        {menuOpen && (
          <div
            style={sellerProductMenu}
          >
            {status ===
              "ACTIVE" && (
              <button
                type="button"
                onClick={() =>
                  updateStatus(
                    "DISABLED"
                  )
                }
                disabled={busy}
              >
                Pausar
              </button>
            )}

            {status ===
              "DISABLED" && (
              <button
                type="button"
                onClick={() =>
                  updateStatus(
                    "ACTIVE"
                  )
                }
                disabled={busy}
              >
                Reactivar
              </button>
            )}

            {![
              "SOLD",
              "DISABLED"
            ].includes(status) && (
              <button
                type="button"
                onClick={() =>
                  updateStatus(
                    "SOLD"
                  )
                }
                disabled={busy}
              >
                Marcar vendido
              </button>
            )}

            <button
              type="button"
              onClick={
                duplicatePublication
              }
              disabled={busy}
            >
              Duplicar
            </button>

            <button
              type="button"
              onClick={
                deletePublication
              }
              disabled={busy}
              style={{
                color:
                  "#fca5a5"
              }}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      <div
        style={sellerProductBody}
      >
        <div
          style={sellerProductMeta}
        >
          <span>
            {product?.category ||
              "Producto"}
          </span>

          <span>
            {formatDate(
              product?.createdAt
            )}
          </span>
        </div>

        <h3
          style={sellerProductTitle}
        >
          {product?.title ||
            "Producto QSM"}
        </h3>

        <strong
          style={sellerProductPrice}
        >
          {formatMoney(
            product?.price
          )}
        </strong>

        <div
          className="seller-product-metric-grid"
          style={sellerProductMetrics}
        >
          <ProductMetric
            label="QSM Score"
            value={`${score}/100`}
          />

          <ProductMetric
            label="Riesgo"
            value={risk.label}
            color={risk.color}
          />

          <ProductMetric
            label="Vistas"
            value={
              Number(
                product?.views ||
                product?.viewCount ||
                0
              )
            }
          />

          <ProductMetric
            label="Favoritos"
            value={
              Number(
                product?.favoritesCount ||
                product?.favoriteCount ||
                0
              )
            }
          />
        </div>

        <div
          style={sellerProductActions}
        >
          <Link
            to={`/product/${productId}`}
            style={sellerProductPrimaryLink}
          >
            Ver publicación
          </Link>

          <Link
            to={`/products/${productId}/edit`}
            style={sellerProductSecondaryLink}
          >
            Editar
          </Link>

          <Link
            to={`/product/${productId}/history`}
            style={sellerProductSecondaryLink}
          >
            Historial
          </Link>
        </div>

        {busy && (
          <p
            style={sellerProductProcessing}
          >
            Procesando acción...
          </p>
        )}
      </div>
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| Métrica de publicación
|--------------------------------------------------------------------------
*/

function ProductMetric({
  label,
  value,
  color
}) {
  return (
    <div
      style={productMetric}
    >
      <span>
        {label}
      </span>

      <strong
        style={{
          color:
            color ||
            "var(--sales-text)"
        }}
      >
        {value}
      </strong>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Modal de cancelación
|--------------------------------------------------------------------------
*/

function CancelSaleModal({
  order,
  cancelReason,
  setCancelReason,
  actionLoading,
  onClose
}) {
  const [
    localLoading,
    setLocalLoading
  ] = useState(false);

  const [
    localError,
    setLocalError
  ] = useState("");

  const orderId =
    getOrderId(order);

  const product =
    order?.product &&
    typeof order.product ===
      "object"
      ? order.product
      : {};

  const confirmCancellation =
    async () => {
      if (!orderId) {
        setLocalError(
          "La orden no tiene un identificador válido."
        );

        return;
      }

      if (
        String(
          cancelReason ||
          ""
        )
          .trim()
          .length < 5
      ) {
        setLocalError(
          "Escribe un motivo de al menos 5 caracteres."
        );

        return;
      }

      try {
        setLocalLoading(true);
        setLocalError("");

        await api.patch(
          `/orders/${orderId}/cancel`,
          {
            reason:
              cancelReason.trim(),

            requestedBy:
              "SELLER"
          }
        );

        window.setTimeout(
          () => {
            window.location.reload();
          },
          350
        );
      } catch (
        requestError
      ) {
        setLocalError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "No se pudo cancelar la venta."
        );
      } finally {
        setLocalLoading(false);
      }
    };

  const busy =
    Boolean(
      actionLoading ||
      localLoading
    );

  return (
    <div
      style={cancelModalOverlay}
      onClick={
        onClose
      }
    >
      <section
        style={cancelModalCard}
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        <div
          style={cancelModalHeader}
        >
          <div>
            <p
              style={salesCardEyebrow}
            >
              CANCELAR VENTA
            </p>

            <h2
              style={cancelModalTitle}
            >
              Confirma la cancelación
            </h2>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={busy}
            style={cancelModalClose}
          >
            ×
          </button>
        </div>

        <div
          style={cancelProductSummary}
        >
          <img
            src={getSalesProductImage(
              product
            )}
            alt={
              product?.title ||
              "Producto"
            }
            style={cancelProductImage}
            onError={
              handleSalesImageError
            }
          />

          <div>
            <strong>
              {product?.title ||
                "Producto QSM"}
            </strong>

            <p>
              Orden{" "}
              {formatOrderReference(
                order
              )}
            </p>

            <span>
              {formatMoney(
                getOrderAmount(
                  order
                )
              )}
            </span>
          </div>
        </div>

        <div
          style={cancelWarning}
        >
          <strong>
            ⚠ Importante
          </strong>

          <p>
            La cancelación puede afectar la reputación del vendedor y activar una
            revisión si el comprador ya realizó el pago.
          </p>
        </div>

        <label
          style={cancelReasonLabel}
        >
          Motivo de cancelación

          <textarea
            value={
              cancelReason
            }
            onChange={(
              event
            ) => {
              setCancelReason(
                event
                  .target
                  .value
              );

              setLocalError("");
            }}
            maxLength={500}
            placeholder="Explica claramente por qué necesitas cancelar la venta."
            disabled={busy}
            style={cancelReasonTextarea}
          />
        </label>

        <div
          style={cancelReasonCounter}
        >
          {cancelReason.length}/500
        </div>

        {localError && (
          <div
            style={saleLocalError}
          >
            {localError}
          </div>
        )}

        <div
          style={cancelModalActions}
        >
          <button
            type="button"
            onClick={
              onClose
            }
            disabled={busy}
            style={saleSecondaryAction}
          >
            Volver
          </button>

          <button
            type="button"
            onClick={
              confirmCancellation
            }
            disabled={busy}
            style={cancelConfirmButton}
          >
            {busy
              ? "Cancelando..."
              : "Confirmar cancelación"}
          </button>
        </div>
      </section>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Helpers de la Entrega 2
|--------------------------------------------------------------------------
*/

const SALES_API_ORIGIN =
  String(
    import.meta.env
      .VITE_API_URL ||
    "http://localhost:5000/api"
  ).replace(
    /\/api\/?$/,
    ""
  );

function formatPerson(
  user,
  fallback
) {
  if (
    !user ||
    typeof user !==
      "object"
  ) {
    return fallback;
  }

  const name =
    [
      user?.firstName,
      user?.lastName
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  return (
    name ||
    user?.name ||
    user?.email ||
    fallback
  );
}

function formatOrderReference(
  order
) {
  const reference =
    order?.orderCode ||
    order?.reference ||
    getOrderId(order);

  if (!reference) {
    return "QSM";
  }

  const value =
    String(reference);

  return value.length >
    10
    ? `#${value.slice(
        -8
      ).toUpperCase()}`
    : `#${value.toUpperCase()}`;
}

function formatDate(
  value
) {
  if (!value) {
    return "Fecha no disponible";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Fecha no disponible";
  }

  return date.toLocaleDateString(
    "es-DO",
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  );
}

function getOrderStatusInfo(
  status
) {
  const statuses = {
    PENDING: {
      label:
        "Pendiente",
      icon:
        "◌",
      color:
        "#facc15",
      background:
        "rgba(245,158,11,.14)",
      border:
        "rgba(245,158,11,.34)"
    },

    WAITING_PAYMENT: {
      label:
        "Esperando pago",
      icon:
        "💳",
      color:
        "#facc15",
      background:
        "rgba(245,158,11,.14)",
      border:
        "rgba(245,158,11,.34)"
    },

    PAYMENT_UNDER_REVIEW: {
      label:
        "Pago en revisión",
      icon:
        "🔎",
      color:
        "#60a5fa",
      background:
        "rgba(59,130,246,.14)",
      border:
        "rgba(59,130,246,.34)"
    },

    PAYMENT_CONFIRMED: {
      label:
        "Pago confirmado",
      icon:
        "✓",
      color:
        "#4ade80",
      background:
        "rgba(34,197,94,.14)",
      border:
        "rgba(34,197,94,.34)"
    },

    WAITING_SELLER: {
      label:
        "Acción requerida",
      icon:
        "🔔",
      color:
        "#fb923c",
      background:
        "rgba(249,115,22,.14)",
      border:
        "rgba(249,115,22,.34)"
    },

    WAITING_WAREHOUSE: {
      label:
        "Esperando almacén",
      icon:
        "🏬",
      color:
        "#60a5fa",
      background:
        "rgba(59,130,246,.14)",
      border:
        "rgba(59,130,246,.34)"
    },

    IN_WAREHOUSE: {
      label:
        "En almacén",
      icon:
        "🏬",
      color:
        "#38bdf8",
      background:
        "rgba(56,189,248,.14)",
      border:
        "rgba(56,189,248,.34)"
    },

    UNDER_INSPECTION: {
      label:
        "En inspección",
      icon:
        "🔬",
      color:
        "#a78bfa",
      background:
        "rgba(139,92,246,.14)",
      border:
        "rgba(139,92,246,.34)"
    },

    READY_FOR_PICKUP: {
      label:
        "Listo para recoger",
      icon:
        "📦",
      color:
        "#38bdf8",
      background:
        "rgba(56,189,248,.14)",
      border:
        "rgba(56,189,248,.34)"
    },

    OUT_FOR_DELIVERY: {
      label:
        "En delivery",
      icon:
        "🚚",
      color:
        "#38bdf8",
      background:
        "rgba(56,189,248,.14)",
      border:
        "rgba(56,189,248,.34)"
    },

    WAITING_PIN: {
      label:
        "Esperando PIN",
      icon:
        "🔐",
      color:
        "#a78bfa",
      background:
        "rgba(139,92,246,.14)",
      border:
        "rgba(139,92,246,.34)"
    },

    DELIVERED: {
      label:
        "Entregado",
      icon:
        "✓",
      color:
        "#4ade80",
      background:
        "rgba(34,197,94,.14)",
      border:
        "rgba(34,197,94,.34)"
    },

    COMPLETED: {
      label:
        "Completado",
      icon:
        "✓",
      color:
        "#4ade80",
      background:
        "rgba(34,197,94,.14)",
      border:
        "rgba(34,197,94,.34)"
    },

    DISPUTED: {
      label:
        "En reclamo",
      icon:
        "⚠",
      color:
        "#fb923c",
      background:
        "rgba(249,115,22,.14)",
      border:
        "rgba(249,115,22,.34)"
    },

    CANCELLED: {
      label:
        "Cancelado",
      icon:
        "×",
      color:
        "#f87171",
      background:
        "rgba(239,68,68,.14)",
      border:
        "rgba(239,68,68,.34)"
    },

    REFUNDED: {
      label:
        "Reembolsado",
      icon:
        "↩",
      color:
        "#f87171",
      background:
        "rgba(239,68,68,.14)",
      border:
        "rgba(239,68,68,.34)"
    },

    REJECTED: {
      label:
        "Rechazado",
      icon:
        "×",
      color:
        "#f87171",
      background:
        "rgba(239,68,68,.14)",
      border:
        "rgba(239,68,68,.34)"
    }
  };

  return (
    statuses[
      status
    ] || {
      label:
        status ||
        "Pendiente",
      icon:
        "◌",
      color:
        "#94a3b8",
      background:
        "rgba(148,163,184,.13)",
      border:
        "rgba(148,163,184,.28)"
    }
  );
}

function getProductStatusInfo(
  status
) {
  const statuses = {
    ACTIVE: {
      label:
        "Activo",
      color:
        "#4ade80",
      background:
        "rgba(34,197,94,.14)",
      border:
        "rgba(34,197,94,.34)"
    },

    PENDING: {
      label:
        "Pendiente",
      color:
        "#facc15",
      background:
        "rgba(245,158,11,.14)",
      border:
        "rgba(245,158,11,.34)"
    },

    SOLD: {
      label:
        "Vendido",
      color:
        "#60a5fa",
      background:
        "rgba(59,130,246,.14)",
      border:
        "rgba(59,130,246,.34)"
    },

    DISABLED: {
      label:
        "Pausado",
      color:
        "#94a3b8",
      background:
        "rgba(148,163,184,.13)",
      border:
        "rgba(148,163,184,.28)"
    }
  };

  return (
    statuses[
      status
    ] || {
      label:
        status ||
        "No definido",
      color:
        "#94a3b8",
      background:
        "rgba(148,163,184,.13)",
      border:
        "rgba(148,163,184,.28)"
    }
  );
}

function getProductRiskInfo(
  level
) {
  const normalized =
    normalizeStatus(
      level ||
      "UNCLASSIFIED"
    );

  const risks = {
    LOW: {
      label:
        "Bajo",
      color:
        "#4ade80"
    },

    MEDIUM: {
      label:
        "Medio",
      color:
        "#facc15"
    },

    HIGH: {
      label:
        "Alto",
      color:
        "#fb923c"
    },

    CRITICAL: {
      label:
        "Crítico",
      color:
        "#f87171"
    },

    UNCLASSIFIED: {
      label:
        "Pendiente",
      color:
        "#94a3b8"
    }
  };

  return (
    risks[
      normalized
    ] ||
    risks.UNCLASSIFIED
  );
}

function formatPaymentStatus(
  status
) {
  const labels = {
    PENDING:
      "Pendiente",

    PAID:
      "Pagado",

    CONFIRMED:
      "Confirmado",

    VERIFIED:
      "Verificado",

    FAILED:
      "Fallido",

    REFUNDED:
      "Reembolsado",

    CANCELLED:
      "Cancelado"
  };

  return (
    labels[
      status
    ] ||
    status ||
    "No especificado"
  );
}

function formatEscrowStatus(
  status
) {
  const labels = {
    NOT_FUNDED:
      "Sin fondos",

    FUNDED:
      "Financiado",

    HELD:
      "Fondos retenidos",

    UNDER_REVIEW:
      "En revisión",

    READY_TO_RELEASE:
      "Listo para liberar",

    RELEASED:
      "Liberado",

    REFUNDED:
      "Reembolsado"
  };

  return (
    labels[
      status
    ] ||
    status ||
    "No especificado"
  );
}

function formatDeliveryStatus(
  status
) {
  const labels = {
    PENDING:
      "Pendiente",

    WAITING_WAREHOUSE:
      "Esperando almacén",

    IN_WAREHOUSE:
      "En almacén",

    UNDER_INSPECTION:
      "En inspección",

    READY_FOR_PICKUP:
      "Listo para recoger",

    OUT_FOR_DELIVERY:
      "En delivery",

    WAITING_PIN:
      "Esperando PIN",

    DELIVERED:
      "Entregado"
  };

  return (
    labels[
      status
    ] ||
    status ||
    "No especificado"
  );
}

function formatDeliveryMethodForSales(
  method
) {
  const labels = {
    QSM_WAREHOUSE:
      "Almacén QSM",

    QSM_VERIFIED_DELIVERY:
      "Delivery QSM",

    DIRECT_DELIVERY:
      "Entrega directa",

    PICKUP:
      "Retiro",

    DELIVERY:
      "Delivery"
  };

  return (
    labels[
      normalizeStatus(
        method
      )
    ] ||
    method ||
    "No especificado"
  );
}

function clampSalesNumber(
  value,
  minimum,
  maximum,
  fallback = 0
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      number
    )
  );
}

function normalizeSalesMediaValue(
  value
) {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value
      .trim()
      .replaceAll(
        "&#x2F;",
        "/"
      )
      .replaceAll(
        "&amp;",
        "&"
      );
  }

  return normalizeSalesMediaValue(
    value?.url ||
    value?.path ||
    value?.fileUrl ||
    value?.secure_url ||
    ""
  );
}

function resolveSalesMediaUrl(
  value
) {
  const source =
    normalizeSalesMediaValue(
      value
    );

  if (!source) {
    return "";
  }

  if (
    source.startsWith(
      "data:"
    ) ||
    source.startsWith(
      "blob:"
    ) ||
    /^https?:\/\//i.test(
      source
    )
  ) {
    return source;
  }

  return source.startsWith(
    "/"
  )
    ? `${SALES_API_ORIGIN}${source}`
    : `${SALES_API_ORIGIN}/${source}`;
}

function getSalesProductImage(
  product
) {
  const images =
    Array.isArray(
      product?.images
    )
      ? product.images
      : [];

  const first =
    images.find(Boolean) ||
    product?.image ||
    product?.imageUrl ||
    "";

  return (
    resolveSalesMediaUrl(
      first
    ) ||
    salesFallbackImage()
  );
}

function salesFallbackImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="650">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="52%" stop-color="#164e63"/>
          <stop offset="100%" stop-color="#312e81"/>
        </linearGradient>
      </defs>

      <rect width="900" height="650" fill="url(#g)"/>

      <text
        x="450"
        y="300"
        text-anchor="middle"
        font-size="100"
      >
        📦
      </text>

      <text
        x="450"
        y="420"
        text-anchor="middle"
        fill="#e2e8f0"
        font-family="Arial"
        font-size="38"
        font-weight="700"
      >
        Producto QSM
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    svg
  )}`;
}

function handleSalesImageError(
  event
) {
  event.currentTarget.onerror =
    null;

  event.currentTarget.src =
    salesFallbackImage();
}

/*
|--------------------------------------------------------------------------
| Estilos de órdenes
|--------------------------------------------------------------------------
*/

const saleOrderCard = {
  minWidth: 0,
  overflow: "hidden",
  padding: "18px",
  borderRadius: "22px",
  border:
    "1px solid var(--sales-border)",
  background:
    "var(--sales-card)",
  boxShadow:
    "0 20px 65px rgba(0,0,0,.18)"
};

const saleOrderHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "13px"
};

const saleOrderIdentity = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns:
    "68px minmax(0, 1fr)",
  alignItems: "center",
  gap: "12px"
};

const saleOrderImage = {
  width: "68px",
  height: "68px",
  display: "block",
  borderRadius: "16px",
  border:
    "1px solid var(--sales-border)",
  objectFit: "cover",
  background: "#020617"
};

const salesCardEyebrow = {
  margin: 0,
  color:
    "var(--sales-accent)",
  fontSize: "8px",
  fontWeight: "950",
  letterSpacing: "1.5px"
};

const salesCardTitle = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient:
    "vertical",
  overflow: "hidden",
  margin: "4px 0",
  color:
    "var(--sales-text)",
  fontSize: "16px",
  lineHeight: "21px"
};

const salesCardMuted = {
  margin: 0,
  color:
    "var(--sales-muted)",
  fontSize: "8px"
};

const orderStatusBadge =
  (
    info
  ) => ({
    minHeight: "28px",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: "999px",
    border:
      `1px solid ${info.border}`,
    background:
      info.background,
    color:
      info.color,
    fontSize: "8px",
    fontWeight: "950"
  });

const saleOrderAmountRow = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "14px",
  margin: "16px 0",
  padding: "13px",
  borderRadius: "15px",
  border:
    "1px solid var(--sales-border)",
  background:
    "rgba(2,6,23,.17)"
};

const saleOrderAmount = {
  display: "block",
  marginTop: "4px",
  color:
    "var(--sales-accent)",
  fontSize: "22px"
};

const saleOrderBuyer = {
  display: "grid",
  gap: "4px",
  color:
    "var(--sales-muted)",
  fontSize: "8px",
  textAlign: "right"
};

const saleOrderProgress = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "7px",
  marginBottom: "14px"
};

const saleProgressItem = {
  minWidth: 0,
  display: "grid",
  justifyItems: "center",
  gap: "6px",
  color:
    "var(--sales-muted)",
  fontSize: "7px",
  textAlign: "center"
};

const saleProgressCircle =
  (
    done
  ) => ({
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    border:
      done
        ? "1px solid var(--sales-accent-border)"
        : "1px solid var(--sales-border)",
    background:
      done
        ? "var(--sales-accent-soft)"
        : "rgba(2,6,23,.18)",
    color:
      done
        ? "var(--sales-accent)"
        : "var(--sales-muted)",
    fontSize: "9px",
    fontWeight: "950"
  });

const salePrimaryActions = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "8px"
};

const salePrimaryAction = {
  minHeight: "42px",
  border: "none",
  borderRadius: "12px",
  background:
    "linear-gradient(135deg, var(--sales-accent), #38bdf8, #8b5cf6)",
  color: "#ffffff",
  fontSize: "9px",
  fontWeight: "950",
  cursor: "pointer"
};

const saleSecondaryAction = {
  minHeight: "42px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 12px",
  borderRadius: "12px",
  border:
    "1px solid var(--sales-border)",
  background:
    "rgba(2,6,23,.18)",
  color:
    "var(--sales-text)",
  fontSize: "9px",
  fontWeight: "900",
  cursor: "pointer"
};

const saleExpandedArea = {
  marginTop: "13px",
  paddingTop: "13px",
  borderTop:
    "1px solid var(--sales-border)"
};

const saleDetailGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "8px"
};

const saleDetailBox = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
  padding: "10px",
  borderRadius: "12px",
  border:
    "1px solid var(--sales-border)",
  background:
    "rgba(2,6,23,.16)",
  color:
    "var(--sales-muted)",
  fontSize: "8px"
};

const saleSecurityNotice = {
  marginTop: "10px",
  padding: "12px",
  borderRadius: "13px",
  border:
    "1px solid var(--sales-accent-border)",
  background:
    "var(--sales-accent-soft)",
  color:
    "var(--sales-text)",
  fontSize: "8px",
  lineHeight: "14px"
};

const saleSecondaryActions = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(125px, 1fr))",
  gap: "7px",
  marginTop: "10px"
};

const saleSmallButton = {
  minHeight: "37px",
  padding: "8px 10px",
  borderRadius: "10px",
  border:
    "1px solid var(--sales-border)",
  background:
    "rgba(2,6,23,.18)",
  color:
    "var(--sales-text)",
  fontSize: "8px",
  fontWeight: "850",
  cursor: "pointer"
};

const saleSmallLink = {
  ...saleSmallButton,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none"
};

const saleDangerSmallButton = {
  ...saleSmallButton,
  border:
    "1px solid rgba(239,68,68,.28)",
  background:
    "rgba(127,29,29,.16)",
  color: "#fca5a5"
};

const saleLocalSuccess = {
  marginBottom: "10px",
  padding: "9px 11px",
  borderRadius: "11px",
  border:
    "1px solid rgba(34,197,94,.28)",
  background:
    "rgba(34,197,94,.10)",
  color: "#bbf7d0",
  fontSize: "8px"
};

const saleLocalError = {
  marginBottom: "10px",
  padding: "9px 11px",
  borderRadius: "11px",
  border:
    "1px solid rgba(248,113,113,.28)",
  background:
    "rgba(127,29,29,.17)",
  color: "#fecaca",
  fontSize: "8px"
};

/*
|--------------------------------------------------------------------------
| Estilos de productos
|--------------------------------------------------------------------------
*/

const sellerProductCard = {
  minWidth: 0,
  overflow: "hidden",
  borderRadius: "22px",
  border:
    "1px solid var(--sales-border)",
  background:
    "var(--sales-card)",
  boxShadow:
    "0 20px 65px rgba(0,0,0,.18)"
};

const sellerProductImageWrap = {
  position: "relative",
  height: "235px",
  overflow: "hidden",
  background: "#020617"
};

const sellerProductImage = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "cover"
};

const sellerProductStatusBadge =
  (
    info
  ) => ({
    position: "absolute",
    top: "12px",
    left: "12px",
    minHeight: "28px",
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: "999px",
    border:
      `1px solid ${info.border}`,
    background:
      info.background,
    color:
      info.color,
    fontSize: "8px",
    fontWeight: "950",
    backdropFilter:
      "blur(10px)"
  });

const sellerProductMenuButton = {
  position: "absolute",
  top: "12px",
  right: "12px",
  width: "38px",
  height: "38px",
  borderRadius: "50%",
  border:
    "1px solid rgba(255,255,255,.18)",
  background:
    "rgba(2,6,23,.76)",
  color: "#ffffff",
  fontSize: "20px",
  cursor: "pointer"
};

const sellerProductMenu = {
  position: "absolute",
  top: "56px",
  right: "12px",
  zIndex: 20,
  minWidth: "170px",
  display: "grid",
  gap: "3px",
  padding: "7px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,.14)",
  background:
    "rgba(8,19,37,.96)",
  boxShadow:
    "0 20px 55px rgba(0,0,0,.45)",
  backdropFilter:
    "blur(15px)"
};

Object.assign(
  sellerProductMenu,
  {
    color: "#ffffff"
  }
);

const sellerProductBody = {
  padding: "16px"
};

const sellerProductMeta = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "7px",
  color:
    "var(--sales-muted)",
  fontSize: "8px",
  textTransform: "uppercase"
};

const sellerProductTitle = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient:
    "vertical",
  overflow: "hidden",
  minHeight: "46px",
  margin: 0,
  color:
    "var(--sales-text)",
  fontSize: "17px",
  lineHeight: "23px"
};

const sellerProductPrice = {
  display: "block",
  margin: "7px 0 12px",
  color:
    "var(--sales-accent)",
  fontSize: "22px"
};

const sellerProductMetrics = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  marginBottom: "12px"
};

const productMetric = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
  padding: "10px",
  borderRadius: "12px",
  border:
    "1px solid var(--sales-border)",
  background:
    "rgba(2,6,23,.16)",
  color:
    "var(--sales-muted)",
  fontSize: "8px"
};

const sellerProductActions = {
  display: "grid",
  gridTemplateColumns:
    "1.2fr 1fr 1fr",
  gap: "7px"
};

const sellerProductPrimaryLink = {
  minHeight: "40px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 10px",
  borderRadius: "11px",
  border: "none",
  background:
    "linear-gradient(135deg, var(--sales-accent), #38bdf8, #8b5cf6)",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "8px",
  fontWeight: "950"
};

const sellerProductSecondaryLink = {
  minHeight: "40px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 10px",
  borderRadius: "11px",
  border:
    "1px solid var(--sales-border)",
  background:
    "rgba(2,6,23,.18)",
  color:
    "var(--sales-text)",
  textDecoration: "none",
  fontSize: "8px",
  fontWeight: "900"
};

const sellerProductProcessing = {
  margin: "10px 0 0",
  color:
    "var(--sales-accent)",
  fontSize: "8px",
  textAlign: "center"
};

/*
|--------------------------------------------------------------------------
| Estilos del modal
|--------------------------------------------------------------------------
*/

const cancelModalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  background:
    "rgba(2,6,23,.84)",
  backdropFilter:
    "blur(10px)"
};

const cancelModalCard = {
  width: "min(560px, 96vw)",
  maxHeight: "92vh",
  overflowY: "auto",
  padding: "22px",
  borderRadius: "24px",
  border:
    "1px solid var(--sales-border)",
  background:
    "var(--sales-card)",
  color:
    "var(--sales-text)",
  boxShadow:
    "0 30px 100px rgba(0,0,0,.60)"
};

const cancelModalHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "15px",
  marginBottom: "16px"
};

const cancelModalTitle = {
  margin: "5px 0 0",
  fontSize: "22px"
};

const cancelModalClose = {
  width: "40px",
  height: "40px",
  flexShrink: 0,
  borderRadius: "50%",
  border:
    "1px solid var(--sales-border)",
  background:
    "rgba(2,6,23,.18)",
  color:
    "var(--sales-text)",
  fontSize: "23px",
  cursor: "pointer"
};

const cancelProductSummary = {
  display: "grid",
  gridTemplateColumns:
    "72px minmax(0, 1fr)",
  alignItems: "center",
  gap: "12px",
  padding: "13px",
  borderRadius: "15px",
  border:
    "1px solid var(--sales-border)",
  background:
    "rgba(2,6,23,.16)"
};

const cancelProductImage = {
  width: "72px",
  height: "72px",
  display: "block",
  borderRadius: "14px",
  objectFit: "cover"
};

const cancelWarning = {
  margin: "14px 0",
  padding: "13px",
  borderRadius: "14px",
  border:
    "1px solid rgba(245,158,11,.28)",
  background:
    "rgba(245,158,11,.10)",
  color:
    "var(--sales-text)",
  fontSize: "9px",
  lineHeight: "16px"
};

const cancelReasonLabel = {
  display: "grid",
  gap: "8px",
  color:
    "var(--sales-text)",
  fontSize: "10px",
  fontWeight: "900"
};

const cancelReasonTextarea = {
  width: "100%",
  minHeight: "125px",
  padding: "12px",
  borderRadius: "14px",
  border:
    "1px solid var(--sales-border)",
  outline: "none",
  resize: "vertical",
  background:
    "rgba(2,6,23,.20)",
  color:
    "var(--sales-text)",
  fontSize: "10px",
  lineHeight: "18px"
};

const cancelReasonCounter = {
  marginTop: "5px",
  color:
    "var(--sales-muted)",
  fontSize: "8px",
  textAlign: "right"
};

const cancelModalActions = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1.4fr",
  gap: "9px",
  marginTop: "16px"
};

const cancelConfirmButton = {
  minHeight: "42px",
  border: "none",
  borderRadius: "12px",
  background:
    "linear-gradient(135deg, #ef4444, #f97316)",
  color: "#ffffff",
  fontSize: "9px",
  fontWeight: "950",
  cursor: "pointer"
};

/*
|--------------------------------------------------------------------------
| Ajustes responsive adicionales
|--------------------------------------------------------------------------
*/

const salesResponsiveExtraCss = `
  .seller-product-menu button {
    min-height: 36px;
    padding: 8px 10px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: #e2e8f0;
    text-align: left;
    font-size: 9px;
    font-weight: 850;
    cursor: pointer;
  }

  .seller-product-menu button:hover {
    background: rgba(255,255,255,.07);
  }

  @media (max-width: 620px) {
    .sale-order-detail-grid,
    .seller-product-metric-grid,
    .sale-order-secondary-actions,
    .seller-product-actions,
    .cancel-modal-actions {
      grid-template-columns: 1fr !important;
    }

    .sale-order-header {
      display: grid !important;
    }

    .sale-order-progress {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }
`;

/*
|--------------------------------------------------------------------------
| Inyectar CSS adicional una vez
|--------------------------------------------------------------------------
*/

if (
  typeof document !==
    "undefined" &&
  !document.getElementById(
    "qsm-sales-part-2-styles"
  )
) {
  const style =
    document.createElement(
      "style"
    );

  style.id =
    "qsm-sales-part-2-styles";

  style.textContent =
    salesResponsiveExtraCss;

  document.head.appendChild(
    style
  );
}

/*
|--------------------------------------------------------------------------
| Exportación
|--------------------------------------------------------------------------
*/

export default Sales;
