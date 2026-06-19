import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import AiAssistant from "../components/AiAssistant";

function Marketplace() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = async () => {
    try {
      const response = await api.get("/products");
      setProducts(response.data.products || []);
    } catch (error) {
      console.error("Error cargando productos:", error);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const unique = products
      .map((p) => p.category)
      .filter(Boolean);

    return ["Todos", ...new Set(unique)];
  }, [products]);

  const filteredProducts = products.filter((product) => {
    const matchSearch =
      product.title?.toLowerCase().includes(search.toLowerCase()) ||
      product.description?.toLowerCase().includes(search.toLowerCase()) ||
      product.category?.toLowerCase().includes(search.toLowerCase());

    const matchCategory =
      category === "Todos" || product.category === category;

    return matchSearch && matchCategory;
  });

  const getRiskLevel = (product) => {
    if (!product?.fraudAlerts || product.fraudAlerts.length === 0) return "Bajo";

    const hasHigh = product.fraudAlerts.some((alert) => alert.level === "HIGH");
    const hasMedium = product.fraudAlerts.some((alert) => alert.level === "MEDIUM");

    if (hasHigh) return "Alto";
    if (hasMedium) return "Medio";
    return "Bajo";
  };

  if (loading) {
    return (
      <div style={page}>
        <div style={loadingBox}>
          <h2>Cargando marketplace QSM...</h2>
          <p>Preparando productos seguros.</p>
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
          <Link style={menuItem} to="/profile">👤 Mi perfil</Link>
          <Link style={activeMenuItem} to="/marketplace">🛒 Marketplace</Link>
          <Link style={menuItem} to="/new-product">➕ Publicar producto</Link>
          <Link style={menuItem} to="/orders">📦 Mis órdenes</Link>
          <Link style={menuItem} to="/marketing">📈 Marketing Center</Link>
          <Link style={menuItem} to="/disputes">⚖ Mis disputas</Link>
          <Link style={menuItem} to="/complete-profile">🧾 Verificación QSM</Link>
        </nav>

        <div style={aiSideCard}>
          <h3>🤖 QSM AI</h3>
          <p>
            Te ayuda a detectar productos sospechosos, verificar vendedores y comprar con escrow.
          </p>
        </div>
      </aside>

      <main style={main}>
        <header style={topbar}>
          <div style={searchBox}>
            <span>🔎</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos seguros..."
              style={searchInput}
            />
          </div>

          <div style={topActions}>
            <Link to="/new-product" style={primaryButton}>
              + Vender producto
            </Link>
          </div>
        </header>

        <section style={hero}>
          <div>
            <p style={label}>QUICK SECURE MARKET</p>
            <h1 style={title}>Compra y vende con protección QSM</h1>
            <p style={subtitle}>
              Explora productos publicados por usuarios, revisa el Trust Score del vendedor,
              consulta alertas de riesgo y compra con pago protegido mediante escrow.
            </p>

            <div style={heroBadges}>
              <span>🛡 Identidad QSM</span>
              <span>💰 Escrow protegido</span>
              <span>🤖 IA antifraude</span>
              <span>📦 Historial del producto</span>
            </div>
          </div>

          <div style={heroCard}>
            <h3>Centro de confianza</h3>
            <p>
              Antes de comprar, QSM analiza señales del producto, vendedor y comportamiento
              para ayudarte a tomar mejores decisiones.
            </p>
          </div>
        </section>

        <section style={categoriesBar}>
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              style={category === item ? categoryActive : categoryButton}
            >
              {item}
            </button>
          ))}
        </section>

        <section style={summaryGrid}>
          <SummaryCard title="Productos disponibles" value={products.length} />
          <SummaryCard title="Resultados filtrados" value={filteredProducts.length} />
          <SummaryCard title="Modo de datos" value="Datos reales/API" />
          <SummaryCard title="Protección" value="Escrow QSM" />
        </section>

        {error && <div style={errorBox}>{error}</div>}

        {products.length === 0 ? (
          <div style={emptyBox}>
            <h2>No hay productos publicados todavía.</h2>
            <p>
              Cuando un usuario publique productos reales, aparecerán aquí. No se mostrarán datos falsos
              como si fueran productos existentes.
            </p>

            <Link to="/new-product" style={primaryButton}>
              Publicar primer producto
            </Link>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={emptyBox}>
            <h2>No encontramos productos con ese filtro.</h2>
            <p>Prueba otra búsqueda o cambia de categoría.</p>
          </div>
        ) : (
          <section style={productGrid}>
            {filteredProducts.map((product) => (
              <ProductPremiumCard
                key={product.id}
                product={product}
                riskLevel={getRiskLevel(product)}
                onClick={() => navigate(`/product/${product.id}`)}
              />
            ))}
          </section>
        )}
      </main>

      <AiAssistant pageContext="marketplace" />
    </div>
  );
}

function ProductPremiumCard({ product, riskLevel, onClick }) {
  const isVerified =
    product.status === "CERTIFIED" ||
    product.verificationStatus === "CERTIFIED" ||
    product.seller?.isVerified;

  return (
    <article style={productCard} onClick={onClick}>
      <div style={imageWrap}>
        {product.imageUrl?.startsWith("http") ? (
          <img src={product.imageUrl} alt={product.title} style={productImage} />
        ) : (
          <div style={noImage}>📦</div>
        )}

        <div style={verifiedBadge(isVerified)}>
          {isVerified ? "QSM Verified" : "Pendiente"}
        </div>

        <button
          onClick={(e) => e.stopPropagation()}
          style={favoriteButton}
        >
          ♡
        </button>
      </div>

      <div style={productBody}>
        <div style={productHeader}>
          <h3>{product.title}</h3>
          <span style={riskBadge(riskLevel)}>Riesgo {riskLevel}</span>
        </div>

        <p style={description}>
          {product.description || "Producto sin descripción detallada."}
        </p>

        <h2 style={price}>RD$ {formatMoney(product.price)}</h2>

        <div style={metaGrid}>
          <span>📂 {product.category || "Sin categoría"}</span>
          <span>📍 {product.location || "Ubicación pendiente"}</span>
          <span>⭐ Trust {product.seller?.trustScore || 60}/100</span>
          <span>🧾 {product.qsmCode || "Código pendiente"}</span>
        </div>

        <div style={sellerRow}>
          <div style={sellerAvatar}>
            {product.seller?.firstName?.charAt(0) || "U"}
          </div>

          <div>
            <strong>
              {product.seller?.firstName || "Usuario"} {product.seller?.lastName || "QSM"}
            </strong>
            <p>{product.seller?.isVerified ? "Vendedor verificado" : "Vendedor pendiente"}</p>
          </div>
        </div>

        <button style={buyButton}>
          Ver perfil del producto →
        </button>
      </div>
    </article>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div style={summaryCard}>
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

function formatMoney(value) {
  if (!value) return "0";
  return Number(value).toLocaleString("es-DO");
}

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(53,208,195,0.12), transparent 35%), #020617",
  color: "white",
  display: "grid",
  gridTemplateColumns: "260px minmax(0, 1fr)",
  overflowX: "hidden"
};

const sidebar = {
  minHeight: "100vh",
  background: "rgba(8,17,35,0.92)",
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
  maxWidth: "1700px",
  margin: "0 auto",
  padding: "28px 34px 60px",
  overflowX: "hidden"
};

const topbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "26px"
};

const searchBox = {
  flex: 1,
  maxWidth: "720px",
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

const topActions = {
  display: "flex",
  gap: "12px"
};

const hero = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 360px",
  gap: "24px",
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.78), rgba(8,47,73,0.40))",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "30px",
  padding: "34px",
  marginBottom: "24px"
};

const label = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "900"
};

const title = {
  fontSize: "clamp(38px, 4vw, 68px)",
  lineHeight: "1.04",
  letterSpacing: "-2.5px",
  margin: "10px 0 16px"
};

const subtitle = {
  color: "#cbd5e1",
  lineHeight: "28px",
  maxWidth: "900px"
};

const heroBadges = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  marginTop: "22px",
  color: "#cbd5e1"
};

const heroCard = {
  background: "rgba(2,6,23,0.52)",
  border: "1px solid rgba(53,208,195,0.20)",
  borderRadius: "24px",
  padding: "24px",
  color: "#cbd5e1"
};

const categoriesBar = {
  display: "flex",
  gap: "12px",
  overflowX: "auto",
  paddingBottom: "8px",
  marginBottom: "22px"
};

const categoryButton = {
  background: "rgba(15,23,42,0.58)",
  color: "#cbd5e1",
  border: "1px solid rgba(148,163,184,0.14)",
  borderRadius: "999px",
  padding: "11px 16px",
  cursor: "pointer",
  fontWeight: "800",
  whiteSpace: "nowrap"
};

const categoryActive = {
  ...categoryButton,
  background: "rgba(53,208,195,0.16)",
  border: "1px solid rgba(53,208,195,0.35)",
  color: "#35d0c3"
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginBottom: "24px"
};

const summaryCard = {
  background: "rgba(15,23,42,0.58)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "20px",
  padding: "18px"
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "22px"
};

const productCard = {
  background: "rgba(15,23,42,0.66)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "26px",
  overflow: "hidden",
  cursor: "pointer",
  transition: "transform .2s ease, border .2s ease",
  minWidth: 0
};

const imageWrap = {
  height: "260px",
  position: "relative",
  background: "rgba(2,6,23,0.72)",
  overflow: "hidden"
};

const productImage = {
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
  fontSize: "52px",
  color: "#64748b"
};

const verifiedBadge = (verified) => ({
  position: "absolute",
  left: "14px",
  top: "14px",
  background: verified ? "rgba(34,197,94,0.18)" : "rgba(245,158,11,0.18)",
  color: verified ? "#86efac" : "#fde68a",
  border: verified
    ? "1px solid rgba(34,197,94,0.32)"
    : "1px solid rgba(245,158,11,0.32)",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900"
});

const favoriteButton = {
  position: "absolute",
  right: "14px",
  top: "14px",
  width: "38px",
  height: "38px",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(2,6,23,0.65)",
  color: "white",
  cursor: "pointer"
};

const productBody = {
  padding: "20px"
};

const productHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start"
};

const description = {
  color: "#94a3b8",
  lineHeight: "24px",
  minHeight: "48px"
};

const price = {
  color: "#35d0c3",
  fontSize: "30px",
  margin: "14px 0"
};

const riskBadge = (risk) => ({
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
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

const metaGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  color: "#cbd5e1",
  fontSize: "13px",
  marginBottom: "18px"
};

const sellerRow = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "14px 0",
  borderTop: "1px solid rgba(148,163,184,0.12)"
};

const sellerAvatar = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900"
};

const buyButton = {
  width: "100%",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  color: "white",
  border: "none",
  padding: "14px",
  borderRadius: "15px",
  cursor: "pointer",
  fontWeight: "900"
};

const primaryButton = {
  display: "inline-block",
  background: "#35d0c3",
  color: "#020617",
  textDecoration: "none",
  padding: "13px 18px",
  borderRadius: "14px",
  fontWeight: "900"
};

const errorBox = {
  background: "rgba(127,29,29,0.22)",
  color: "#fecaca",
  border: "1px solid rgba(248,113,113,0.28)",
  borderRadius: "16px",
  padding: "14px",
  marginBottom: "20px"
};

const emptyBox = {
  background: "rgba(15,23,42,0.58)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "24px",
  padding: "34px",
  textAlign: "center"
};

const loadingBox = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center"
};

export default Marketplace;