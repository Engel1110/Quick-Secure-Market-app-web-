import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

function Sales() {
  const navigate = useNavigate();

  const savedUser =
    safeJson(localStorage.getItem("qsm_user")) ||
    safeJson(localStorage.getItem("user")) ||
    {};

  const currentUserId = savedUser._id || savedUser.id || savedUser.userId || "";

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeView, setActiveView] = useState("orders");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSalesData();
  }, []);

  const loadSalesData = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [ordersResponse, productsResponse] = await Promise.allSettled([
        api.get("/orders/my-orders"),
        api.get("/products/my-products")
      ]);

      if (ordersResponse.status === "fulfilled") {
        const backendOrders =
          ordersResponse.value.data.orders ||
          ordersResponse.value.data.data ||
          ordersResponse.value.data.myOrders ||
          [];
        setOrders(Array.isArray(backendOrders) ? backendOrders : []);
      }

      if (productsResponse.status === "fulfilled") {
        const backendProducts =
          productsResponse.value.data.products ||
          productsResponse.value.data.data ||
          productsResponse.value.data.myProducts ||
          [];
        setProducts(Array.isArray(backendProducts) ? backendProducts : []);
      }

      if (
        ordersResponse.status === "rejected" &&
        productsResponse.status === "rejected"
      ) {
        setError(
          "No se pudo cargar Mis ventas. Verifica que existan los endpoints /orders/my-orders y /products/my-products."
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo cargar Mis ventas. Verifica el backend."
      );
    } finally {
      setLoading(false);
    }
  };

  const sellerOrders = useMemo(() => {
    let result = orders.filter((order) => isSellerOrder(order, currentUserId));

    if (statusFilter !== "ALL") {
      result = result.filter((order) => normalizeStatus(order.status) === statusFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((order) => {
        const product = order.product || {};
        const buyer = order.buyer || {};
        return `${order._id || ""} ${order.orderCode || ""} ${product.title || ""} ${buyer.firstName || ""} ${buyer.lastName || ""} ${buyer.email || ""}`
          .toLowerCase()
          .includes(term);
      });
    }

    return result;
  }, [orders, statusFilter, search, currentUserId]);

  const sellerProducts = useMemo(() => {
    let result = products.filter((product) => {
      if (!currentUserId) return true;
      const seller = product.seller || {};
      const sellerId = seller._id || seller.id || product.sellerId;
      return String(sellerId || "") === String(currentUserId);
    });

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((product) =>
        `${product.title || ""} ${product.category || ""} ${product.description || ""}`
          .toLowerCase()
          .includes(term)
      );
    }

    return result;
  }, [products, search, currentUserId]);

  const stats = useMemo(() => {
    const totalSalesValue = sellerOrders.reduce(
      (total, order) => total + Number(order.price || order.product?.price || 0),
      0
    );

    return {
      orders: sellerOrders.length,
      products: sellerProducts.length,
      active: sellerOrders.filter((order) =>
        ["PENDING", "HELD", "PAID", "IN_STORAGE", "SHIPPED"].includes(normalizeStatus(order.status))
      ).length,
      total: totalSalesValue
    };
  }, [sellerOrders, sellerProducts]);

  const markAsShipped = async (orderId) => {
    if (!orderId) return;

    try {
      setActionLoading(orderId);
      setError("");
      setMessage("");
      await api.patch(`/orders/${orderId}/mark-shipped`);
      setMessage("Orden marcada como enviada correctamente.");
      await loadSalesData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo marcar como enviada. Falta el endpoint: PATCH /orders/:id/mark-shipped"
      );
    } finally {
      setActionLoading("");
    }
  };

  const prepareOrder = async (orderId) => {
    if (!orderId) return;

    try {
      setActionLoading(orderId);
      setError("");
      setMessage("");
      await api.patch(`/orders/${orderId}/prepare`);
      setMessage("Orden marcada como en preparación.");
      await loadSalesData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo actualizar la orden. Falta el endpoint: PATCH /orders/:id/prepare"
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div style={page}>
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: #020617;
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
          overflow-x: hidden;
        }
        a, button, input, select { font-family: inherit; }
        a, button { transition: all .25s ease; }
        a:hover, button:hover { transform: translateY(-2px); }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1200px) {
          .sales-page { grid-template-columns: 1fr !important; }
          .sidebar-wrapper { display: none !important; }
          .stats-grid, .sales-grid, .filters-row { grid-template-columns: 1fr !important; }
          .hero-row { flex-direction: column !important; align-items: flex-start !important; }
        }
        @media (max-width: 760px) {
          .main-content { padding: 18px !important; }
          .view-tabs, .card-actions { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="sales-page" style={layout}>
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main className="main-content" style={main}>
          <Topbar />

          <section className="hero-row" style={hero}>
            <div>
              <p style={label}>VENTAS QSM</p>
              <h1 style={title}>Mis ventas</h1>
              <p style={subtitle}>
                Administra productos vendidos, órdenes recibidas, entregas, compradores y estado del Pago Protegido.
              </p>
            </div>

            <div style={heroActions}>
              <button onClick={loadSalesData} style={ghostButton}>Actualizar</button>
              <Link to="/new-product" style={primaryButton}>Publicar producto →</Link>
            </div>
          </section>

          <section className="stats-grid" style={statsGrid}>
            <StatCard icon="💰" title="Ventas recibidas" value={stats.orders} />
            <StatCard icon="📦" title="Productos publicados" value={stats.products} />
            <StatCard icon="🛡" title="Ventas activas" value={stats.active} />
            <StatCard icon="💵" title="Monto protegido" value={formatMoney(stats.total)} />
          </section>

          <section style={controlPanel}>
            <div className="view-tabs" style={viewTabs}>
              <button
                onClick={() => setActiveView("orders")}
                style={activeView === "orders" ? activeTabButton : tabButton}
              >
                🧾 Órdenes de venta
              </button>

              <button
                onClick={() => setActiveView("products")}
                style={activeView === "products" ? activeTabButton : tabButton}
              >
                📦 Mis productos publicados
              </button>
            </div>

            <div className="filters-row" style={filtersRow}>
              <div style={searchBox}>
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por producto, comprador, código o categoría..."
                  style={searchInput}
                />
              </div>

              {activeView === "orders" && (
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  style={selectInput}
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="HELD">Pago retenido</option>
                  <option value="IN_STORAGE">En preparación</option>
                  <option value="SHIPPED">Enviado</option>
                  <option value="DELIVERED">Entregado</option>
                  <option value="RELEASED">Pago liberado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              )}
            </div>
          </section>

          {message && <div style={successBox}>{message}</div>}
          {error && <div style={errorBox}>{error}</div>}

          {loading && (
            <div style={centerCard}>
              <h2>Cargando ventas...</h2>
              <p>QSM está consultando tus productos vendidos y publicados.</p>
            </div>
          )}

          {!loading && activeView === "orders" && sellerOrders.length === 0 && (
            <div style={centerCard}>
              <h2>Aún no tienes ventas registradas</h2>
              <p>Cuando un comprador realice una compra, aparecerá aquí para que puedas gestionarla.</p>
              <Link to="/new-product" style={primaryButton}>Publicar producto</Link>
            </div>
          )}

          {!loading && activeView === "products" && sellerProducts.length === 0 && (
            <div style={centerCard}>
              <h2>No tienes productos publicados</h2>
              <p>Publica tu primer producto para iniciar tu historial como vendedor QSM.</p>
              <Link to="/new-product" style={primaryButton}>Crear publicación</Link>
            </div>
          )}

          {!loading && activeView === "orders" && sellerOrders.length > 0 && (
            <section className="sales-grid" style={salesGrid}>
              {sellerOrders.map((order, index) => (
                <SaleOrderCard
                  key={order._id || order.id || index}
                  order={order}
                  actionLoading={actionLoading}
                  onPrepare={prepareOrder}
                  onMarkAsShipped={markAsShipped}
                />
              ))}
            </section>
          )}

          {!loading && activeView === "products" && sellerProducts.length > 0 && (
            <section className="sales-grid" style={salesGrid}>
              {sellerProducts.map((product, index) => (
                <SellerProductCard key={product._id || index} product={product} />
              ))}
            </section>
          )}
        </main>
      </div>

      <AiAssistant pageContext="sales" />
    </div>
  );
}

function SaleOrderCard({ order, actionLoading, onPrepare, onMarkAsShipped }) {
  const product = order.product || {};
  const buyer = order.buyer || {};
  const orderId = order._id || order.id;
  const status = normalizeStatus(order.status);
  const price = order.price || product.price || 0;
  const image = getProductImage(product);

  const canPrepare = ["PENDING", "HELD", "PAID"].includes(status);
  const canShip = ["IN_STORAGE", "HELD", "PAID"].includes(status);

  return (
    <article style={card}>
      <div style={cardHeader}>
        <div>
          <p style={smallLabel}>Venta protegida</p>
          <h2 style={cardTitle}>#{order.orderCode || `QSM-${String(orderId || Date.now()).slice(-6).toUpperCase()}`}</h2>
        </div>
        <span style={statusBadge(status)}>{formatStatus(status)}</span>
      </div>

      <div style={productBox}>
        <div style={imageBox}>
          {image ? <img src={image} alt={product.title || "Producto"} style={imageStyle} /> : "📦"}
        </div>

        <div>
          <h3 style={productTitle}>{product.title || order.productTitle || "Producto vendido"}</h3>
          <p style={muted}>Comprador: {formatUser(buyer, "Comprador QSM")}</p>
          <strong style={priceText}>{formatMoney(price)}</strong>
        </div>
      </div>

      <div style={infoGrid}>
        <Info title="Pago" value={formatPayment(order.escrowStatus || order.paymentStatus || "HELD")} />
        <Info title="Entrega" value={order.deliveryMethod || "Pendiente"} />
        <Info title="PIN entrega" value={order.deliveryPin || order.deliveryCode || "Pendiente"} />
        <Info title="Fecha" value={formatDate(order.createdAt)} />
      </div>

      <div style={sellerNotice}>
        <strong>🛡 Pago Protegido</strong>
        <p>QSM mantiene el dinero retenido hasta que el comprador confirme la recepción o se resuelva cualquier reclamo.</p>
      </div>

      <div className="card-actions" style={actions}>
        <Link to={`/orders/${orderId}`} style={primaryAction}>Ver detalle</Link>
        <Link to={`/messages?buyerId=${buyer._id || buyer.id || ""}&orderId=${orderId || ""}`} style={outlineAction}>
          Contactar comprador
        </Link>
        <button
          onClick={() => onPrepare(orderId)}
          disabled={!canPrepare || actionLoading === orderId}
          style={canPrepare ? warningAction : disabledAction}
        >
          {actionLoading === orderId ? "Procesando..." : "Preparar"}
        </button>
        <button
          onClick={() => onMarkAsShipped(orderId)}
          disabled={!canShip || actionLoading === orderId}
          style={canShip ? successAction : disabledAction}
        >
          Marcar enviado
        </button>
      </div>
    </article>
  );
}

function SellerProductCard({ product }) {
  const image = getProductImage(product);

  return (
    <article style={card}>
      <div style={productImageLarge}>
        {image ? <img src={image} alt={product.title || "Producto"} style={largeImageStyle} /> : "📦"}
        <span style={productStatus}>{product.status || "ACTIVE"}</span>
      </div>

      <h2 style={cardTitle}>{product.title || "Producto publicado"}</h2>
      <strong style={priceText}>{formatMoney(product.price)}</strong>
      <p style={muted}>{product.category || "Categoría"} · {product.location || "República Dominicana"}</p>

      <div style={infoGrid}>
        <Info title="Riesgo QSM" value={product.riskLevel || "LOW"} />
        <Info title="Confianza" value={`${product.confidenceScore || 70}/100`} />
      </div>

      <div className="card-actions" style={productActions}>
        <Link to={`/product/${product._id}`} style={primaryAction}>Ver publicación</Link>
        <Link to={`/products/${product._id}/edit`} style={outlineAction}>Editar</Link>
      </div>
    </article>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div style={statCard}>
      <div style={statIcon}>{icon}</div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Info({ title, value }) {
  return (
    <div style={infoItem}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function isSellerOrder(order, currentUserId) {
  if (!currentUserId) return true;
  const seller = order.seller || {};
  const sellerId = seller._id || seller.id || order.sellerId;
  return String(sellerId || "") === String(currentUserId);
}

function normalizeStatus(status) {
  const value = String(status || "PENDING").toUpperCase();
  if (value === "COMPLETED") return "RELEASED";
  if (value === "PAID") return "HELD";
  return value;
}

function formatStatus(status) {
  const map = {
    PENDING: "Pendiente",
    HELD: "Pago retenido",
    PAID: "Pago retenido",
    IN_STORAGE: "En preparación",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    RELEASED: "Pago liberado",
    COMPLETED: "Completado",
    CANCELLED: "Cancelado",
    REFUNDED: "Reembolsado"
  };
  return map[status] || status || "Pendiente";
}

function formatPayment(status) {
  const map = {
    HELD: "Pago retenido",
    ESCROW_HELD: "Pago retenido",
    RELEASED: "Pago liberado",
    REFUNDED: "Reembolsado",
    FAILED: "Fallido"
  };
  return map[status] || status || "Pendiente";
}

function formatUser(user, fallback) {
  if (!user || typeof user !== "object") return fallback;
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.email || fallback;
}

function formatDate(value) {
  if (!value) return "Pendiente";
  return new Date(value).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function getProductImage(product) {
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0];

    if (typeof firstImage === "string") {
      const cleanImage = firstImage
        .trim()
        .replaceAll("&#x2F;", "/")
        .replaceAll("&amp;", "&");

      if (cleanImage.startsWith("http")) return cleanImage;
      if (cleanImage.startsWith("/uploads")) return `http://localhost:5000${cleanImage}`;
      if (cleanImage.startsWith("uploads")) return `http://localhost:5000/${cleanImage}`;

      return `http://localhost:5000/uploads/products/images/${cleanImage}`;
    }
  }
  return "";
}

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(139,92,246,.16), transparent 34%), radial-gradient(circle at 18% 15%, rgba(56,189,248,.09), transparent 28%), #020617",
  color: "white"
};

const layout = {
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr)",
  overflowX: "hidden"
};

const main = {
  width: "100%",
  minWidth: 0,
  padding: "26px 34px 56px",
  overflowX: "hidden"
};

const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "24px",
  margin: "22px 0"
};

const label = {
  color: "#38bdf8",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  margin: 0
};

const title = {
  fontSize: "clamp(40px, 3.6vw, 62px)",
  lineHeight: "1",
  margin: "10px 0",
  letterSpacing: "-2px"
};

const subtitle = {
  color: "#cbd5e1",
  lineHeight: "29px",
  maxWidth: "780px",
  margin: 0
};

const heroActions = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap"
};

const primaryButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "14px 20px",
  borderRadius: "14px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 18px 54px rgba(139,92,246,.22)"
};

const ghostButton = {
  ...primaryButton,
  background: "rgba(15,23,42,.70)",
  border: "1px solid rgba(148,163,184,.16)",
  boxShadow: "none"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px"
};

const statCard = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.15)",
  borderRadius: "22px",
  padding: "20px"
};

const statIcon = {
  width: "52px",
  height: "52px",
  borderRadius: "17px",
  background: "rgba(56,189,248,.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px"
};

const controlPanel = {
  background: "rgba(15,23,42,.62)",
  border: "1px solid rgba(56,189,248,.14)",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "18px"
};

const viewTabs = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "10px",
  marginBottom: "14px"
};

const tabButton = {
  background: "rgba(2,6,23,.45)",
  border: "1px solid rgba(148,163,184,.14)",
  color: "#cbd5e1",
  padding: "13px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900"
};

const activeTabButton = {
  ...tabButton,
  background: "linear-gradient(135deg, rgba(56,189,248,.18), rgba(139,92,246,.20))",
  border: "1px solid rgba(56,189,248,.35)",
  color: "white"
};

const filtersRow = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 260px",
  gap: "12px"
};

const searchBox = {
  height: "56px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "rgba(2,6,23,.45)",
  border: "1px solid rgba(148,163,184,.14)",
  borderRadius: "15px",
  padding: "0 14px"
};

const searchInput = {
  flex: 1,
  height: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "white"
};

const selectInput = {
  background: "rgba(2,6,23,.45)",
  border: "1px solid rgba(148,163,184,.14)",
  borderRadius: "15px",
  padding: "0 14px",
  color: "white",
  outline: "none"
};

const successBox = {
  background: "rgba(34,197,94,.14)",
  border: "1px solid rgba(34,197,94,.32)",
  color: "#bbf7d0",
  padding: "14px 18px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontWeight: "800"
};

const errorBox = {
  background: "rgba(127,29,29,.24)",
  border: "1px solid rgba(248,113,113,.30)",
  color: "#fecaca",
  padding: "14px 18px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontWeight: "800"
};

const centerCard = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.14)",
  borderRadius: "24px",
  padding: "34px",
  textAlign: "center",
  color: "#cbd5e1"
};

const salesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(390px, 1fr))",
  gap: "20px"
};

const card = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "22px",
  boxShadow: "0 24px 80px rgba(0,0,0,.20)",
  animation: "fadeUp .45s ease"
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  marginBottom: "18px"
};

const smallLabel = {
  color: "#38bdf8",
  fontSize: "12px",
  letterSpacing: "3px",
  fontWeight: "950",
  margin: 0
};

const cardTitle = {
  margin: "6px 0 0",
  fontSize: "24px"
};

const statusBadge = (status) => {
  const normalized = normalizeStatus(status);
  const colors = {
    RELEASED: ["rgba(34,197,94,.16)", "#86efac", "rgba(34,197,94,.34)"],
    DELIVERED: ["rgba(34,197,94,.16)", "#86efac", "rgba(34,197,94,.34)"],
    SHIPPED: ["rgba(56,189,248,.16)", "#7dd3fc", "rgba(56,189,248,.34)"],
    HELD: ["rgba(245,158,11,.16)", "#fde68a", "rgba(245,158,11,.34)"],
    PENDING: ["rgba(245,158,11,.16)", "#fde68a", "rgba(245,158,11,.34)"],
    CANCELLED: ["rgba(239,68,68,.16)", "#fca5a5", "rgba(239,68,68,.34)"],
    REFUNDED: ["rgba(168,85,247,.16)", "#d8b4fe", "rgba(168,85,247,.34)"]
  };
  const selected = colors[normalized] || colors.PENDING;
  return {
    background: selected[0],
    color: selected[1],
    border: `1px solid ${selected[2]}`,
    borderRadius: "999px",
    padding: "8px 12px",
    fontWeight: "950",
    whiteSpace: "nowrap"
  };
};

const productBox = {
  display: "grid",
  gridTemplateColumns: "96px 1fr",
  gap: "16px",
  alignItems: "center",
  background: "rgba(2,6,23,.40)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "18px",
  padding: "14px",
  marginBottom: "16px"
};

const imageBox = {
  width: "96px",
  height: "96px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, rgba(56,189,248,.16), rgba(139,92,246,.16))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "36px",
  overflow: "hidden"
};

const imageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const productTitle = {
  margin: "0 0 5px",
  fontSize: "20px"
};

const muted = {
  color: "#94a3b8",
  margin: "4px 0"
};

const priceText = {
  display: "block",
  marginTop: "8px",
  color: "#35d0c3",
  fontSize: "20px"
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
  marginBottom: "16px"
};

const infoItem = {
  background: "rgba(2,6,23,.35)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "14px",
  padding: "12px"
};

const sellerNotice = {
  background: "rgba(53,208,195,.10)",
  border: "1px solid rgba(53,208,195,.26)",
  color: "#cbd5e1",
  borderRadius: "16px",
  padding: "14px",
  marginBottom: "16px"
};

const actions = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px"
};

const productActions = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "16px"
};

const primaryAction = {
  textAlign: "center",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  color: "white",
  textDecoration: "none",
  border: "none",
  borderRadius: "13px",
  padding: "12px",
  fontWeight: "950",
  cursor: "pointer"
};

const outlineAction = {
  ...primaryAction,
  background: "rgba(15,23,42,.64)",
  border: "1px solid rgba(148,163,184,.16)",
  boxShadow: "none"
};

const warningAction = {
  ...primaryAction,
  background: "rgba(245,158,11,.16)",
  color: "#fde68a",
  border: "1px solid rgba(245,158,11,.32)"
};

const successAction = {
  ...primaryAction,
  background: "rgba(34,197,94,.16)",
  color: "#bbf7d0",
  border: "1px solid rgba(34,197,94,.32)"
};

const disabledAction = {
  ...primaryAction,
  background: "rgba(148,163,184,.10)",
  color: "#64748b",
  border: "1px solid rgba(148,163,184,.12)",
  cursor: "not-allowed",
  opacity: 0.75
};

const productImageLarge = {
  height: "240px",
  borderRadius: "20px",
  background: "linear-gradient(135deg, rgba(56,189,248,.16), rgba(139,92,246,.16))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "52px",
  overflow: "hidden",
  position: "relative",
  marginBottom: "16px"
};

const largeImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const productStatus = {
  position: "absolute",
  top: "14px",
  right: "14px",
  background: "rgba(53,208,195,.18)",
  border: "1px solid rgba(53,208,195,.35)",
  color: "#67fff1",
  borderRadius: "999px",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "900"
};

export default Sales;
