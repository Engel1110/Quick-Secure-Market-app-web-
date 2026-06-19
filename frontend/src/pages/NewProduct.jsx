import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import AiAssistant from "../components/AiAssistant";

function NewProduct() {
  const navigate = useNavigate();

  const savedUser = JSON.parse(localStorage.getItem("qsm_user")) || {
    firstName: "Usuario",
    lastName: "QSM",
    email: "usuario@qsm.com",
    trustScore: 60,
    kycStatus: "PENDING"
  };

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    status: "PENDING",
    imageUrl: "",
    location: "",
    warranty: "",
    deliveryType: ""
  });

  const [imageSlots, setImageSlots] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const completion = useMemo(() => {
    const checks = [
      !!form.title,
      !!form.description,
      !!form.price,
      !!form.category,
      !!form.condition,
      !!form.location,
      imageSlots.length > 0 || !!form.imageUrl
    ];

    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [form, imageSlots]);

  const aiChecks = [
    {
      title: "Imagen del producto",
      value: imageSlots.length > 0 || form.imageUrl ? "Lista" : "Pendiente",
      done: imageSlots.length > 0 || form.imageUrl
    },
    {
      title: "Precio justo",
      value: form.price ? "En evaluación" : "Pendiente",
      done: !!form.price
    },
    {
      title: "Información del vendedor",
      value: savedUser.kycStatus === "VERIFIED" ? "Verificada" : "Pendiente",
      done: savedUser.kycStatus === "VERIFIED"
    },
    {
      title: "Descripción",
      value: form.description.length >= 40 ? "Completa" : "Pendiente",
      done: form.description.length >= 40
    },
    {
      title: "Riesgo de fraude",
      value: completion >= 80 ? "Bajo" : "Pendiente",
      done: completion >= 80
    }
  ];

  const previewImage =
    imageSlots[0] ||
    form.imageUrl ||
    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=90";

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const previews = files.slice(0, 8).map((file) => URL.createObjectURL(file));
    setImageSlots(previews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.title || !form.description || !form.price || !form.category || !form.condition) {
      setMessage("Completa título, descripción, precio, categoría y condición antes de publicar.");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/products", {
        ...form,
        imageUrl: imageSlots[0] || form.imageUrl,
        status: "PENDING",
        verificationStatus: "PENDING",
        sellerId: savedUser.id
      });

      setMessage("Producto enviado a verificación QSM correctamente.");
      setTimeout(() => navigate("/marketplace"), 900);
    } catch (error) {
      console.error("Error publicando producto:", error);
      setMessage("No se pudo publicar el producto. Revisa el backend o intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

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

          input::placeholder,
          textarea::placeholder {
            color: #64748b;
          }

          select {
            color-scheme: dark;
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
          <Link style={menuItem} to="/marketplace">🛒 Marketplace</Link>
          <Link style={menuItem} to="/orders">📦 Mis órdenes</Link>
          <Link style={menuItem} to="/profile">👤 Mi perfil</Link>
          <Link style={activeMenuItem} to="/new-product">➕ Vender producto</Link>
          <Link style={menuItem} to="/marketing">📈 Marketing Center</Link>
          <Link style={menuItem} to="/disputes">⚖ Mis disputas</Link>
          <Link style={menuItem} to="/complete-profile">🧾 Verificación QSM</Link>
        </nav>

        <div style={aiSideCard}>
          <h3>🤖 QSM AI</h3>
          <p>Te ayudamos a publicar productos seguros y atractivos para compradores.</p>
          <button style={sideButton}>Pregúntame algo</button>
        </div>
      </aside>

      <main style={main}>
        <header style={topbar}>
          <div style={searchBox}>
            <span>🔎</span>
            <input placeholder="Buscar productos seguros..." style={searchInput} />
          </div>

          <div style={topIcons}>
            <TopIcon icon="🔔" number="3" label="Notificaciones" />
            <TopIcon icon="✉️" number="2" label="Mensajes" />
            <TopIcon icon="🛒" number="1" label="Carrito" />
          </div>

          <div style={userMini}>
            <div style={userAvatar}>
              {savedUser.firstName?.charAt(0) || "U"}
            </div>
            <div>
              <strong>{savedUser.firstName || "Usuario"} {savedUser.lastName || "QSM"}</strong>
              <p>{savedUser.kycStatus === "VERIFIED" ? "Verificado" : "Pendiente"}</p>
            </div>
          </div>
        </header>

        <div style={breadcrumb}>
          Inicio › Vender producto › <strong>Publicar nuevo producto</strong>
        </div>

        <section style={layout}>
          <form onSubmit={handleSubmit} style={formCard}>
            <div style={formHeader}>
              <div>
                <h1 style={title}>Publicar Producto</h1>
                <p style={subtitle}>
                  QSM analizará la imagen, precio y vendedor antes de publicarlo.
                </p>
              </div>

              <div style={protectionBox}>
                <div style={protectionIcon}>🛡</div>
                <div>
                  <strong>Protección QSM</strong>
                  <p>Tu publicación será analizada por IA.</p>
                </div>
              </div>
            </div>

            <label style={fieldLabel}>Título del producto</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Ej: iPhone 13 Pro 128GB"
              style={input}
            />

            <label style={fieldLabel}>Descripción</label>
            <div style={textareaWrap}>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe tu producto en detalle, su estado, funcionamiento, accesorios incluidos, etc."
                style={textarea}
                maxLength={1000}
              />
              <span style={counter}>{form.description.length}/1000</span>
            </div>

            <div style={twoColumns}>
              <div>
                <label style={fieldLabel}>Precio (RD$)</label>
                <input
                  name="price"
                  type="number"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="Ej: 45000"
                  style={input}
                />
              </div>

              <div>
                <label style={fieldLabel}>Categoría</label>
                <select name="category" value={form.category} onChange={handleChange} style={input}>
                  <option value="">Selecciona una categoría</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Celulares">Celulares</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Computadoras">Computadoras</option>
                  <option value="Vehículos">Vehículos</option>
                  <option value="Hogar">Hogar</option>
                </select>
              </div>
            </div>

            <div style={twoColumns}>
              <div>
                <label style={fieldLabel}>Condición</label>
                <select name="condition" value={form.condition} onChange={handleChange} style={input}>
                  <option value="">Selecciona la condición</option>
                  <option value="Nuevo">Nuevo</option>
                  <option value="Como nuevo">Como nuevo</option>
                  <option value="Usado en excelente estado">Usado en excelente estado</option>
                  <option value="Usado con detalles">Usado con detalles</option>
                </select>
              </div>

              <div>
                <label style={fieldLabel}>Estado</label>
                <select name="status" value={form.status} onChange={handleChange} style={input}>
                  <option value="PENDING">Pendiente de revisión</option>
                  <option value="CERTIFIED">Certificado QSM</option>
                </select>
              </div>
            </div>

            <div style={twoColumns}>
              <div>
                <label style={fieldLabel}>Ubicación</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Ej: Santo Domingo, RD"
                  style={input}
                />
              </div>

              <div>
                <label style={fieldLabel}>Garantía</label>
                <input
                  name="warranty"
                  value={form.warranty}
                  onChange={handleChange}
                  placeholder="Ej: No aplica / 30 días"
                  style={input}
                />
              </div>
            </div>

            <label style={fieldLabel}>Imágenes del producto</label>

            <label style={uploadBox}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                style={{ display: "none" }}
              />
              <div style={uploadIcon}>☁️</div>
              <strong>Sube fotos claras y reales del producto</strong>
              <p>Arrastra imágenes aquí o haz clic para seleccionar</p>
              <span>Máximo 8 imágenes · JPG/PNG · Máx. 10MB c/u</span>
            </label>

            <div style={slotGrid}>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} style={slot}>
                  {imageSlots[index] ? (
                    <img src={imageSlots[index]} alt={`Producto ${index + 1}`} style={slotImage} />
                  ) : (
                    "+"
                  )}
                </div>
              ))}
            </div>

            <label style={fieldLabel}>URL o código único de imagen (opcional)</label>
            <input
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleChange}
              placeholder="https://ejemplo.com/imagen.jpg o código único"
              style={input}
            />

            {message && <div style={messageBox}>{message}</div>}

            <button disabled={submitting} type="submit" style={submitButton}>
              {submitting ? "Publicando..." : "Publicar y enviar a verificación QSM →"}
            </button>

            <p style={secureText}>
              🔒 Tu producto estará protegido y verificado por QSM IA antes de publicarse.
            </p>
          </form>

          <aside style={rightColumn}>
            <section style={analysisCard}>
              <h2>Análisis en tiempo real</h2>
              <p style={muted}>QSM IA evaluará tu producto</p>

              <div style={analysisList}>
                {aiChecks.map((item) => (
                  <AnalysisItem key={item.title} item={item} />
                ))}
              </div>

              <div style={progressArea}>
                <div style={circle}>
                  <span>{completion}%</span>
                </div>

                <div>
                  <strong>Análisis completo</strong>
                  <p>Tu producto será evaluado por nuestra IA antifraude.</p>
                </div>
              </div>
            </section>

            <section style={previewCard}>
              <h2>Vista previa del producto</h2>

              <div style={previewImageWrap}>
                <img src={previewImage} alt="Vista previa" style={previewImageStyle} />
                <span style={previewBadge}>QSM Verificado</span>
              </div>

              <div style={previewContent}>
                <h3>{form.title || "Título del producto aparecerá aquí"}</h3>
                <h2>RD$ {form.price ? Number(form.price).toLocaleString("es-DO") : "0"}</h2>
                <p>{form.description || "Descripción breve del producto..."}</p>

                <div style={previewMeta}>
                  <span>🛡 Vendedor {savedUser.kycStatus === "VERIFIED" ? "verificado" : "pendiente"}</span>
                  <span>⭐ Trust Score {savedUser.trustScore || 60}/100</span>
                </div>

                <div style={riskPreview}>
                  🟡 Riesgo QSM: {completion >= 80 ? "Bajo" : "Pendiente"}
                </div>
              </div>
            </section>
          </aside>
        </section>

        <section style={benefitRow}>
          <Benefit icon="🛡" title="Protección garantizada" text="Tu dinero siempre seguro con escrow." />
          <Benefit icon="🤖" title="Verificación inteligente" text="IA analiza cada publicación para detectar riesgos." />
          <Benefit icon="✅" title="Vendedor verificado" text="Genera confianza con tu identidad verificada QSM." />
          <Benefit icon="📈" title="Más ventas" text="Productos verificados reciben más confianza y ventas." />
        </section>

        <footer style={footer}>
          © 2026 Quick Secure Market. Todos los derechos reservados.
        </footer>
      </main>

      <AiAssistant pageContext="new-product" />
    </div>
  );
}

function TopIcon({ icon, number, label }) {
  return (
    <div style={topIconBox}>
      <span style={notification}>{number}</span>
      <div>{icon}</div>
      <small>{label}</small>
    </div>
  );
}

function AnalysisItem({ item }) {
  return (
    <div style={analysisItem}>
      <div style={analysisIcon(item.done)}>{item.done ? "✓" : "•"}</div>
      <div>
        <strong>{item.title}</strong>
        <p>{item.value}</p>
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

const sideButton = {
  width: "100%",
  background: "rgba(15,23,42,0.72)",
  color: "#35d0c3",
  border: "1px solid rgba(53,208,195,0.24)",
  padding: "12px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900"
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
  gridTemplateColumns: "minmax(0, 1fr) auto 260px",
  gap: "18px",
  alignItems: "center",
  marginBottom: "28px"
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

const topIcons = {
  display: "flex",
  gap: "18px"
};

const topIconBox = {
  position: "relative",
  textAlign: "center",
  color: "#cbd5e1",
  fontSize: "13px"
};

const notification = {
  position: "absolute",
  top: "-8px",
  right: "8px",
  background: "#ef4444",
  color: "white",
  width: "18px",
  height: "18px",
  borderRadius: "50%",
  fontSize: "11px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900"
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
  marginBottom: "24px"
};

const layout = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 390px",
  gap: "24px",
  alignItems: "start"
};

const formCard = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "28px",
  padding: "34px",
  minWidth: 0
};

const formHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "22px",
  alignItems: "start",
  marginBottom: "26px"
};

const title = {
  fontSize: "42px",
  lineHeight: "46px",
  margin: "0 0 8px",
  letterSpacing: "-1.5px"
};

const subtitle = {
  color: "#cbd5e1",
  margin: 0
};

const protectionBox = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
  background: "rgba(2,6,23,0.42)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "18px",
  padding: "16px",
  minWidth: "230px"
};

const protectionIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "14px",
  background: "rgba(53,208,195,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px"
};

const fieldLabel = {
  display: "block",
  margin: "18px 0 8px",
  fontWeight: "900",
  color: "#e5e7eb"
};

const input = {
  width: "100%",
  background: "rgba(2,6,23,0.60)",
  border: "1px solid rgba(148,163,184,0.22)",
  color: "white",
  outline: "none",
  padding: "15px",
  borderRadius: "14px",
  fontFamily: "'Inter', system-ui, sans-serif"
};

const textareaWrap = {
  position: "relative"
};

const textarea = {
  ...input,
  minHeight: "140px",
  resize: "vertical",
  lineHeight: "24px"
};

const counter = {
  position: "absolute",
  right: "14px",
  bottom: "12px",
  color: "#94a3b8",
  fontSize: "12px"
};

const twoColumns = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px"
};

const uploadBox = {
  border: "1px dashed rgba(148,163,184,0.36)",
  background: "rgba(2,6,23,0.38)",
  borderRadius: "18px",
  minHeight: "160px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  padding: "22px",
  cursor: "pointer",
  color: "#cbd5e1"
};

const uploadIcon = {
  fontSize: "42px",
  marginBottom: "10px"
};

const slotGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(8, 1fr)",
  gap: "10px",
  marginTop: "12px"
};

const slot = {
  height: "70px",
  border: "1px dashed rgba(148,163,184,0.28)",
  borderRadius: "12px",
  background: "rgba(2,6,23,0.42)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
  overflow: "hidden"
};

const slotImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const messageBox = {
  marginTop: "18px",
  background: "rgba(245,158,11,0.12)",
  border: "1px solid rgba(245,158,11,0.28)",
  color: "#fde68a",
  padding: "14px",
  borderRadius: "14px",
  fontWeight: "800"
};

const submitButton = {
  width: "100%",
  marginTop: "22px",
  background: "linear-gradient(135deg, #35d0c3, #22d3ee)",
  color: "#020617",
  border: "none",
  padding: "17px",
  borderRadius: "15px",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "15px"
};

const secureText = {
  color: "#cbd5e1",
  textAlign: "center",
  marginTop: "16px"
};

const rightColumn = {
  display: "grid",
  gap: "24px"
};

const analysisCard = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "28px",
  padding: "26px"
};

const muted = {
  color: "#94a3b8"
};

const analysisList = {
  display: "grid",
  gap: "18px",
  marginTop: "20px"
};

const analysisItem = {
  display: "flex",
  gap: "14px",
  alignItems: "center"
};

const analysisIcon = (done) => ({
  width: "36px",
  height: "36px",
  borderRadius: "12px",
  background: done ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.12)",
  color: done ? "#86efac" : "#fde68a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900"
});

const progressArea = {
  display: "flex",
  gap: "16px",
  alignItems: "center",
  marginTop: "28px"
};

const circle = {
  width: "70px",
  height: "70px",
  borderRadius: "50%",
  border: "7px solid rgba(53,208,195,0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#35d0c3",
  fontWeight: "900"
};

const previewCard = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "28px",
  padding: "20px"
};

const previewImageWrap = {
  height: "260px",
  borderRadius: "18px",
  overflow: "hidden",
  position: "relative",
  background: "rgba(2,6,23,0.55)"
};

const previewImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const previewBadge = {
  position: "absolute",
  top: "12px",
  right: "12px",
  background: "rgba(53,208,195,0.16)",
  color: "#35d0c3",
  border: "1px solid rgba(53,208,195,0.28)",
  borderRadius: "999px",
  padding: "7px 10px",
  fontWeight: "900",
  fontSize: "12px"
};

const previewContent = {
  paddingTop: "16px"
};

const previewMeta = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  color: "#cbd5e1",
  fontSize: "13px",
  paddingTop: "12px",
  borderTop: "1px solid rgba(148,163,184,0.12)"
};

const riskPreview = {
  marginTop: "14px",
  color: "#fde68a",
  fontWeight: "800"
};

const benefitRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "16px",
  marginTop: "34px"
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

const footer = {
  textAlign: "center",
  color: "#64748b",
  padding: "26px 0 0"
};

export default NewProduct;