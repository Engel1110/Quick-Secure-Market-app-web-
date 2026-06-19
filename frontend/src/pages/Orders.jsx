function Orders() {
  const order = JSON.parse(localStorage.getItem("qsm_last_order"));

  if (!order) {
    return (
      <div style={page}>
        <h1>Mis Órdenes</h1>
        <p>No tienes órdenes creadas todavía.</p>
      </div>
    );
  }

  const statusText = {
    HELD: "Pago retenido",
    IN_STORAGE: "En almacén QSM",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    RELEASED: "Pago liberado"
  };

  const paymentText = {
    ESCROW_HELD: "Pago retenido en garantía",
    RELEASED: "Pago liberado al vendedor",
    REFUNDED: "Reembolsado al comprador"
  };

  return (
    <div style={page}>
      <h1>Orden creada correctamente ✅</h1>

      <div style={card}>
        <h2>Orden #{order.orderCode}</h2>

        <p><strong>Producto ID:</strong> {order.productId}</p>
        <p><strong>Estado:</strong> 🟡 {statusText[order.status] || order.status}</p>
        <p><strong>Pago:</strong> {paymentText[order.paymentStatus] || order.paymentStatus}</p>
        <p><strong>PIN de entrega:</strong> {order.deliveryPin}</p>

        <div style={progressBox}>
          <h3>Estado del proceso QSM</h3>
          <p>✅ Compra creada</p>
          <p>🟡 Dinero retenido por QSM</p>
          <p>📦 Pendiente de envío / almacén</p>
          <p>🚚 Pendiente de entrega</p>
          <p>💰 Pendiente de liberación de pago</p>
        </div>

        <div style={escrowBox}>
          Dinero retenido por QSM hasta que el comprador confirme recepción.
        </div>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#050b1f",
  color: "white",
  padding: "40px",
  textAlign: "center"
};

const card = {
  maxWidth: "700px",
  margin: "30px auto",
  background: "#111827",
  border: "1px solid #223047",
  borderRadius: "18px",
  padding: "30px"
};

const progressBox = {
  marginTop: "22px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "14px",
  padding: "18px",
  textAlign: "left"
};

const escrowBox = {
  marginTop: "20px",
  background: "#0c1838",
  border: "1px solid #35d0c3",
  borderRadius: "12px",
  padding: "15px"
};

export default Orders;