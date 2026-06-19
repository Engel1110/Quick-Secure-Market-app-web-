function QsmCertification({ product }) {
  const hasAlerts = product.fraudAlerts?.length > 0;

  const score = hasAlerts
    ? product.fraudAlerts.some((a) => a.level === "HIGH")
      ? 65
      : 82
    : 96;

  return (
    <div style={box}>
      <h3>🛡 Certificación QSM</h3>

      <p>✅ Identidad del vendedor verificada</p>
      <p>✅ Código único QSM asignado</p>
      <p>✅ Escrow protegido habilitado</p>
      <p>✅ Historial de propietarios disponible</p>
      <p>{hasAlerts ? "⚠ Producto con alertas pendientes" : "✅ Sin alertas críticas"}</p>

      <div style={scoreBox}>
        Nivel de confianza: <strong>{score}/100</strong>
      </div>
    </div>
  );
}

const box = {
  background: "#0f172a",
  border: "1px solid #35d0c3",
  borderRadius: "16px",
  padding: "18px",
  marginTop: "20px"
};

const scoreBox = {
  marginTop: "15px",
  background: "#063b2e",
  color: "#86efac",
  padding: "12px",
  borderRadius: "10px"
};

export default QsmCertification;