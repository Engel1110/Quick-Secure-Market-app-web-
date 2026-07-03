import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";
import { getProducts } from "../api/products";

function Marketplace() {
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
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
    const params = new URLSearchParams(location.search);
    const querySearch = params.get("search") || "";
    const queryCategory = params.get("category") || "Todos";

    setSearch(querySearch);
    setActiveCategory(queryCategory);
  }, [location.search]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProducts();
      setProducts(Array.isArray(data?.products) ? data.products : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudieron cargar los productos. Verifica que el backend esté funcionando."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (activeCategory !== "Todos") params.set("category", activeCategory);

    navigate(`/marketplace?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch("");
    setActiveCategory("Todos");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("recent");
    setVisibleCount(12);
    navigate("/marketplace");
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    result = result.filter((product) => {
      const category = product.category || "";
      const title = product.title || "";
      const description = product.description || "";
      const locationName = product.location || "";
      const price = Number(product.price || 0);

      const matchCategory =
        activeCategory === "Todos" ||
        category.toLowerCase() === activeCategory.toLowerCase();

      const matchSearch = `${title} ${description} ${category} ${locationName}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchMin = minPrice === "" || price >= Number(minPrice);
      const matchMax = maxPrice === "" || price <= Number(maxPrice);

      return matchCategory && matchSearch && matchMin && matchMax;
    });

    if (sortBy === "price-low") {
      result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }

    if (sortBy === "price-high") {
      result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }

    if (sortBy === "recent") {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return result;
  }, [products, activeCategory, search, minPrice, maxPrice, sortBy]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

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
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
          overflow-x: hidden;
        }

        a, button, input, select {
          font-family: inherit;
        }

        a, button {
          transition: all .25s ease;
        }

        a:hover, button:hover {
          transform: translateY(-2px);
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
          border-color: rgba(56,189,248,.58);
          box-shadow:
            0 0 35px rgba(56,189,248,.14),
            0 0 80px rgba(139,92,246,.10),
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
          border-color: rgba(56,189,248,.55);
        }

        @media (max-width: 1250px) {
          .marketplace-page {
            grid-template-columns: 1fr !important;
          }

          .sidebar-wrapper {
            display: none !important;
          }

          .market-hero {
            grid-template-columns: 1fr !important;
          }

          .products-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .filters-panel {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 760px) {
          .main-content {
            padding: 18px !important;
          }

          .products-grid {
            grid-template-columns: 1fr !important;
          }

          .top-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .stats-row {
            grid-template-columns: 1fr 1fr !important;
          }

          .filter-inputs {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="marketplace-page" style={layout}>
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main className="main-content" style={main}>
          <Topbar />

          <div className="top-row" style={topRow}>
            <div>
              <p style={label}>MARKETPLACE QSM</p>
              <h1 style={pageTitle}>Compra con Pago Protegido</h1>
              <p style={pageSubtitle}>
                Productos cargados desde el backend, organizados con filtros reales y búsqueda funcional.
              </p>
            </div>

            <div style={topActions}>
              <button onClick={loadProducts} style={ghostButton}>
                Actualizar
              </button>

              <Link to="/new-product" style={sellButton}>
                + Vender producto
              </Link>
            </div>
          </div>

          <section className="market-hero" style={hero}>
            <div style={heroVisual}>
              <div style={shieldGlow}></div>
              <div style={shieldIcon}>🛡</div>
            </div>

            <div style={heroText}>
              <span style={protectedPill}>Protección activa QSM</span>
              <h2>Compra y vende con total seguridad</h2>
              <p>
                QSM protege el pago, valida usuarios y permite revisar el vendedor antes de comprar.
                Los filtros, categorías y búsqueda están conectados a los productos del backend.
              </p>

              <div style={heroBadges}>
                <span>🧾 Identidad verificada</span>
                <span>💰 Pago Protegido</span>
                <span>🤖 IA antifraude</span>
                <span>⚖ Reclamos QSM</span>
              </div>
            </div>
          </section>

          <section style={statsRow} className="stats-row">
            <StatBox title="Productos disponibles" value={products.length} />
            <StatBox title="Resultados filtrados" value={filteredProducts.length} />
            <StatBox title="Modo de datos" value="Backend / API" />
            <StatBox title="Protección" value="Pago Protegido" />
          </section>

          <section style={filtersPanel} className="filters-panel">
            <form onSubmit={handleSearchSubmit} style={searchPanel}>
              <span style={searchIcon}>⌕</span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por producto, categoría, descripción o ubicación..."
                style={searchInput}
              />

              <button type="submit" style={searchButton}>
                Buscar
              </button>
            </form>

            <div className="filter-inputs" style={filterInputs}>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="Precio mínimo"
                style={filterInput}
              />

              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Precio máximo"
                style={filterInput}
              />

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                style={filterInput}
              >
                <option value="recent">Más recientes</option>
                <option value="price-low">Precio menor a mayor</option>
                <option value="price-high">Precio mayor a menor</option>
              </select>

              <button onClick={clearFilters} style={clearButton}>
                Limpiar
              </button>
            </div>
          </section>

          <section style={categoryRow}>
            {categories.map((category) => (
              <button
                key={category}
                className="category-button"
                onClick={() => {
                  setActiveCategory(category);
                  setVisibleCount(12);
                }}
                style={
                  activeCategory === category
                    ? activeCategoryButton
                    : categoryButton
                }
              >
                {category}
              </button>
            ))}
          </section>

          {loading && (
            <section className="products-grid" style={grid}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
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
            <>
              <section className="products-grid" style={grid}>
                {visibleProducts.map((product, index) => (
                  <ProductCard
                    key={product._id || index}
                    product={product}
                    index={index}
                  />
                ))}
              </section>

              {visibleCount < filteredProducts.length && (
                <div style={loadMoreWrap}>
                  <button
                    style={loadMoreButton}
                    onClick={() => setVisibleCount((current) => current + 8)}
                  >
                    Cargar más productos
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AiAssistant pageContext="marketplace" />
    </div>
  );
}

function StatBox({ title, value }) {
  return (
    <div style={statBox}>
      <span>{title}</span>
      <strong>{value}</strong>
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
    "rgba(56,189,248,.26)",
    "rgba(139,92,246,.26)",
    "rgba(34,197,94,.20)",
    "rgba(236,72,153,.22)"
  ];

  return (
    <article className="market-product-card" style={productCard}>
      <div
        style={{
          ...cardGlow,
          background: glowColors[index % glowColors.length]
        }}
      ></div>

      <button style={heartButton} title="Agregar a favoritos">
        ♡
      </button>

      <Link to={`/product/${product._id}`} style={imageLink}>
        <div style={imageWrap}>
          <img
            className="market-product-image"
            src={image}
            alt={product.title || "Producto QSM"}
            style={productImage}
            onError={(event) => {
              event.currentTarget.src =
                "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&w=900&q=90";
            }}
          />
          <span style={protectedBadge}>🛡 Pago Protegido</span>
        </div>
      </Link>

      <div style={productBody}>
        <Link to={`/product/${product._id}`} style={productTitleLink}>
          <h3 style={productTitle}>{product.title || "Producto sin título"}</h3>
        </Link>

        <strong style={priceText}>{price}</strong>

        <div style={metaLine}>
          <span>🏷 {product.category || "Producto"}</span>
          <span>📍 {product.location || "República Dominicana"}</span>
        </div>

        <div style={sellerBox}>
          <div style={sellerAvatar}>{sellerLetter}</div>

          <div>
            <strong>{sellerName}</strong>
            <p>
              Confianza: <span>{trustScore}/100</span>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function getProductImage(product) {
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0];

    if (typeof firstImage === "string") {
      if (firstImage.startsWith("http")) return firstImage;

      if (firstImage.startsWith("/uploads")) {
        return `http://localhost:5000${firstImage}`;
      }

      return `http://localhost:5000/uploads/products/images/${firstImage}`;
    }
  }

  const category = (product.category || "").toLowerCase();
  const title = (product.title || "").toLowerCase();

  if (title.includes("ps5") || title.includes("playstation") || category.includes("gaming")) {
    return "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=90";
  }

  if (title.includes("iphone") || title.includes("celular") || category.includes("celular")) {
    return "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=90";
  }

  if (title.includes("honda") || title.includes("vehiculo") || title.includes("vehículo") || category.includes("veh")) {
    return "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=90";
  }

  if (title.includes("laptop") || title.includes("macbook") || category.includes("laptop")) {
    return "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=90";
  }

  return "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&w=900&q=90";
}

function formatMoney(value) {
  if (!value && value !== 0) return "RD$ 0";

  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(139,92,246,.14), transparent 30%), radial-gradient(circle at 20% 15%, rgba(56,189,248,.08), transparent 28%), #020617",
  color: "white"
};

const layout = {
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr)",
  overflowX: "hidden"
};

const main = {
  width: "100%",
  minWidth: 0,
  padding: "26px 34px 54px",
  overflowX: "hidden"
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  margin: "24px 0 20px"
};

const topActions = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap"
};

const label = {
  margin: 0,
  color: "#38bdf8",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase"
};

const pageTitle = {
  fontSize: "clamp(38px, 3vw, 58px)",
  lineHeight: "1",
  margin: "10px 0 8px",
  letterSpacing: "-1.8px"
};

const pageSubtitle = {
  color: "#cbd5e1",
  margin: 0,
  maxWidth: "780px",
  lineHeight: "28px"
};

const hero = {
  display: "grid",
  gridTemplateColumns: "330px minmax(0, 1fr)",
  gap: "26px",
  alignItems: "center",
  background:
    "linear-gradient(135deg, rgba(15,23,42,.82), rgba(15,23,42,.55))",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "26px 32px",
  marginBottom: "20px",
  animation: "fadeUp .55s ease"
};

const heroVisual = {
  position: "relative",
  height: "170px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden"
};

const shieldGlow = {
  position: "absolute",
  width: "220px",
  height: "220px",
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(56,189,248,.34), rgba(139,92,246,.30), transparent 68%)",
  filter: "blur(10px)",
  animation: "softPulse 4s ease-in-out infinite"
};

const shieldIcon = {
  position: "relative",
  width: "100px",
  height: "100px",
  borderRadius: "30px",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "44px",
  boxShadow: "0 0 60px rgba(139,92,246,.42)"
};

const heroText = {
  color: "#cbd5e1"
};

const protectedPill = {
  display: "inline-block",
  color: "#35d0c3",
  background: "rgba(53,208,195,.10)",
  border: "1px solid rgba(53,208,195,.25)",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px"
};

const heroBadges = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  marginTop: "18px"
};

const statsRow = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "20px"
};

const statBox = {
  background: "rgba(15,23,42,.70)",
  border: "1px solid rgba(56,189,248,.14)",
  borderRadius: "18px",
  padding: "18px",
  textAlign: "center"
};

const filtersPanel = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, .8fr)",
  gap: "14px",
  marginBottom: "18px"
};

const searchPanel = {
  height: "58px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "rgba(15,23,42,.70)",
  border: "1px solid rgba(148,163,184,.16)",
  borderRadius: "18px",
  padding: "0 14px"
};

const searchIcon = {
  color: "#94a3b8",
  fontSize: "22px"
};

const searchInput = {
  flex: 1,
  height: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "white",
  fontSize: "15px"
};

const searchButton = {
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  color: "white",
  border: "none",
  padding: "11px 16px",
  borderRadius: "13px",
  fontWeight: "950",
  cursor: "pointer"
};

const filterInputs = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1.2fr auto",
  gap: "10px"
};

const filterInput = {
  width: "100%",
  background: "rgba(15,23,42,.70)",
  border: "1px solid rgba(148,163,184,.16)",
  borderRadius: "15px",
  padding: "0 14px",
  color: "white",
  outline: "none",
  minHeight: "58px"
};

const clearButton = {
  background: "rgba(15,23,42,.70)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "#cbd5e1",
  padding: "0 16px",
  borderRadius: "15px",
  cursor: "pointer",
  fontWeight: "900",
  minHeight: "58px"
};

const categoryRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "20px"
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

const ghostButton = {
  background: "rgba(15,23,42,.70)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "white",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "14px",
  fontWeight: "900",
  cursor: "pointer"
};

const sellButton = {
  background: "linear-gradient(135deg, #35d0c3, #38bdf8)",
  color: "#020617",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "14px",
  fontWeight: "950",
  boxShadow: "0 18px 50px rgba(56,189,248,.18)"
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
  border: "1px solid rgba(56,189,248,.18)",
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
  background: "radial-gradient(circle at center, rgba(56,189,248,.15), rgba(15,23,42,.55))"
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

const productTitleLink = {
  color: "white",
  textDecoration: "none"
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
  border: "1px solid rgba(56,189,248,.18)",
  borderRadius: "22px",
  padding: "30px",
  textAlign: "center",
  color: "#cbd5e1"
};

const primaryButton = {
  display: "inline-block",
  marginTop: "16px",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  color: "white",
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
  background: "rgba(15,23,42,.70)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "white",
  padding: "13px 24px",
  borderRadius: "999px",
  fontWeight: "800",
  cursor: "pointer"
};

export default Marketplace;
