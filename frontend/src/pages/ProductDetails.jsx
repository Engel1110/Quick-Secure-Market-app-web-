import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import AiAssistant from "../components/AiAssistant";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const [activeImage, setActiveImage] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState([
    { from: "seller", text: "¡Hola! 👋 ¿En qué puedo ayudarte?", time: "10:30 AM" },
    { from: "buyer", text: "Hola, ¿el producto está disponible?", time: "10:31 AM" },
    { from: "seller", text: "Sí, está disponible y funciona correctamente.", time: "10:32 AM" }
  ]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      const loadedProduct = response.data.product;
      setProduct(loadedProduct);
      setActiveImage(getProductImage(loadedProduct));
    } catch (error) {
      console.error("Error cargando producto:", error);
      setError("Producto no encontrado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [id]);

  const riskLevel = useMemo(() => getRiskLevel(product), [product]);
  const isVerified = isProductVerified(product);
  const seller = product?.seller || {};

  const gallery = useMemo(() => {
    const main = getProductImage(product);

    return [
      main,
      product?.imageUrl,
      product?.secondaryImageUrl,
      product?.thirdImageUrl
    ].filter((img, index, arr) => img && img.startsWith("http") && arr.indexOf(img) === index);
  }, [product]);

  const sendMessage = () => {
    if (!chatMessage.trim()) return;

    setMessages([
      ...messages,
      {
        from: "buyer",
        text: chatMessage,
        time: "Ahora"
      }
    ]);

    setChatMessage("");
  };

  if (loading) {
    return (
      <div style={page}>
        <div style={centerBox}>
          <h2>Cargando perfil del producto...</h2>
          <p>QSM está preparando la información segura del producto.</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={page}>
        <div style={centerBox}>
          <h2>{error}</h2>
          <button onClick={() => navigate("/marketplace")} style={primaryButton}>
            Volver al Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          html, body, #root {
            width: 100%;
            min-height: 100%;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            background: #020617;
            font-family: 'Inter', system-ui, sans-serif;
          }

          input::placeholder {
            color: #64748b;
          }
        `}
      </style>

      <aside style={sidebar}>
        <Link to="/" style={brand}>
          <div style={brandIcon}>🛡</div>
          <div>
            <strong style={brandTitle}>QSM</strong>
            <span style={brandSub}>Quick Secure Market</span>
          </div>
        </Link>

        <nav style={menu}>
          <Link style={menuItem} to="/dashboard">🏠 Inicio</Link>
          <Link style={activeMenuItem} to="/marketplace">🛒 Marketplace</Link>
          <Link style={menuItem} to="/orders">📦 Mis órdenes</Link>
          <Link style={menuItem} to="/profile">👤 Mi perfil</Link>
          <Link style={menuItem} to="/marketing">📈 Marketing Center</Link>
          <Link style={menuItem} to="/disputes">⚖ Mis disputas</Link>
          <Link style={menuItem} to="/complete-profile">🧾 Verificación QSM</Link>
        </nav>

        <div style={aiSideCard}>
          <h3>🤖 QSM AI</h3>
          <p>
            Analizamos señales del producto, vendedor, precio, historial y riesgo para ayudarte a comprar seguro.
          </p>
        </div>
      </aside>

      <main style={main}>
        <header style={topbar}>
          <button onClick={() => navigate("/marketplace")} style={backButton}>
            ← Marketplace
          </button>

          <div style={searchBox}>
            <span>🔎</span>
            <input placeholder="Buscar productos seguros..." style={searchInput} />
          </div>

          <div style={userMini}>
            <div style={userAvatar}>
              {seller.firstName?.charAt(0) || "U"}
            </div>
            <div>
              <strong>{seller.firstName || "Usuario"} {seller.lastName || "QSM"}</strong>
              <p>{seller.isVerified ? "Verificado" : "Pendiente"}</p>
            </div>
          </div>
        </header>

        <div style={breadcrumb}>
          Marketplace › {product.category || "Categoría"} › {product.title}
        </div>

        <section style={productHero}>
          <div style={galleryCard}>
            <div style={imageStage}>
              {activeImage ? (
                <img src={activeImage} alt={product.title} style={mainImage} />
              ) : (
                <div style={noImage}>📦 Sin imagen</div>
              )}

              <span style={verifiedBadge(isVerified)}>
                {isVerified ? "QSM Verified" : "Pendiente QSM"}
              </span>

              <button style={favoriteButton}>♡</button>
            </div>

            <div style={thumbRow}>
              {gallery.length > 0 ? (
                gallery.map((img) => (
                  <button
                    key={img}
                    onClick={() => setActiveImage(img)}
                    style={activeImage === img ? thumbActive : thumb}
                  >
                    <img src={img} alt="Miniatura" style={thumbImage} />
                  </button>
                ))
              ) : (
                <div style={emptyThumb}>Sin galería disponible</div>
              )}
            </div>
          </div>

          <div style={productCard}>
            <div style={productTitleRow}>
              <div>
                <h1 style={productTitle}>{product.title}</h1>
                <p style={productSubtitle}>
                  {product.condition || "Condición no especificada"} · {product.category || "Sin categoría"}
                </p>
                <p style={published}>
                  Publicado el {product.createdAt ? formatDate(product.createdAt) : "fecha pendiente"}
                </p>
              </div>

              <span style={productVerifiedTag(isVerified)}>
                {isVerified ? "Producto Verificado" : "En revisión"}
              </span>
            </div>

            <h2 style={price}>RD$ {formatMoney(product.price)}</h2>

            <p style={aiPriceText}>Precio evaluado por QSM AI según señales del producto.</p>

            <div style={specGrid}>
              <Spec title="Estado" value={product.condition || "No disponible"} />
              <Spec title="Garantía" value={product.warranty || "No aplica"} />
              <Spec title="Ubicación" value={product.location || "Santo Domingo, RD"} />
            </div>

            <button
              onClick={() => navigate(`/checkout/${product.id}`)}
              style={buyButton}
            >
              🔒 Comprar con pago protegido Escrow QSM
            </button>

            <button style={cartButton}>
              🛒 Agregar al carrito
            </button>

            <button style={reportButton}>
              🚩 Reportar producto
            </button>
          </div>

          <aside style={sellerCard}>
            <p style={sectionLabel}>Vendido por</p>

            <div style={sellerProfile}>
              <div style={sellerPhoto}>
                {seller.firstName?.charAt(0) || "U"}
              </div>

              <div>
                <strong>{seller.firstName || "Usuario"} {seller.lastName || "QSM"}</strong>
                <p>@{generateUsername(seller.firstName, seller.lastName)}</p>
                <span style={sellerBadge(seller.isVerified)}>
                  {seller.isVerified ? "Verificado" : "Pendiente"}
                </span>
              </div>
            </div>

            <div style={trustBox}>
              <h3>Trust Score</h3>
              <h2>{seller.trustScore || 60}/100</h2>
              <p>{getTrustLevel(seller.trustScore || 60)}</p>
              <div style={track}>
                <div style={{ ...fill, width: `${seller.trustScore || 60}%` }}></div>
              </div>
            </div>

            <InfoLine title="Miembro desde" value="Enero 2026" />
            <InfoLine title="Productos vendidos" value={seller.productsSold || 0} />
            <InfoLine title="Ventas completadas" value={seller.completedSales || 0} />
            <InfoLine title="Reseñas positivas" value={seller.positiveReviews ? `${seller.positiveReviews}%` : "Sin datos"} />

            <button style={sellerButton}>Ver perfil del vendedor</button>
          </aside>
        </section>

        <section style={tabs}>
          <button onClick={() => setActiveTab("description")} style={activeTab === "description" ? tabActive : tab}>
            Descripción
          </button>
          <button onClick={() => setActiveTab("details")} style={activeTab === "details" ? tabActive : tab}>
            Detalles
          </button>
          <button onClick={() => setActiveTab("ai")} style={activeTab === "ai" ? tabActive : tab}>
            Análisis QSM AI
          </button>
          <button onClick={() => setActiveTab("history")} style={activeTab === "history" ? tabActive : tab}>
            Historial
          </button>
          <button onClick={() => setActiveTab("shipping")} style={activeTab === "shipping" ? tabActive : tab}>
            Envíos y devoluciones
          </button>
        </section>

        <section style={belowGrid}>
          <div style={leftContent}>
            <div style={panel}>
              {activeTab === "description" && (
                <>
                  <h2>Descripción del vendedor</h2>
                  <p style={paragraph}>
                    {product.description || "El vendedor no ha agregado una descripción detallada todavía."}
                  </p>
                </>
              )}

              {activeTab === "details" && (
                <>
                  <h2>Detalles del producto</h2>
                  <InfoLine title="Código QSM" value={product.qsmCode || "Pendiente"} />
                  <InfoLine title="Categoría" value={product.category || "No disponible"} />
                  <InfoLine title="Condición" value={product.condition || "No disponible"} />
                  <InfoLine title="Estado QSM" value={formatStatus(product.status)} />
                  <InfoLine title="Verificación" value={formatStatus(product.verificationStatus)} />
                </>
              )}

              {activeTab === "ai" && (
                <>
                  <h2>Análisis QSM AI</h2>
                  <p style={paragraph}>
                    QSM AI evalúa el producto usando señales de precio, vendedor, historial,
                    descripción, imágenes, reportes y comportamiento de riesgo.
                  </p>

                  <div style={checkList}>
                    <Check text="Vendedor identificado en la plataforma" />
                    <Check text="Precio evaluado dentro del rango esperado" />
                    <Check text="Historial del producto disponible" />
                    <Check text={hasAlerts(product) ? "Existen alertas que deben revisarse" : "Sin alertas críticas activas"} />
                  </div>
                </>
              )}

              {activeTab === "history" && (
                <>
                  <h2>Historial del producto</h2>
                  <Timeline title="Producto publicado" text="El producto fue creado en QSM." />
                  <Timeline title="Revisión QSM" text="La plataforma evaluó la información del producto." />
                  <Timeline title="Análisis IA" text={`Riesgo actual: ${riskLevel}.`} />
                  <Timeline title="Código único" text={product.qsmCode || "Código pendiente de asignación."} />
                </>
              )}

              {activeTab === "shipping" && (
                <>
                  <h2>Envíos y devoluciones</h2>
                  <p style={paragraph}>
                    La entrega debe ser acordada entre comprador y vendedor. QSM recomienda lugares seguros,
                    evidencia de entrega y uso de escrow para proteger el pago.
                  </p>
                </>
              )}
            </div>

            <div style={insightGrid}>
              <div style={panel}>
                <div style={panelHeader}>
                  <h2>Análisis QSM AI</h2>
                  <span style={riskBadge(riskLevel)}>Riesgo {riskLevel}</span>
                </div>

                <p style={paragraph}>
                  Nuestra IA determinó este nivel de riesgo según la información disponible del producto.
                </p>

                <div style={checkList}>
                  <Check text="Vendedor con información registrada" />
                  <Check text="Precio revisado por QSM AI" />
                  <Check text="Descripción del vendedor disponible" />
                  <Check text={hasAlerts(product) ? "Alertas pendientes de revisión" : "Sin alertas activas"} />
                </div>
              </div>

              <div style={panel}>
                <h2>Certificación QSM</h2>

                <div style={certBox}>
                  <div style={certIcon}>🛡</div>
                  <div>
                    <strong>{isVerified ? "Producto verificado por QSM" : "Producto pendiente de revisión"}</strong>
                    <p>
                      QSM valida señales del vendedor, producto, historial e información disponible.
                    </p>
                  </div>
                </div>

                <div style={checkList}>
                  <Check text="Identidad del vendedor revisada" />
                  <Check text="Producto analizado por IA" />
                  <Check text="Historial consultado" />
                  <Check text={`Riesgo ${riskLevel.toLowerCase()} registrado`} />
                </div>

                <p style={codeLine}>
                  Código único: <strong>{product.qsmCode || "Pendiente"}</strong>
                </p>
              </div>
            </div>
          </div>

          <aside style={chatCard}>
            <div style={chatHeader}>
              <strong>Chat con el vendedor</strong>
              <span>● En línea</span>
            </div>

            <div style={chatBody}>
              {messages.map((message, index) => (
                <div
                  key={index}
                  style={message.from === "buyer" ? buyerMessage : sellerMessage}
                >
                  <p>{message.text}</p>
                  <small>{message.time}</small>
                </div>
              ))}
            </div>

            <div style={chatInputRow}>
              <input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Escribe tu mensaje..."
                style={chatInput}
              />
              <button onClick={sendMessage} style={sendButton}>➤</button>
            </div>
          </aside>
        </section>

        <section style={benefitRow}>
          <Benefit icon="💎" title="Pago protegido" text="Tu dinero se mantiene seguro con escrow QSM." />
          <Benefit icon="🧾" title="Identidad verificada" text="Vendedores revisados para mayor confianza." />
          <Benefit icon="🤖" title="IA antifraude" text="Analizamos cada producto para evitar fraudes." />
          <Benefit icon="⚖️" title="Disputas protegidas" text="Si tienes problemas, QSM revisa tu caso." />
        </section>
      </main>

      <AiAssistant pageContext="product" />
    </div>
  );
}

function Spec({ title, value }) {
  return (
    <div style={spec}>
      <p>{title}</p>
      <strong>{value}</strong>
    </div>
  );
}

function InfoLine({ title, value }) {
  return (
    <div style={infoLine}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Check({ text }) {
  return (
    <div style={check}>
      <span>✅</span>
      <p>{text}</p>
    </div>
  );
}

function Timeline({ title, text }) {
  return (
    <div style={timeline}>
      <div style={timelineDot}></div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function Benefit({ icon, title, text }) {
  return (
    <div style={benefit}>
      <div style={benefitIcon}>{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function getProductImage(product) {
  if (product?.imageUrl?.startsWith("http")) return product.imageUrl;
  return "";
}

function isProductVerified(product) {
  return (
    product?.status === "CERTIFIED" ||
    product?.verificationStatus === "CERTIFIED" ||
    product?.seller?.isVerified
  );
}

function hasAlerts(product) {
  return product?.fraudAlerts?.length > 0;
}

function getRiskLevel(product) {
  if (!product?.fraudAlerts || product.fraudAlerts.length === 0) return "Bajo";

  const hasHigh = product.fraudAlerts.some((alert) => alert.level === "HIGH");
  const hasMedium = product.fraudAlerts.some((alert) => alert.level === "MEDIUM");

  if (hasHigh) return "Alto";
  if (hasMedium) return "Medio";
  return "Bajo";
}

function formatStatus(status) {
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
}

function generateUsername(firstName, lastName) {
  const first = firstName ? firstName.toLowerCase().replaceAll(" ", "") : "usuario";
  const last = lastName ? lastName.toLowerCase().replaceAll(" ", "") : "qsm";
  return `${first}${last}`;
}

function getTrustLevel(score) {
  if (score >= 90) return "Nivel alto";
  if (score >= 70) return "Nivel medio";
  return "Nivel inicial";
}

function formatMoney(value) {
  if (!value) return "0";
  return Number(value).toLocaleString("es-DO");
}

function formatDate(date) {
  try {
    return new Date(date).toLocaleDateString("es-DO", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return "fecha pendiente";
  }
}

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(53,208,195,0.10), transparent 35%), #020617",
  color: "white",
  display: "grid",
  gridTemplateColumns: "260px minmax(0, 1fr)",
  overflowX: "hidden"
};

const sidebar = {
  minHeight: "100vh",
  background: "rgba(8,17,35,0.94)",
  borderRight: "1px solid rgba(53,208,195,0.18)",
  padding: "28px 16px",
  position: "sticky",
  top: 0
};

const brand = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "white",
  textDecoration: "none",
  marginBottom: "40px"
};

const brandIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  border: "1px solid rgba(53,208,195,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#35d0c3"
};

const brandTitle = {
  display: "block",
  fontSize: "28px",
  lineHeight: "28px"
};

const brandSub = {
  color: "#94a3b8",
  fontSize: "12px"
};

const menu = {
  display: "grid",
  gap: "11px"
};

const menuItem = {
  color: "#cbd5e1",
  textDecoration: "none",
  padding: "13px 14px",
  borderRadius: "15px",
  background: "rgba(15,23,42,0.38)",
  border: "1px solid rgba(148,163,184,0.10)",
  fontWeight: "700",
  fontSize: "15px"
};

const activeMenuItem = {
  ...menuItem,
  background: "rgba(53,208,195,0.14)",
  border: "1px solid rgba(53,208,195,0.35)",
  color: "#35d0c3"
};

const aiSideCard = {
  marginTop: "34px",
  background: "rgba(53,208,195,0.08)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "22px",
  padding: "20px",
  color: "#cbd5e1"
};

const main = {
  width: "100%",
  minWidth: 0,
  maxWidth: "1740px",
  margin: "0 auto",
  padding: "28px 34px 60px",
  overflowX: "hidden"
};

const topbar = {
  display: "grid",
  gridTemplateColumns: "160px minmax(0, 1fr) 260px",
  alignItems: "center",
  gap: "18px",
  marginBottom: "24px"
};

const backButton = {
  background: "rgba(15,23,42,0.58)",
  color: "#cbd5e1",
  border: "1px solid rgba(53,208,195,0.18)",
  padding: "13px 15px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "800"
};

const searchBox = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "rgba(15,23,42,0.72)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "18px",
  padding: "0 16px"
};

const searchInput = {
  width: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "white",
  padding: "16px 0",
  fontSize: "15px"
};

const userMini = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "rgba(15,23,42,0.52)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "18px",
  padding: "12px"
};

const userAvatar = {
  width: "46px",
  height: "46px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900"
};

const breadcrumb = {
  color: "#94a3b8",
  marginBottom: "22px"
};

const productHero = {
  display: "grid",
  gridTemplateColumns: "minmax(360px, 1fr) minmax(420px, 1fr) 330px",
  gap: "24px",
  alignItems: "stretch",
  marginBottom: "24px"
};

const galleryCard = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "26px",
  padding: "18px",
  minWidth: 0
};

const imageStage = {
  height: "470px",
  position: "relative",
  borderRadius: "22px",
  overflow: "hidden",
  background: "rgba(2,6,23,0.70)"
};

const mainImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const noImage = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#64748b",
  fontSize: "54px"
};

const verifiedBadge = (verified) => ({
  position: "absolute",
  top: "14px",
  left: "14px",
  background: verified ? "rgba(34,197,94,0.18)" : "rgba(245,158,11,0.18)",
  color: verified ? "#86efac" : "#fde68a",
  border: verified
    ? "1px solid rgba(34,197,94,0.32)"
    : "1px solid rgba(245,158,11,0.32)",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px"
});

const favoriteButton = {
  position: "absolute",
  top: "14px",
  right: "14px",
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  background: "rgba(2,6,23,0.72)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
  cursor: "pointer"
};

const thumbRow = {
  display: "flex",
  gap: "12px",
  marginTop: "14px",
  overflowX: "auto"
};

const thumb = {
  width: "76px",
  height: "76px",
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,0.14)",
  background: "rgba(2,6,23,0.58)",
  padding: 0,
  overflow: "hidden",
  cursor: "pointer"
};

const thumbActive = {
  ...thumb,
  border: "2px solid #35d0c3"
};

const thumbImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const emptyThumb = {
  color: "#94a3b8",
  padding: "20px"
};

const productCard = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "26px",
  padding: "26px",
  minWidth: 0
};

const productTitleRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start"
};

const productTitle = {
  fontSize: "36px",
  lineHeight: "42px",
  margin: "0 0 8px"
};

const productSubtitle = {
  color: "#cbd5e1",
  margin: 0
};

const published = {
  color: "#94a3b8"
};

const productVerifiedTag = (verified) => ({
  background: verified ? "rgba(14,165,233,0.16)" : "rgba(245,158,11,0.16)",
  color: verified ? "#7dd3fc" : "#fde68a",
  border: verified
    ? "1px solid rgba(14,165,233,0.28)"
    : "1px solid rgba(245,158,11,0.28)",
  padding: "8px 11px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap"
});

const price = {
  color: "#35d0c3",
  fontSize: "40px",
  margin: "28px 0 8px"
};

const aiPriceText = {
  color: "#94a3b8",
  marginBottom: "24px"
};

const specGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "12px",
  marginBottom: "22px"
};

const spec = {
  background: "rgba(2,6,23,0.46)",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: "18px",
  padding: "16px"
};

const buyButton = {
  width: "100%",
  background: "linear-gradient(135deg, #35d0c3, #2563eb)",
  color: "#020617",
  border: "none",
  padding: "16px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "14px"
};

const cartButton = {
  ...buyButton,
  background: "rgba(15,23,42,0.72)",
  color: "white",
  border: "1px solid rgba(148,163,184,0.18)"
};

const reportButton = {
  ...buyButton,
  background: "rgba(127,29,29,0.12)",
  color: "#fca5a5",
  border: "1px solid rgba(248,113,113,0.28)",
  marginBottom: 0
};

const sellerCard = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "26px",
  padding: "24px",
  minWidth: 0
};

const sectionLabel = {
  color: "#94a3b8",
  marginTop: 0
};

const sellerProfile = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
  marginBottom: "22px"
};

const sellerPhoto = {
  width: "76px",
  height: "76px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
  fontWeight: "900",
  flexShrink: 0
};

const sellerBadge = (verified) => ({
  display: "inline-block",
  marginTop: "8px",
  padding: "6px 10px",
  borderRadius: "999px",
  background: verified ? "rgba(34,197,94,0.18)" : "rgba(245,158,11,0.18)",
  color: verified ? "#86efac" : "#fde68a",
  fontWeight: "900",
  fontSize: "12px"
});

const trustBox = {
  background: "rgba(2,6,23,0.50)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "20px",
  padding: "18px",
  marginBottom: "18px"
};

const track = {
  height: "10px",
  background: "rgba(148,163,184,0.18)",
  borderRadius: "999px",
  overflow: "hidden"
};

const fill = {
  height: "100%",
  background: "linear-gradient(90deg, #35d0c3, #7c3aed)"
};

const sellerButton = {
  width: "100%",
  background: "rgba(148,163,184,0.12)",
  color: "white",
  border: "1px solid rgba(148,163,184,0.18)",
  padding: "14px",
  borderRadius: "14px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "12px"
};

const tabs = {
  display: "flex",
  gap: "18px",
  borderBottom: "1px solid rgba(148,163,184,0.16)",
  marginBottom: "18px",
  overflowX: "auto"
};

const tab = {
  background: "transparent",
  color: "#94a3b8",
  border: "none",
  padding: "16px 0",
  cursor: "pointer",
  fontWeight: "900",
  whiteSpace: "nowrap"
};

const tabActive = {
  ...tab,
  color: "#35d0c3",
  borderBottom: "2px solid #35d0c3"
};

const belowGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 360px",
  gap: "24px",
  marginBottom: "28px"
};

const leftContent = {
  minWidth: 0
};

const panel = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "22px",
  padding: "24px",
  marginBottom: "18px",
  minWidth: 0
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center"
};

const paragraph = {
  color: "#cbd5e1",
  lineHeight: "28px"
};

const infoLine = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  padding: "13px 0",
  borderBottom: "1px solid rgba(148,163,184,0.12)",
  color: "#cbd5e1"
};

const checkList = {
  display: "grid",
  gap: "10px",
  marginTop: "16px"
};

const check = {
  display: "flex",
  gap: "10px",
  color: "#cbd5e1"
};

const insightGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px"
};

const riskBadge = (risk) => ({
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  background:
    risk === "Alto"
      ? "rgba(239,68,68,0.18)"
      : risk === "Medio"
        ? "rgba(245,158,11,0.18)"
        : "rgba(34,197,94,0.18)",
  color:
    risk === "Alto"
      ? "#fca5a5"
      : risk === "Medio"
        ? "#fde68a"
        : "#86efac"
});

const certBox = {
  display: "flex",
  gap: "16px",
  alignItems: "center",
  color: "#cbd5e1"
};

const certIcon = {
  width: "76px",
  height: "76px",
  borderRadius: "24px",
  background: "rgba(53,208,195,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
  flexShrink: 0
};

const codeLine = {
  color: "#cbd5e1",
  marginTop: "18px"
};

const timeline = {
  display: "flex",
  gap: "14px",
  padding: "14px 0",
  color: "#cbd5e1"
};

const timelineDot = {
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  background: "#35d0c3",
  marginTop: "6px",
  flexShrink: 0
};

const chatCard = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "22px",
  overflow: "hidden",
  minHeight: "520px",
  display: "grid",
  gridTemplateRows: "auto 1fr auto"
};

const chatHeader = {
  display: "flex",
  justifyContent: "space-between",
  padding: "18px",
  borderBottom: "1px solid rgba(148,163,184,0.12)"
};

const chatBody = {
  padding: "18px",
  display: "grid",
  gap: "12px",
  alignContent: "start"
};

const sellerMessage = {
  justifySelf: "start",
  maxWidth: "82%",
  background: "rgba(30,41,59,0.88)",
  padding: "12px",
  borderRadius: "16px",
  color: "#cbd5e1"
};

const buyerMessage = {
  justifySelf: "end",
  maxWidth: "82%",
  background: "rgba(37,99,235,0.88)",
  padding: "12px",
  borderRadius: "16px",
  color: "white"
};

const chatInputRow = {
  display: "flex",
  gap: "10px",
  padding: "14px",
  borderTop: "1px solid rgba(148,163,184,0.12)"
};

const chatInput = {
  flex: 1,
  background: "rgba(2,6,23,0.55)",
  border: "1px solid rgba(148,163,184,0.16)",
  color: "white",
  padding: "13px",
  borderRadius: "14px",
  outline: "none"
};

const sendButton = {
  width: "46px",
  borderRadius: "14px",
  border: "none",
  background: "#35d0c3",
  color: "#020617",
  cursor: "pointer",
  fontWeight: "900"
};

const benefitRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px"
};

const benefit = {
  display: "flex",
  gap: "14px",
  background: "rgba(15,23,42,0.45)",
  border: "1px solid rgba(53,208,195,0.12)",
  borderRadius: "18px",
  padding: "18px",
  color: "#cbd5e1"
};

const benefitIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "14px",
  background: "rgba(53,208,195,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0
};

const primaryButton = {
  background: "#35d0c3",
  color: "#020617",
  border: "none",
  padding: "14px 18px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900"
};

const centerBox = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center"
};

export default ProductDetails;