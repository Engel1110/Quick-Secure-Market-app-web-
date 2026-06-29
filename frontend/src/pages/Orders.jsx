import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/orders/my-orders");
      setOrders(response.data.orders || []);
    } catch (err) {
      console.error("Error cargando órdenes:", err);
      setError(
        err.response?.data?.message ||
          "No se pudieron cargar tus compras. Verifica que hayas iniciado sesión."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={page}>
        <div style={centerCard}>
          <h1>Cargando tus compras...</h1>
          <p style={muted}>QSM está consultando tus órdenes protegidas.</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={page}>
        <div style={centerCard}>
          <h1>Mis compras</h1>
          <p style={muted}>Todavía no tienes compras creadas.</p>

          {error && <p style={errorText}>{error}</p>}

          <Link to="/marketplace" style={primaryButton}>
            Ir al Marketplace
          </Link>
        </div>
      </div>
    );
  }

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
          font-family: 'Inter', system-ui, sans-serif;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <main style={container}>
        <div style={topRow}>
          <div>
            <p style={label}>COMPRAS PROTEGIDAS QSM</p>
            <h1 style={title}>Mis compras</h1>
            <p style={subtitle}>
              Revisa el estado de tus órdenes, pago protegido, entrega y
              liberación del dinero.
            </p>
          </div>

          <Link to="/marketplace" style={secondaryButton}>
            Volver al Marketplace
          </Link>
        </div>

        {error && <div style={errorBox}>{error}</div>}

        <section style={grid}>
          {orders.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
        </section>
      </main>
    </div>
  );
}

function OrderCard({ order }) {
  const product = order.product || {};
  const seller = order.seller || {};
  const buyer = order.buyer || {};

  const orderCode = `QSM-${String(order._id || "").slice(-6).toUpperCase()}`;
  const status = order.status || "PENDING";
  const paymentStatus = order.escrowStatus || order.paymentStatus || "HELD";
  const price = order.price || product.price || 0;

  return (
    <article style={card}>
      <div style={cardHeader}>
        <div>
          <p style={labelSmall}>Orden segura</p>
          <h2 style={orderTitle}>Orden #{orderCode}</h2>
        </div>

        <span style={statusBadge(status)}>{formatStatus(status)}</span>
      </div>

      <div style={productBox}>
        <div style={productImageBox}>
          <span>📦</span>
        </div>

        <div>
          <h3 style={productTitle}>
            {product.title || "Producto comprado"}
          </h3>

          <p style={muted}>
            ID del producto: {product._id || "Pendiente"}
          </p>

          <strong style={priceText}>{formatMoney(price)}</strong>
        </div>
      </div>

      <div style={infoGrid}>
        <Info title="Comprador" value={formatUser(buyer, "Comprador")} />
        <Info title="Vendedor" value={formatUser(seller, "Vendedor")} />
        <Info title="Estado del pago" value={formatPayment(paymentStatus)} />
        <Info title="PIN de entrega" value={order.deliveryPin || "Pendiente"} />
      </div>

      <div style={progressBox}>
        <h3>Seguimiento del pedido</h3>

        <ProgressItem active text="Compra creada" />
        <ProgressItem
          active={isStepActive(status, [
            "PENDING",
            "HELD",
            "PAID",
            "IN_STORAGE",
            "SHIPPED",
            "DELIVERED",
            "RELEASED",
            "COMPLETED"
          ])}
          text="Dinero retenido por QSM"
        />
        <ProgressItem
          active={isStepActive(status, [
            "IN_STORAGE",
            "SHIPPED",
            "DELIVERED",
            "RELEASED",
            "COMPLETED"
          ])}
          text="Producto en preparación o almacén"
        />
        <ProgressItem
          active={isStepActive(status, [
            "SHIPPED",
            "DELIVERED",
            "RELEASED",
            "COMPLETED"
          ])}
          text="Producto enviado"
        />
        <ProgressItem
          active={isStepActive(status, ["DELIVERED", "RELEASED", "COMPLETED"])}
          text="Entrega confirmada"
        />
        <ProgressItem
          active={isStepActive(status, ["RELEASED", "COMPLETED"])}
          text="Pago liberado al vendedor"
        />
      </div>

      <div style={escrowBox}>
        <strong>🛡 Pago Protegido QSM</strong>
        <p>
          El dinero queda retenido hasta que el comprador confirme que recibió el
          producto correctamente.
        </p>
      </div>

      <div style={actions}>
        <Link to={`/orders/${order._id}`} style={primaryButton}>
          Ver detalle
        </Link>

        <Link
          to="/disputes"
          state={{ orderId: order._id, productId: product._id }}
          style={outlineButton}
        >
          Abrir reclamo
        </Link>
      </div>
    </article>
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

function ProgressItem({ active, text }) {
  return (
    <div style={progressItem}>
      <span style={active ? dotActive : dotInactive}>{active ? "✓" : "•"}</span>
      <p>{text}</p>
    </div>
  );
}

function isStepActive(status, validStatuses) {
  return validStatuses.includes(status);
}

function formatUser(user, fallback) {
  if (!user || typeof user !== "object") return fallback;

  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return name || user.email || fallback;
}

function formatStatus(status) {
  const map = {
    PENDING: "Pago retenido",
    HELD: "Pago retenido",
    PAID: "Pago retenido",
    IN_STORAGE: "En almacén QSM",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    COMPLETED: "Completado",
    RELEASED: "Pago liberado",
    CANCELLED: "Cancelado",
    REFUNDED: "Reembolsado"
  };

  return map[status] || status || "Pendiente";
}

function formatPayment(status) {
  const map = {
    HELD: "Pago retenido",
    ESCROW_HELD: "Pago retenido en garantía",
    PAID: "Pago retenido",
    RELEASED: "Pago liberado al vendedor",
    REFUNDED: "Reembolsado al comprador",
    PENDING: "Pendiente"
  };

  return map[status] || status || "Pago retenido";
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(value || 0);
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top right, rgba(53,208,195,0.12), transparent 35%), #020617",
  color: "white"
};

const container = {
  maxWidth: "1450px",
  margin: "0 auto",
  padding: "40px 28px 80px"
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "center",
  marginBottom: "30px"
};

const label = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "900"
};

const labelSmall = {
  color: "#35d0c3",
  letterSpacing: "2px",
  fontSize: "11px",
  fontWeight: "900",
  margin: 0
};

const title = {
  fontSize: "clamp(40px, 5vw, 64px)",
  margin: "8px 0"
};

const subtitle = {
  color: "#cbd5e1",
  fontSize: "18px",
  maxWidth: "760px",
  lineHeight: "30px"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: "24px"
};

const card = {
  background: "rgba(15,23,42,0.74)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "26px",
  padding: "26px",
  boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
  animation: "fadeUp .5s ease"
};

const centerCard = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "40px"
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  alignItems: "flex-start",
  marginBottom: "22px"
};

const orderTitle = {
  fontSize: "28px",
  margin: "6px 0 0"
};

const statusBadge = (status) => ({
  padding: "9px 13px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  background:
    status === "RELEASED" || status === "COMPLETED"
      ? "rgba(34,197,94,0.18)"
      : status === "CANCELLED" || status === "REFUNDED"
      ? "rgba(239,68,68,0.18)"
      : "rgba(245,158,11,0.18)",
  color:
    status === "RELEASED" || status === "COMPLETED"
      ? "#86efac"
      : status === "CANCELLED" || status === "REFUNDED"
      ? "#fca5a5"
      : "#fde68a"
});

const productBox = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  background: "rgba(2,6,23,0.45)",
  border: "1px solid rgba(148,163,184,0.10)",
  borderRadius: "20px",
  padding: "16px",
  marginBottom: "18px"
};

const productImageBox = {
  width: "76px",
  height: "76px",
  borderRadius: "18px",
  background:
    "linear-gradient(135deg, rgba(53,208,195,0.22), rgba(124,58,237,0.22))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
  flexShrink: 0
};

const productTitle = {
  margin: 0,
  fontSize: "22px"
};

const muted = {
  color: "#94a3b8",
  lineHeight: "25px"
};

const priceText = {
  color: "#35d0c3",
  fontSize: "22px"
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
  marginBottom: "20px"
};

const infoItem = {
  background: "rgba(2,6,23,0.38)",
  border: "1px solid rgba(148,163,184,0.10)",
  borderRadius: "16px",
  padding: "14px",
  color: "#cbd5e1",
  display: "grid",
  gap: "6px"
};

const progressBox = {
  background: "rgba(2,6,23,0.38)",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: "18px",
  padding: "18px",
  marginBottom: "18px"
};

const progressItem = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#cbd5e1",
  marginBottom: "8px"
};

const dotActive = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: "#35d0c3",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  flexShrink: 0
};

const dotInactive = {
  ...dotActive,
  background: "rgba(148,163,184,0.18)",
  color: "#94a3b8"
};

const escrowBox = {
  background: "rgba(53,208,195,0.10)",
  border: "1px solid rgba(53,208,195,0.28)",
  borderRadius: "18px",
  padding: "16px",
  color: "#cbd5e1",
  marginBottom: "18px"
};

const actions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px"
};

const primaryButton = {
  display: "block",
  textAlign: "center",
  background: "linear-gradient(135deg, #35d0c3, #2563eb)",
  color: "#020617",
  border: "none",
  padding: "14px",
  borderRadius: "14px",
  fontWeight: "900",
  textDecoration: "none",
  cursor: "pointer"
};

const outlineButton = {
  display: "block",
  textAlign: "center",
  background: "rgba(15,23,42,0.72)",
  color: "white",
  border: "1px solid rgba(53,208,195,0.22)",
  padding: "14px",
  borderRadius: "14px",
  fontWeight: "900",
  cursor: "pointer",
  textDecoration: "none"
};

const secondaryButton = {
  ...outlineButton
};

const errorBox = {
  background: "rgba(127,29,29,0.22)",
  border: "1px solid rgba(248,113,113,0.32)",
  color: "#fecaca",
  padding: "16px",
  borderRadius: "16px",
  marginBottom: "20px"
};

const errorText = {
  color: "#fecaca"
};

export default Orders;