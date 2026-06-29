import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const [activeImage, setActiveImage] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "seller",
      text: "¡Hola! 👋 ¿En qué puedo ayudarte?",
      time: "10:30 AM"
    },
    {
      from: "buyer",
      text: "Hola, ¿el producto está disponible?",
      time: "10:31 AM"
    },
    {
      from: "seller",
      text: "Sí, todavía está disponible.",
      time: "10:32 AM"
    }
  ]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError("");

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

  const seller = product?.seller || {};
  const riskLevel = useMemo(() => getRiskLevel(product), [product]);
  const isVerified = isProductVerified(product);

  const gallery = useMemo(() => {
    if (!product) return [];

    const imagesFromArray = Array.isArray(product.images)
      ? product.images.filter((img) => typeof img === "string" && img.startsWith("http"))
      : [];

    const fallback = getProductImage(product);

    return [fallback, ...imagesFromArray]
      .filter(Boolean)
      .filter((img, index, arr) => arr.indexOf(img) === index);
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
          <h2>Cargando producto...</h2>
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
      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: #020617;
          font-family: 'Inter', system-ui, sans-serif;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulseGlow {
          0% { opacity: .55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: .55; transform: scale(1); }
        }

        .product-main-image {
          transition: transform .4s ease;
        }

        .product-main-image:hover {
          transform: scale(1.04);
        }

        input::placeholder {
          color: #64748b;
        }
      `}</style>

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
          <Link style={menuItem} to="/orders">📦 Mis compras</Link>
          <Link style={menuItem} to="/disputes">⚖ Mis reclamos</Link>
          <Link style={menuItem} to="/new-product">➕ Publicar producto</Link>
          <Link style={menuItem} to="/complete-profile">🧾 Verificar identidad</Link>
          <Link style={menuItem} to="/profile">👤 Mi perfil</Link>
        </nav>

        <div style={aiSideCard}>
          <h3>🤖 QSM AI</h3>
          <p>
            Analizamos señales del producto, vendedor, precio y riesgo para ayudarte a comprar seguro.
          </p>
        </div>
      </aside>

      <main style={main}>
        <Topbar />

        <div style={breadcrumb}>
          <button onClick={() => navigate("/marketplace")} style={backButton}>
            ← Volver al Marketplace
          </button>

          <span>
            Marketplace › {product.category || "Categoría"} › {product.title}
          </span>
        </div>

        <section style={productHero}>
          <div style={galleryCard}>
            <div style={imageStage}>
              <div style={imageGlow}></div>

              {activeImage ? (
                <img
                  className="product-main-image"
                  src={activeImage}
                  alt={product.title}
                  style={mainImage}
                />
              ) : (
                <div style={noImage}>📦 Sin imagen</div>
              )}

              <span style={verifiedBadge(isVerified)}>
                {isVerified ? "Vendedor verificado" : "Verificación pendiente"}
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
                  {formatCondition(product.condition)} · {product.category || "Sin categoría"}
                </p>
                <p style={published}>
                  Publicado el {product.createdAt ? formatDate(product.createdAt) : "fecha pendiente"}
                </p>
              </div>

              <span style={productVerifiedTag(isVerified)}>
                {isVerified ? "Producto confiable" : "En revisión"}
              </span>
            </div>

            <h2 style={price}>{formatMoney(product.price)}</h2>

            <p style={aiPriceText}>
              Precio evaluado por QSM según señales del producto, vendedor e historial.
            </p>

            <div style={specGrid}>
              <Spec title="Estado" value={formatCondition(product.condition)} />
              <Spec title="Calidad" value={formatQuality(product.quality)} />
              <Spec title="Ubicación" value={product.location || "República Dominicana"} />
            </div>

            <button
              onClick={() => navigate(`/checkout/${product._id}`)}
              style={buyButton}
            >
              🔒 Comprar con Pago Protegido
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
                {seller.firstName?.charAt(0)?.toUpperCase() || "V"}
              </div>

              <div>
                <strong>
                  {seller.firstName || "Vendedor"} {seller.lastName || ""}
                </strong>
                <p>@{generateUsername(seller.firstName, seller.lastName)}</p>
                <span style={sellerBadge(seller.isVerified)}>
                  {seller.isVerified ? "Identidad verificada" : "Identidad pendiente"}
                </span>
              </div>
            </div>

            <div style={trustBox}>
              <h3>Nivel de confianza</h3>
              <h2>{seller.trustScore || 50}/100</h2>
              <p>{getTrustLevel(seller.trustScore || 50)}</p>

              <div style={track}>
                <div style={{ ...fill, width: `${seller.trustScore || 50}%` }}></div>
              </div>
            </div>

            <InfoLine title="Miembro desde" value={seller.createdAt ? formatDate(seller.createdAt) : "Pendiente"} />
            <InfoLine title="Correo" value={seller.email || "No disponible"} />
            <InfoLine title="Estado" value={seller.isVerified ? "Verificado" : "Pendiente"} />
            <InfoLine title="Nivel" value={getTrustLevel(seller.trustScore || 50)} />

            <button
              style={sellerButton}
              onClick={() => navigate(`/seller/${seller._id || seller.id || ""}`)}
            >
              Ver perfil del vendedor
            </button>
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
            Análisis QSM
          </button>

          <button onClick={() => setActiveTab("history")} style={activeTab === "history" ? tabActive : tab}>
            Historial
          </button>

          <button onClick={() => setActiveTab("shipping")} style={activeTab === "shipping" ? tabActive : tab}>
            Entrega
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
                  <InfoLine title="ID del producto" value={product._id || "Pendiente"} />
                  <InfoLine title="Categoría" value={product.category || "No disponible"} />
                  <InfoLine title="Estado" value={formatCondition(product.condition)} />
                  <InfoLine title="Calidad" value={formatQuality(product.quality)} />
                  <InfoLine title="Estatus" value={formatStatus(product.status)} />
                  <InfoLine title="Puntaje de evidencia" value={`${product.confidenceScore || 70}/100`} />
                </>
              )}

              {activeTab === "ai" && (
                <>
                  <h2>Análisis QSM</h2>

                  <p style={paragraph}>
                    QSM evalúa el producto usando señales de precio, vendedor, descripción,
                    evidencia, historial y nivel de confianza.
                  </p>

                  <div style={checkList}>
                    <Check text="Vendedor registrado en la plataforma" />
                    <Check text={`Nivel de riesgo actual: ${riskLevel}`} />
                    <Check text={`Puntaje de evidencia: ${product.confidenceScore || 70}/100`} />
                    <Check text={product.riskLevel ? `Código interno de riesgo: ${formatRisk(product.riskLevel)}` : "Sin riesgo crítico activo"} />
                  </div>
                </>
              )}

              {activeTab === "history" && (
                <>
                  <h2>Historial del producto</h2>

                  <Timeline title="Producto publicado" text="El producto fue creado en QSM." />
                  <Timeline title="Revisión inicial" text="QSM revisó la información básica del producto." />
                  <Timeline title="Análisis de riesgo" text={`Resultado actual: ${riskLevel}.`} />
                  <Timeline title="Pago Protegido" text="Disponible para compras seguras dentro de la plataforma." />
                </>
              )}

              {activeTab === "shipping" && (
                <>
                  <h2>Entrega y protección</h2>
                  <p style={paragraph}>
                    La entrega debe ser acordada entre comprador y vendedor. QSM recomienda
                    lugares seguros, evidencia de entrega y uso de Pago Protegido para cuidar el dinero.
                  </p>
                </>
              )}
            </div>

            <div style={insightGrid}>
              <div style={panel}>
                <div style={panelHeader}>
                  <h2>Seguridad QSM</h2>
                  <span style={riskBadge(riskLevel)}>Riesgo {riskLevel}</span>
                </div>

                <p style={paragraph}>
                  El sistema clasifica este producto según la información disponible.
                </p>

                <div style={checkList}>
                  <Check text="Producto registrado en MongoDB" />
                  <Check text="Vendedor enlazado correctamente" />
                  <Check text="Pago Protegido disponible" />
                  <Check text="Mensajería protegida por IA preparada" />
                </div>
              </div>

              <div style={panel}>
                <h2>Protección del comprador</h2>

                <div style={certBox}>
                  <div style={certIcon}>🛡</div>
                  <div>
                    <strong>Pago Protegido QSM</strong>
                    <p>
                      El dinero se retiene hasta que el comprador confirme la entrega correcta.
                    </p>
                  </div>
                </div>

                <div style={checkList}>
                  <Check text="Dinero retenido durante la compra" />
                  <Check text="Chat protegido por IA antifraude" />
                  <Check text="Reclamos disponibles si ocurre un problema" />
                  <Check text="Historial del producto visible" />
                </div>
              </div>
            </div>
          </div>

          <aside style={chatCard}>
            <div style={chatHeader}>
              <strong>Chat con el vendedor</strong>
              <span>● Demo visual</span>
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
          <Benefit icon="💰" title="Pago Protegido" text="Tu dinero se mantiene seguro hasta confirmar la entrega." />
          <Benefit icon="🧾" title="Identidad verificada" text="Los vendedores pueden validar su identidad para generar confianza." />
          <Benefit icon="🤖" title="IA antifraude" text="QSM analiza mensajes y señales sospechosas." />
          <Benefit icon="⚖️" title="Reclamos protegidos" text="Si hay problemas, puedes abrir un reclamo con evidencia." />
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
  if (product?.images && product.images.length > 0) {
    const firstImage = product.images[0];

    if (typeof firstImage === "string" && firstImage.startsWith("http")) {
      return firstImage;
    }
  }

  const category = (product?.category || "").toLowerCase();
  const title = (product?.title || "").toLowerCase();

  if (title.includes("ps5") || title.includes("playstation") || category.includes("gaming")) {
    return "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=90";
  }

  if (title.includes("iphone") || title.includes("celular")) {
    return "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=90";
  }

  if (title.includes("laptop") || title.includes("macbook")) {
    return "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=90";
  }

  if (title.includes("watch") || title.includes("reloj")) {
    return "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=1200&q=90";
  }

  return "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&w=1200&q=90";
}

function isProductVerified(product) {
  return product?.seller?.isVerified || product?.isQsmVerified || false;
}

function getRiskLevel(product) {
  if (!product?.riskLevel) return "Bajo";

  const map = {
    LOW: "Bajo",
    MEDIUM: "Medio",
    HIGH: "Alto",
    CRITICAL: "Crítico"
  };

  return map[product.riskLevel] || "Bajo";
}

function formatRisk(value) {
  const map = {
    LOW: "Bajo",
    MEDIUM: "Medio",
    HIGH: "Alto",
    CRITICAL: "Crítico"
  };

  return map[value] || value || "Bajo";
}

function formatCondition(condition) {
  const map = {
    NEW: "Nuevo",
    LIKE_NEW: "Como nuevo",
    USED_GOOD: "Buen estado",
    USED_DETAILS: "Usado con detalles",
    FOR_PARTS: "Para piezas"
  };

  return map[condition] || "No disponible";
}

function formatQuality(quality) {
  const map = {
    EXCELLENT: "Excelente",
    GOOD: "Buena",
    FAIR: "Aceptable",
    DAMAGED: "Dañado",
    UNKNOWN: "No especificada"
  };

  return map[quality] || "No especificada";
}

function formatStatus(status) {
  const map = {
    ACTIVE: "Activo",
    PENDING: "Pendiente",
    SOLD: "Vendido",
    DISABLED: "Deshabilitado",
    COMPLETED: "Completado"
  };

  return map[status] || status || "No disponible";
}

function generateUsername(firstName, lastName) {
  const first = firstName ? firstName.toLowerCase().replaceAll(" ", "") : "vendedor";
  const last = lastName ? lastName.toLowerCase().replaceAll(" ", "") : "qsm";

  return `${first}${last}`;
}

function getTrustLevel(score) {
  if (score >= 90) return "Nivel alto";
  if (score >= 70) return "Nivel medio";
  return "Nivel inicial";
}

function formatMoney(value) {
  if (!value && value !== 0) return "RD$ 0";

  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(value);
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
  background: "rgba(8,17,35,0.96)",
  borderRight: "1px solid rgba(53,208,195,0.18)",
  padding: "22px 16px",
  position: "sticky",
  top: 0
};

const brand = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "white",
  textDecoration: "none",
  marginBottom: "34px"
};

const brandIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "15px",
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
  gap: "10px"
};

const menuItem = {
  color: "#cbd5e1",
  textDecoration: "none",
  padding: "13px 14px",
  borderRadius: "14px",
  background: "rgba(15,23,42,0.34)",
  border: "1px solid rgba(148,163,184,0.08)",
  fontWeight: "800"
};

const activeMenuItem = {
  ...menuItem,
  background: "rgba(53,208,195,0.14)",
  border: "1px solid rgba(53,208,195,0.42)",
  color: "#35d0c3"
};

const aiSideCard = {
  marginTop: "28px",
  background: "rgba(53,208,195,0.08)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "20px",
  padding: "18px",
  color: "#cbd5e1"
};

const main = {
  width: "100%",
  minWidth: 0,
  padding: "18px 28px 54px",
  overflowX: "hidden"
};

const breadcrumb = {
  color: "#94a3b8",
  margin: "14px 0 18px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap"
};

const backButton = {
  background: "rgba(15,23,42,0.58)",
  color: "#cbd5e1",
  border: "1px solid rgba(53,208,195,0.18)",
  padding: "12px 15px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "800"
};

const productHero = {
  display: "grid",
  gridTemplateColumns: "minmax(360px, 1fr) minmax(420px, 1fr) 330px",
  gap: "22px",
  alignItems: "stretch",
  marginBottom: "22px"
};

const galleryCard = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "24px",
  padding: "16px",
  minWidth: 0
};

const imageStage = {
  height: "470px",
  position: "relative",
  borderRadius: "22px",
  overflow: "hidden",
  background: "rgba(2,6,23,0.70)"
};

const imageGlow = {
  position: "absolute",
  inset: "20%",
  background: "radial-gradient(circle, rgba(53,208,195,0.22), transparent 65%)",
  filter: "blur(20px)",
  animation: "pulseGlow 4s ease-in-out infinite"
};

const mainImage = {
  position: "relative",
  zIndex: 2,
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
  zIndex: 3,
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
  zIndex: 3,
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
  borderRadius: "24px",
  padding: "24px",
  minWidth: 0
};

const productTitleRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "flex-start"
};

const productTitle = {
  fontSize: "34px",
  lineHeight: "40px",
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
  margin: "26px 0 8px"
};

const aiPriceText = {
  color: "#94a3b8",
  marginBottom: "22px"
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
  borderRadius: "24px",
  padding: "22px",
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
  marginBottom: "20px"
};

const sellerPhoto = {
  width: "72px",
  height: "72px",
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
  gap: "22px",
  marginBottom: "26px"
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
    risk === "Alto" || risk === "Crítico"
      ? "rgba(239,68,68,0.18)"
      : risk === "Medio"
      ? "rgba(245,158,11,0.18)"
      : "rgba(34,197,94,0.18)",
  color:
    risk === "Alto" || risk === "Crítico"
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
  width: "72px",
  height: "72px",
  borderRadius: "22px",
  background: "rgba(53,208,195,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
  flexShrink: 0
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