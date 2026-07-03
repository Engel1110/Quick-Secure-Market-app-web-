import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [sortBy, setSortBy] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const categories = ["Todos", "Gaming", "Tecnología", "Celulares", "Laptops", "Vehículos", "Hogar", "Moda", "Otros"];

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await api.get("/favorites");
      const backendFavorites = response.data.favorites || response.data.products || response.data.data || [];
      setFavorites(Array.isArray(backendFavorites) ? backendFavorites : []);
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudieron cargar tus favoritos. Verifica GET /favorites en el backend.");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (productId) => {
    if (!productId) return;

    try {
      setRemovingId(productId);
      setError("");
      setMessage("");

      await api.delete(`/favorites/${productId}`);

      setFavorites((prev) => prev.filter((product) => String(product._id || product.id) !== String(productId)));
      setMessage("Producto eliminado de favoritos.");
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo eliminar de favoritos. Verifica DELETE /favorites/:productId.");
    } finally {
      setRemovingId("");
    }
  };

  const filteredFavorites = useMemo(() => {
    let result = [...favorites];

    if (categoryFilter !== "Todos") {
      result = result.filter((product) => String(product.category || "").toLowerCase() === categoryFilter.toLowerCase());
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((product) =>
        `${product.title || ""} ${product.description || ""} ${product.category || ""} ${product.location || ""}`
          .toLowerCase()
          .includes(term)
      );
    }

    if (sortBy === "price-low") result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sortBy === "price-high") result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sortBy === "recent") {
      result.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
    }

    return result;
  }, [favorites, categoryFilter, search, sortBy]);

  return (
    <div style={page}>
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin:0; padding:0; width:100%; min-height:100%; background:#020617; font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif; overflow-x:hidden; }
        a, button, input, select { font-family: inherit; }
        a, button { transition: all .25s ease; }
        a:hover, button:hover { transform: translateY(-2px); }
        @keyframes fadeUp { from { opacity:0; transform: translateY(18px); } to { opacity:1; transform: translateY(0); } }
        .favorite-card { transition: transform .25s ease, border .25s ease, box-shadow .25s ease; }
        .favorite-card:hover { transform: translateY(-8px); border-color: rgba(236,72,153,.45); box-shadow: 0 0 35px rgba(236,72,153,.12), 0 0 70px rgba(56,189,248,.08), 0 26px 80px rgba(0,0,0,.45); }
        @media (max-width: 1200px) {
          .favorites-page { grid-template-columns: 1fr !important; }
          .sidebar-wrapper { display:none !important; }
          .stats-grid, .filters-row { grid-template-columns: 1fr !important; }
          .hero-row { flex-direction: column !important; align-items:flex-start !important; }
          .favorites-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 760px) {
          .main-content { padding:18px !important; }
          .favorites-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="favorites-page" style={layout}>
        <div className="sidebar-wrapper"><Sidebar /></div>

        <main className="main-content" style={main}>
          <Topbar />

          <section className="hero-row" style={hero}>
            <div>
              <p style={label}>FAVORITOS QSM</p>
              <h1 style={title}>Mis favoritos</h1>
              <p style={subtitle}>Guarda productos para revisarlos después, comparar precios y comprar con Pago Protegido.</p>
            </div>

            <div style={heroBadge}>
              <span>❤️</span>
              <div>
                <strong>{favorites.length} guardados</strong>
                <p>Productos marcados por ti.</p>
              </div>
            </div>
          </section>

          <section className="stats-grid" style={statsGrid}>
            <StatCard icon="❤️" title="Favoritos guardados" value={favorites.length} />
            <StatCard icon="🔎" title="Resultados filtrados" value={filteredFavorites.length} />
            <StatCard icon="🛡" title="Protección" value="Pago QSM" />
            <StatCard icon="⚡" title="Modo" value="Backend/API" />
          </section>

          <section style={controlPanel}>
            <div className="filters-row" style={filtersRow}>
              <div style={searchBox}>
                <span>⌕</span>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar favoritos..." style={searchInput} />
              </div>

              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectInput}>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectInput}>
                <option value="recent">Más recientes</option>
                <option value="price-low">Precio menor a mayor</option>
                <option value="price-high">Precio mayor a menor</option>
              </select>

              <button onClick={() => { setSearch(""); setCategoryFilter("Todos"); setSortBy("recent"); }} style={ghostButton}>Limpiar</button>
            </div>
          </section>

          {message && <div style={successBox}>{message}</div>}
          {error && <div style={errorBox}>{error}</div>}

          {loading && <div style={centerCard}><h2>Cargando favoritos...</h2><p>QSM está consultando tus productos guardados.</p></div>}

          {!loading && filteredFavorites.length === 0 && (
            <div style={centerCard}>
              <div style={emptyIcon}>❤️</div>
              <h2>No tienes favoritos todavía</h2>
              <p>Marca productos con el corazón desde el Marketplace y aparecerán aquí.</p>
              <Link to="/marketplace" style={primaryButton}>Explorar Marketplace →</Link>
            </div>
          )}

          {!loading && filteredFavorites.length > 0 && (
            <section className="favorites-grid" style={favoritesGrid}>
              {filteredFavorites.map((product, index) => (
                <FavoriteCard key={product._id || product.id || index} product={product} removingId={removingId} onRemove={removeFavorite} />
              ))}
            </section>
          )}
        </main>
      </div>

      <AiAssistant pageContext="favorites" />
    </div>
  );
}

function FavoriteCard({ product, removingId, onRemove }) {
  const productId = product._id || product.id;
  const seller = product.seller || {};
  const image = getProductImage(product);

  return (
    <article className="favorite-card" style={card}>
      <div style={imageWrap}>
        {image ? <img src={image} alt={product.title || "Producto favorito"} style={imageStyle} /> : <span style={imagePlaceholder}>📦</span>}
        <span style={favoriteBadge}>❤️ Favorito</span>
      </div>

      <div style={cardBody}>
        <div style={cardTop}>
          <div>
            <p style={smallLabel}>Producto guardado</p>
            <h2 style={productTitle}>{product.title || "Producto QSM"}</h2>
          </div>
          <strong style={priceText}>{formatMoney(product.price)}</strong>
        </div>

        <p style={description}>{product.description ? product.description.slice(0, 130) : "Producto guardado para revisar más adelante."}</p>

        <div style={metaGrid}>
          <Info title="Categoría" value={product.category || "Producto"} />
          <Info title="Ubicación" value={product.location || "República Dominicana"} />
          <Info title="Vendedor" value={formatUser(seller, "Vendedor QSM")} />
          <Info title="Confianza" value={`${seller.trustScore || 50}/100`} />
        </div>

        <div style={actions}>
          <Link to={`/product/${productId}`} style={primaryAction}>Ver producto</Link>
          <button onClick={() => onRemove(productId)} disabled={removingId === productId} style={dangerAction}>
            {removingId === productId ? "Quitando..." : "Quitar"}
          </button>
        </div>
      </div>
    </article>
  );
}

function StatCard({ icon, title, value }) {
  return <div style={statCard}><div style={statIcon}>{icon}</div><div><span>{title}</span><strong>{value}</strong></div></div>;
}

function Info({ title, value }) {
  return <div style={infoItem}><span>{title}</span><strong>{value}</strong></div>;
}

function formatUser(user, fallback) {
  if (!user || typeof user !== "object") return fallback;
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.name || user.email || fallback;
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function getProductImage(product) {
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0];

    if (typeof firstImage === "string") {
      const cleanImage = firstImage.trim().replaceAll("&#x2F;", "/").replaceAll("&amp;", "&");
      if (cleanImage.startsWith("http")) return cleanImage;
      if (cleanImage.startsWith("/uploads")) return `http://localhost:5000${cleanImage}`;
      if (cleanImage.startsWith("uploads")) return `http://localhost:5000/${cleanImage}`;
      return `http://localhost:5000/uploads/products/images/${cleanImage}`;
    }
  }
  return "";
}

const page = { minHeight: "100vh", width: "100%", background: "radial-gradient(circle at top right, rgba(236,72,153,.14), transparent 34%), radial-gradient(circle at 18% 15%, rgba(56,189,248,.09), transparent 28%), #020617", color: "white" };
const layout = { width: "100%", minHeight: "100vh", display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", overflowX: "hidden" };
const main = { width: "100%", minWidth: 0, padding: "26px 34px 56px", overflowX: "hidden" };
const hero = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", margin: "22px 0" };
const label = { color: "#38bdf8", letterSpacing: "4px", fontSize: "12px", fontWeight: "950", textTransform: "uppercase", margin: 0 };
const title = { fontSize: "clamp(40px, 3.6vw, 62px)", lineHeight: "1", margin: "10px 0", letterSpacing: "-2px" };
const subtitle = { color: "#cbd5e1", lineHeight: "29px", maxWidth: "780px", margin: 0 };
const heroBadge = { display: "flex", alignItems: "center", gap: "14px", minWidth: "260px", background: "rgba(15,23,42,.72)", border: "1px solid rgba(236,72,153,.22)", borderRadius: "22px", padding: "18px" };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const statCard = { display: "flex", alignItems: "center", gap: "14px", background: "rgba(15,23,42,.72)", border: "1px solid rgba(56,189,248,.15)", borderRadius: "22px", padding: "20px" };
const statIcon = { width: "52px", height: "52px", borderRadius: "17px", background: "rgba(236,72,153,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" };
const controlPanel = { background: "rgba(15,23,42,.62)", border: "1px solid rgba(56,189,248,.14)", borderRadius: "24px", padding: "18px", marginBottom: "18px" };
const filtersRow = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 190px 210px 120px", gap: "12px" };
const searchBox = { height: "56px", display: "flex", alignItems: "center", gap: "12px", background: "rgba(2,6,23,.45)", border: "1px solid rgba(148,163,184,.14)", borderRadius: "15px", padding: "0 14px" };
const searchInput = { flex: 1, height: "100%", background: "transparent", border: "none", outline: "none", color: "white" };
const selectInput = { background: "rgba(2,6,23,.45)", border: "1px solid rgba(148,163,184,.14)", borderRadius: "15px", padding: "0 14px", color: "white", outline: "none" };
const ghostButton = { background: "rgba(15,23,42,.70)", border: "1px solid rgba(148,163,184,.16)", color: "white", padding: "0 14px", borderRadius: "15px", fontWeight: "900", cursor: "pointer" };
const successBox = { background: "rgba(34,197,94,.14)", border: "1px solid rgba(34,197,94,.32)", color: "#bbf7d0", padding: "14px 18px", borderRadius: "16px", marginBottom: "16px", fontWeight: "800" };
const errorBox = { background: "rgba(127,29,29,.24)", border: "1px solid rgba(248,113,113,.30)", color: "#fecaca", padding: "14px 18px", borderRadius: "16px", marginBottom: "16px", fontWeight: "800" };
const centerCard = { background: "rgba(15,23,42,.72)", border: "1px solid rgba(56,189,248,.14)", borderRadius: "24px", padding: "44px", textAlign: "center", color: "#cbd5e1" };
const emptyIcon = { fontSize: "70px", marginBottom: "14px" };
const primaryButton = { display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)", color: "white", textDecoration: "none", border: "none", padding: "14px 20px", borderRadius: "14px", fontWeight: "950", cursor: "pointer", boxShadow: "0 18px 54px rgba(139,92,246,.22)" };
const favoritesGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" };
const card = { background: "rgba(15,23,42,.72)", border: "1px solid rgba(56,189,248,.16)", borderRadius: "26px", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.20)", animation: "fadeUp .45s ease" };
const imageWrap = { height: "240px", position: "relative", background: "linear-gradient(135deg, rgba(56,189,248,.16), rgba(236,72,153,.14))", overflow: "hidden" };
const imageStyle = { width: "100%", height: "100%", objectFit: "cover" };
const imagePlaceholder = { height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "60px" };
const favoriteBadge = { position: "absolute", top: "14px", right: "14px", background: "rgba(236,72,153,.18)", border: "1px solid rgba(236,72,153,.38)", color: "#fbcfe8", borderRadius: "999px", padding: "8px 12px", fontSize: "12px", fontWeight: "950" };
const cardBody = { padding: "20px" };
const cardTop = { display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start" };
const smallLabel = { color: "#38bdf8", fontSize: "12px", letterSpacing: "3px", fontWeight: "950", margin: 0 };
const productTitle = { margin: "6px 0 0", fontSize: "23px" };
const priceText = { color: "#35d0c3", fontSize: "22px", whiteSpace: "nowrap" };
const description = { color: "#cbd5e1", lineHeight: "24px", minHeight: "52px" };
const metaGrid = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", margin: "16px 0" };
const infoItem = { background: "rgba(2,6,23,.35)", border: "1px solid rgba(148,163,184,.10)", borderRadius: "14px", padding: "12px" };
const actions = { display: "grid", gridTemplateColumns: "1fr 120px", gap: "10px" };
const primaryAction = { textAlign: "center", background: "linear-gradient(135deg, #38bdf8, #8b5cf6)", color: "white", textDecoration: "none", border: "none", borderRadius: "13px", padding: "12px", fontWeight: "950", cursor: "pointer" };
const dangerAction = { ...primaryAction, background: "rgba(239,68,68,.16)", color: "#fecaca", border: "1px solid rgba(239,68,68,.32)" };

export default Favorites;
