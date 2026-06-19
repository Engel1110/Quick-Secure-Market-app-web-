import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [lastDispute, setLastDispute] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      const response = await api.get("/products");

      setProducts(response.data.products || []);
      setLastOrder(JSON.parse(localStorage.getItem("qsm_last_order")));
      setLastDispute(JSON.parse(localStorage.getItem("qsm_last_dispute")));
    } catch (error) {
      console.error("Error cargando panel admin:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const pendingProducts = products.filter(
    (product) => product.status === "PENDING"
  );

  const fraudAlerts = products.flatMap((product) =>
    (product.fraudAlerts || []).map((alert) => ({
      ...alert,
      productTitle: product.title,
      qsmCode: product.qsmCode
    }))
  );

  const highRiskProducts = products.filter(
    (product) => product.fraudAlerts?.length > 0
  );

  if (loading) {
    return (
      <div style={page}>
        <h1>Cargando panel administrativo...</h1>
      </div>
    );
  }

  return (
    <div style={page}>
      <header style={header}>
        <div>
          <h1>Panel Administrativo QSM</h1>
          <p style={{ color: "#94a3b8" }}>
            Centro de control para productos, alertas, disputas y escrow.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <Link to="/dashboard" style={secondaryButton}>
            Dashboard
          </Link>

          <Link to="/marketplace" style={primaryButton}>
            Marketplace
          </Link>
        </div>
      </header>

      <section style={statsGrid}>
        <StatCard title="Productos" value={products.length} />
        <StatCard title="Pendientes" value={pendingProducts.length} />
        <StatCard title="Alertas" value={fraudAlerts.length} />
        <StatCard title="Alto riesgo" value={highRiskProducts.length} />
      </section>

      <section style={grid}>
        <div style={card}>
          <h2>Productos pendientes</h2>

          {pendingProducts.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>No hay productos pendientes.</p>
          ) : (
            pendingProducts.slice(0, 5).map((product) => (
              <div key={product.id} style={row}>
                <div>
                  <strong>{product.title}</strong>
                  <p style={{ color: "#94a3b8" }}>{product.qsmCode}</p>
                </div>

                <span style={badgeWarning}>Pendiente</span>
              </div>
            ))
          )}
        </div>

        <div style={card}>
          <h2>Alertas antifraude</h2>

          {fraudAlerts.length === 0 ? (
            <p style={{ color: "#86efac" }}>No hay alertas activas.</p>
          ) : (
            fraudAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} style={alertBox}>
                <strong>{formatAlert(alert.type)}</strong>
                <p>{alert.productTitle}</p>
                <small>{alert.qsmCode}</small>
              </div>
            ))
          )}
        </div>
      </section>

      <section style={grid}>
        <div style={card}>
          <h2>Última orden Escrow</h2>

          {!lastOrder ? (
            <p style={{ color: "#94a3b8" }}>No hay órdenes recientes.</p>
          ) : (
            <>
              <p><strong>Orden:</strong> {lastOrder.orderCode}</p>
              <p><strong>Producto ID:</strong> {lastOrder.productId}</p>
              <p><strong>Estado:</strong> {formatStatus(lastOrder.status)}</p>
              <p><strong>Pago:</strong> {formatPayment(lastOrder.paymentStatus)}</p>
              <p><strong>PIN:</strong> {lastOrder.deliveryPin}</p>

              <div style={escrowBox}>
                Pago retenido por QSM hasta confirmación del comprador.
              </div>
            </>
          )}
        </div>

        <div style={card}>
          <h2>Última disputa</h2>

          {!lastDispute ? (
            <p style={{ color: "#94a3b8" }}>No hay disputas recientes.</p>
          ) : (
            <>
              <p><strong>Código:</strong> {lastDispute.disputeCode}</p>
              <p><strong>Orden:</strong> {lastDispute.orderCode}</p>
              <p><strong>Motivo:</strong> {lastDispute.reason}</p>
              <p><strong>Evidencia:</strong> {lastDispute.evidence}</p>

              <span style={badgeWarning}>
                {formatDisputeStatus(lastDispute.status)}
              </span>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div style={statCard}>
      <p style={{ color: "#94a3b8" }}>{title}</p>
      <h1 style={{ color: "#35d0c3", fontSize: "42px" }}>{value}</h1>
    </div>
  );
}

function formatAlert(type) {
  const map = {
    LOW_PRICE: "Precio sospechosamente bajo",
    NEW_ACCOUNT: "Cuenta nueva",
    REUSED_IMAGE: "Imagen reutilizada",
    HIGH_RISK: "Alto riesgo",
    HIGH_RISK_CATEGORY: "Categoría de alto riesgo"
  };

  return map[type] || type?.replaceAll("_", " ") || "Alerta QSM";
}

function formatStatus(status) {
  const map = {
    HELD: "Pago retenido",
    IN_STORAGE: "En almacén QSM",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    RELEASED: "Pago liberado"
  };

  return map[status] || status || "No disponible";
}

function formatPayment(payment) {
  const map = {
    ESCROW_HELD: "Pago retenido en garantía",
    RELEASED: "Pago liberado al vendedor",
    REFUNDED: "Reembolsado al comprador"
  };

  return map[payment] || payment || "No disponible";
}

function formatDisputeStatus(status) {
  const map = {
    OPEN: "Abierta",
    REVIEWING: "En revisión",
    RESOLVED: "Resuelta"
  };

  return map[status] || status || "No disponible";
}

const page = {
  minHeight: "100vh",
  background: "#050b1f",
  color: "white",
  padding: "40px"
};

const header = {
  maxWidth: "1200px",
  margin: "0 auto 28px auto",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px"
};

const statsGrid = {
  maxWidth: "1200px",
  margin: "0 auto 24px auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px"
};

const grid = {
  maxWidth: "1200px",
  margin: "0 auto 24px auto",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px"
};

const card = {
  background: "#111827",
  border: "1px solid #223047",
  borderRadius: "18px",
  padding: "26px"
};

const statCard = {
  background: "#111827",
  border: "1px solid #223047",
  borderRadius: "18px",
  padding: "22px",
  textAlign: "center"
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #223047",
  padding: "12px 0"
};

const alertBox = {
  background: "#3a2a0a",
  color: "#fde68a",
  border: "1px solid #78350f",
  borderRadius: "12px",
  padding: "14px",
  marginBottom: "12px"
};

const badgeWarning = {
  display: "inline-block",
  padding: "7px 12px",
  borderRadius: "20px",
  background: "#78350f",
  color: "#fde68a",
  fontWeight: "bold"
};

const escrowBox = {
  marginTop: "18px",
  background: "#0c1838",
  border: "1px solid #35d0c3",
  borderRadius: "12px",
  padding: "15px"
};

const primaryButton = {
  background: "#35d0c3",
  color: "#020617",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "10px",
  fontWeight: "bold"
};

const secondaryButton = {
  background: "#111827",
  color: "#e5e7eb",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "10px",
  border: "1px solid #334155"
};

export default AdminPanel;