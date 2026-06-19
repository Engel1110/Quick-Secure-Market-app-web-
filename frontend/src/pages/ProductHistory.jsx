import { useParams, useNavigate } from "react-router-dom";

function ProductHistory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const history = [
    {
      owner: "Carlos Gómez",
      type: "Vendedor original",
      date: "Enero 2026",
      status: "Verificado por QSM"
    },
    {
      owner: "Ana Pérez",
      type: "Compradora",
      date: "Marzo 2026",
      status: "Compra protegida por Escrow"
    },
    {
      owner: "Engel Feliz",
      type: "Propietario actual",
      date: "Junio 2026",
      status: "Producto validado"
    }
  ];

  return (
    <div style={page}>
      <button onClick={() => navigate(`/product/${id}`)} style={backButton}>
        ← Volver al producto
      </button>

      <h1>Historial de Propietarios QSM</h1>
      <p style={{ color: "#94a3b8" }}>
        Producto ID: {id}
      </p>

      <div style={card}>
        <h2>Cadena de propiedad</h2>

        {history.map((item, index) => (
          <div key={index} style={timelineItem}>
            <div style={circle}>{index + 1}</div>

            <div>
              <h3>{item.owner}</h3>
              <p><strong>Tipo:</strong> {item.type}</p>
              <p><strong>Fecha:</strong> {item.date}</p>
              <p><strong>Estado:</strong> {item.status}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={infoBox}>
        Este historial ayuda a prevenir fraudes, duplicaciones y reventas sospechosas.
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#050b1f",
  color: "white",
  padding: "40px"
};

const backButton = {
  background: "#35d0c3",
  color: "#000",
  border: "none",
  padding: "10px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  marginBottom: "30px",
  fontWeight: "bold"
};

const card = {
  maxWidth: "750px",
  marginTop: "30px",
  background: "#111827",
  border: "1px solid #223047",
  borderRadius: "18px",
  padding: "30px"
};

const timelineItem = {
  display: "flex",
  gap: "20px",
  borderBottom: "1px solid #223047",
  padding: "20px 0"
};

const circle = {
  minWidth: "42px",
  height: "42px",
  borderRadius: "50%",
  background: "#35d0c3",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold"
};

const infoBox = {
  maxWidth: "750px",
  marginTop: "25px",
  background: "#0c1838",
  border: "1px solid #35d0c3",
  borderRadius: "12px",
  padding: "18px"
};

export default ProductHistory;