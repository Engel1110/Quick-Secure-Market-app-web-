import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

function Dashboard() {
  const navigate = useNavigate();

  const savedUser =
    safeJson(localStorage.getItem("qsm_user")) ||
    safeJson(localStorage.getItem("user")) ||
    {
      firstName: "Usuario",
      lastName: "QSM",
      email: "usuario@qsm.com",
      trustScore: 50,
      verificationStatus: "NOT_SUBMITTED",
      isVerified: false
    };

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

  const [user, setUser] = useState(savedUser);
  const [settings, setSettings] = useState(savedSettings);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    products: 0,
    purchases: 0,
    sales: 0,
    favorites: 0,
    messages: 0,
    disputes: 0,
    protectedAmount: 0
  });
  const [recentProducts, setRecentProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentDisputes, setRecentDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const theme = settings.theme || "dark";
  const isLight = theme === "light";
  const accent = getAccentColor(settings.accentColor || "cyan");

  const isVerified =
    user.isVerified ||
    user.verificationStatus === "APPROVED" ||
    user.verificationStatus === "VERIFIED" ||
    user.kycStatus === "VERIFIED";

  const trustScore = Number(user.trustScore || 50);

  const profileCompletion = useMemo(() => {
    const checks = [
      Boolean(user.firstName),
      Boolean(user.lastName),
      Boolean(user.email),
      Boolean(user.phone),
      Boolean(user.city || user.province),
      Boolean(user.profilePhoto || user.avatar),
      isVerified
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [user, isVerified]);

  useEffect(() => {
    loadDashboard();
    loadSettings();
  }, []);

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [userRes, statsRes, productsRes, ordersRes, disputesRes] = await Promise.allSettled([
        api.get("/users/me"),
        api.get("/dashboard/summary"),
        api.get("/products/my-products"),
        api.get("/orders/my-orders"),
        api.get("/disputes")
      ]);

      if (userRes.status === "fulfilled") {
        const backendUser = userRes.value.data.user || userRes.value.data.data || userRes.value.data;
        setUser(backendUser);
        localStorage.setItem("qsm_user", JSON.stringify(backendUser));
      }

      if (statsRes.status === "fulfilled") {
        const data = statsRes.value.data.stats || statsRes.value.data.data || statsRes.value.data;
        setStats((prev) => ({
          ...prev,
          products: data.products || data.productsCount || prev.products,
          purchases: data.purchases || data.purchasesCount || prev.purchases,
          sales: data.sales || data.salesCount || prev.sales,
          favorites: data.favorites || data.favoritesCount || prev.favorites,
          messages: data.messages || data.messagesCount || prev.messages,
          disputes: data.disputes || data.disputesCount || prev.disputes,
          protectedAmount: data.protectedAmount || data.escrowAmount || prev.protectedAmount
        }));
      }

      if (productsRes.status === "fulfilled") {
        const products =
          productsRes.value.data.products ||
          productsRes.value.data.myProducts ||
          productsRes.value.data.data ||
          [];
        setRecentProducts(Array.isArray(products) ? products.slice(0, 4) : []);
        setStats((prev) => ({
          ...prev,
          products: Array.isArray(products) ? products.length : prev.products
        }));
      }

      if (ordersRes.status === "fulfilled") {
        const orders =
          ordersRes.value.data.orders ||
          ordersRes.value.data.myOrders ||
          ordersRes.value.data.data ||
          [];
        const safeOrders = Array.isArray(orders) ? orders : [];
        setRecentOrders(safeOrders.slice(0, 4));

        const currentUserId =
          savedUser._id || savedUser.id || user._id || user.id || "";

        const purchases = currentUserId
          ? safeOrders.filter((order) => {
              const buyer = order.buyer || {};
              const buyerId = buyer._id || buyer.id || order.buyerId;
              return String(buyerId || "") === String(currentUserId);
            }).length
          : safeOrders.length;

        const sales = currentUserId
          ? safeOrders.filter((order) => {
              const seller = order.seller || {};
              const sellerId = seller._id || seller.id || order.sellerId;
              return String(sellerId || "") === String(currentUserId);
            }).length
          : 0;

        const protectedAmount = safeOrders.reduce(
          (total, order) => total + Number(order.total || order.price || order.product?.price || 0),
          0
        );

        setStats((prev) => ({
          ...prev,
          purchases,
          sales,
          protectedAmount
        }));
      }

      if (disputesRes.status === "fulfilled") {
        const disputes = disputesRes.value.data.disputes || disputesRes.value.data.data || [];
        setRecentDisputes(Array.isArray(disputes) ? disputes.slice(0, 4) : []);
        setStats((prev) => ({
          ...prev,
          disputes: Array.isArray(disputes) ? disputes.length : prev.disputes
        }));
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo cargar el inicio completo. Revisa el backend."
      );
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

  const handleSearch = (event) => {
    event.preventDefault();
    const value = search.trim();

    if (!value) {
      navigate("/marketplace");
      return;
    }

    navigate(`/marketplace?search=${encodeURIComponent(value)}`);
  };

  return (
    <div style={page(isLight)}>
      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: ${isLight ? "#f8fafc" : "#020617"};
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
        }

        input::placeholder {
          color: ${isLight ? "#94a3b8" : "#64748b"};
        }

        input, select, button, a {
          font-family: inherit;
        }

        button, a {
          transition: ${settings.animations === false ? "none" : "all .25s ease"};
        }

        button:hover, a:hover {
          transform: ${settings.animations === false ? "none" : "translateY(-2px)"};
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1240px) {
          .dashboard-page {
            grid-template-columns: 1fr !important;
          }

          .sidebar-wrapper {
            display: none !important;
          }

          .hero-grid,
          .stats-grid,
          .dashboard-grid,
          .quick-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 760px) {
          .main-content {
            padding: 18px !important;
          }

          .hero-actions {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="dashboard-page" style={layout(settings)}>
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main className="main-content" style={main(settings)}>
          <Topbar />

          <section className="hero-grid" style={heroGrid}>
            <div style={heroCard(isLight, settings, accent)}>
              <p style={label(accent)}>INICIO QSM</p>
              <h1 style={title(isLight)}>
                Hola, {user.firstName || "Usuario"}.
              </h1>
              <p style={subtitle(isLight)}>
                Este es tu centro principal para comprar, vender, publicar productos, revisar mensajes, favoritos, reclamos y seguridad.
              </p>

              <form onSubmit={handleSearch} style={searchBox(isLight)}>
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar productos en Marketplace..."
                  style={searchInput(isLight)}
                />
                <button type="submit" style={searchButton(accent)}>
                  Buscar
                </button>
              </form>

              <div className="hero-actions" style={heroActions}>
                <Link to="/marketplace" style={primaryButton(accent)}>Ir al Marketplace</Link>
                <Link to="/new-product" style={outlineButton(isLight)}>Publicar producto</Link>
                <Link to="/complete-profile" style={outlineButton(isLight)}>Verificación QSM</Link>
              </div>
            </div>

            <aside style={profileCard(isLight, settings)}>
              <div style={avatar(accent)}>
                {(user.firstName || user.email || "U").charAt(0).toUpperCase()}
              </div>

              <h2 style={panelTitle(isLight)}>
                {user.firstName || "Usuario"} {user.lastName || "QSM"}
              </h2>
              <p style={muted(isLight)}>{user.email || "usuario@qsm.com"}</p>

              <div style={badgeRow}>
                <span style={verifiedBadge(isVerified)}>
                  {isVerified ? "✅ Verificado" : "🟡 Pendiente"}
                </span>
                <span style={trustBadge(accent)}>Confianza {trustScore}/100</span>
              </div>

              <div style={scoreBar(isLight)}>
                <div style={{ ...scoreFill(accent), width: `${trustScore}%` }}></div>
              </div>

              <p style={muted(isLight)}>Perfil completado: {profileCompletion}%</p>

              <Link to="/profile" style={primaryButton(accent)}>
                Editar perfil
              </Link>
            </aside>
          </section>

          {error && <div style={errorBox}>{error}</div>}

          {loading ? (
            <div style={centerCard(isLight)}>
              <h2>Cargando inicio...</h2>
              <p>QSM está consultando tus datos.</p>
            </div>
          ) : (
            <>
              <section className="stats-grid" style={statsGrid}>
                <StatCard icon="📦" title="Productos" value={stats.products} isLight={isLight} accent={accent} />
                <StatCard icon="🛒" title="Compras" value={stats.purchases} isLight={isLight} accent={accent} />
                <StatCard icon="💰" title="Ventas" value={stats.sales} isLight={isLight} accent={accent} />
                <StatCard icon="🛡️" title="Protegido" value={formatMoney(stats.protectedAmount)} isLight={isLight} accent={accent} />
              </section>

              <section className="quick-grid" style={quickGrid}>
                <QuickAction icon="🛒" title="Marketplace" text="Explorar productos seguros." to="/marketplace" isLight={isLight} accent={accent} />
                <QuickAction icon="➕" title="Publicar" text="Vender con verificación QSM." to="/new-product" isLight={isLight} accent={accent} />
                <QuickAction icon="❤️" title="Favoritos" text="Productos guardados." to="/favorites" isLight={isLight} accent={accent} />
                <QuickAction icon="💬" title="Mensajes" text="Hablar con compradores o vendedores." to="/messages" isLight={isLight} accent={accent} />
                <QuickAction icon="⚖️" title="Reclamos" text="Resolver disputas protegidas." to="/disputes" isLight={isLight} accent={accent} />
                <QuickAction icon="⚙️" title="Configuración" text="Tema, idioma y seguridad." to="/settings" isLight={isLight} accent={accent} />
              </section>

              <section className="dashboard-grid" style={dashboardGrid}>
                <div style={panel(isLight, settings)}>
                  <div style={sectionHeader}>
                    <p style={label(accent)}>ACTIVIDAD</p>
                    <h2 style={panelTitle(isLight)}>Órdenes recientes</h2>
                  </div>

                  {recentOrders.length === 0 ? (
                    <EmptyState text="Todavía no tienes órdenes recientes." isLight={isLight} />
                  ) : (
                    recentOrders.map((order, index) => (
                      <ActivityRow
                        key={order._id || index}
                        icon="🛒"
                        title={order.product?.title || order.productTitle || "Orden QSM"}
                        subtitle={order.orderCode || formatStatus(order.status)}
                        value={formatMoney(order.total || order.price || order.product?.price || 0)}
                        isLight={isLight}
                      />
                    ))
                  )}

                  <Link to="/orders" style={miniLink(accent)}>Ver mis compras →</Link>
                </div>

                <div style={panel(isLight, settings)}>
                  <div style={sectionHeader}>
                    <p style={label(accent)}>VENTAS</p>
                    <h2 style={panelTitle(isLight)}>Productos publicados</h2>
                  </div>

                  {recentProducts.length === 0 ? (
                    <EmptyState text="Publica tu primer producto para verlo aquí." isLight={isLight} />
                  ) : (
                    recentProducts.map((product, index) => (
                      <ActivityRow
                        key={product._id || index}
                        icon="📦"
                        title={product.title || "Producto QSM"}
                        subtitle={product.category || "Marketplace"}
                        value={formatMoney(product.price)}
                        isLight={isLight}
                      />
                    ))
                  )}

                  <Link to="/sales" style={miniLink(accent)}>Ver mis ventas →</Link>
                </div>

                <div style={panel(isLight, settings)}>
                  <div style={sectionHeader}>
                    <p style={label(accent)}>SEGURIDAD</p>
                    <h2 style={panelTitle(isLight)}>Progreso QSM</h2>
                  </div>

                  <ProgressLine done={Boolean(user.firstName && user.email)} text="Información básica" isLight={isLight} />
                  <ProgressLine done={isVerified} text="Verificación de identidad" isLight={isLight} />
                  <ProgressLine done={stats.products > 0} text="Primer producto publicado" isLight={isLight} />
                  <ProgressLine done={stats.purchases > 0 || stats.sales > 0} text="Primera operación protegida" isLight={isLight} />

                  <Link to="/complete-profile" style={miniLink(accent)}>Completar verificación →</Link>
                </div>

                <div style={panel(isLight, settings)}>
                  <div style={sectionHeader}>
                    <p style={label(accent)}>RECLAMOS</p>
                    <h2 style={panelTitle(isLight)}>Centro de reclamos</h2>
                  </div>

                  {recentDisputes.length === 0 ? (
                    <EmptyState text="No tienes reclamos activos." isLight={isLight} />
                  ) : (
                    recentDisputes.map((dispute, index) => (
                      <ActivityRow
                        key={dispute._id || index}
                        icon="⚖️"
                        title={dispute.disputeCode || "Reclamo QSM"}
                        subtitle={formatStatus(dispute.status)}
                        value={dispute.reason || "Disputa"}
                        isLight={isLight}
                      />
                    ))
                  )}

                  <Link to="/disputes" style={miniLink(accent)}>Ver reclamos →</Link>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      <AiAssistant pageContext="dashboard" />
    </div>
  );
}

function StatCard({ icon, title, value, isLight, accent }) {
  return (
    <div style={statCard(isLight)}>
      <div style={statIcon(accent)}>{icon}</div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function QuickAction({ icon, title, text, to, isLight, accent }) {
  return (
    <Link to={to} style={quickAction(isLight, accent)}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </Link>
  );
}

function ActivityRow({ icon, title, subtitle, value, isLight }) {
  return (
    <div style={activityRow(isLight)}>
      <div style={activityIcon}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <strong>{title}</strong>
        <p>{subtitle}</p>
      </div>
      <span>{value}</span>
    </div>
  );
}

function ProgressLine({ done, text, isLight }) {
  return (
    <div style={progressLine(isLight)}>
      <span style={done ? checkDone : checkPending}>{done ? "✓" : "•"}</span>
      <p>{text}</p>
    </div>
  );
}

function EmptyState({ text, isLight }) {
  return (
    <div style={emptyState(isLight)}>
      <p>{text}</p>
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
  document.body.dataset.qsmTheme = settings.theme || "dark";
  localStorage.setItem("qsm_theme", settings.theme || "dark");
  localStorage.setItem("qsm_accent", settings.accentColor || "cyan");
  localStorage.setItem("qsm_language", settings.language || "es");
  localStorage.setItem("qsm_settings", JSON.stringify(settings));
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatStatus(status) {
  const map = {
    PENDING: "Pendiente",
    HELD: "Pago retenido",
    PAID: "Pago retenido",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    RELEASED: "Pago liberado",
    OPEN: "Abierto",
    IN_REVIEW: "En revisión",
    WAITING_EVIDENCE: "Esperando evidencia",
    CLOSED: "Cerrado"
  };
  return map[String(status || "").toUpperCase()] || "Activo";
}

const page = (isLight) => ({
  minHeight: "100vh",
  width: "100%",
  background: isLight
    ? "radial-gradient(circle at top right, rgba(53,208,195,.16), transparent 34%), #f8fafc"
    : "radial-gradient(circle at top right, rgba(139,92,246,.14), transparent 34%), radial-gradient(circle at 18% 15%, rgba(53,208,195,.10), transparent 28%), #020617",
  color: isLight ? "#0f172a" : "white"
});

const layout = (settings) => ({
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: settings.compactSidebar ? "230px minmax(0, 1fr)" : "280px minmax(0, 1fr)",
  overflowX: "hidden"
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

const heroGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 360px",
  gap: "20px",
  margin: "22px 0"
};

const heroCard = (isLight, settings, accent) => ({
  background: isLight ? "rgba(255,255,255,.88)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.16)",
  borderRadius: "30px",
  padding: "30px",
  boxShadow: isLight ? "0 24px 70px rgba(15,23,42,.08)" : "0 24px 90px rgba(0,0,0,.25)",
  backdropFilter: settings.glassEffect === false ? "none" : "blur(16px)",
  animation: settings.animations === false ? "none" : "fadeUp .35s ease",
  position: "relative",
  overflow: "hidden"
});

const label = (accent) => ({
  color: accent,
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  margin: 0
});

const title = (isLight) => ({
  fontSize: "clamp(42px, 4vw, 70px)",
  lineHeight: "1",
  margin: "10px 0",
  letterSpacing: "-2px",
  color: isLight ? "#0f172a" : "white"
});

const subtitle = (isLight) => ({
  color: isLight ? "#475569" : "#cbd5e1",
  lineHeight: "29px",
  maxWidth: "820px"
});

const searchBox = (isLight) => ({
  height: "62px",
  display: "grid",
  gridTemplateColumns: "30px minmax(0, 1fr) 120px",
  alignItems: "center",
  gap: "10px",
  background: isLight ? "rgba(248,250,252,.95)" : "rgba(2,6,23,.55)",
  border: isLight ? "1px solid rgba(15,23,42,.10)" : "1px solid rgba(148,163,184,.16)",
  borderRadius: "18px",
  padding: "0 12px",
  margin: "24px 0"
});

const searchInput = (isLight) => ({
  width: "100%",
  height: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: isLight ? "#0f172a" : "white"
});

const searchButton = (accent) => ({
  height: "44px",
  border: "none",
  borderRadius: "14px",
  background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
  color: "white",
  fontWeight: "950",
  cursor: "pointer"
});

const heroActions = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1fr",
  gap: "12px"
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
  fontWeight: "950"
});

const profileCard = (isLight, settings) => ({
  background: isLight ? "rgba(255,255,255,.88)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.16)",
  borderRadius: "30px",
  padding: "26px",
  boxShadow: isLight ? "0 24px 70px rgba(15,23,42,.08)" : "0 24px 90px rgba(0,0,0,.25)",
  backdropFilter: settings.glassEffect === false ? "none" : "blur(16px)",
  display: "grid",
  gap: "12px",
  alignContent: "start"
});

const avatar = (accent) => ({
  width: "86px",
  height: "86px",
  borderRadius: "26px",
  background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
  fontWeight: "950",
  color: "white"
});

const panelTitle = (isLight) => ({
  color: isLight ? "#0f172a" : "white",
  margin: "8px 0"
});

const muted = (isLight) => ({
  color: isLight ? "#475569" : "#cbd5e1",
  lineHeight: "25px"
});

const badgeRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px"
};

const verifiedBadge = (verified) => ({
  background: verified ? "rgba(34,197,94,.14)" : "rgba(245,158,11,.16)",
  color: verified ? "#86efac" : "#fde68a",
  border: verified ? "1px solid rgba(34,197,94,.34)" : "1px solid rgba(245,158,11,.34)",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900"
});

const trustBadge = (accent) => ({
  background: `${accent}22`,
  color: accent,
  border: `1px solid ${accent}66`,
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900"
});

const scoreBar = (isLight) => ({
  height: "10px",
  background: isLight ? "rgba(15,23,42,.10)" : "rgba(148,163,184,.16)",
  borderRadius: "999px",
  overflow: "hidden"
});

const scoreFill = (accent) => ({
  height: "100%",
  background: `linear-gradient(90deg, ${accent}, #38bdf8, #8b5cf6)`,
  borderRadius: "999px"
});

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
  background: isLight ? "rgba(255,255,255,.86)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.14)",
  borderRadius: "24px",
  padding: "44px",
  textAlign: "center",
  color: isLight ? "#0f172a" : "#cbd5e1"
});

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px"
};

const statCard = (isLight) => ({
  display: "flex",
  alignItems: "center",
  gap: "14px",
  background: isLight ? "rgba(255,255,255,.86)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.15)",
  borderRadius: "22px",
  padding: "20px",
  boxShadow: isLight ? "0 18px 50px rgba(15,23,42,.06)" : "none"
});

const statIcon = (accent) => ({
  width: "52px",
  height: "52px",
  borderRadius: "17px",
  background: `${accent}22`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px"
});

const quickGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "20px"
};

const quickAction = (isLight, accent) => ({
  background: isLight ? "rgba(255,255,255,.86)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.15)",
  color: isLight ? "#0f172a" : "white",
  borderRadius: "22px",
  padding: "18px",
  textDecoration: "none",
  display: "grid",
  gap: "8px",
  boxShadow: isLight ? "0 18px 50px rgba(15,23,42,.06)" : "none",
  borderTop: `3px solid ${accent}`
});

const dashboardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "20px"
};

const panel = (isLight, settings) => ({
  background: isLight ? "rgba(255,255,255,.86)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "24px",
  boxShadow: isLight ? "0 18px 60px rgba(15,23,42,.07)" : "0 24px 80px rgba(0,0,0,.18)",
  backdropFilter: settings.glassEffect === false ? "none" : "blur(16px)"
});

const sectionHeader = {
  marginBottom: "18px"
};

const activityRow = (isLight) => ({
  display: "grid",
  gridTemplateColumns: "48px minmax(0, 1fr) auto",
  gap: "12px",
  alignItems: "center",
  padding: "13px 0",
  borderBottom: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(148,163,184,.10)",
  color: isLight ? "#0f172a" : "#cbd5e1"
});

const activityIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "rgba(53,208,195,.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const progressLine = (isLight) => ({
  display: "flex",
  gap: "10px",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(148,163,184,.10)",
  color: isLight ? "#0f172a" : "#cbd5e1"
});

const checkDone = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  background: "#35d0c3",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950"
};

const checkPending = {
  ...checkDone,
  background: "rgba(148,163,184,.16)",
  color: "#94a3b8"
};

const emptyState = (isLight) => ({
  background: isLight ? "rgba(248,250,252,.85)" : "rgba(2,6,23,.35)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(148,163,184,.10)",
  color: isLight ? "#475569" : "#cbd5e1",
  borderRadius: "18px",
  padding: "20px",
  textAlign: "center"
});

const miniLink = (accent) => ({
  display: "inline-flex",
  marginTop: "14px",
  color: accent,
  textDecoration: "none",
  fontWeight: "950"
});

export default Dashboard;
