import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

function ProductHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/products/${id}/history`);

        if (active) {
          setHistory(response.data?.history || null);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
            "No se pudo cargar el historial del producto."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [id]);

  const product = history?.product;

  const images = useMemo(
    () => Array.isArray(product?.images) ? product.images : [],
    [product?.images]
  );

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={stateCard}>
          <h2>Cargando historial...</h2>
          <p style={muted}>QSM esta reuniendo la trazabilidad real del producto.</p>
        </div>
      </div>
    );
  }

  if (error || !history) {
    return (
      <div style={pageStyle}>
        <div style={stateCard}>
          <h2>No se pudo abrir el historial</h2>
          <p style={errorText}>{error || "No hay datos disponibles."}</p>
          <button
            type="button"
            onClick={() => navigate(`/product/${id}`)}
            style={primaryButton}
          >
            Volver al producto
          </button>
        </div>
      </div>
    );
  }

  const duplicateStatus =
    history.duplicates?.status === "POSSIBLE_DUPLICATE";

  return (
    <div style={pageStyle}>
      <header style={header}>
        <button
          type="button"
          onClick={() => navigate(`/product/${id}`)}
          style={backButton}
        >
          {"<- Volver al producto"}
        </button>

        <span style={duplicateStatus ? warningBadge : safeBadge}>
          {duplicateStatus ? "POSIBLE DUPLICADO" : "SIN COINCIDENCIAS"}
        </span>
      </header>

      <section style={hero}>
        <div>
          <p style={eyebrow}>HISTORIAL DEL PRODUCTO</p>
          <h1 style={title}>{product.title}</h1>
          <p style={subtitle}>
            Expediente verificable con identidad, operaciones,
            seguridad y eventos registrados por QSM.
          </p>

          <div style={badges}>
            <span style={codeBadge}>{product.qsmCode || "SIN CODIGO QSM"}</span>
            <span style={neutralBadge}>{product.category || "Sin categoria"}</span>
            <span style={neutralBadge}>{product.status || "Sin estado"}</span>
          </div>
        </div>

        <div style={scoreCard}>
          <span style={small}>Confianza QSM</span>
          <strong style={score}>{Number(product.confidenceScore || 0)}</strong>
          <span style={small}>/100</span>
        </div>
      </section>

      <main style={mainGrid}>
        <section style={leftColumn}>
          <article style={card}>
            <div style={sectionHeader}>
              <div>
                <p style={sectionLabel}>EVIDENCIA VISUAL</p>
                <h2 style={sectionTitle}>Galeria del producto</h2>
              </div>
              <span style={counter}>{images.length} imagenes</span>
            </div>

            {images.length ? (
              <>
                <div style={mainImageWrap}>
                  <img
                    src={images[selectedImage] || images[0]}
                    alt={product.title}
                    style={mainImage}
                  />
                </div>

                <div style={thumbGrid}>
                  {images.map((image, index) => (
                    <button
                      type="button"
                      key={image + index}
                      onClick={() => setSelectedImage(index)}
                      style={index === selectedImage ? activeThumb : thumb}
                    >
                      <img
                        src={image}
                        alt={"Evidencia " + (index + 1)}
                        style={thumbImage}
                      />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={empty}>No hay imagenes registradas.</div>
            )}
          </article>

          <article style={card}>
            <div style={sectionHeader}>
              <div>
                <p style={sectionLabel}>TRAZABILIDAD</p>
                <h2 style={sectionTitle}>Linea de tiempo real</h2>
              </div>
              <span style={counter}>
                {history.summary?.totalEvents || 0} eventos
              </span>
            </div>

            <div>
              {history.timeline?.length ? (
                history.timeline.map((event, index) => (
                  <TimelineEvent
                    key={event.type + event.date + index}
                    event={event}
                  />
                ))
              ) : (
                <div style={empty}>No existen eventos adicionales.</div>
              )}
            </div>
          </article>
        </section>

        <aside style={rightColumn}>
          <article style={card}>
            <p style={sectionLabel}>IDENTIDAD</p>
            <h2 style={sectionTitle}>Huella del producto</h2>

            <InfoRow label="Codigo QSM" value={product.qsmCode || "No disponible"} />
            <InfoRow label="Codigo anterior" value={product.previousQsmCode || "No aplica"} />
            <InfoRow label="Marca" value={product.brand || "No registrada"} />
            <InfoRow label="Modelo" value={product.model || "No registrado"} />
            <InfoRow label="Numero de serie" value={mask(product.serialNumber)} />
            <InfoRow label="IMEI" value={mask(product.imei)} />
            <InfoRow label="VIN" value={mask(product.vehicleDetails?.vin)} />
          </article>

          <article style={duplicateStatus ? warningCard : safeCard}>
            <p style={sectionLabel}>DUPLICADOS</p>
            <h2 style={sectionTitle}>
              {duplicateStatus ? "Revision requerida" : "Sin coincidencias"}
            </h2>
            <p style={muted}>
              {duplicateStatus
                ? `QSM encontro ${history.duplicates.count} coincidencia(s).`
                : "No se encontraron coincidencias por IMEI, serial, VIN o photoHash."}
            </p>

            {duplicateStatus && history.duplicates.matches.map((match) => (
              <div key={match.id} style={duplicateItem}>
                <strong>{match.title}</strong>
                <span style={warningText}>{match.reasons.join(" / ")}</span>
              </div>
            ))}
          </article>

          <article style={card}>
            <p style={sectionLabel}>SEGURIDAD</p>
            <h2 style={sectionTitle}>Evaluacion QSM</h2>

            <InfoRow label="Riesgo" value={product.riskLabel || product.riskLevel || "Sin clasificar"} />
            <InfoRow label="Puntuacion de riesgo" value={`${Number(product.riskScore || 0)}/100`} />
            <InfoRow label="Publicacion" value={`${Number(product.publicationScore || 0)}/100`} />
            <InfoRow label="Nivel" value={product.publicationLevel || "Sin clasificar"} />
            <InfoRow
              label="Verificacion"
              value={product.isQsmVerified ? "Verificado" : product.verificationStatus || "Pendiente"}
            />
          </article>

          <article style={aiCard}>
            <div style={aiIcon}>AI</div>
            <div>
              <p style={sectionLabel}>QSM INTELLIGENCE</p>
              <h2 style={sectionTitle}>Preparado para IA</h2>
              <p style={muted}>
                Esta zona conectara despues comparacion de imagenes,
                textos, precios y patrones sospechosos.
              </p>
            </div>
          </article>
        </aside>
      </main>
    </div>
  );
}

function TimelineEvent({ event }) {
  return (
    <div style={timelineItem}>
      <div style={dot}>{eventIcon(event.type)}</div>
      <div style={timelineContent}>
        <div style={eventTop}>
          <strong>{event.title}</strong>
          <span style={eventStatus}>{event.status}</span>
        </div>
        <p style={muted}>{event.description}</p>
        <div style={eventMeta}>
          <span>{formatDate(event.date)}</span>
          <span>{event.source}</span>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={infoRow}>
      <span style={small}>{label}</span>
      <strong style={infoValue}>{value}</strong>
    </div>
  );
}

function mask(value) {
  const text = String(value || "").trim();

  if (!text) return "No registrado";
  if (text.length <= 6) return text;

  return text.slice(0, 3) + "..." + text.slice(-4);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function eventIcon(type) {
  const value = String(type || "");

  if (value.includes("DISPUTE")) return "!";
  if (value.includes("PAYMENT")) return "$";
  if (value.includes("DELIVER")) return ">";
  if (value.includes("EDIT")) return "E";
  if (value.includes("VERIFIED")) return "V";

  return "Q";
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #020617, #07152e 48%, #020617)",
  color: "#f8fafc",
  padding: "28px clamp(18px, 4vw, 64px) 70px",
  fontFamily: 'Inter, "Plus Jakarta Sans", system-ui, sans-serif'
};

const header = {
  maxWidth: "1500px",
  margin: "0 auto",
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap"
};

const backButton = {
  minHeight: "46px",
  borderRadius: "14px",
  padding: "0 17px",
  border: "1px solid rgba(56,189,248,.22)",
  background: "rgba(15,23,42,.72)",
  color: "#dbeafe",
  fontWeight: "900",
  cursor: "pointer"
};

const safeBadge = {
  padding: "9px 12px",
  borderRadius: "999px",
  background: "rgba(34,197,94,.12)",
  border: "1px solid rgba(34,197,94,.28)",
  color: "#86efac",
  fontSize: "11px",
  fontWeight: "950"
};

const warningBadge = {
  ...safeBadge,
  background: "rgba(245,158,11,.12)",
  border: "1px solid rgba(245,158,11,.30)",
  color: "#fcd34d"
};

const hero = {
  maxWidth: "1500px",
  margin: "48px auto 28px",
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) 230px",
  gap: "24px",
  alignItems: "end"
};

const eyebrow = {
  color: "#22d3ee",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "950"
};

const title = {
  margin: "12px 0",
  fontSize: "clamp(42px,6vw,82px)",
  lineHeight: ".98",
  letterSpacing: "-3px"
};

const subtitle = {
  maxWidth: "850px",
  color: "#a8b6cc",
  fontSize: "17px",
  lineHeight: "29px"
};

const badges = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "20px"
};

const codeBadge = {
  padding: "9px 12px",
  borderRadius: "999px",
  background: "linear-gradient(135deg,rgba(34,211,238,.18),rgba(139,92,246,.18))",
  border: "1px solid rgba(56,189,248,.25)",
  color: "#e0f2fe",
  fontSize: "11px",
  fontWeight: "950"
};

const neutralBadge = {
  ...codeBadge,
  background: "rgba(15,23,42,.72)",
  color: "#cbd5e1"
};

const scoreCard = {
  minHeight: "190px",
  borderRadius: "26px",
  padding: "24px",
  background: "linear-gradient(145deg,rgba(15,23,42,.92),rgba(30,41,59,.72))",
  border: "1px solid rgba(56,189,248,.22)",
  display: "flex",
  flexWrap: "wrap",
  alignContent: "center",
  alignItems: "baseline",
  gap: "4px"
};

const score = {
  fontSize: "64px",
  lineHeight: "1",
  color: "#67e8f9"
};

const mainGrid = {
  maxWidth: "1500px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "minmax(0,1.75fr) minmax(320px,.85fr)",
  gap: "22px"
};

const leftColumn = { display: "grid", gap: "22px", minWidth: 0 };
const rightColumn = { display: "grid", gap: "22px", alignContent: "start", minWidth: 0 };

const card = {
  background: "linear-gradient(145deg,rgba(15,23,42,.90),rgba(9,18,36,.82))",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "22px",
  boxShadow: "0 28px 80px rgba(0,0,0,.28)"
};

const safeCard = {
  ...card,
  border: "1px solid rgba(34,197,94,.24)",
  background: "linear-gradient(145deg,rgba(6,78,59,.24),rgba(15,23,42,.90))"
};

const warningCard = {
  ...card,
  border: "1px solid rgba(245,158,11,.28)",
  background: "linear-gradient(145deg,rgba(120,53,15,.24),rgba(15,23,42,.90))"
};

const aiCard = {
  ...card,
  display: "flex",
  gap: "16px",
  background: "linear-gradient(145deg,rgba(49,46,129,.28),rgba(8,47,73,.26))"
};

const aiIcon = {
  width: "58px",
  height: "58px",
  flexShrink: 0,
  borderRadius: "19px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg,#22d3ee,#8b5cf6)",
  fontWeight: "950"
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  marginBottom: "18px"
};

const sectionLabel = {
  margin: 0,
  color: "#22d3ee",
  fontSize: "10px",
  letterSpacing: "2px",
  fontWeight: "950"
};

const sectionTitle = { margin: "7px 0 0", fontSize: "24px" };

const counter = {
  padding: "8px 11px",
  borderRadius: "999px",
  color: "#cbd5e1",
  background: "rgba(148,163,184,.10)",
  border: "1px solid rgba(148,163,184,.15)",
  fontSize: "12px",
  fontWeight: "900"
};

const mainImageWrap = {
  height: "430px",
  borderRadius: "22px",
  overflow: "hidden",
  background: "#020617",
  border: "1px solid rgba(56,189,248,.15)"
};

const mainImage = { width: "100%", height: "100%", objectFit: "cover" };

const thumbGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(92px,1fr))",
  gap: "10px",
  marginTop: "12px"
};

const thumb = {
  height: "86px",
  padding: 0,
  overflow: "hidden",
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,.18)",
  background: "#020617",
  cursor: "pointer"
};

const activeThumb = {
  ...thumb,
  border: "2px solid #22d3ee",
  boxShadow: "0 0 26px rgba(34,211,238,.20)"
};

const thumbImage = { width: "100%", height: "100%", objectFit: "cover" };

const timelineItem = {
  display: "grid",
  gridTemplateColumns: "44px minmax(0,1fr)",
  gap: "14px",
  padding: "16px 0",
  borderBottom: "1px solid rgba(148,163,184,.10)"
};

const dot = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg,#22d3ee,#8b5cf6)",
  fontWeight: "950"
};

const timelineContent = { minWidth: 0 };
const eventTop = { display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" };
const eventStatus = { color: "#7dd3fc", fontSize: "11px", fontWeight: "950" };
const eventMeta = { display: "flex", gap: "14px", color: "#64748b", fontSize: "12px" };

const infoRow = {
  display: "grid",
  gap: "5px",
  padding: "14px 0",
  borderBottom: "1px solid rgba(148,163,184,.10)"
};

const small = { color: "#7f8ea8", fontSize: "12px" };
const infoValue = { color: "#e2e8f0", wordBreak: "break-word" };
const duplicateItem = { display: "grid", gap: "5px", padding: "12px", borderRadius: "14px", background: "rgba(2,6,23,.44)" };
const warningText = { color: "#fcd34d", fontSize: "11px", fontWeight: "900" };
const muted = { color: "#94a3b8", lineHeight: "24px" };
const empty = { padding: "20px", borderRadius: "16px", background: "rgba(2,6,23,.46)", color: "#94a3b8" };

const stateCard = {
  maxWidth: "620px",
  margin: "16vh auto 0",
  padding: "36px",
  borderRadius: "26px",
  textAlign: "center",
  background: "rgba(15,23,42,.90)",
  border: "1px solid rgba(56,189,248,.20)"
};

const primaryButton = {
  minHeight: "50px",
  marginTop: "14px",
  border: "none",
  borderRadius: "14px",
  padding: "0 18px",
  background: "linear-gradient(135deg,#22d3ee,#38bdf8,#8b5cf6)",
  color: "white",
  fontWeight: "950",
  cursor: "pointer"
};

const errorText = { color: "#fecaca", lineHeight: "24px" };

export default ProductHistory;
