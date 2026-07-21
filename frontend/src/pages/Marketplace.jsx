import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

import { getProducts } from "../api/products";
import api from "../api/axios";

const API_ORIGIN = String(
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

const CATEGORIES = [
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

const BLOCKED_STATUSES = [
  "DISABLED",
  "DELETED",
  "REMOVED",
  "BLOCKED",
  "FRAUD"
];

const DEFAULT_VISUALS = {
  appearance: "dark",
  accentColor: "#35d0c3",
  compactMode: false,
  showHero: true,
  showStats: true,
  showSeller: true,
  showRisk: true,
  showQsmScore: true,
  reducedMotion: false
};

function Marketplace() {
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [sortBy, setSortBy] = useState("recent");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    readSidebarCollapsed
  );

  const [visuals, setVisuals] = useState(readVisualSettings);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    setSearch(params.get("search") || "");
    setActiveCategory(normalizeCategory(params.get("category")));
    setSortBy(normalizeSort(params.get("sort")));
    setRiskFilter(normalizeRisk(params.get("risk")));
    setMinPrice(normalizePrice(params.get("min")));
    setMaxPrice(normalizePrice(params.get("max")));
    setVisibleCount(12);
  }, [location.search]);

  useEffect(() => {
    const handleSidebar = (event) => {
      const collapsed = event?.detail?.collapsed;

      setSidebarCollapsed(
        typeof collapsed === "boolean"
          ? collapsed
          : readSidebarCollapsed()
      );
    };

    const handleSettings = () => {
      setVisuals(readVisualSettings());
    };

    const handleStorage = (event) => {
      if (event.key === "qsm_sidebar_collapsed") {
        setSidebarCollapsed(readSidebarCollapsed());
      }

      if (isVisualSettingsKey(event.key)) {
        handleSettings();
      }
    };

    window.addEventListener("qsm-sidebar-changed", handleSidebar);
    window.addEventListener("qsm-settings-changed", handleSettings);
    window.addEventListener("qsm-theme-changed", handleSettings);
    window.addEventListener("qsm-appearance-changed", handleSettings);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("qsm-sidebar-changed", handleSidebar);
      window.removeEventListener("qsm-settings-changed", handleSettings);
      window.removeEventListener("qsm-theme-changed", handleSettings);
      window.removeEventListener("qsm-appearance-changed", handleSettings);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const loadProducts = useCallback(async ({ initial = false } = {}) => {
    try {
      initial ? setLoading(true) : setRefreshing(true);
      setError("");

      const response = await getProducts();
      const loaded = extractProducts(response).filter(isVisibleProduct);

      setProducts(loaded);
    } catch (requestError) {
      console.error("Error cargando Marketplace:", requestError);

      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "No se pudieron cargar los productos."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    if (!hasSession()) {
      setFavoriteIds([]);
      return;
    }

    try {
      const response = await api.get("/favorite");

      const raw =
        response?.data?.favorites ??
        response?.data?.products ??
        response?.data?.data?.favorites ??
        response?.data?.data ??
        [];

      const ids = Array.isArray(raw)
        ? raw
            .map(
              (item) =>
                item?.product?._id ||
                item?.product?.id ||
                item?._id ||
                item?.id
            )
            .filter(Boolean)
            .map(String)
        : [];

      setFavoriteIds([...new Set(ids)]);
    } catch (requestError) {
      if (requestError?.response?.status !== 404) {
        console.warn(
          "No se pudieron cargar favoritos:",
          requestError?.response?.data?.message || requestError?.message
        );
      }
    }
  }, []);

  useEffect(() => {
    loadProducts({ initial: true });
    loadFavorites();
  }, [loadProducts, loadFavorites]);

  const toggleFavorite = async (productId) => {
    if (!productId) return;

    if (!hasSession()) {
      navigate("/login", {
        state: {
          from: location.pathname + location.search
        }
      });
      return;
    }

    const id = String(productId);
    const currentlyFavorite = favoriteIds.includes(id);

    try {
      setFavoriteLoadingId(id);
      setError("");

      if (currentlyFavorite) {
        await api.delete(`/favorite/${id}`);
        setFavoriteIds((current) =>
          current.filter((favoriteId) => favoriteId !== id)
        );
      } else {
        await api.post(`/favorite/${id}`);
        setFavoriteIds((current) =>
          current.includes(id) ? current : [...current, id]
        );
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "No se pudo actualizar Favoritos."
      );
    } finally {
      setFavoriteLoadingId("");
    }
  };

  const updateUrl = (overrides = {}) => {
    const values = {
      search,
      activeCategory,
      sortBy,
      riskFilter,
      minPrice,
      maxPrice,
      ...overrides
    };

    const params = new URLSearchParams();

    if (values.search.trim()) params.set("search", values.search.trim());
    if (values.activeCategory !== "Todos") {
      params.set("category", values.activeCategory);
    }
    if (values.sortBy !== "recent") params.set("sort", values.sortBy);
    if (values.riskFilter !== "ALL") params.set("risk", values.riskFilter);
    if (values.minPrice !== "") params.set("min", values.minPrice);
    if (values.maxPrice !== "") params.set("max", values.maxPrice);

    const query = params.toString();

    navigate(query ? `/marketplace?${query}` : "/marketplace");
  };

  const clearFilters = () => {
    setSearch("");
    setActiveCategory("Todos");
    setSortBy("recent");
    setRiskFilter("ALL");
    setMinPrice("");
    setMaxPrice("");
    setVisibleCount(12);
    navigate("/marketplace");
  };

  const filteredProducts = useMemo(() => {
    const term = normalizeText(search);
    const minimum = optionalNumber(minPrice);
    const maximum = optionalNumber(maxPrice);

    const result = products.filter((product) => {
      const productText = normalizeText(
        [
          product?.title,
          product?.description,
          product?.category,
          product?.location,
          product?.brand,
          product?.model,
          product?.seller?.firstName,
          product?.seller?.lastName
        ]
          .filter(Boolean)
          .join(" ")
      );

      const categoryMatch =
        activeCategory === "Todos" ||
        String(product?.category || "").toLowerCase() ===
          activeCategory.toLowerCase();

      const searchMatch = !term || productText.includes(term);
      const price = Number(product?.price || 0);
      const minimumMatch = minimum === null || price >= minimum;
      const maximumMatch = maximum === null || price <= maximum;
      const riskMatch =
        riskFilter === "ALL" ||
        normalizeRisk(product?.riskLevel) === riskFilter;

      return (
        categoryMatch &&
        searchMatch &&
        minimumMatch &&
        maximumMatch &&
        riskMatch
      );
    });

    result.sort(getSortFunction(sortBy));

    return result;
  }, [
    products,
    search,
    activeCategory,
    sortBy,
    riskFilter,
    minPrice,
    maxPrice
  ]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const statistics = useMemo(
    () => ({
      products: products.length,
      results: filteredProducts.length,
      lowRisk: products.filter(
        (product) => normalizeRisk(product?.riskLevel) === "LOW"
      ).length,
      protected: products.filter(
        (product) =>
          product?.isQsmVerified ||
          Boolean(product?.deliveryMethod)
      ).length
    }),
    [products, filteredProducts.length]
  );

  const lightMode = visuals.appearance === "light";
  const accent = normalizeHex(visuals.accentColor, "#35d0c3");

  const cssVariables = {
    "--market-accent": accent,
    "--market-accent-soft": hexToRgba(accent, 0.14),
    "--market-accent-border": hexToRgba(accent, 0.38),
    "--market-background": lightMode ? "#edf4ff" : "#020617",
    "--market-card": lightMode
      ? "rgba(255,255,255,.90)"
      : "rgba(15,23,42,.76)",
    "--market-text": lightMode ? "#0f172a" : "#f8fafc",
    "--market-muted": lightMode ? "#64748b" : "#94a3b8",
    "--market-border": lightMode
      ? "rgba(15,23,42,.12)"
      : "rgba(148,163,184,.15)"
  };

  return (
    <div style={{ ...styles.page(lightMode), ...cssVariables }}>
      <style>{marketplaceCss(visuals)}</style>

      <div
        className="marketplace-layout"
        style={styles.layout(sidebarCollapsed)}
      >
        <div className="marketplace-sidebar">
          <Sidebar />
        </div>

        <main
          className="marketplace-main"
          style={styles.main(visuals.compactMode)}
        >
          <Topbar />

          {visuals.showHero && (
            <section className="marketplace-hero" style={styles.hero}>
              <div>
                <p style={styles.eyebrow}>MARKETPLACE QSM</p>

                <h1 style={styles.title}>
                  Compra con{" "}
                  <span style={styles.gradientText}>Pago Protegido</span>
                </h1>

                <p style={styles.subtitle}>
                  Explora publicaciones reales, revisa el riesgo QSM y compra
                  con información transparente.
                </p>

                <div style={styles.badges}>
                  <span>🧾 Identidad</span>
                  <span>💰 Pago protegido</span>
                  <span>🧠 Riesgo QSM</span>
                  <span>⚖️ Reclamos</span>
                </div>

                <div style={styles.actions}>
                  <button
                    type="button"
                    onClick={() => loadProducts()}
                    disabled={refreshing}
                    style={styles.secondaryButton}
                  >
                    {refreshing ? "Actualizando..." : "Actualizar"}
                  </button>

                  <Link to="/new-product" style={styles.primaryButton}>
                    + Vender producto
                  </Link>
                </div>
              </div>

              <div style={styles.heroCard}>
                <div style={styles.heroIcon}>🛡</div>

                <div>
                  <strong>QSM Marketplace</strong>
                  <p>
                    Reputación, trazabilidad y clasificación de riesgo en cada
                    publicación.
                  </p>
                </div>
              </div>
            </section>
          )}

          {visuals.showStats && (
            <section className="marketplace-stats" style={styles.stats}>
              <Stat icon="📦" label="Disponibles" value={statistics.products} />
              <Stat icon="🔎" label="Resultados" value={statistics.results} />
              <Stat icon="🟢" label="Riesgo bajo" value={statistics.lowRisk} />
              <Stat icon="🛡" label="Protegidos" value={statistics.protected} />
            </section>
          )}

          <section className="marketplace-filters" style={styles.filters}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setVisibleCount(12);
                updateUrl();
              }}
              style={styles.searchForm}
            >
              <span style={styles.searchIcon}>⌕</span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar producto, marca, categoría o ubicación..."
                style={styles.searchInput}
              />

              <button type="submit" style={styles.searchButton}>
                Buscar
              </button>
            </form>

            <div className="marketplace-filter-grid" style={styles.filterGrid}>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="Mínimo"
                style={styles.input}
              />

              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Máximo"
                style={styles.input}
              />

              <select
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value)}
                style={styles.input}
              >
                <option value="ALL">Todo riesgo</option>
                <option value="LOW">Riesgo bajo</option>
                <option value="MEDIUM">Riesgo medio</option>
                <option value="HIGH">Riesgo alto</option>
                <option value="CRITICAL">Riesgo crítico</option>
              </select>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                style={styles.input}
              >
                <option value="recent">Más recientes</option>
                <option value="price-low">Menor precio</option>
                <option value="price-high">Mayor precio</option>
                <option value="score-high">Mejor QSM Score</option>
                <option value="trust-high">Mayor confianza</option>
              </select>

              <button
                type="button"
                onClick={clearFilters}
                style={styles.clearButton}
              >
                Limpiar
              </button>
            </div>
          </section>

          <section style={styles.categories}>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className="marketplace-category"
                onClick={() => {
                  setActiveCategory(category);
                  setVisibleCount(12);
                  updateUrl({ activeCategory: category });
                }}
                style={
                  activeCategory === category
                    ? styles.categoryActive
                    : styles.category
                }
              >
                {category}
              </button>
            ))}
          </section>

          {error && (
            <div style={styles.error}>
              <span>!</span>
              <p>{error}</p>
              <button type="button" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}

          {loading && (
            <section
              className="marketplace-products"
              style={styles.grid(visuals.compactMode)}
            >
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} />
              ))}
            </section>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>🔎</div>
              <h3>No encontramos productos</h3>
              <p>Ajusta los filtros o publica el primer producto.</p>

              <div style={styles.actions}>
                <button
                  type="button"
                  onClick={clearFilters}
                  style={styles.secondaryButton}
                >
                  Limpiar filtros
                </button>

                <Link to="/new-product" style={styles.primaryButton}>
                  Publicar producto
                </Link>
              </div>
            </div>
          )}

          {!loading && filteredProducts.length > 0 && (
            <>
              <div style={styles.resultsHeader}>
                <div>
                  <p style={styles.eyebrow}>RESULTADOS</p>
                  <h2 style={styles.resultsTitle}>
                    {filteredProducts.length}{" "}
                    {filteredProducts.length === 1 ? "producto" : "productos"}
                  </h2>
                </div>

                <span style={styles.realDataBadge}>Datos reales de QSM</span>
              </div>

              <section
                className="marketplace-products"
                style={styles.grid(visuals.compactMode)}
              >
                {visibleProducts.map((product, index) => (
                  <ProductCard
                    key={product?._id || product?.id || index}
                    product={product}
                    index={index}
                    isFavorite={favoriteIds.includes(
                      String(product?._id || product?.id)
                    )}
                    favoriteLoadingId={favoriteLoadingId}
                    onToggleFavorite={toggleFavorite}
                    visuals={visuals}
                  />
                ))}
              </section>

              {visibleCount < filteredProducts.length && (
                <div style={styles.loadMoreWrap}>
                  <button
                    type="button"
                    onClick={() => setVisibleCount((current) => current + 8)}
                    style={styles.loadMore}
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

function ProductCard({
  product,
  index,
  isFavorite,
  favoriteLoadingId,
  onToggleFavorite,
  visuals
}) {
  const productId = product?._id || product?.id;
  const seller =
    product?.seller && typeof product.seller === "object"
      ? product.seller
      : {};

  const sellerName =
    [seller?.firstName, seller?.lastName].filter(Boolean).join(" ").trim() ||
    seller?.name ||
    "Vendedor QSM";

  const sellerPhoto = resolveMediaUrl(
    seller?.profilePhoto || seller?.avatar || seller?.photo || ""
  );

  const trustScore = clamp(seller?.trustScore, 0, 100, 50);
  const publicationScore = clamp(
    product?.publicationScore ?? product?.confidenceScore,
    0,
    100,
    0
  );

  const risk = riskPresentation(product?.riskLevel, product?.riskLabel);
  const image = productImage(product);

  const glows = [
    "rgba(56,189,248,.23)",
    "rgba(139,92,246,.23)",
    "rgba(34,197,94,.18)",
    "rgba(236,72,153,.19)"
  ];

  return (
    <article className="marketplace-product-card" style={styles.productCard}>
      <div
        style={{
          ...styles.glow,
          background: glows[index % glows.length]
        }}
      />

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleFavorite(productId);
        }}
        disabled={favoriteLoadingId === String(productId)}
        style={styles.heart(isFavorite)}
      >
        {favoriteLoadingId === String(productId)
          ? "..."
          : isFavorite
          ? "♥"
          : "♡"}
      </button>

      <Link to={`/product/${productId}`} style={styles.imageLink}>
        <div style={styles.imageWrap}>
          <img
            className="marketplace-product-image"
            src={image}
            alt={product?.title || "Producto QSM"}
            loading="lazy"
            style={styles.productImage}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = fallbackImage();
            }}
          />

          <div style={styles.imageOverlay} />

          <span style={styles.protectedBadge}>🛡 Pago Protegido</span>

          {visuals.showRisk && (
            <span style={styles.riskBadge(risk)}>
              {risk.icon} {risk.label}
            </span>
          )}

          {String(product?.status || "").toUpperCase() === "SOLD" && (
            <span style={styles.sold}>Vendido</span>
          )}
        </div>
      </Link>

      <div style={styles.productBody}>
        <div style={styles.cardMeta}>
          <span>{product?.category || "Producto"}</span>
          <span>{conditionLabel(product?.condition)}</span>
        </div>

        <Link to={`/product/${productId}`} style={styles.titleLink}>
          <h3 style={styles.productTitle}>
            {product?.title || "Producto sin título"}
          </h3>
        </Link>

        <strong style={styles.price}>{formatMoney(product?.price)}</strong>

        <div style={styles.meta}>
          <span>📍 {product?.location || "República Dominicana"}</span>
          <span>🚚 {deliveryLabel(product?.deliveryMethod)}</span>
        </div>

        {(visuals.showQsmScore || visuals.showRisk) && (
          <div style={styles.scoreGrid}>
            {visuals.showQsmScore && (
              <div style={styles.scoreBox}>
                <span>QSM Score</span>
                <strong>{publicationScore}/100</strong>
              </div>
            )}

            {visuals.showRisk && (
              <div style={styles.scoreBox}>
                <span>Riesgo</span>
                <strong style={{ color: risk.color }}>{risk.label}</strong>
              </div>
            )}
          </div>
        )}

        {visuals.showSeller && (
          <div style={styles.seller}>
            {sellerPhoto ? (
              <img
                src={sellerPhoto}
                alt={sellerName}
                style={styles.sellerPhoto}
              />
            ) : (
              <div style={styles.sellerAvatar}>
                {sellerName.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={styles.sellerInfo}>
              <strong>{sellerName}</strong>
              <p>
                Confianza <span>{trustScore}/100</span>
              </p>
            </div>

            <span style={styles.verified(isVerifiedSeller(seller))}>
              {isVerifiedSeller(seller) ? "Verificado" : "Pendiente"}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statIcon}>{icon}</div>

      <div>
        <span style={styles.statLabel}>{label}</span>
        <strong style={styles.statValue}>{value}</strong>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={styles.skeleton}>
      <div style={styles.skeletonImage} />
      <div style={styles.skeletonLine} />
      <div style={styles.skeletonLineSmall} />
      <div style={styles.skeletonFooter} />
    </div>
  );
}

function extractProducts(response) {
  const source = response?.data ?? response;

  const candidates = [
    source?.products,
    source?.data?.products,
    source?.data,
    source
  ];

  return candidates.find(Array.isArray) || [];
}

function isVisibleProduct(product) {
  if (!product || typeof product !== "object") return false;

  const id = product?._id || product?.id;
  if (!id) return false;

  const status = String(product?.status || "ACTIVE").toUpperCase();

  return !BLOCKED_STATUSES.includes(status);
}

function hasSession() {
  return Boolean(
    localStorage.getItem("qsm_token") ||
      sessionStorage.getItem("qsm_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
  );
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCategory(value) {
  const found = CATEGORIES.find(
    (category) =>
      category.toLowerCase() === String(value || "").toLowerCase()
  );

  return found || "Todos";
}

function normalizeSort(value) {
  const allowed = [
    "recent",
    "price-low",
    "price-high",
    "score-high",
    "trust-high"
  ];

  return allowed.includes(value) ? value : "recent";
}

function normalizeRisk(value) {
  const normalized = String(value || "ALL").toUpperCase();

  return ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL", "UNCLASSIFIED"].includes(
    normalized
  )
    ? normalized
    : "ALL";
}

function normalizePrice(value) {
  if (value === null || value === undefined || value === "") return "";

  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? String(number) : "";
}

function optionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getSortFunction(sortBy) {
  if (sortBy === "price-low") {
    return (a, b) => Number(a?.price || 0) - Number(b?.price || 0);
  }

  if (sortBy === "price-high") {
    return (a, b) => Number(b?.price || 0) - Number(a?.price || 0);
  }

  if (sortBy === "score-high") {
    return (a, b) =>
      Number(b?.publicationScore ?? b?.confidenceScore ?? 0) -
      Number(a?.publicationScore ?? a?.confidenceScore ?? 0);
  }

  if (sortBy === "trust-high") {
    return (a, b) =>
      Number(b?.seller?.trustScore || 0) -
      Number(a?.seller?.trustScore || 0);
  }

  return (a, b) =>
    new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
}

function clamp(value, minimum, maximum, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.min(maximum, Math.max(minimum, number));
}

function formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "RD$ 0";

  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(number);
}

function conditionLabel(value) {
  const labels = {
    NEW: "Nuevo",
    LIKE_NEW: "Como nuevo",
    USED_GOOD: "Buen estado",
    USED_DETAILS: "Con detalles",
    FOR_PARTS: "Para piezas"
  };

  return labels[String(value || "").toUpperCase()] || "No indicada";
}

function deliveryLabel(value) {
  const labels = {
    QSM_WAREHOUSE: "Almacén QSM",
    QSM_VERIFIED_DELIVERY: "Delivery QSM",
    DIRECT_DELIVERY: "Entrega directa"
  };

  return labels[String(value || "").toUpperCase()] || "Entrega acordada";
}

function isVerifiedSeller(seller) {
  return (
    Boolean(seller?.isVerified) ||
    ["APPROVED", "VERIFIED"].includes(
      String(seller?.verificationStatus || "").toUpperCase()
    )
  );
}

function riskPresentation(level, customLabel) {
  const normalized = normalizeRisk(level);

  const variants = {
    LOW: {
      label: customLabel || "Riesgo bajo",
      icon: "●",
      color: "#4ade80",
      background: "rgba(34,197,94,.15)",
      border: "rgba(34,197,94,.36)"
    },
    MEDIUM: {
      label: customLabel || "Riesgo medio",
      icon: "●",
      color: "#facc15",
      background: "rgba(245,158,11,.15)",
      border: "rgba(245,158,11,.36)"
    },
    HIGH: {
      label: customLabel || "Riesgo alto",
      icon: "●",
      color: "#fb923c",
      background: "rgba(249,115,22,.15)",
      border: "rgba(249,115,22,.36)"
    },
    CRITICAL: {
      label: customLabel || "Riesgo crítico",
      icon: "●",
      color: "#f87171",
      background: "rgba(239,68,68,.16)",
      border: "rgba(239,68,68,.38)"
    },
    UNCLASSIFIED: {
      label: customLabel || "Por determinar",
      icon: "●",
      color: "#94a3b8",
      background: "rgba(148,163,184,.13)",
      border: "rgba(148,163,184,.26)"
    }
  };

  return variants[normalized] || variants.UNCLASSIFIED;
}

function resolveMediaUrl(value) {
  if (!value) return "";

  const source =
    typeof value === "string"
      ? value
      : value?.url ||
        value?.path ||
        value?.fileUrl ||
        value?.secure_url ||
        "";

  if (!source) return "";

  if (
    source.startsWith("data:") ||
    source.startsWith("blob:") ||
    /^https?:\/\//i.test(source)
  ) {
    return source;
  }

  return source.startsWith("/")
    ? `${API_ORIGIN}${source}`
    : `${API_ORIGIN}/${source}`;
}

function productImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const first = images.find(Boolean);

  return resolveMediaUrl(first) || fallbackImage();
}

function fallbackImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="52%" stop-color="#164e63"/>
          <stop offset="100%" stop-color="#312e81"/>
        </linearGradient>
      </defs>
      <rect width="1000" height="700" fill="url(#g)"/>
      <text x="500" y="330" text-anchor="middle" font-size="120">📦</text>
      <text x="500" y="470" text-anchor="middle" fill="#e2e8f0"
        font-family="Arial" font-size="44" font-weight="700">Producto QSM</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function storageValue(key) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function readSidebarCollapsed() {
  return storageValue("qsm_sidebar_collapsed") === "true";
}

function readVisualSettings() {
  const settings =
    safeJson(storageValue("qsm_settings")) ||
    safeJson(storageValue("qsm_user_settings")) ||
    safeJson(storageValue("qsm_preferences")) ||
    {};

  const marketplace =
    settings?.marketplace ||
    settings?.visual?.marketplace ||
    {};

  const appearance =
    marketplace?.appearance ||
    settings?.appearance ||
    storageValue("qsm_appearance") ||
    storageValue("qsm_theme") ||
    DEFAULT_VISUALS.appearance;

  const accentColor =
    marketplace?.accentColor ||
    settings?.accentColor ||
    settings?.accent ||
    storageValue("qsm_accent_color") ||
    DEFAULT_VISUALS.accentColor;

  return {
    ...DEFAULT_VISUALS,
    ...marketplace,
    appearance: String(appearance).toLowerCase().includes("light")
      ? "light"
      : "dark",
    accentColor: normalizeHex(accentColor, DEFAULT_VISUALS.accentColor),
    compactMode: Boolean(
      marketplace?.compactMode ?? settings?.compactMode ?? false
    ),
    showHero: marketplace?.showHero !== false,
    showStats: marketplace?.showStats !== false,
    showSeller: marketplace?.showSeller !== false,
    showRisk: marketplace?.showRisk !== false,
    showQsmScore: marketplace?.showQsmScore !== false,
    reducedMotion: Boolean(
      marketplace?.reducedMotion ?? settings?.reducedMotion ?? false
    )
  };
}

function isVisualSettingsKey(key) {
  return [
    "qsm_settings",
    "qsm_user_settings",
    "qsm_preferences",
    "qsm_appearance",
    "qsm_theme",
    "qsm_accent_color"
  ].includes(String(key || ""));
}

function normalizeHex(value, fallback) {
  const candidate = String(value || "").trim();

  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
}

function hexToRgba(hex, alpha) {
  const number = Number.parseInt(normalizeHex(hex, "#35d0c3").slice(1), 16);

  return `rgba(${(number >> 16) & 255},${(number >> 8) & 255},${
    number & 255
  },${alpha})`;
}

function marketplaceCss(visuals) {
  const noMotion = visuals?.reducedMotion;

  return `
    * { box-sizing: border-box; }

    html, body, #root {
      width: 100%;
      min-height: 100%;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      background: var(--market-background);
      font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
    }

    a, button, input, select { font-family: inherit; }

    button, a {
      transition: ${noMotion ? "none" : "all .24s ease"};
    }

    button:hover, a:hover {
      transform: ${noMotion ? "none" : "translateY(-2px)"};
    }

    button:disabled {
      opacity: .58;
      cursor: not-allowed;
      transform: none !important;
    }

    select {
      color-scheme: ${visuals?.appearance === "light" ? "light" : "dark"};
    }

    .marketplace-product-card {
      transition: ${
        noMotion
          ? "none"
          : "transform .28s ease, border-color .28s ease, box-shadow .28s ease"
      };
    }

    .marketplace-product-card:hover {
      transform: ${noMotion ? "none" : "translateY(-7px)"};
      border-color: var(--market-accent-border);
      box-shadow:
        0 0 35px var(--market-accent-soft),
        0 28px 80px rgba(0,0,0,.30);
    }

    .marketplace-product-card:hover .marketplace-product-image {
      transform: ${noMotion ? "none" : "scale(1.055)"};
    }

    @media (max-width: 1250px) {
      .marketplace-layout {
        grid-template-columns: 1fr !important;
      }

      .marketplace-sidebar {
        display: none !important;
      }

      .marketplace-hero,
      .marketplace-filters {
        grid-template-columns: 1fr !important;
      }

      .marketplace-products {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }

    @media (max-width: 820px) {
      .marketplace-main {
        padding: 18px !important;
      }

      .marketplace-stats,
      .marketplace-filter-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }

    @media (max-width: 620px) {
      .marketplace-products,
      .marketplace-stats,
      .marketplace-filter-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `;
}

const styles = {
  page: (light) => ({
    width: "100%",
    minHeight: "100vh",
    color: "var(--market-text)",
    background: light
      ? "radial-gradient(circle at 88% 5%, rgba(139,92,246,.11), transparent 28%), radial-gradient(circle at 12% 10%, rgba(53,208,195,.10), transparent 25%), #edf4ff"
      : "radial-gradient(circle at 88% 5%, rgba(139,92,246,.17), transparent 30%), radial-gradient(circle at 12% 10%, rgba(53,208,195,.10), transparent 27%), #020617"
  }),

  layout: (collapsed) => ({
    width: "100%",
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: collapsed
      ? "96px minmax(0, 1fr)"
      : "300px minmax(0, 1fr)",
    overflowX: "hidden",
    transition: "grid-template-columns .28s ease"
  }),

  main: (compact) => ({
    minWidth: 0,
    minHeight: "100vh",
    padding: compact ? "20px 24px 48px" : "26px 34px 58px",
    overflowX: "hidden"
  }),

  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 390px)",
    alignItems: "center",
    gap: "22px",
    margin: "22px 0",
    padding: "28px",
    borderRadius: "28px",
    border: "1px solid var(--market-border)",
    background: "var(--market-card)",
    boxShadow: "0 26px 85px rgba(0,0,0,.20)",
    backdropFilter: "blur(16px)"
  },

  eyebrow: {
    margin: 0,
    color: "var(--market-accent)",
    letterSpacing: "3px",
    fontSize: "9px",
    fontWeight: "950"
  },

  title: {
    margin: "9px 0",
    fontSize: "clamp(38px, 4vw, 62px)",
    lineHeight: "1.02",
    letterSpacing: "-2px"
  },

  gradientText: {
    background:
      "linear-gradient(90deg, var(--market-accent), #38bdf8, #8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },

  subtitle: {
    maxWidth: "760px",
    margin: 0,
    color: "var(--market-muted)",
    fontSize: "14px",
    lineHeight: "23px"
  },

  badges: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "17px"
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "18px"
  },

  heroCard: {
    display: "grid",
    gridTemplateColumns: "70px minmax(0, 1fr)",
    alignItems: "center",
    gap: "14px",
    padding: "19px",
    borderRadius: "22px",
    border: "1px solid var(--market-accent-border)",
    background:
      "linear-gradient(135deg, var(--market-accent-soft), rgba(139,92,246,.12))"
  },

  heroIcon: {
    width: "70px",
    height: "70px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "20px",
    background:
      "linear-gradient(135deg, var(--market-accent), #38bdf8, #8b5cf6)",
    fontSize: "30px"
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "13px",
    marginBottom: "18px"
  },

  stat: {
    minWidth: 0,
    minHeight: "82px",
    display: "grid",
    gridTemplateColumns: "46px minmax(0, 1fr)",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    borderRadius: "18px",
    border: "1px solid var(--market-border)",
    background: "var(--market-card)"
  },

  statIcon: {
    width: "46px",
    height: "46px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "14px",
    background: "var(--market-accent-soft)",
    fontSize: "21px"
  },

  statLabel: {
    display: "block",
    color: "var(--market-muted)",
    fontSize: "11px"
  },

  statValue: {
    display: "block",
    marginTop: "4px",
    fontSize: "20px"
  },

  filters: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(520px, .9fr)",
    gap: "13px",
    marginBottom: "16px"
  },

  searchForm: {
    minHeight: "58px",
    display: "grid",
    gridTemplateColumns: "30px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "10px",
    padding: "0 12px",
    borderRadius: "17px",
    border: "1px solid var(--market-border)",
    background: "var(--market-card)"
  },

  searchIcon: {
    color: "var(--market-muted)",
    fontSize: "21px",
    textAlign: "center"
  },

  searchInput: {
    width: "100%",
    height: "56px",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--market-text)"
  },

  searchButton: {
    minHeight: "40px",
    padding: "9px 16px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, var(--market-accent), #38bdf8, #8b5cf6)",
    color: "#fff",
    fontWeight: "950",
    cursor: "pointer"
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns: ".7fr .7fr .9fr 1fr auto",
    gap: "9px"
  },

  input: {
    minWidth: 0,
    minHeight: "58px",
    padding: "0 12px",
    borderRadius: "15px",
    border: "1px solid var(--market-border)",
    outline: "none",
    background: "var(--market-card)",
    color: "var(--market-text)"
  },

  clearButton: {
    minHeight: "58px",
    padding: "0 15px",
    borderRadius: "15px",
    border: "1px solid var(--market-border)",
    background: "var(--market-card)",
    color: "var(--market-muted)",
    fontWeight: "900",
    cursor: "pointer"
  },

  categories: {
    display: "flex",
    flexWrap: "wrap",
    gap: "9px",
    marginBottom: "19px"
  },

  category: {
    minHeight: "38px",
    padding: "8px 14px",
    borderRadius: "999px",
    border: "1px solid var(--market-border)",
    background: "var(--market-card)",
    color: "var(--market-muted)",
    fontWeight: "850",
    cursor: "pointer"
  },

  categoryActive: {
    minHeight: "38px",
    padding: "8px 14px",
    borderRadius: "999px",
    border: "1px solid var(--market-accent-border)",
    background: "var(--market-accent-soft)",
    color: "var(--market-accent)",
    fontWeight: "900",
    cursor: "pointer"
  },

  primaryButton: {
    minHeight: "43px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 17px",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg, var(--market-accent), #38bdf8, #8b5cf6)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: "950"
  },

  secondaryButton: {
    minHeight: "43px",
    padding: "10px 16px",
    borderRadius: "13px",
    border: "1px solid var(--market-border)",
    background: "var(--market-card)",
    color: "var(--market-text)",
    fontWeight: "900",
    cursor: "pointer"
  },

  error: {
    display: "grid",
    gridTemplateColumns: "34px minmax(0, 1fr) 34px",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
    padding: "12px",
    borderRadius: "15px",
    border: "1px solid rgba(248,113,113,.30)",
    background: "rgba(127,29,29,.18)",
    color: "#fecaca"
  },

  resultsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "14px",
    margin: "4px 0 14px"
  },

  resultsTitle: {
    margin: "5px 0 0",
    fontSize: "22px"
  },

  realDataBadge: {
    padding: "6px 10px",
    borderRadius: "999px",
    border: "1px solid var(--market-accent-border)",
    background: "var(--market-accent-soft)",
    color: "var(--market-accent)",
    fontSize: "8px",
    fontWeight: "900"
  },

  grid: (compact) => ({
    display: "grid",
    gridTemplateColumns: compact
      ? "repeat(auto-fit, minmax(245px, 1fr))"
      : "repeat(auto-fit, minmax(280px, 1fr))",
    alignItems: "start",
    gap: compact ? "15px" : "20px"
  }),

  productCard: {
    position: "relative",
    minWidth: 0,
    overflow: "hidden",
    borderRadius: "22px",
    border: "1px solid var(--market-border)",
    background: "var(--market-card)",
    boxShadow: "0 18px 55px rgba(0,0,0,.18)",
    backdropFilter: "blur(14px)"
  },

  glow: {
    position: "absolute",
    top: "-70px",
    right: "-70px",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    filter: "blur(44px)",
    pointerEvents: "none"
  },

  heart: (active) => ({
    position: "absolute",
    top: "13px",
    right: "13px",
    zIndex: 6,
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: active
      ? "1px solid rgba(236,72,153,.48)"
      : "1px solid rgba(255,255,255,.18)",
    background: active ? "rgba(236,72,153,.20)" : "rgba(2,6,23,.72)",
    color: active ? "#fb7185" : "#fff",
    fontSize: "21px",
    cursor: "pointer"
  }),

  imageLink: {
    display: "block",
    textDecoration: "none"
  },

  imageWrap: {
    position: "relative",
    height: "250px",
    overflow: "hidden"
  },

  productImage: {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "cover",
    transition: "transform .4s ease"
  },

  imageOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, transparent 48%, rgba(2,6,23,.72))"
  },

  protectedBadge: {
    position: "absolute",
    left: "12px",
    bottom: "12px",
    padding: "5px 9px",
    borderRadius: "999px",
    border: "1px solid var(--market-accent-border)",
    background: "rgba(2,6,23,.72)",
    color: "var(--market-accent)",
    fontSize: "8px",
    fontWeight: "950"
  },

  riskBadge: (risk) => ({
    position: "absolute",
    top: "13px",
    left: "13px",
    padding: "5px 9px",
    borderRadius: "999px",
    border: `1px solid ${risk.border}`,
    background: risk.background,
    color: risk.color,
    fontSize: "8px",
    fontWeight: "950"
  }),

  sold: {
    position: "absolute",
    inset: 0,
    zIndex: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(2,6,23,.64)",
    color: "#fff",
    fontSize: "28px",
    fontWeight: "950"
  },

  productBody: {
    position: "relative",
    zIndex: 2,
    padding: "17px"
  },

  cardMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "9px",
    color: "var(--market-muted)",
    fontSize: "8px",
    fontWeight: "850",
    textTransform: "uppercase"
  },

  titleLink: {
    color: "var(--market-text)",
    textDecoration: "none"
  },

  productTitle: {
    minHeight: "48px",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    margin: "0 0 7px",
    fontSize: "18px",
    lineHeight: "24px"
  },

  price: {
    display: "block",
    marginBottom: "11px",
    color: "var(--market-accent)",
    fontSize: "22px"
  },

  meta: {
    display: "grid",
    gap: "6px",
    marginBottom: "12px",
    color: "var(--market-muted)",
    fontSize: "9px"
  },

  scoreGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
    marginBottom: "12px"
  },

  scoreBox: {
    display: "grid",
    gap: "4px",
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid var(--market-border)",
    background: "rgba(2,6,23,.18)",
    color: "var(--market-muted)",
    fontSize: "8px"
  },

  seller: {
    display: "grid",
    gridTemplateColumns: "42px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "10px",
    padding: "11px",
    borderRadius: "14px",
    border: "1px solid var(--market-border)",
    background: "rgba(2,6,23,.18)"
  },

  sellerAvatar: {
    width: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, var(--market-accent), #8b5cf6)",
    color: "#fff",
    fontWeight: "950"
  },

  sellerPhoto: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "2px solid var(--market-accent-border)",
    objectFit: "cover"
  },

  sellerInfo: {
    minWidth: 0,
    fontSize: "9px"
  },

  verified: (verified) => ({
    padding: "5px 8px",
    borderRadius: "999px",
    border: verified
      ? "1px solid rgba(34,197,94,.30)"
      : "1px solid rgba(245,158,11,.30)",
    background: verified
      ? "rgba(34,197,94,.12)"
      : "rgba(245,158,11,.12)",
    color: verified ? "#86efac" : "#fde68a",
    fontSize: "7px",
    fontWeight: "900"
  }),

  skeleton: {
    minHeight: "410px",
    padding: "15px",
    borderRadius: "22px",
    border: "1px solid var(--market-border)",
    background: "var(--market-card)"
  },

  skeletonImage: {
    height: "230px",
    marginBottom: "16px",
    borderRadius: "17px",
    background: "rgba(148,163,184,.12)"
  },

  skeletonLine: {
    width: "78%",
    height: "16px",
    marginBottom: "10px",
    borderRadius: "999px",
    background: "rgba(148,163,184,.12)"
  },

  skeletonLineSmall: {
    width: "48%",
    height: "16px",
    borderRadius: "999px",
    background: "rgba(148,163,184,.12)"
  },

  skeletonFooter: {
    height: "58px",
    marginTop: "20px",
    borderRadius: "14px",
    background: "rgba(148,163,184,.09)"
  },

  empty: {
    display: "grid",
    justifyItems: "center",
    gap: "10px",
    padding: "42px 24px",
    borderRadius: "24px",
    border: "1px solid var(--market-border)",
    background: "var(--market-card)",
    color: "var(--market-muted)",
    textAlign: "center"
  },

  emptyIcon: {
    fontSize: "44px"
  },

  loadMoreWrap: {
    display: "flex",
    justifyContent: "center",
    marginTop: "26px"
  },

  loadMore: {
    padding: "10px 22px",
    borderRadius: "999px",
    border: "1px solid var(--market-accent-border)",
    background: "var(--market-accent-soft)",
    color: "var(--market-accent)",
    fontWeight: "900",
    cursor: "pointer"
  }
};

export default Marketplace;
