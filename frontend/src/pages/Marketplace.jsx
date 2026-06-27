import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";
import { getProducts } from "../api/products";

function Marketplace() {
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const categories = [
    "Todos",
    "Gaming",
    "Tecnología",
    "Celulares",
    "Laptops",
    "Vehículos",
    "Hogar",
    "Moda",
    "Otros"
  ];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProducts();
      setProducts(data.products || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudieron cargar los productos. Verifica que el backend esté funcionando."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const category = product.category || "";
      const title = product.title || "";
      const description = product.description || "";

      const matchCategory =
        activeCategory === "Todos" ||
        category.toLowerCase() === activeCategory.toLowerCase();

      const matchSearch = `${title} ${description} ${category}`
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchCategory && matchSearch;
    });
  }, [products, activeCategory, search]);

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

        @keyframes softPulse {
          0% { opacity: .55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
          100% { opacity: .55; transform: scale(1); }
        }

        .market-product-card {
          transition: transform .28s ease, border .28s ease, box-shadow .28s ease;
        }

        .market-product-card:hover {
          transform: translateY(-8px);
          border-color: rgba(53,208,195,.65);
          box-shadow:
            0 0 35px rgba(53,208,195,.18),
            0 0 70px rgba(124,58,237,.12),
            0 28px 80px rgba(0,0,0,.50);
        }

        .market-product-card:hover .market-product-image {
          transform: scale(1.08);
        }

        .category-button {
          transition: all .22s ease;
        }

        .category-button:hover {
          transform: translateY(-2px);
          border-color: rgba(53,208,195,.55);
        }

        @media (max-width: 1300px) {
          .products-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 1000px) {
          .products-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .market-hero {
            grid-template-columns: 1fr !important;
          }
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

        <div style={sideCard}>
          <p style={label}>PAGO PROTEGIDO</p>
          <h3>Compra con confianza</h3>
          <p>
            El dinero queda retenido hasta que confirmes que recibiste el producto correctamente.
          </p>
          <Link to="/complete-profile" style={sideButton}>
            Saber más
          </Link>
        </div>

        <div style={sideCard}>
          <p style={label}>NIVEL DE CONFIANZA</p>
          <h3>50 / 100</h3>
          <p>Completa tu verificación para aumentar tu nivel y desbloquear más beneficios.</p>
          <div style={progressTrack}>
            <div style={progressFill}></div>
          </div>
        </div>
      </aside>

      <main style={main}>
        <Topbar />

        <div style={topRow}>
          <div>
            <h1 style={pageTitle}>Marketplace</h1>
            <span style={protectedPill}>🛡 Protegido por QSM</span>
          </div>

          <Link to="/new-product" style={sellButton}>
            + Vender producto
          </Link>
        </div>

        <section className="market-hero" style={hero}>
          <div style={heroImageBox}>
            <div style={shieldGlow}></div>
            <div style={shieldIcon}>🛡</div>
          </div>

          <div style={heroText}>
            <h2>Compra y vende con total seguridad</h2>
            <p>
              Todos los productos se muestran desde tu backend. QSM protege el pago,
              valida usuarios y permite revisar el vendedor antes de comprar.
            </p>

            <div style={heroBadges}>
              <span>🧾 Identidad verificada</span>
              <span>💰 Pago Protegido</span>
              <span>🤖 IA antifraude</span>
              <span>🛟 Soporte QSM</span>
            </div>
          </div>
        </section>

        <section style={filterBar}>
          <div style={categoryRow}>
            {categories.map((category) => (
              <button
                key={category}
                className="category-button"
                onClick={() => setActiveCategory(category)}
                style={
                  activeCategory === category
                    ? activeCategoryButton
                    : categoryButton
                }
              >
                {category}
              </button>
            ))}
          </div>

          <div style={rightFilters}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar productos..."
              style={miniSearch}
            />

            <button onClick={loadProducts} style={refreshButton}>
              Actualizar
            </button>
          </div>
        </section>

        <section style={statsRow}>
          <div style={statBox}>
            <span>Productos disponibles</span>
            <strong>{products.length}</strong>
          </div>

          <div style={statBox}>
            <span>Resultados filtrados</span>
            <strong>{filteredProducts.length}</strong>
          </div>

          <div style={statBox}>
            <span>Modo de datos</span>
            <strong>Backend / API</strong>
          </div>

          <div style={statBox}>
            <span>Protección</span>
            <strong>Pago Protegido</strong>
          </div>
        </section>

        {loading && (
          <section className="products-grid" style={grid}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={skeletonCard}>
                <div style={skeletonImage}></div>
                <div style={skeletonLine}></div>
                <div style={skeletonLineSmall}></div>
              </div>
            ))}
          </section>
        )}

        {!loading && error && (
          <div style={errorBox}>
            <h3>No pudimos cargar los productos</h3>
            <p>{error}</p>
            <button onClick={loadProducts} style={primaryButton}>
              Intentar de nuevo
            </button>
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div style={emptyBox}>
            <h3>No hay productos para mostrar</h3>
            <p>No existen productos publicados o tu filtro no encontró coincidencias.</p>
            <Link to="/new-product" style={primaryButton}>
              Publicar producto
            </Link>
          </div>
        )}

        {!loading && !error && filteredProducts.length > 0 && (
          <section className="products-grid" style={grid}>
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product._id || index}
                product={product}
                index={index}
              />
            ))}
          </section>
        )}

        <div style={loadMoreWrap}>
          <button style={loadMoreButton}>Cargar más productos⌄</button>
        </div>
      </main>

      <AiAssistant pageContext="marketplace" />
    </div>
  );
}

function ProductCard({ product, index }) {
  const seller = product.seller || {};
  const image = getProductImage(product);
  const price = formatMoney(product.price);
  const sellerName = `${seller.firstName || "Vendedor"} ${seller.lastName || ""}`.trim();
  const trustScore = seller.trustScore || 50;
  const sellerLetter = seller.firstName?.charAt(0)?.toUpperCase() || "V";

  const glowColors = [
    "rgba(53,208,195,.30)",
    "rgba(124,58,237,.30)",
    "rgba(59,130,246,.26)",
    "rgba(236,72,153,.24)"
  ];

  return (
    <article className="market-product-card" style={productCard}>
      <div
        style={{
          ...cardGlow,
          background: glowColors[index % glowColors.length]
        }}
      ></div>

      <button style={heartButton}>♡</button>

      <Link to={`/product/${product._id}`} style={imageLink}>
        <div style={imageWrap}>
          <img
            className="market-product-image"
            src={image}
            alt={product.title}
            style={productImage}
          />
          <span style={protectedBadge}>🛡 Pago Protegido</span>
        </div>
      </Link>

      <div style={productBody}>
        <h3 style={productTitle}>{product.title || "Producto sin título"}</h3>

        <strong style={priceText}>{price}</strong>

        <div style={metaLine}>
          <span>🏷 {product.category || "Producto"}</span>
          <span>📍 {product.location || "República Dominicana"}</span>
        </div>

        <div style={sellerBox}>
          <div style={sellerAvatar}>{sellerLetter}</div>

          <div>
            <strong>{sellerName}</strong>
            <p>Confianza: <span>{trustScore}/100</span></p>
          </div>
        </div>
      </div>
    </article>
  );
}

function getProductImage(product) {
  if (product.images && product.images.length > 0) {
    const firstImage = product.images[0];

    if (typeof firstImage === "string" && firstImage.startsWith("http")) {
      return firstImage;
    }
  }

  const category = (product.category || "").toLowerCase();
  const title = (product.title || "").toLowerCase();

  if (title.includes("ps5") || title.includes("playstation") || category.includes("gaming")) {
    return "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=90";
  }

  if (title.includes("iphone") || title.includes("celular")) {
    return "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=90";
  }

  if (title.includes("laptop") || title.includes("macbook")) {
    return "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=90";
  }

  if (title.includes("watch") || title.includes("reloj")) {
    return "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=900&q=90";
  }

  return "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&w=900&q=90";
}

function formatMoney(value) {
  if (!value && value !== 0) return "RD$ 0";

  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(value);
}

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(124,58,237,.12), transparent 30%), #020617",
  color: "white",
  display: "grid",
  gridTemplateColumns: "260px minmax(0, 1fr)",
  overflowX: "hidden"
};

const sidebar = {
  minHeight: "100vh",
  background: "rgba(8,17,35,.96)",
  borderRight: "1px solid rgba(53,208,195,.14)",
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
  border: "1px solid rgba(53,208,195,.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
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
  background: "rgba(15,23,42,.34)",
  border: "1px solid rgba(148,163,184,.08)",
  fontWeight: "800"
};

const activeMenuItem = {
  ...menuItem,
  background: "rgba(53,208,195,.14)",
  border: "1px solid rgba(53,208,195,.42)",
  color: "#35d0c3"
};

const sideCard = {
  marginTop: "28px",
  background: "rgba(15,23,42,.62)",
  border: "1px solid rgba(53,208,195,.18)",
  borderRadius: "20px",
  padding: "18px",
  color: "#cbd5e1",
  textAlign: "center"
};

const sideButton = {
  display: "block",
  marginTop: "14px",
  background: "rgba(53,208,195,.14)",
  border: "1px solid rgba(53,208,195,.32)",
  color: "#35d0c3",
  padding: "11px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: "900"
};

const progressTrack = {
  height: "9px",
  background: "rgba(148,163,184,.18)",
  borderRadius: "999px",
  overflow: "hidden",
  marginTop: "12px"
};

const progressFill = {
  width: "50%",
  height: "100%",
  background: "linear-gradient(90deg, #35d0c3, #8b5cf6)"
};

const main = {
  width: "100%",
  minWidth: 0,
  padding: "18px 28px 54px",
  overflowX: "hidden"
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  margin: "12px 0 18px"
};

const pageTitle = {
  fontSize: "34px",
  margin: 0
};

const protectedPill = {
  display: "inline-block",
  marginTop: "8px",
  color: "#35d0c3",
  background: "rgba(53,208,195,.10)",
  border: "1px solid rgba(53,208,195,.25)",
  padding: "7px 11px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px"
};

const sellButton = {
  background: "#35d0c3",
  color: "#020617",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "14px",
  fontWeight: "900"
};

const hero = {
  display: "grid",
  gridTemplateColumns: "360px minmax(0, 1fr)",
  gap: "26px",
  alignItems: "center",
  background:
    "linear-gradient(135deg, rgba(15,23,42,.78), rgba(15,23,42,.50))",
  border: "1px solid rgba(53,208,195,.16)",
  borderRadius: "22px",
  padding: "20px 28px",
  marginBottom: "22px",
  animation: "fadeUp .55s ease"
};

const heroImageBox = {
  position: "relative",
  height: "150px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden"
};

const shieldGlow = {
  position: "absolute",
  width: "190px",
  height: "190px",
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(53,208,195,.34), rgba(124,58,237,.28), transparent 68%)",
  filter: "blur(10px)",
  animation: "softPulse 4s ease-in-out infinite"
};

const shieldIcon = {
  position: "relative",
  width: "92px",
  height: "92px",
  borderRadius: "28px",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "42px",
  boxShadow: "0 0 55px rgba(124,58,237,.42)"
};

const heroText = {
  color: "#cbd5e1"
};

const heroBadges = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  marginTop: "18px"
};

const filterBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "18px"
};

const categoryRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px"
};

const categoryButton = {
  padding: "11px 17px",
  borderRadius: "999px",
  border: "1px solid rgba(148,163,184,.16)",
  background: "rgba(15,23,42,.60)",
  color: "#cbd5e1",
  cursor: "pointer",
  fontWeight: "800"
};

const activeCategoryButton = {
  ...categoryButton,
  color: "#35d0c3",
  background: "rgba(53,208,195,.12)",
  border: "1px solid rgba(53,208,195,.45)"
};

const rightFilters = {
  display: "flex",
  gap: "10px"
};

const miniSearch = {
  width: "230px",
  background: "rgba(15,23,42,.66)",
  border: "1px solid rgba(148,163,184,.16)",
  borderRadius: "14px",
  padding: "12px 14px",
  color: "white",
  outline: "none"
};

const refreshButton = {
  background: "rgba(53,208,195,.12)",
  border: "1px solid rgba(53,208,195,.32)",
  color: "#35d0c3",
  padding: "12px 16px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900"
};

const statsRow = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "20px"
};

const statBox = {
  background: "rgba(15,23,42,.62)",
  border: "1px solid rgba(53,208,195,.14)",
  borderRadius: "18px",
  padding: "16px",
  textAlign: "center"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "20px"
};

const productCard = {
  position: "relative",
  overflow: "hidden",
  borderRadius: "22px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(53,208,195,.20)",
  minHeight: "455px",
  animation: "fadeUp .55s ease"
};

const cardGlow = {
  position: "absolute",
  inset: "-70px -70px auto auto",
  width: "210px",
  height: "210px",
  borderRadius: "50%",
  filter: "blur(42px)",
  zIndex: 0
};

const heartButton = {
  position: "absolute",
  top: "15px",
  right: "15px",
  width: "38px",
  height: "38px",
  borderRadius: "50%",
  background: "rgba(2,6,23,.70)",
  border: "1px solid rgba(255,255,255,.18)",
  color: "#cbd5e1",
  fontSize: "22px",
  zIndex: 4,
  cursor: "pointer"
};

const imageLink = {
  textDecoration: "none",
  color: "white"
};

const imageWrap = {
  position: "relative",
  height: "250px",
  overflow: "hidden",
  background: "radial-gradient(circle at center, rgba(53,208,195,.17), rgba(15,23,42,.52))"
};

const productImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "transform .42s ease"
};

const protectedBadge = {
  position: "absolute",
  left: "16px",
  bottom: "14px",
  background: "rgba(53,208,195,.17)",
  border: "1px solid rgba(53,208,195,.40)",
  color: "#67fff1",
  borderRadius: "999px",
  padding: "7px 11px",
  fontSize: "12px",
  fontWeight: "900",
  backdropFilter: "blur(10px)"
};

const productBody = {
  position: "relative",
  zIndex: 2,
  padding: "18px"
};

const productTitle = {
  fontSize: "21px",
  margin: "0 0 8px"
};

const priceText = {
  display: "block",
  color: "#35d0c3",
  fontSize: "21px",
  marginBottom: "12px"
};

const metaLine = {
  display: "grid",
  gap: "6px",
  color: "#94a3b8",
  fontSize: "14px",
  marginBottom: "15px"
};

const sellerBox = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "rgba(2,6,23,.40)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "16px",
  padding: "12px"
};

const sellerAvatar = {
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #35d0c3, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900"
};

const skeletonCard = {
  borderRadius: "22px",
  background: "rgba(15,23,42,.62)",
  border: "1px solid rgba(148,163,184,.12)",
  padding: "18px",
  minHeight: "400px"
};

const skeletonImage = {
  height: "240px",
  borderRadius: "18px",
  background: "rgba(148,163,184,.12)",
  marginBottom: "18px"
};

const skeletonLine = {
  height: "18px",
  width: "80%",
  borderRadius: "999px",
  background: "rgba(148,163,184,.12)",
  marginBottom: "12px"
};

const skeletonLineSmall = {
  ...skeletonLine,
  width: "45%"
};

const errorBox = {
  background: "rgba(127,29,29,.22)",
  border: "1px solid rgba(248,113,113,.32)",
  borderRadius: "22px",
  padding: "28px",
  color: "#fecaca"
};

const emptyBox = {
  background: "rgba(15,23,42,.62)",
  border: "1px solid rgba(53,208,195,.18)",
  borderRadius: "22px",
  padding: "30px",
  textAlign: "center",
  color: "#cbd5e1"
};

const primaryButton = {
  display: "inline-block",
  marginTop: "16px",
  background: "#35d0c3",
  color: "#020617",
  padding: "13px 18px",
  borderRadius: "14px",
  textDecoration: "none",
  fontWeight: "900",
  border: "none",
  cursor: "pointer"
};

const loadMoreWrap = {
  display: "flex",
  justifyContent: "center",
  marginTop: "28px"
};

const loadMoreButton = {
  background: "rgba(15,23,42,.62)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "white",
  padding: "13px 24px",
  borderRadius: "999px",
  fontWeight: "800",
  cursor: "pointer"
};

const label = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase"
};

export default Marketplace;