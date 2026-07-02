import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

function NewProduct() {
  const navigate = useNavigate();

  const savedUser = JSON.parse(localStorage.getItem("qsm_user")) || {
    firstName: "Usuario",
    lastName: "QSM",
    email: "usuario@qsm.com",
    trustScore: 60,
    isVerified: false
  };

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    quality: "UNKNOWN",
    specialPriceReason: "NONE",
    specialPriceExplanation: "",
    location: "",
    warranty: "",
    deliveryMethod: ""
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingText, setUploadingText] = useState("");
  const [message, setMessage] = useState("");

  const completion = useMemo(() => {
    const checks = [
      !!form.title,
      form.description.length >= 40,
      !!form.price,
      !!form.category,
      !!form.condition,
      !!form.location,
      imageFiles.length >= 1,
      !!videoFile
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, imageFiles, videoFile]);

  const riskLevel =
    completion >= 85
      ? "Riesgo bajo"
      : completion >= 60
      ? "Riesgo medio"
      : "Pendiente";

  const previewImage =
    imagePreviews[0] ||
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=90";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 8);

    setImageFiles(files);
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleVideo = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeImage = (index) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (
      !form.title ||
      !form.description ||
      !form.price ||
      !form.category ||
      !form.condition
    ) {
      setMessage("Completa título, descripción, precio, categoría y condición.");
      return;
    }

    if (Number(form.price) <= 0) {
      setMessage("El precio debe ser mayor que cero.");
      return;
    }

    try {
      setSubmitting(true);
      setUploadingText("Subiendo imágenes y video...");

      let uploadedImages = [];
      let uploadedVideo = null;

      if (imageFiles.length > 0 || videoFile) {
        const formData = new FormData();

        imageFiles.forEach((file) => {
          formData.append("images", file);
        });

        if (videoFile) {
          formData.append("video", videoFile);
        }

        const uploadResponse = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        uploadedImages = uploadResponse.data.images || [];
        uploadedVideo = uploadResponse.data.video || null;
      }

      setUploadingText("Publicando producto en QSM...");

      const response = await api.post("/products", {
        title: form.title,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        condition: form.condition,
        quality: form.quality,
        location: form.location,
        warranty: form.warranty,
        deliveryMethod: form.deliveryMethod,
        specialPriceReason: form.specialPriceReason,
        specialPriceExplanation: form.specialPriceExplanation,
        images: uploadedImages,
        video: uploadedVideo
      });

      const newProduct = response.data.product;

      setMessage("Producto publicado correctamente.");

      setTimeout(() => {
        navigate(newProduct?._id ? `/product/${newProduct._id}` : "/marketplace");
      }, 700);
    } catch (error) {
      console.error(error);
      setMessage(
        error.response?.data?.message ||
          "No se pudo publicar el producto. Verifica el backend."
      );
    } finally {
      setSubmitting(false);
      setUploadingText("");
    }
  };

  return (
    <div style={page} className="qsm-new-product-page">
      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: #020617;
          font-family: Inter, system-ui, sans-serif;
          overflow-x: hidden;
        }

        input::placeholder, textarea::placeholder {
          color: #64748b;
        }

        select {
          color-scheme: dark;
        }

        @keyframes floatGlow {
          0% { transform: translateY(0px); opacity: .65; }
          50% { transform: translateY(-12px); opacity: 1; }
          100% { transform: translateY(0px); opacity: .65; }
        }

        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(53,208,195,.35); }
          70% { box-shadow: 0 0 0 18px rgba(53,208,195,0); }
          100% { box-shadow: 0 0 0 0 rgba(53,208,195,0); }
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
          <Link style={menuItem} to="/marketplace">🛒 Marketplace</Link>
          <Link style={menuItem} to="/orders">📦 Mis órdenes</Link>
          <Link style={menuItem} to="/profile">👤 Mi perfil</Link>
          <Link style={activeMenuItem} to="/new-product">➕ Vender producto</Link>
          <Link style={menuItem} to="/marketing">📈 Marketing Center</Link>
          <Link style={menuItem} to="/disputes">⚖ Mis reclamos</Link>
          <Link style={menuItem} to="/complete-profile">🧾 Verificación QSM</Link>
        </nav>

        <div style={sideCard}>
          <p style={sideLabel}>PUBLICACIÓN SEGURA</p>
          <h3>QSM AI</h3>
          <p>
            Analizamos fotos, video, descripción, precio y vendedor antes de publicar.
          </p>
        </div>
      </aside>

      <main style={main}>
        <Topbar />

        <section style={hero}>
          <div>
            <p style={label}>MARKETPLACE / VENDER PRODUCTO</p>
            <h1 style={title}>
              Publica con <span style={gradientText}>Protección QSM</span>
            </h1>
            <p style={subtitle}>
              Crea una publicación profesional con fotos, video, análisis de riesgo y Pago Protegido.
            </p>
          </div>

          <div style={heroBadge}>
            <div style={heroIcon}>🧠</div>
            <div>
              <strong>Análisis inteligente activo</strong>
              <p>Tu producto será evaluado antes de mostrarse.</p>
            </div>
          </div>
        </section>

        <section style={layout}>
          <form onSubmit={handleSubmit} style={formCard}>
            <div style={stepBar}>
              <Step active number="1" text="Datos" />
              <Step active={completion >= 35} number="2" text="Fotos" />
              <Step active={completion >= 60} number="3" text="Video" />
              <Step active={completion >= 85} number="4" text="Publicar" />
            </div>

            <div style={sectionTitle}>Información principal</div>

            <label style={fieldLabel}>Título del producto</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Ej: iPhone 15 Pro Max 256GB"
              style={input}
            />

            <label style={fieldLabel}>Descripción</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe estado real, detalles, accesorios, garantía y motivo de venta."
              style={textarea}
              maxLength={2000}
            />

            <div style={twoColumns}>
              <div>
                <label style={fieldLabel}>Precio RD$</label>
                <input
                  name="price"
                  type="number"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="Ej: 65000"
                  style={input}
                />
              </div>

              <div>
                <label style={fieldLabel}>Categoría</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  style={input}
                >
                  <option value="">Seleccionar</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Celulares">Celulares</option>
                  <option value="Laptops">Laptops</option>
                  <option value="Vehículos">Vehículos</option>
                  <option value="Hogar">Hogar</option>
                  <option value="Moda">Moda</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>

            <div style={twoColumns}>
              <div>
                <label style={fieldLabel}>Condición</label>
                <select
                  name="condition"
                  value={form.condition}
                  onChange={handleChange}
                  style={input}
                >
                  <option value="">Seleccionar</option>
                  <option value="NEW">Nuevo</option>
                  <option value="LIKE_NEW">Como nuevo</option>
                  <option value="USED_GOOD">Buen estado</option>
                  <option value="USED_DETAILS">Usado con detalles</option>
                  <option value="FOR_PARTS">Para piezas</option>
                </select>
              </div>

              <div>
                <label style={fieldLabel}>Calidad</label>
                <select
                  name="quality"
                  value={form.quality}
                  onChange={handleChange}
                  style={input}
                >
                  <option value="UNKNOWN">No especificada</option>
                  <option value="EXCELLENT">Excelente</option>
                  <option value="GOOD">Buena</option>
                  <option value="FAIR">Aceptable</option>
                  <option value="DAMAGED">Dañado</option>
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
                  placeholder="Ej: Santo Domingo"
                  style={input}
                />
              </div>

              <div>
                <label style={fieldLabel}>Garantía</label>
                <input
                  name="warranty"
                  value={form.warranty}
                  onChange={handleChange}
                  placeholder="Ej: 30 días / No aplica"
                  style={input}
                />
              </div>
            </div>

            <label style={fieldLabel}>Método de entrega</label>
            <select
              name="deliveryMethod"
              value={form.deliveryMethod}
              onChange={handleChange}
              style={input}
            >
              <option value="">Seleccionar</option>
              <option value="Punto seguro QSM">Punto seguro QSM</option>
              <option value="Entrega acordada">Entrega acordada</option>
              <option value="Envío nacional">Envío nacional</option>
              <option value="Retiro presencial">Retiro presencial</option>
            </select>

            <div style={sectionTitle}>Fotos y video</div>

            <label style={uploadBox}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImages}
                style={{ display: "none" }}
              />
              <div style={uploadIcon}>📷</div>
              <strong>Subir hasta 8 imágenes reales</strong>
              <p>Fotos claras aumentan la confianza del comprador.</p>
            </label>

            <div style={mediaGrid}>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} style={mediaSlot}>
                  {imagePreviews[index] ? (
                    <>
                      <img src={imagePreviews[index]} alt="preview" style={mediaImg} />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        style={removeBtn}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span>+</span>
                  )}
                </div>
              ))}
            </div>

            <label style={uploadBoxVideo}>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideo}
                style={{ display: "none" }}
              />
              <div style={uploadIcon}>🎥</div>
              <strong>Subir video del producto</strong>
              <p>Máximo 1 video. Ideal mostrando que el producto funciona.</p>
            </label>

            {videoPreview && (
              <div style={videoBox}>
                <video src={videoPreview} controls style={videoPlayer} />
                <button type="button" onClick={removeVideo} style={removeVideoButton}>
                  Eliminar video
                </button>
              </div>
            )}

            <label style={fieldLabel}>Motivo de precio especial</label>
            <select
              name="specialPriceReason"
              value={form.specialPriceReason}
              onChange={handleChange}
              style={input}
            >
              <option value="NONE">No aplica</option>
              <option value="URGENT_MONEY">Necesito vender rápido</option>
              <option value="MOVING">Mudanza</option>
              <option value="BOUGHT_ANOTHER">Compré otro producto</option>
              <option value="NO_LONGER_USED">Ya no lo uso</option>
              <option value="MEDICAL_EXPENSE">Gasto médico</option>
              <option value="BUSINESS_LIQUIDATION">Liquidación</option>
              <option value="OTHER">Otro</option>
            </select>

            <label style={fieldLabel}>Explicación adicional</label>
            <input
              name="specialPriceExplanation"
              value={form.specialPriceExplanation}
              onChange={handleChange}
              placeholder="Ej: Lo vendo porque compré otro. Incluye caja y cargador."
              style={input}
            />

            {message && <div style={messageBox}>{message}</div>}
            {uploadingText && <div style={uploadingBox}>{uploadingText}</div>}

            <div style={buttonRow}>
              <Link to="/marketplace" style={cancelButton}>
                Cancelar
              </Link>

              <button type="button" style={draftButton}>
                Guardar borrador
              </button>

              <button type="submit" disabled={submitting} style={submitButton}>
                {submitting ? "Publicando..." : "Publicar producto seguro →"}
              </button>
            </div>
          </form>

          <aside style={rightColumn}>
            <section style={aiCard}>
              <div style={aiHeader}>
                <div style={aiBrain}>🧠</div>
                <div>
                  <h2>QSM AI</h2>
                  <p>Análisis inteligente en tiempo real</p>
                </div>
              </div>

              <div style={scoreCircle}>
                <span>{completion}%</span>
              </div>

              <div style={scoreBar}>
                <div style={{ ...scoreFill, width: `${completion}%` }}></div>
              </div>

              <AnalysisLine
                icon="📷"
                title="Fotos del producto"
                value={`${imageFiles.length}/8 imágenes`}
                done={imageFiles.length > 0}
              />
              <AnalysisLine
                icon="🎥"
                title="Video funcional"
                value={videoFile ? "Video agregado" : "Pendiente"}
                done={!!videoFile}
              />
              <AnalysisLine
                icon="💰"
                title="Precio publicado"
                value={
                  form.price
                    ? `RD$ ${Number(form.price).toLocaleString("es-DO")}`
                    : "Pendiente"
                }
                done={!!form.price}
              />
              <AnalysisLine
                icon="📝"
                title="Descripción"
                value={form.description.length >= 40 ? "Aceptable" : "Muy corta"}
                done={form.description.length >= 40}
              />
              <AnalysisLine
                icon="👤"
                title="Vendedor"
                value={`Nivel ${savedUser.trustScore || 60}/100`}
                done
              />
              <AnalysisLine
                icon="🛡"
                title="Riesgo QSM"
                value={riskLevel}
                done={completion >= 60}
              />
            </section>

            <section style={previewCard}>
              <h2>Vista previa</h2>

              <div style={previewImageWrap}>
                <img src={previewImage} alt="preview" style={previewImageStyle} />
                <span style={previewBadge}>Pago Protegido</span>
              </div>

              <h3>{form.title || "Tu producto aparecerá aquí"}</h3>
              <h2 style={previewPrice}>
                RD$ {form.price ? Number(form.price).toLocaleString("es-DO") : "0"}
              </h2>
              <p style={previewText}>
                {form.description || "Agrega una descripción clara para generar confianza."}
              </p>

              <div style={sellerPreview}>
                <div style={avatar}>
                  {savedUser.firstName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <strong>
                    {savedUser.firstName} {savedUser.lastName}
                  </strong>
                  <p>Nivel de confianza {savedUser.trustScore || 60}/100</p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </main>

      <AiAssistant pageContext="new-product" />
    </div>
  );
}

function Step({ number, text, active }) {
  return (
    <div style={step}>
      <span style={active ? stepNumberActive : stepNumber}>{number}</span>
      <p>{text}</p>
    </div>
  );
}

function AnalysisLine({ icon, title, value, done }) {
  return (
    <div style={analysisLine}>
      <div style={done ? analysisIconDone : analysisIcon}>{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{value}</p>
      </div>
      <span style={done ? checkDone : checkPending}>{done ? "✓" : "•"}</span>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  width: "100vw",
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr)",
  background:
    "radial-gradient(circle at 80% 10%, rgba(124,58,237,.20), transparent 30%), radial-gradient(circle at 25% 15%, rgba(53,208,195,.13), transparent 28%), #020617",
  color: "white",
  overflowX: "hidden"
};

const sidebar = {
  background: "rgba(8,17,35,.94)",
  borderRight: "1px solid rgba(53,208,195,.18)",
  padding: "24px 16px",
  minHeight: "100vh",
  position: "sticky",
  top: 0,
  width: "280px"
};

const brand = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  textDecoration: "none",
  color: "white",
  marginBottom: "38px"
};

const brandIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
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
  gap: "11px"
};

const menuItem = {
  color: "#cbd5e1",
  textDecoration: "none",
  padding: "13px 14px",
  borderRadius: "15px",
  background: "rgba(15,23,42,.38)",
  border: "1px solid rgba(148,163,184,.10)",
  fontWeight: "800"
};

const activeMenuItem = {
  ...menuItem,
  color: "#35d0c3",
  background: "rgba(53,208,195,.14)",
  border: "1px solid rgba(53,208,195,.35)"
};

const sideCard = {
  marginTop: "34px",
  padding: "22px",
  borderRadius: "24px",
  background:
    "linear-gradient(145deg, rgba(53,208,195,.13), rgba(124,58,237,.12))",
  border: "1px solid rgba(53,208,195,.22)",
  color: "#cbd5e1"
};

const sideLabel = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "11px",
  fontWeight: "900"
};

const main = {
  width: "100%",
  maxWidth: "none",
  margin: 0,
  padding: "18px 26px 96px",
  minWidth: 0
};

const hero = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 340px",
  gap: "24px",
  alignItems: "center",
  margin: "18px 0 24px",
  width: "100%"
};

const label = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "900"
};

const title = {
  fontSize: "42px",
  lineHeight: "48px",
  margin: "8px 0"
};

const gradientText = {
  background: "linear-gradient(90deg, #35d0c3, #60a5fa, #a855f7)",
  WebkitBackgroundClip: "text",
  color: "transparent"
};

const subtitle = {
  color: "#cbd5e1",
  fontSize: "18px",
  maxWidth: "780px"
};

const heroBadge = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  minWidth: "330px",
  padding: "18px",
  borderRadius: "22px",
  background: "rgba(15,23,42,.68)",
  border: "1px solid rgba(53,208,195,.20)"
};

const heroIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  fontSize: "28px",
  animation: "pulseRing 2.4s infinite"
};

const layout = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 560px",
  gap: "20px",
  alignItems: "start",
  width: "100%"
};

const formCard = {
  padding: "26px",
  borderRadius: "26px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(53,208,195,.18)",
  boxShadow: "0 30px 100px rgba(0,0,0,.38)",
  minWidth: 0
};

const stepBar = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "12px",
  marginBottom: "22px"
};

const step = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#cbd5e1",
  fontWeight: "900"
};

const stepNumber = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: "rgba(148,163,184,.16)",
  color: "#94a3b8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const stepNumberActive = {
  ...stepNumber,
  background: "#35d0c3",
  color: "#020617"
};

const sectionTitle = {
  marginTop: "18px",
  paddingTop: "18px",
  borderTop: "1px solid rgba(148,163,184,.12)",
  color: "#35d0c3",
  fontWeight: "900",
  letterSpacing: "2px"
};

const fieldLabel = {
  display: "block",
  margin: "18px 0 8px",
  fontWeight: "900"
};

const input = {
  width: "100%",
  padding: "15px",
  borderRadius: "15px",
  border: "1px solid rgba(148,163,184,.22)",
  background: "rgba(2,6,23,.64)",
  color: "white",
  outline: "none"
};

const textarea = {
  ...input,
  minHeight: "150px",
  resize: "vertical",
  lineHeight: "24px"
};

const twoColumns = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px"
};

const uploadBox = {
  marginTop: "10px",
  minHeight: "150px",
  borderRadius: "22px",
  border: "1px dashed rgba(53,208,195,.38)",
  background:
    "linear-gradient(145deg, rgba(53,208,195,.08), rgba(124,58,237,.08))",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  cursor: "pointer",
  color: "#cbd5e1"
};

const uploadBoxVideo = {
  ...uploadBox,
  border: "1px dashed rgba(168,85,247,.45)"
};

const uploadIcon = {
  fontSize: "42px",
  marginBottom: "10px"
};

const mediaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(8, 1fr)",
  gap: "10px",
  marginTop: "14px"
};

const mediaSlot = {
  height: "82px",
  borderRadius: "16px",
  background: "rgba(2,6,23,.55)",
  border: "1px solid rgba(148,163,184,.16)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  position: "relative",
  color: "#94a3b8",
  fontWeight: "900"
};

const mediaImg = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const removeBtn = {
  position: "absolute",
  top: "4px",
  right: "4px",
  border: "none",
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  background: "rgba(239,68,68,.90)",
  color: "white",
  cursor: "pointer"
};

const videoBox = {
  marginTop: "14px",
  borderRadius: "20px",
  overflow: "hidden",
  border: "1px solid rgba(53,208,195,.18)"
};

const videoPlayer = {
  width: "100%",
  maxHeight: "320px",
  display: "block",
  background: "#020617"
};

const removeVideoButton = {
  width: "100%",
  padding: "12px",
  background: "rgba(239,68,68,.18)",
  color: "#fecaca",
  border: "none",
  cursor: "pointer",
  fontWeight: "900"
};

const messageBox = {
  marginTop: "18px",
  padding: "14px",
  borderRadius: "14px",
  background: "rgba(245,158,11,.13)",
  color: "#fde68a",
  border: "1px solid rgba(245,158,11,.28)",
  fontWeight: "900"
};

const uploadingBox = {
  ...messageBox,
  background: "rgba(53,208,195,.12)",
  color: "#67fff1",
  border: "1px solid rgba(53,208,195,.28)"
};

const buttonRow = {
  position: "fixed",
  left: "300px",
  right: "26px",
  bottom: "18px",
  display: "grid",
  gridTemplateColumns: "280px 1fr 1.1fr",
  gap: "14px",
  zIndex: 50,
  padding: 0
};

const cancelButton = {
  textAlign: "center",
  textDecoration: "none",
  color: "white",
  padding: "16px",
  borderRadius: "15px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(148,163,184,.18)",
  fontWeight: "900"
};

const draftButton = {
  textAlign: "center",
  color: "#35d0c3",
  padding: "16px",
  borderRadius: "15px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(53,208,195,.35)",
  fontWeight: "900",
  cursor: "pointer"
};

const submitButton = {
  border: "none",
  padding: "16px",
  borderRadius: "15px",
  background: "linear-gradient(135deg, #35d0c3, #2563eb, #7c3aed)",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "16px"
};

const rightColumn = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "18px",
  position: "sticky",
  top: "18px",
  minWidth: 0
};

const aiCard = {
  borderRadius: "26px",
  padding: "22px",
  background:
    "linear-gradient(145deg, rgba(15,23,42,.86), rgba(30,41,59,.58))",
  border: "1px solid rgba(53,208,195,.20)",
  boxShadow: "0 28px 90px rgba(0,0,0,.35)"
};

const aiHeader = {
  display: "flex",
  alignItems: "center",
  gap: "14px"
};

const aiBrain = {
  width: "58px",
  height: "58px",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px"
};

const scoreCircle = {
  width: "120px",
  height: "120px",
  margin: "22px auto",
  borderRadius: "50%",
  border: "10px solid rgba(53,208,195,.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#35d0c3",
  fontSize: "30px",
  fontWeight: "900",
  animation: "floatGlow 4s ease-in-out infinite"
};

const scoreBar = {
  height: "10px",
  background: "rgba(148,163,184,.16)",
  borderRadius: "999px",
  overflow: "hidden",
  marginBottom: "22px"
};

const scoreFill = {
  height: "100%",
  background: "linear-gradient(90deg, #35d0c3, #60a5fa, #a855f7)",
  borderRadius: "999px"
};

const analysisLine = {
  display: "grid",
  gridTemplateColumns: "44px 1fr 28px",
  gap: "12px",
  alignItems: "center",
  padding: "14px 0",
  borderBottom: "1px solid rgba(148,163,184,.10)"
};

const analysisIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "14px",
  background: "rgba(245,158,11,.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const analysisIconDone = {
  ...analysisIcon,
  background: "rgba(34,197,94,.14)"
};

const checkDone = {
  color: "#86efac",
  fontWeight: "900"
};

const checkPending = {
  color: "#fde68a",
  fontWeight: "900"
};

const previewCard = {
  borderRadius: "26px",
  padding: "20px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(53,208,195,.18)"
};

const previewImageWrap = {
  position: "relative",
  height: "260px",
  borderRadius: "22px",
  overflow: "hidden",
  background: "#020617"
};

const previewImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const previewBadge = {
  position: "absolute",
  left: "14px",
  bottom: "14px",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(53,208,195,.18)",
  color: "#67fff1",
  border: "1px solid rgba(53,208,195,.35)",
  fontWeight: "900",
  fontSize: "12px"
};

const previewPrice = {
  color: "#35d0c3"
};

const previewText = {
  color: "#94a3b8",
  lineHeight: "24px"
};

const sellerPreview = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  padding: "14px",
  borderRadius: "18px",
  background: "rgba(2,6,23,.45)",
  border: "1px solid rgba(148,163,184,.12)"
};

const avatar = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900"
};

export default NewProduct;