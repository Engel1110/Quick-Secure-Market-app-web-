import { Link } from "react-router-dom";

function ProductCard({ product }) {
  const formatStatus = (status) => {
    const statusMap = {
      PENDING: "Pendiente",
      CERTIFIED: "Certificado",
      APPROVED: "Aprobado",
      REJECTED: "Rechazado",
      SOLD: "Vendido",
      SHIPPED: "Enviado",
      DELIVERED: "Entregado"
    };

    return statusMap[status] || status || "No disponible";
  };

  const getRiskLevel = () => {
    if (!product.fraudAlerts || product.fraudAlerts.length === 0) {
      return "Bajo";
    }

    const hasHigh = product.fraudAlerts.some(
      (alert) => alert.level === "HIGH"
    );

    const hasMedium = product.fraudAlerts.some(
      (alert) => alert.level === "MEDIUM"
    );

    if (hasHigh) return "Alto";
    if (hasMedium) return "Medio";

    return "Bajo";
  };

  const riskLevel = getRiskLevel();

  return (
    <div style={card}>
      {product.imageUrl?.startsWith("http") ? (
        <img src={product.imageUrl} alt={product.title} style={image} />
      ) : (
        <div style={noImage}>📦 Sin imagen</div>
      )}

      <h2 style={title}>{product.title}</h2>

      <p style={description}>{product.description}</p>

      <h2 style={price}>RD$ {product.price}</h2>

      <p>
        <strong>QSM ID:</strong> {product.qsmCode}
      </p>

      <div style={statusBadge(product.verificationStatus)}>
        {product.verificationStatus === "APPROVED"
          ? "🛡 Certificado QSM"
          : "⏳ Pendiente de verificación"}
      </div>

      <div style={riskBadge(riskLevel)}>
        Riesgo QSM: {riskLevel}
      </div>

      <hr style={{ borderColor: "#334155" }} />

      <p>
        <strong>Vendedor:</strong>{" "}
        {product.seller?.firstName} {product.seller?.lastName}
      </p>

      <p>
        ⭐ <strong>Trust Score:</strong>{" "}
        {product.seller?.trustScore}/100
      </p>

      <p>
        <strong>Estado:</strong>{" "}
        {formatStatus(product.status)}
      </p>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "15px"
        }}
      >
        <Link to={`/product/${product.id}`} style={detailsButton}>
          Ver Detalles
        </Link>

        <Link to={`/checkout/${product.id}`} style={buyButton}>
          Comprar
        </Link>
      </div>
    </div>
  );
}

const card = {
  background: "#0f172a",
  border: "1px solid #1e3a5f",
  borderRadius: "18px",
  padding: "18px",
  color: "white",
  overflow: "hidden",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
};

const image = {
  width: "100%",
  height: "220px",
  objectFit: "cover",
  borderRadius: "12px",
  marginBottom: "15px"
};

const noImage = {
  height: "220px",
  background: "#020617",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
  marginBottom: "15px"
};

const title = {
  fontSize: "24px",
  marginBottom: "8px"
};

const description = {
  color: "#cbd5e1",
  minHeight: "48px"
};

const price = {
  color: "#35d0c3",
  fontSize: "26px"
};

const statusBadge = (status) => ({
  display: "inline-block",
  padding: "7px 12px",
  borderRadius: "20px",
  marginBottom: "10px",
  background:
    status === "APPROVED"
      ? "#064e3b"
      : "#78350f",
  color:
    status === "APPROVED"
      ? "#86efac"
      : "#fde68a",
  fontWeight: "bold"
});

const riskBadge = (riskLevel) => ({
  display: "block",
  width: "fit-content",
  marginTop: "8px",
  marginBottom: "12px",
  padding: "7px 12px",
  borderRadius: "20px",
  background:
    riskLevel === "Alto"
      ? "#7f1d1d"
      : riskLevel === "Medio"
        ? "#78350f"
        : "#064e3b",
  color:
    riskLevel === "Alto"
      ? "#fecaca"
      : riskLevel === "Medio"
        ? "#fde68a"
        : "#86efac",
  fontWeight: "bold"
});

const detailsButton = {
  flex: 1,
  background: "#35d0c3",
  color: "#020617",
  textAlign: "center",
  textDecoration: "none",
  padding: "11px",
  borderRadius: "10px",
  fontWeight: "bold"
};

const buyButton = {
  flex: 1,
  background: "#1d4ed8",
  color: "white",
  textAlign: "center",
  textDecoration: "none",
  padding: "11px",
  borderRadius: "10px",
  fontWeight: "bold"
};

export default ProductCard;