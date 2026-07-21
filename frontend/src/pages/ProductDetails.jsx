import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

const API_ORIGIN = String(
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const savedUser =
    safeJson(localStorage.getItem("qsm_user")) ||
    safeJson(localStorage.getItem("user")) ||
    {};

  const savedSettings =
    safeJson(localStorage.getItem("qsm_settings")) || {
      theme: localStorage.getItem("qsm_theme") || "dark",
      accentColor: localStorage.getItem("qsm_accent") || "cyan",
      language: localStorage.getItem("qsm_language") || "es",
      density: "comfortable",
      animations: true,
      glassEffect: true,
      compactSidebar: false
    };

  const [product, setProduct] = useState(null);
  const [settings, setSettings] = useState(savedSettings);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    localStorage.getItem("qsm_sidebar_collapsed") === "true"
  );
  const [activeImage, setActiveImage] = useState("");
  const [activeTab, setActiveTab] = useState("description");
  const [favorite, setFavorite] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const theme = settings.appearance || settings.theme || "dark";
  const isLight = String(theme).toLowerCase().includes("light");
  const accent = getAccentColor(settings.accentColor || settings.accent || "cyan");

  const currentUserId = savedUser._id || savedUser.id || savedUser.userId || "";
  const seller = product?.seller || {};
  const sellerId = seller._id || seller.id || product?.sellerId || "";
  const isOwner = currentUserId && sellerId && String(currentUserId) === String(sellerId);
  const isAdmin = savedUser.role === "ADMIN" || savedUser.isAdmin === true;

  const gallery = useMemo(() => {
    if (!product) return [];

    const images = Array.isArray(product.images)
      ? product.images.map((img) => getImageUrl(img)).filter(Boolean)
      : [];

    const fallback = getProductImage(product);

    return [...images, fallback]
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index);
  }, [product]);

  const risk = useMemo(() => getRiskLevel(product), [product]);

  useEffect(() => {
    loadProduct();
    loadSettings();
  }, [id]);

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  useEffect(() => {
    const handleSidebarChange = (event) => {
      const collapsed = event?.detail?.collapsed;

      setSidebarCollapsed(
        typeof collapsed === "boolean"
          ? collapsed
          : localStorage.getItem("qsm_sidebar_collapsed") === "true"
      );
    };

    const handleSettingsChange = () => {
      const nextSettings =
        safeJson(localStorage.getItem("qsm_settings")) ||
        safeJson(localStorage.getItem("qsm_user_settings")) ||
        safeJson(localStorage.getItem("qsm_preferences")) ||
        savedSettings;

      setSettings((current) => ({
        ...current,
        ...nextSettings
      }));
    };

    const handleStorage = (event) => {
      if (event.key === "qsm_sidebar_collapsed") {
        handleSidebarChange();
      }

      if ([
        "qsm_settings",
        "qsm_user_settings",
        "qsm_preferences",
        "qsm_theme",
        "qsm_appearance",
        "qsm_accent",
        "qsm_accent_color"
      ].includes(event.key)) {
        handleSettingsChange();
      }
    };

    window.addEventListener("qsm-sidebar-changed", handleSidebarChange);
    window.addEventListener("qsm-settings-changed", handleSettingsChange);
    window.addEventListener("qsm-theme-changed", handleSettingsChange);
    window.addEventListener("qsm-appearance-changed", handleSettingsChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("qsm-sidebar-changed", handleSidebarChange);
      window.removeEventListener("qsm-settings-changed", handleSettingsChange);
      window.removeEventListener("qsm-theme-changed", handleSettingsChange);
      window.removeEventListener("qsm-appearance-changed", handleSettingsChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await api.get(`/products/${id}`);
      const loaded = response.data.product || response.data.data || response.data;

      setProduct(loaded);

      const firstImage = getProductImage(loaded);
      setActiveImage(firstImage || "");

      try {
        const favResponse = await api.get(`/favorite/${id}/check`);
        setFavorite(Boolean(favResponse.data.isFavorite));
      } catch {
        setFavorite(false);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Producto no encontrado.");
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await api.get("/settings/me");
      const backendSettings = response.data.settings || response.data.data || response.data;

      if (backendSettings) {
        const merged = { ...savedSettings, ...backendSettings };
        setSettings(merged);
        localStorage.setItem("qsm_settings", JSON.stringify(merged));
      }
    } catch {
      setSettings(savedSettings);
    }
  };

 const toggleFavorite = async () => {
  try {
    setActionLoading("favorite");
    setError("");
    setMessage("");

    if (favorite) {
      await api.delete(`/favorite/${id}`);
      setFavorite(false);
      setMessage("Producto eliminado de favoritos.");
    } else {
      await api.post(`/favorite/${id}`);
      setFavorite(true);
      setMessage("Producto agregado a favoritos.");
    }
  } catch (err) {
    setError(
      err?.response?.data?.message ||
        "No se pudo actualizar favoritos."
    );
  } finally {
    setActionLoading("");
  }
};

  const contactSeller = async () => {
    if (!sellerId) {
      setError("Este producto no tiene vendedor asignado.");
      return;
    }

    try {
      setActionLoading("message");
      setError("");

      await api.post("/messages/conversations", {
        receiverId: sellerId,
        productId: id
      });

      navigate(`/messages?sellerId=${sellerId}&productId=${id}`);
    } catch {
      navigate(`/messages?sellerId=${sellerId}&productId=${id}`);
    } finally {
      setActionLoading("");
    }
  };

  const buyProduct = () => {
    navigate(`/checkout/${id}`);
  };

  const deleteProduct = async () => {
    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer."
    );

    if (!confirmDelete) return;

    try {
      setActionLoading("delete");
      setError("");
      setMessage("");

      await api.delete(`/products/${id}`);

      setMessage("Publicación eliminada correctamente.");

      setTimeout(() => {
        navigate("/sales");
      }, 600);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo eliminar la publicación. Verifica DELETE /products/:id en el backend."
      );
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div style={page(isLight)}>
        <div style={centerCard(isLight)}>
          <h2>Cargando producto...</h2>
          <p>QSM está preparando la información segura del producto.</p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div style={page(isLight)}>
        <div style={centerCard(isLight)}>
          <h2>{error}</h2>
          <button onClick={() => navigate("/marketplace")} style={primaryButton(accent)}>
            Volver al Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={page(isLight)}>
      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: ${isLight ? "#f8fafc" : "#020617"};
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
          overflow-x: hidden;
        }

        button, a {
          transition: ${settings.animations === false ? "none" : "all .25s ease"};
        }

        button:hover, a:hover {
          transform: ${settings.animations === false ? "none" : "translateY(-2px)"};
        }

        @media (max-width: 1240px) {
          .product-page {
            grid-template-columns: 1fr !important;
          }

          .sidebar-wrapper {
            display: none !important;
          }

          .product-layout,
          .meta-grid,
          .benefits-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 760px) {
          .main-content {
            padding: 18px !important;
          }

          .actions-row,
          .tab-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="product-page" style={layout(sidebarCollapsed)}>
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main className="main-content" style={main(settings)}>
          <Topbar />

          <section style={header}>
            <div>
              <p style={label(accent)}>DETALLE DEL PRODUCTO</p>
              <h1 style={title(isLight)}>{product.title || "Producto QSM"}</h1>
              <p style={muted(isLight)}>
                Revisa la información, vendedor, riesgo y opciones de compra segura.
              </p>
            </div>

            <div style={headerActions}>
              <button onClick={() => navigate("/marketplace")} style={outlineButton(isLight)}>
                ← Marketplace
              </button>

              {(isOwner || isAdmin) && (
                <button
                  onClick={deleteProduct}
                  disabled={actionLoading === "delete"}
                  style={dangerButton}
                >
                  {actionLoading === "delete" ? "Eliminando..." : "Eliminar publicación"}
                </button>
              )}
            </div>
          </section>

          {message && <div style={successBox}>{message}</div>}
          {error && <div style={errorBox}>{error}</div>}

          <section className="product-layout" style={productLayout}>
            <div style={galleryPanel(isLight, settings)}>
              <div style={imageBox(isLight)}>
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={product.title || "Producto"}
                    style={mainImage}
                    onClick={() => setImageModalOpen(true)}
                  />
                ) : (
                  <span style={imagePlaceholder}>📦</span>
                )}

                <span style={statusBadge(product.status)}>
                  {formatProductStatus(product.status)}
                </span>
              </div>

              {settings.showVideo !== false && getVideoUrl(product) && (
                <div style={videoPanel}>
                  <p style={label(accent)}>VIDEO DEL PRODUCTO</p>
                  <video
                    src={getVideoUrl(product)}
                    controls
                    playsInline
                    preload="metadata"
                    style={productVideo}
                  />
                </div>
              )}

              {gallery.length > 1 && (
                <div style={thumbRow}>
                  {gallery.map((img) => (
                    <button
                      key={img}
                      onClick={() => setActiveImage(img)}
                      style={activeImage === img ? activeThumb(accent) : thumb(isLight)}
                    >
                      <img src={img} alt="Miniatura" style={thumbImage} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <aside style={summaryPanel(isLight, settings)}>
              <div style={priceRow}>
                <div>
                  <p style={label(accent)}>PRECIO</p>
                  <h2 style={priceText(accent)}>{formatMoney(product.price)}</h2>
                </div>

                <button
                  onClick={toggleFavorite}
                  disabled={actionLoading === "favorite"}
                  style={favoriteButton(favorite)}
                >
                  {favorite ? "❤️" : "🤍"}
                </button>
              </div>

              <div className="meta-grid" style={metaGrid}>
                <Info title="Categoría" value={product.category || "Producto"} isLight={isLight} />
                <Info title="Ubicación" value={product.location || "República Dominicana"} isLight={isLight} />
                <Info title="Condición" value={formatCondition(product.condition)} isLight={isLight} />
                <Info title="Riesgo QSM" value={risk.label} isLight={isLight} />
              </div>

              <div style={sellerBox(isLight)}>
                {getImageUrl(
                  seller.profilePhoto || seller.avatar || seller.photo || ""
                ) ? (
                  <img
                    src={getImageUrl(
                      seller.profilePhoto || seller.avatar || seller.photo || ""
                    )}
                    alt={formatUser(seller, "Vendedor QSM")}
                    style={sellerPhotoStyle}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div style={sellerAvatar(accent)}>
                    {(seller.firstName || seller.email || "V")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <strong>{formatUser(seller, "Vendedor QSM")}</strong>
                  <p style={muted(isLight)}>{seller.email || "Vendedor protegido"}</p>
                  <span style={trustBadge(accent)}>
                    Confianza {seller.trustScore || 50}/100
                  </span>
                </div>
              </div>

              <div style={riskBox(risk)}>
                <strong>{risk.icon} {risk.label}</strong>
                <p>{risk.text}</p>
              </div>

              <div className="actions-row" style={actionsRow}>
                {!isOwner && (
                  <button onClick={buyProduct} style={primaryButton(accent)}>
                    Comprar ahora
                  </button>
                )}

                {!isOwner && (
                  <button
                    onClick={contactSeller}
                    disabled={actionLoading === "message"}
                    style={outlineButton(isLight)}
                  >
                    {actionLoading === "message" ? "Abriendo..." : "Contactar vendedor"}
                  </button>
                )}

                {isOwner && (
                  <Link to={`/products/${id}/edit`} style={primaryButton(accent)}>
                    Editar publicación
                  </Link>
                )}

                <Link to={`/product/${id}/history`} style={outlineButton(isLight)}>
                  Ver historial
                </Link>
              </div>

              <div style={escrowBox(isLight, accent)}>
                <strong>🛡 Pago Protegido QSM</strong>
                <p>
                  QSM protege la operación y permite dar seguimiento al producto dentro de la plataforma.
                </p>
              </div>
            </aside>
          </section>

          <section style={tabsPanel(isLight, settings)}>
            <div className="tab-row" style={tabRow}>
              <button
                onClick={() => setActiveTab("description")}
                style={activeTab === "description" ? activeTabButton(accent) : tabButton(isLight)}
              >
                Descripción
              </button>

              <button
                onClick={() => setActiveTab("security")}
                style={activeTab === "security" ? activeTabButton(accent) : tabButton(isLight)}
              >
                Seguridad QSM
              </button>

              <button
                onClick={() => setActiveTab("seller")}
                style={activeTab === "seller" ? activeTabButton(accent) : tabButton(isLight)}
              >
                Vendedor
              </button>
            </div>

            {activeTab === "description" && (
              <div>
                <h2 style={panelTitle(isLight)}>Descripción</h2>
                <p style={descriptionText(isLight)}>
                  {product.description || "Este producto no tiene descripción detallada."}
                </p>
              </div>
            )}

            {activeTab === "security" && (
              <div className="benefits-grid" style={benefitsGrid}>
                <Benefit icon="🧾" title="Producto trazable" text="El producto queda asociado a esta publicación." isLight={isLight} />
                <Benefit icon="🛡" title="Pago protegido" text="La compra puede manejarse dentro de QSM." isLight={isLight} />
                <Benefit icon="⚖️" title="Reclamos" text="Puedes abrir un reclamo si hay algún problema." isLight={isLight} />
                <Benefit icon="🤖" title="QSM AI" text="El asistente puede orientar sobre señales de riesgo." isLight={isLight} />
              </div>
            )}

            {activeTab === "seller" && (
              <div>
                <h2 style={panelTitle(isLight)}>Información del vendedor</h2>

                <div style={sellerBox(isLight)}>
                  <div style={sellerAvatar(accent)}>
                    {(seller.firstName || seller.email || "V").charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <strong>{formatUser(seller, "Vendedor QSM")}</strong>
                    <p style={muted(isLight)}>{seller.email || "Correo no visible"}</p>
                    <p style={muted(isLight)}>
                      Estado: {seller.isVerified ? "Verificado" : "Pendiente de verificación"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {imageModalOpen && activeImage && (
        <div style={modalOverlay} onClick={() => setImageModalOpen(false)}>
          <button style={modalClose} onClick={() => setImageModalOpen(false)}>
            ×
          </button>

          <img
            src={activeImage}
            alt={product.title || "Producto"}
            style={modalImage}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      <AiAssistant pageContext="product-details" />
    </div>
  );
}

function Info({ title, value, isLight }) {
  return (
    <div style={infoBox(isLight)}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Benefit({ icon, title, text, isLight }) {
  return (
    <div style={benefit(isLight)}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function formatUser(user, fallback) {
  if (!user || typeof user !== "object") return fallback;

  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return name || user.name || user.email || fallback;
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatCondition(condition) {
  const map = {
    NEW: "Nuevo",
    LIKE_NEW: "Como nuevo",
    USED_GOOD: "Buen estado",
    USED_DETAILS: "Usado con detalles",
    FOR_PARTS: "Para piezas",
    USED: "Usado",
    REFURBISHED: "Reacondicionado"
  };

  return map[String(condition || "").toUpperCase()] || condition || "No especificada";
}

function formatProductStatus(status) {
  const map = {
    ACTIVE: "Disponible",
    SOLD: "Vendido",
    RESERVED: "Reservado",
    PENDING: "Pendiente",
    DISABLED: "Desactivado",
    BLOCKED: "Bloqueado"
  };

  return map[String(status || "ACTIVE").toUpperCase()] || status || "Disponible";
}

function getImageUrl(image) {
  if (!image) return "";

  const source =
    typeof image === "string"
      ? image
      : image.url ||
        image.path ||
        image.fileUrl ||
        image.secure_url ||
        "";

  if (!source) return "";

  const clean = String(source)
    .trim()
    .replaceAll("&#x2F;", "/")
    .replaceAll("&amp;", "&");

  if (
    clean.startsWith("http") ||
    clean.startsWith("data:") ||
    clean.startsWith("blob:")
  ) {
    return clean;
  }

  if (clean.startsWith("/")) {
    return `${API_ORIGIN}${clean}`;
  }

  if (clean.startsWith("uploads/")) {
    return `${API_ORIGIN}/${clean}`;
  }

  return `${API_ORIGIN}/uploads/products/images/${clean}`;
}

function getVideoUrl(product) {
  return getImageUrl(
    product?.video?.url ||
      product?.videoUrl ||
      (typeof product?.video === "string" ? product.video : "")
  );
}

function getProductImage(product) {
  if (!product) return "";

  if (Array.isArray(product.images) && product.images.length > 0) {
    return getImageUrl(product.images[0]);
  }

  if (product.image) return getImageUrl(product.image);
  if (product.imageUrl) return getImageUrl(product.imageUrl);

  return "";
}

function getRiskLevel(product) {
  const variants = {
    LOW: {
      label: "Bajo",
      icon: "🟢",
      text: "No se detectaron señales críticas. Mantén la operación dentro de QSM."
    },
    MEDIUM: {
      label: "Medio",
      icon: "🟡",
      text: "Recomendamos validar la publicación y utilizar Pago Protegido."
    },
    HIGH: {
      label: "Alto",
      icon: "🟠",
      text: "QSM detectó señales de riesgo. Verifica el producto antes de continuar."
    },
    CRITICAL: {
      label: "Crítico",
      icon: "🔴",
      text: "La publicación presenta señales críticas. No continúes fuera de QSM."
    },
    UNCLASSIFIED: {
      label: "Por determinar",
      icon: "⚪",
      text: "QSM todavía no dispone de información suficiente para clasificar el riesgo."
    }
  };

  if (!product) return variants.UNCLASSIFIED;

  const directLevel = String(product.riskLevel || "").toUpperCase();

  if (variants[directLevel]) {
    return {
      ...variants[directLevel],
      label: product.riskLabel || variants[directLevel].label
    };
  }

  const score = Number(
    product.riskScore ??
      product.fraudScore ??
      product.aiAnalysis?.fraudRiskScore
  );

  if (!Number.isFinite(score)) return variants.UNCLASSIFIED;
  if (score >= 80) return variants.CRITICAL;
  if (score >= 60) return variants.HIGH;
  if (score >= 35) return variants.MEDIUM;

  return variants.LOW;
}

function getAccentColor(color) {
  const map = {
    cyan: "#35d0c3",
    purple: "#8b5cf6",
    pink: "#ec4899",
    blue: "#38bdf8",
    green: "#22c55e",
    orange: "#f59e0b"
  };

  return map[color] || "#35d0c3";
}

function applySettings(settings) {
  const accent = getAccentColor(settings.accentColor || "cyan");

  document.documentElement.style.setProperty("--qsm-accent", accent);
  document.body.dataset.qsmTheme = settings.theme || settings.appearance || "dark";
}

const page = (isLight) => ({
  minHeight: "100vh",
  width: "100%",
  background: isLight
    ? "radial-gradient(circle at top right, rgba(53,208,195,.16), transparent 34%), #f8fafc"
    : "radial-gradient(circle at top right, rgba(139,92,246,.14), transparent 34%), radial-gradient(circle at 18% 15%, rgba(53,208,195,.10), transparent 28%), #020617",
  color: isLight ? "#0f172a" : "white"
});

const layout = (sidebarCollapsed) => ({
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: sidebarCollapsed
    ? "96px minmax(0, 1fr)"
    : "300px minmax(0, 1fr)",
  overflowX: "hidden",
  transition: "grid-template-columns .28s ease"
});

const main = (settings) => ({
  width: "100%",
  minWidth: 0,
  padding:
    settings.density === "compact"
      ? "18px 24px 42px"
      : settings.density === "spacious"
      ? "34px 44px 70px"
      : "26px 34px 56px",
  overflowX: "hidden"
});

const header = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: "18px",
  margin: "30px 0 40px"
};

const headerActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap"
};

const label = (accent) => ({
  color: accent,
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  margin: 0
});

const title = (isLight) => ({
  fontSize: "clamp(38px, 3.4vw, 62px)",
  lineHeight: "1",
  margin: "10px 0",
  letterSpacing: "-2px",
  color: isLight ? "#0f172a" : "white"
});

const muted = (isLight) => ({
  color: isLight ? "#475569" : "#cbd5e1",
  lineHeight: "25px",
  margin: "4px 0"
});

const productLayout = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.1fr) 430px",
  gap: "20px",
  marginBottom: "20px"
};

const galleryPanel = (isLight, settings) => ({
  background: isLight ? "rgba(255,255,255,.88)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.16)",
  borderRadius: "30px",
  padding: "18px",
  boxShadow: isLight ? "0 24px 70px rgba(15,23,42,.08)" : "0 24px 90px rgba(0,0,0,.25)",
  backdropFilter: settings.glassEffect === false ? "none" : "blur(16px)"
});

const imageBox = (isLight) => ({
  height: "560px",
  borderRadius: "24px",
  background: isLight ? "rgba(226,232,240,.8)" : "rgba(2,6,23,.45)",
  overflow: "hidden",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
});

const mainImage = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  background: "#020617",
  cursor: "zoom-in"
};

const imagePlaceholder = {
  fontSize: "80px"
};

const statusBadge = (status) => {
  const value = String(status || "ACTIVE").toUpperCase();
  const sold = value === "SOLD";

  return {
    position: "absolute",
    top: "16px",
    left: "16px",
    background: sold ? "rgba(239,68,68,.18)" : "rgba(34,197,94,.16)",
    color: sold ? "#fecaca" : "#86efac",
    border: sold ? "1px solid rgba(239,68,68,.34)" : "1px solid rgba(34,197,94,.34)",
    borderRadius: "999px",
    padding: "8px 12px",
    fontWeight: "950"
  };
};

const thumbRow = {
  display: "flex",
  gap: "12px",
  marginTop: "14px",
  overflowX: "auto"
};

const thumb = (isLight) => ({
  width: "92px",
  height: "72px",
  borderRadius: "16px",
  border: isLight ? "1px solid rgba(15,23,42,.10)" : "1px solid rgba(148,163,184,.18)",
  background: "transparent",
  padding: 0,
  overflow: "hidden",
  cursor: "pointer",
  flexShrink: 0
});

const activeThumb = (accent) => ({
  ...thumb(false),
  border: `2px solid ${accent}`,
  boxShadow: `0 0 22px ${accent}44`
});

const thumbImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const summaryPanel = (isLight, settings) => ({
  background: isLight ? "rgba(255,255,255,.88)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.16)",
  borderRadius: "30px",
  padding: "24px",
  boxShadow: isLight ? "0 24px 70px rgba(15,23,42,.08)" : "0 24px 90px rgba(0,0,0,.25)",
  backdropFilter: settings.glassEffect === false ? "none" : "blur(16px)",
  alignSelf: "start"
});

const priceRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start"
};

const priceText = (accent) => ({
  color: accent,
  fontSize: "36px",
  margin: "6px 0 0"
});

const favoriteButton = (active) => ({
  width: "54px",
  height: "54px",
  borderRadius: "18px",
  border: active ? "1px solid rgba(236,72,153,.45)" : "1px solid rgba(148,163,184,.18)",
  background: active ? "rgba(236,72,153,.16)" : "rgba(15,23,42,.28)",
  cursor: "pointer",
  fontSize: "24px"
});

const metaGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  margin: "18px 0"
};

const infoBox = (isLight) => ({
  background: isLight ? "rgba(248,250,252,.85)" : "rgba(2,6,23,.35)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(148,163,184,.10)",
  borderRadius: "16px",
  padding: "13px",
  display: "grid",
  gap: "5px"
});

const sellerBox = (isLight) => ({
  display: "flex",
  gap: "14px",
  alignItems: "center",
  background: isLight ? "rgba(248,250,252,.85)" : "rgba(2,6,23,.35)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(148,163,184,.10)",
  borderRadius: "18px",
  padding: "14px",
  margin: "16px 0"
});

const sellerAvatar = (accent) => ({
  width: "58px",
  height: "58px",
  borderRadius: "18px",
  background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontWeight: "950",
  fontSize: "24px"
});

const trustBadge = (accent) => ({
  display: "inline-flex",
  background: `${accent}22`,
  color: accent,
  border: `1px solid ${accent}66`,
  padding: "7px 10px",
  borderRadius: "999px",
  fontWeight: "900"
});

const riskBox = (risk) => ({
  background:
    risk.label === "Alto"
      ? "rgba(239,68,68,.14)"
      : risk.label === "Medio"
      ? "rgba(245,158,11,.14)"
      : "rgba(34,197,94,.14)",
  border:
    risk.label === "Alto"
      ? "1px solid rgba(239,68,68,.32)"
      : risk.label === "Medio"
      ? "1px solid rgba(245,158,11,.32)"
      : "1px solid rgba(34,197,94,.32)",
  color:
    risk.label === "Alto"
      ? "#fecaca"
      : risk.label === "Medio"
      ? "#fde68a"
      : "#bbf7d0",
  borderRadius: "18px",
  padding: "14px",
  margin: "16px 0"
});

const actionsRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  margin: "18px 0"
};

const primaryButton = (accent) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: `linear-gradient(135deg, ${accent}, #38bdf8, #8b5cf6)`,
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "14px 18px",
  borderRadius: "14px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: `0 18px 54px ${accent}2e`
});

const outlineButton = (isLight) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: isLight ? "rgba(255,255,255,.82)" : "rgba(15,23,42,.64)",
  border: isLight ? "1px solid rgba(15,23,42,.10)" : "1px solid rgba(148,163,184,.16)",
  color: isLight ? "#0f172a" : "white",
  textDecoration: "none",
  borderRadius: "14px",
  padding: "14px 18px",
  fontWeight: "950",
  cursor: "pointer"
});

const dangerButton = {
  background: "rgba(239,68,68,.16)",
  border: "1px solid rgba(239,68,68,.32)",
  color: "#fecaca",
  borderRadius: "14px",
  padding: "14px 18px",
  fontWeight: "950",
  cursor: "pointer"
};

const escrowBox = (isLight, accent) => ({
  background: `${accent}14`,
  border: `1px solid ${accent}44`,
  color: isLight ? "#0f172a" : "#cbd5e1",
  borderRadius: "18px",
  padding: "14px"
});

const tabsPanel = (isLight, settings) => ({
  background: isLight ? "rgba(255,255,255,.88)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.16)",
  borderRadius: "30px",
  padding: "24px",
  boxShadow: isLight ? "0 24px 70px rgba(15,23,42,.08)" : "0 24px 90px rgba(0,0,0,.25)",
  backdropFilter: settings.glassEffect === false ? "none" : "blur(16px)"
});

const tabRow = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginBottom: "18px"
};

const tabButton = (isLight) => ({
  background: isLight ? "rgba(248,250,252,.90)" : "rgba(2,6,23,.45)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(148,163,184,.14)",
  color: isLight ? "#0f172a" : "#cbd5e1",
  padding: "13px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900"
});

const activeTabButton = (accent) => ({
  ...tabButton(false),
  background: `${accent}22`,
  border: `1px solid ${accent}66`,
  color: "white"
});

const panelTitle = (isLight) => ({
  color: isLight ? "#0f172a" : "white"
});

const descriptionText = (isLight) => ({
  color: isLight ? "#334155" : "#cbd5e1",
  lineHeight: "30px",
  fontSize: "17px"
});

const benefitsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px"
};

const benefit = (isLight) => ({
  background: isLight ? "rgba(248,250,252,.85)" : "rgba(2,6,23,.35)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(148,163,184,.10)",
  borderRadius: "18px",
  padding: "16px",
  color: isLight ? "#0f172a" : "#cbd5e1"
});

const successBox = {
  background: "rgba(34,197,94,.14)",
  border: "1px solid rgba(34,197,94,.32)",
  color: "#bbf7d0",
  padding: "14px 18px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontWeight: "800"
};

const errorBox = {
  background: "rgba(127,29,29,.24)",
  border: "1px solid rgba(248,113,113,.30)",
  color: "#fecaca",
  padding: "14px 18px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontWeight: "800"
};

const centerCard = (isLight) => ({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  color: isLight ? "#0f172a" : "white"
});

const sellerPhotoStyle = {
  width: "58px",
  height: "58px",
  flexShrink: 0,
  display: "block",
  borderRadius: "18px",
  border: "2px solid rgba(53,208,195,.40)",
  objectFit: "cover",
  objectPosition: "center"
};

const videoPanel = {
  marginTop: "16px",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid rgba(139,92,246,.24)",
  background: "rgba(2,6,23,.32)"
};

const productVideo = {
  width: "100%",
  maxHeight: "420px",
  display: "block",
  marginTop: "10px",
  borderRadius: "15px",
  background: "#020617"
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(2,6,23,.94)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "28px",
  cursor: "zoom-out"
};

const modalImage = {
  maxWidth: "96vw",
  maxHeight: "92vh",
  objectFit: "contain",
  borderRadius: "18px",
  boxShadow: "0 30px 100px rgba(0,0,0,.70)"
};

const modalClose = {
  position: "fixed",
  top: "22px",
  right: "28px",
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,.22)",
  background: "rgba(15,23,42,.88)",
  color: "white",
  fontSize: "32px",
  cursor: "pointer",
  zIndex: 10000,
  lineHeight: "42px"
};

export default ProductDetails;