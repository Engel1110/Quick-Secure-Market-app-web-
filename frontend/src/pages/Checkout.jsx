import { useParams, useNavigate } from "react-router-dom";

function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleConfirmPurchase = () => {
    const newOrder = {
      orderCode:
        "QSM-" +
        Date.now().toString().slice(-6),

      productId: id,

      status: "HELD",

      paymentStatus: "ESCROW_HELD",

      deliveryPin: Math.floor(
        100000 + Math.random() * 900000
      ),

      createdAt: new Date().toLocaleString()
    };

    localStorage.setItem(
      "qsm_last_order",
      JSON.stringify(newOrder)
    );

    navigate("/orders");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050b1f",
        color: "white",
        padding: "40px"
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto"
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "10px"
          }}
        >
          Checkout Seguro QSM
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#94a3b8",
            marginBottom: "30px"
          }}
        >
          Producto ID: {id}
        </p>

        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e3a5f",
            borderRadius: "20px",
            padding: "30px"
          }}
        >
          <h2
            style={{
              textAlign: "center",
              marginBottom: "20px"
            }}
          >
            🛡 Escrow Protection
          </h2>

          <div
            style={{
              background: "#0c1838",
              border: "1px solid #35d0c3",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "25px"
            }}
          >
            <p>
              Tu dinero será retenido por
              Quick Secure Market.
            </p>

            <p>
              El vendedor recibirá el pago
              únicamente cuando confirmes
              la recepción del producto.
            </p>
          </div>

          <div
            style={{
              background: "#111827",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "25px"
            }}
          >
            <h3>¿Cómo funciona?</h3>

            <p>1. Compras el producto.</p>

            <p>
              2. QSM retiene el dinero.
            </p>

            <p>
              3. El vendedor envía el producto.
            </p>

            <p>
              4. Confirmas recepción.
            </p>

            <p>
              5. QSM libera el pago.
            </p>
          </div>

          <button
            onClick={handleConfirmPurchase}
            style={{
              width: "100%",
              background: "#35d0c3",
              color: "#000",
              border: "none",
              padding: "16px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "18px"
            }}
          >
            Confirmar Compra
          </button>
        </div>
      </div>
    </div>
  );
}

export default Checkout;