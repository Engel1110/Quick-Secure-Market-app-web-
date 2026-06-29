import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/products/${id}`);
      setProduct(response.data.product);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la información del producto.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPurchase = async () => {
    try {
      setCreatingOrder(true);
      setError("");

      const response = await api.post("/orders", {
        productId: id
      });

      localStorage.setItem(
        "qsm_last_order",
        JSON.stringify(response.data.order)
      );

      navigate("/orders");
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "No se pudo crear la orden. Verifica que hayas iniciado sesión."
      );
    } finally {
      setCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <div style={page}>
        <div style={card}>
          <h1>Cargando compra segura...</h1>
          <p style={muted}>QSM está consultando el producto.</p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div style={page}>
        <div style={card}>
          <h1>No pudimos cargar el checkout</h1>
          <p style={errorText}>{error}</p>
          <Link to="/marketplace" style={buttonSecondary}>
            Volver al Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const seller = product?.seller || {};
  const price = Number(product?.price || 0);
  const protectionFee = 0;
  const shipping = 0;
  const total = price + protectionFee + shipping;

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
        <div style={topBar}>
          <Link to={`/product/${id}`} style={backButton}>
            ← Volver al producto
          </Link>

          <Link to="/marketplace" style={backButton}>
            Marketplace
          </Link>
        </div>

        <section style={header}>
          <p style={label}>COMPRA SEGURA QSM</p>
          <h1 style={title}>Checkout con Pago Protegido</h1>
          <p style={subtitle}>
            Tu dinero queda retenido por QSM hasta que confirmes que recibiste
            el producto correctamente.
          </p>
        </section>

        {error && <div style={errorBox}>{error}</div>}

        <section style={grid}>
          <div style={leftColumn}>
            <div style={card}>
              <h2>Producto</h2>

              <div style={productBox}>
                <img
                  src={getProductImage(product)}
                  alt={product.title}
                  style={productImage}
                />

                <div>
                  <h3 style={productTitle}>{product.title}</h3>
                  <p style={muted}>{product.description}</p>

                  <div style={pillRow}>
                    <span style={pill}>{formatCondition(product.condition)}</span>
                    <span style={pill}>{product.category}</span>
                    <span style={pill}>Pago Protegido</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={card}>
              <h2>Vendedor</h2>

              <div style={sellerBox}>
                <div style={avatar}>
                  {seller.firstName?.charAt(0)?.toUpperCase() || "V"}
                </div>

                <div>
                  <h3 style={sellerName}>
                    {seller.firstName || "Vendedor"} {seller.lastName || ""}
                  </h3>

                  <p style={muted}>{seller.email || "Correo no disponible"}</p>

                  <strong style={trustText}>
                    Nivel de confianza: {seller.trustScore || 50}/100
                  </strong>
                </div>
              </div>
            </div>

            <div style={card}>
              <h2>¿Cómo funciona el Pago Protegido?</h2>

              <div style={steps}>
                <Step number="1" title="Compras el producto" text="QSM crea una orden segura." />
                <Step number="2" title="QSM retiene el dinero" text="El vendedor todavía no recibe el pago." />
                <Step number="3" title="El vendedor entrega" text="Se coordina la entrega del producto." />
                <Step number="4" title="Confirmas recepción" text="Validas que todo esté correcto." />
                <Step number="5" title="QSM libera el pago" text="El vendedor recibe el dinero." />
              </div>
            </div>
          </div>

          <aside style={rightColumn}>
            <div style={summaryCard}>
              <h2>Resumen de compra</h2>

              <Line title="Producto" value={product.title} />
              <Line title="Subtotal" value={formatMoney(price)} />
              <Line title="Protección QSM" value="Incluida" />
              <Line title="Envío" value={shipping === 0 ? "A coordinar" : formatMoney(shipping)} />

              <div style={totalLine}>
                <span>Total</span>
                <strong>{formatMoney(total)}</strong>
              </div>

              <div style={secureBox}>
                <strong>🛡 Pago Protegido activo</strong>
                <p>
                  El pago queda retenido hasta que confirmes la recepción del
                  producto.
                </p>
              </div>

              <button
                onClick={handleConfirmPurchase}
                disabled={creatingOrder}
                style={{
                  ...buttonPrimary,
                  opacity: creatingOrder ? 0.65 : 1,
                  cursor: creatingOrder ? "not-allowed" : "pointer"
                }}
              >
                {creatingOrder ? "Creando orden..." : "Confirmar compra segura"}
              </button>

              <p style={smallNote}>
                Al confirmar, QSM creará una orden en el backend y dejará el
                pago en estado retenido.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div style={step}>
      <div style={stepNumber}>{number}</div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function Line({ title, value }) {
  return (
    <div style={line}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getProductImage(product) {
  if (product?.images && product.images.length > 0) {
    const firstImage = product.images[0];

    if (typeof firstImage === "string" && firstImage.startsWith("http")) {
      return firstImage;
    }
  }

  const title = (product?.title || "").toLowerCase();
  const category = (product?.category || "").toLowerCase();

  if (title.includes("ps5") || title.includes("playstation") || category.includes("gaming")) {
    return "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=90";
  }

  if (title.includes("iphone") || title.includes("celular")) {
    return "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=90";
  }

  if (title.includes("laptop") || title.includes("macbook")) {
    return "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=90";
  }

  return "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&w=900&q=90";
}

function formatCondition(condition) {
  const map = {
    NEW: "Nuevo",
    LIKE_NEW: "Como nuevo",
    USED_GOOD: "Buen estado",
    USED_DETAILS: "Usado con detalles",
    FOR_PARTS: "Para piezas"
  };

  return map[condition] || "No especificado";
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
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(53,208,195,0.12), transparent 35%), #020617",
  color: "white"
};

const container = {
  maxWidth: "1450px",
  margin: "0 auto",
  padding: "34px 28px 70px"
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "28px"
};

const backButton = {
  color: "#cbd5e1",
  textDecoration: "none",
  background: "rgba(15,23,42,0.72)",
  border: "1px solid rgba(53,208,195,0.18)",
  padding: "12px 16px",
  borderRadius: "14px",
  fontWeight: "800"
};

const header = {
  textAlign: "center",
  marginBottom: "34px",
  animation: "fadeUp .5s ease"
};

const label = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "900"
};

const title = {
  fontSize: "clamp(38px, 5vw, 64px)",
  margin: "10px 0",
  lineHeight: 1.05
};

const subtitle = {
  color: "#cbd5e1",
  fontSize: "18px",
  maxWidth: "780px",
  margin: "0 auto",
  lineHeight: "30px"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 420px",
  gap: "24px",
  alignItems: "start"
};

const leftColumn = {
  display: "grid",
  gap: "20px"
};

const rightColumn = {
  position: "sticky",
  top: "24px"
};

const card = {
  background: "rgba(15,23,42,0.72)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 24px 80px rgba(0,0,0,0.35)"
};

const productBox = {
  display: "grid",
  gridTemplateColumns: "220px minmax(0, 1fr)",
  gap: "20px",
  alignItems: "center"
};

const productImage = {
  width: "220px",
  height: "180px",
  objectFit: "cover",
  borderRadius: "20px",
  border: "1px solid rgba(53,208,195,0.18)"
};

const productTitle = {
  fontSize: "30px",
  margin: "0 0 10px"
};

const muted = {
  color: "#94a3b8",
  lineHeight: "26px"
};

const pillRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "14px"
};

const pill = {
  background: "rgba(53,208,195,0.12)",
  color: "#67fff1",
  border: "1px solid rgba(53,208,195,0.24)",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px"
};

const sellerBox = {
  display: "flex",
  alignItems: "center",
  gap: "16px"
};

const avatar = {
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
  fontWeight: "900"
};

const sellerName = {
  margin: 0,
  fontSize: "24px"
};

const trustText = {
  color: "#35d0c3"
};

const steps = {
  display: "grid",
  gap: "14px"
};

const step = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  background: "rgba(2,6,23,0.45)",
  border: "1px solid rgba(148,163,184,0.10)",
  padding: "14px",
  borderRadius: "16px"
};

const stepNumber = {
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  background: "#35d0c3",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  flexShrink: 0
};

const summaryCard = {
  ...card,
  padding: "26px"
};

const line = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "15px 0",
  borderBottom: "1px solid rgba(148,163,184,0.12)",
  color: "#cbd5e1"
};

const totalLine = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "22px 0",
  fontSize: "24px",
  color: "#35d0c3"
};

const secureBox = {
  background: "rgba(53,208,195,0.10)",
  border: "1px solid rgba(53,208,195,0.28)",
  borderRadius: "18px",
  padding: "18px",
  color: "#cbd5e1",
  marginBottom: "18px"
};

const buttonPrimary = {
  width: "100%",
  background: "linear-gradient(135deg, #35d0c3, #2563eb)",
  color: "#020617",
  border: "none",
  padding: "17px",
  borderRadius: "16px",
  fontWeight: "900",
  fontSize: "16px"
};

const buttonSecondary = {
  display: "inline-block",
  background: "#35d0c3",
  color: "#020617",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "14px",
  fontWeight: "900"
};

const smallNote = {
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: "22px",
  textAlign: "center"
};

const errorBox = {
  background: "rgba(127,29,29,0.22)",
  border: "1px solid rgba(248,113,113,0.32)",
  color: "#fecaca",
  padding: "16px",
  borderRadius: "16px",
  marginBottom: "20px",
  textAlign: "center"
};

const errorText = {
  color: "#fecaca"
};

export default Checkout;