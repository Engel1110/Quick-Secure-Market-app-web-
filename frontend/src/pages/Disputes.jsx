import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AiAssistant from "../components/AiAssistant";

function Disputes() {
  const order = JSON.parse(localStorage.getItem("qsm_last_order"));

  const savedUser = JSON.parse(localStorage.getItem("qsm_user")) || {
    firstName: "Usuario",
    lastName: "QSM",
    email: "usuario@qsm.com",
    trustScore: 60,
    kycStatus: "PENDING"
  };

  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [chatText, setChatText] = useState("");

  const [dispute, setDispute] = useState(
    JSON.parse(localStorage.getItem("qsm_last_dispute")) || null
  );

  const [chatMessages, setChatMessages] = useState([
    {
      role: "Comprador",
      text: "El producto recibido no corresponde a lo publicado.",
      time: "10:35 AM"
    },
    {
      role: "Vendedor",
      text: "Ese daño no estaba cuando lo envié. Puedo revisar con la empresa de envío.",
      time: "11:20 AM"
    },
    {
      role: "Moderador QSM",
      text: "Hemos recibido la evidencia. QSM AI está analizando el caso.",
      time: "12:10 PM"
    }
  ]);

  const activeDispute = dispute || {
    disputeCode: "DSP-660939",
    orderCode: order?.orderCode || "QSM-502600",
    productId: order?.productId || "5",
    productName: order?.productName || "iPhone 11",
    sellerName: "Juan Pérez",
    sellerTrust: 90,
    reason: "Producto diferente al descrito",
    evidence: "El producto llegó con la pantalla rota y no enciende correctamente.",
    status: "OPEN",
    createdAt: "11 de junio de 2026, 10:30 AM",
    escrowAmount: order?.total || 45000
  };

  const completion = useMemo(() => {
    const checks = [
      !!activeDispute.orderCode,
      !!activeDispute.productId,
      !!activeDispute.reason,
      !!activeDispute.evidence,
      evidenceFiles.length > 0 || !!evidence,
      !!activeDispute.sellerTrust
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [activeDispute, evidenceFiles, evidence]);

  const handleEvidenceFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const previews = files.slice(0, 6).map((file) => ({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      type: file.type,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : ""
    }));

    setEvidenceFiles(previews);
  };

  const handleCreateDispute = (e) => {
    e.preventDefault();

    if (!reason || !evidence) {
      setMessage("Debes seleccionar un motivo y escribir una evidencia antes de abrir la disputa.");
      return;
    }

    const newDispute = {
      disputeCode: "DSP-" + Date.now().toString().slice(-6),
      orderCode: order?.orderCode || "QSM-502600",
      productId: order?.productId || "5",
      productName: order?.productName || "Producto QSM",
      sellerName: order?.sellerName || "Vendedor QSM",
      sellerTrust: order?.sellerTrust || 90,
      reason,
      evidence,
      status: "OPEN",
      createdAt: new Date().toLocaleString("es-DO"),
      escrowAmount: order?.total || 45000
    };

    localStorage.setItem("qsm_last_dispute", JSON.stringify(newDispute));
    setDispute(newDispute);
    setMessage("Disputa creada correctamente. El pago queda retenido por QSM.");
  };

  const sendChat = () => {
    if (!chatText.trim()) return;

    setChatMessages([
      ...chatMessages,
      {
        role: "Comprador",
        text: chatText,
        time: "Ahora"
      }
    ]);

    setChatText("");
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
          <Link style={menuItem} to="/new-product">➕ Vender producto</Link>
          <Link style={menuItem} to="/marketing">📈 Marketing Center</Link>
          <Link style={activeMenuItem} to="/disputes">⚖ Mis disputas</Link>
          <Link style={menuItem} to="/complete-profile">🧾 Verificación QSM</Link>
        </nav>

        <div style={aiSideCard}>
          <h3>🤖 QSM AI</h3>
          <p>Te ayudamos a resolver disputas de forma segura, justa y documentada.</p>
          <button style={sideButton}>Pregúntame algo</button>
        </div>
      </aside>

      <main style={main}>
        <header style={topbar}>
          <div style={searchBox}>
            <span>🔎</span>
            <input placeholder="Buscar órdenes, disputas o productos..." style={searchInput} />
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

        <section style={hero}>
          <div>
            <p style={label}>CENTRO DE RESOLUCIÓN QSM</p>
            <h1 style={title}>Centro de Disputas QSM</h1>
            <p style={subtitle}>
              Reporta problemas con una orden. QSM retiene el pago mediante escrow mientras revisa evidencia,
              conversación, historial del vendedor y señales de fraude.
            </p>
          </div>

          <Link to="/orders" style={secondaryButton}>
            Ver mis órdenes
          </Link>
        </section>

        <section style={statsGrid}>
          <StatCard icon="✅" title="Disputas resueltas" value="Proyección" text="Métrica futura del sistema" />
          <StatCard icon="🟡" title="En revisión" value={dispute ? "1" : "0"} text="Activas ahora" />
          <StatCard icon="⏱️" title="Tiempo promedio" value="24h" text="Objetivo de resolución" />
          <StatCard icon="💰" title="Dinero protegido" value={`RD$ ${formatMoney(activeDispute.escrowAmount)}`} text="Retenido por escrow" />
        </section>

        {!order && (
          <div style={warningBox}>
            ⚠ No tienes una orden reciente conectada. Se muestra una disputa de demostración para visualizar el flujo QSM.
          </div>
        )}

        {message && <div style={messageBox}>{message}</div>}

        <section style={layout}>
          <aside style={leftColumn}>
            <div style={panel}>
              <div style={panelHeader}>
                <h2>Información de la disputa</h2>
                <span style={codeBadge}>#{activeDispute.disputeCode}</span>
              </div>

              <InfoLine title="Orden" value={activeDispute.orderCode} />
              <InfoLine title="Producto" value={activeDispute.productName || activeDispute.productId} />
              <InfoLine title="Vendedor" value={activeDispute.sellerName} />
              <InfoLine title="Trust vendedor" value={`${activeDispute.sellerTrust}/100`} />
              <InfoLine title="Fecha apertura" value={activeDispute.createdAt} />
              <InfoLine title="Estado" value={statusText(activeDispute.status)} />
              <InfoLine title="Motivo" value={activeDispute.reason} />

              <div style={descriptionBox}>
                <strong>Descripción</strong>
                <p>{activeDispute.evidence}</p>
              </div>

              <button style={primaryButton}>+ Abrir nueva disputa</button>
            </div>

            <div style={panel}>
              <h2>Línea de tiempo</h2>

              <Timeline done title="Disputa creada" time="11/06/2026 10:30 AM" />
              <Timeline done title="Evidencia agregada" time="11/06/2026 11:15 AM" />
              <Timeline done title="IA QSM analizó el caso" time="11/06/2026 12:02 PM" />
              <Timeline done title="Asignada a moderador" time="11/06/2026 12:10 PM" />
              <Timeline active title="Esperando respuesta del vendedor" time="En proceso" />
              <Timeline title="Resolución final" time="Pendiente" />
            </div>

            <div style={panel}>
              <h2>Abrir disputa</h2>

              <form onSubmit={handleCreateDispute}>
                <label style={fieldLabel}>Orden</label>
                <input
                  value={order?.orderCode || "QSM-502600"}
                  disabled
                  style={input}
                />

                <label style={fieldLabel}>Motivo</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  style={input}
                >
                  <option value="">Selecciona un motivo</option>
                  <option value="Producto diferente al descrito">Producto diferente al descrito</option>
                  <option value="Producto dañado">Producto dañado</option>
                  <option value="No recibí el producto">No recibí el producto</option>
                  <option value="Producto incompleto">Producto incompleto</option>
                  <option value="Sospecha de fraude">Sospecha de fraude</option>
                </select>

                <label style={fieldLabel}>Evidencia</label>
                <textarea
                  placeholder="Describe lo ocurrido y adjunta pruebas si las tienes."
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  required
                  style={textarea}
                />

                <button style={warningButton}>
                  Abrir disputa y retener pago
                </button>
              </form>
            </div>
          </aside>

          <section style={centerColumn}>
            <div style={panel}>
              <div style={panelHeader}>
                <h2>Evidencias del comprador</h2>

                <label style={smallButton}>
                  Agregar evidencia
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf"
                    onChange={handleEvidenceFiles}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <div style={evidenceGrid}>
                {(evidenceFiles.length > 0 ? evidenceFiles : defaultEvidence).map((file, index) => (
                  <EvidenceCard key={index} file={file} />
                ))}
              </div>

              <button style={outlineButton}>Ver todas las evidencias</button>
            </div>

            <div style={panel}>
              <div style={panelHeader}>
                <div>
                  <h2>Conversación protegida</h2>
                  <p style={muted}>Solo visible para comprador, vendedor y moderador QSM.</p>
                </div>

                <button style={smallButton}>Invitar moderador</button>
              </div>

              <div style={chatBox}>
                {chatMessages.map((msg, index) => (
                  <ChatMessage key={index} msg={msg} />
                ))}
              </div>

              <div style={chatInputRow}>
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  style={chatInput}
                />
                <button onClick={sendChat} style={sendButton}>➤</button>
              </div>
            </div>
          </section>

          <aside style={rightColumn}>
            <div style={aiPanel}>
              <div style={panelHeader}>
                <h2>Análisis QSM AI</h2>
                <span style={successBadge}>Completado</span>
              </div>

              <div style={aiRiskCircle}>🛡</div>

              <p style={muted}>Nivel de riesgo</p>
              <h2 style={riskTitle}>Bajo</h2>

              <div style={checkList}>
                <Check text="Producto verificado" />
                <Check text="Pago protegido por escrow" />
                <Check text="Evidencia suficiente" />
                <Check text="Vendedor identificado" />
                <Check text="Historial del vendedor positivo" />
              </div>

              <div style={successRate}>
                <span>Probabilidad de éxito</span>
                <strong>87%</strong>
              </div>

              <div style={track}>
                <div style={{ ...fill, width: `${completion}%` }}></div>
              </div>
            </div>

            <div style={panel}>
              <h2>Estado del dinero</h2>
              <div style={escrowAmount}>RD$ {formatMoney(activeDispute.escrowAmount)}</div>
              <p style={escrowStatus}>● Retenido por QSM</p>

              <InfoLine title="Liberación automática" value="Suspendida" />
              <InfoLine title="Motivo" value="Disputa abierta" />

              <button style={outlineButton}>Ver detalles del escrow</button>
            </div>

            <div style={panel}>
              <h2>Acciones disponibles</h2>
              <button style={outlineButton}>Agregar más evidencia</button>
              <button style={dangerButton}>Cancelar disputa</button>
            </div>
          </aside>
        </section>
      </main>

      <AiAssistant pageContext="disputes" />
    </div>
  );
}

const defaultEvidence = [
  {
    name: "foto_producto_1.jpg",
    size: "1.2 MB",
    url: "https://images.unsplash.com/photo-1603816245457-fe9c80b740ff?auto=format&fit=crop&w=500&q=80"
  },
  {
    name: "foto_producto_2.jpg",
    size: "1.1 MB",
    url: "https://images.unsplash.com/photo-1603816245457-fe9c80b740ff?auto=format&fit=crop&w=500&q=80"
  },
  {
    name: "video_evidencia.mp4",
    size: "12.4 MB",
    video: true
  },
  {
    name: "factura.pdf",
    size: "534 KB",
    pdf: true
  }
];

function TopIcon({ icon, number, label }) {
  return (
    <div style={topIconBox}>
      <span style={notification}>{number}</span>
      <div>{icon}</div>
      <small>{label}</small>
    </div>
  );
}

function StatCard({ icon, title, value, text }) {
  return (
    <div style={statCard}>
      <div style={statIcon}>{icon}</div>
      <div>
        <p>{title}</p>
        <h2>{value}</h2>
        <span>{text}</span>
      </div>
    </div>
  );
}

function InfoLine({ title, value }) {
  return (
    <div style={infoLine}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Timeline({ title, time, done, active }) {
  return (
    <div style={timeline}>
      <div style={done ? timelineDotDone : active ? timelineDotActive : timelineDot}></div>
      <div>
        <strong>{title}</strong>
        <p>{time}</p>
      </div>
    </div>
  );
}

function EvidenceCard({ file }) {
  return (
    <div style={evidenceCard}>
      <div style={evidencePreview}>
        {file.url ? (
          <img src={file.url} alt={file.name} style={evidenceImage} />
        ) : file.video ? (
          <div style={evidenceIcon}>▶</div>
        ) : file.pdf ? (
          <div style={evidenceIcon}>📄</div>
        ) : (
          <div style={evidenceIcon}>📎</div>
        )}
      </div>
      <strong>{file.name}</strong>
      <p>{file.size}</p>
    </div>
  );
}

function ChatMessage({ msg }) {
  const isModerator = msg.role === "Moderador QSM";

  return (
    <div style={isModerator ? moderatorMessage : chatMessage}>
      <div style={chatAvatar}>
        {isModerator ? "🛡" : msg.role.charAt(0)}
      </div>

      <div>
        <div style={chatHeaderSmall}>
          <strong>{msg.role}</strong>
          <span>{msg.time}</span>
        </div>
        <p>{msg.text}</p>
      </div>
    </div>
  );
}

function Check({ text }) {
  return (
    <div style={check}>
      <span>✅</span>
      <p>{text}</p>
    </div>
  );
}

function statusText(status) {
  const map = {
    OPEN: "Abierta",
    REVIEWING: "En revisión",
    RESOLVED: "Resuelta"
  };

  return map[status] || status || "Pendiente";
}

function formatMoney(value) {
  if (!value) return "0";
  return Number(value).toLocaleString("es-DO");
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
  maxWidth: "1760px",
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

const hero = {
  display: "flex",
  justifyContent: "space-between",
  gap: "24px",
  alignItems: "center",
  marginBottom: "24px"
};

const label = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "900"
};

const title = {
  fontSize: "clamp(40px, 4vw, 68px)",
  lineHeight: "1.04",
  margin: "8px 0",
  letterSpacing: "-2px"
};

const subtitle = {
  color: "#cbd5e1",
  lineHeight: "28px",
  maxWidth: "950px"
};

const secondaryButton = {
  color: "#35d0c3",
  textDecoration: "none",
  border: "1px solid rgba(53,208,195,0.35)",
  padding: "14px 20px",
  borderRadius: "14px",
  fontWeight: "900"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "18px",
  marginBottom: "20px"
};

const statCard = {
  display: "flex",
  gap: "16px",
  alignItems: "center",
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "22px",
  padding: "20px"
};

const statIcon = {
  width: "56px",
  height: "56px",
  borderRadius: "18px",
  background: "rgba(53,208,195,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px"
};

const warningBox = {
  background: "rgba(245,158,11,0.12)",
  border: "1px solid rgba(245,158,11,0.28)",
  color: "#fde68a",
  borderRadius: "16px",
  padding: "14px",
  marginBottom: "20px",
  fontWeight: "800"
};

const messageBox = {
  background: "rgba(6,78,59,0.25)",
  border: "1px solid rgba(134,239,172,0.28)",
  color: "#86efac",
  borderRadius: "16px",
  padding: "14px",
  marginBottom: "20px",
  fontWeight: "800"
};

const layout = {
  display: "grid",
  gridTemplateColumns: "340px minmax(0, 1fr) 340px",
  gap: "18px",
  alignItems: "start"
};

const leftColumn = {
  display: "grid",
  gap: "18px"
};

const centerColumn = {
  display: "grid",
  gap: "18px",
  minWidth: 0
};

const rightColumn = {
  display: "grid",
  gap: "18px"
};

const panel = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "22px",
  padding: "20px",
  minWidth: 0
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center"
};

const codeBadge = {
  background: "rgba(53,208,195,0.16)",
  color: "#35d0c3",
  padding: "8px 11px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px"
};

const infoLine = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  padding: "11px 0",
  borderBottom: "1px solid rgba(148,163,184,0.12)",
  color: "#cbd5e1"
};

const descriptionBox = {
  marginTop: "16px",
  background: "rgba(2,6,23,0.44)",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: "16px",
  padding: "16px",
  color: "#cbd5e1",
  lineHeight: "25px"
};

const primaryButton = {
  width: "100%",
  marginTop: "16px",
  background: "#35d0c3",
  color: "#020617",
  border: "none",
  padding: "14px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900"
};

const warningButton = {
  ...primaryButton,
  background: "#f59e0b"
};

const fieldLabel = {
  display: "block",
  margin: "14px 0 8px",
  color: "#e5e7eb",
  fontWeight: "900"
};

const input = {
  width: "100%",
  background: "rgba(2,6,23,0.60)",
  border: "1px solid rgba(148,163,184,0.22)",
  color: "white",
  outline: "none",
  padding: "13px",
  borderRadius: "13px",
  fontFamily: "'Inter', system-ui, sans-serif"
};

const textarea = {
  ...input,
  minHeight: "110px",
  resize: "vertical",
  lineHeight: "24px"
};

const timeline = {
  display: "flex",
  gap: "14px",
  padding: "12px 0",
  color: "#cbd5e1"
};

const timelineDot = {
  width: "18px",
  height: "18px",
  borderRadius: "50%",
  background: "rgba(148,163,184,0.25)",
  marginTop: "4px",
  flexShrink: 0
};

const timelineDotDone = {
  ...timelineDot,
  background: "#35d0c3"
};

const timelineDotActive = {
  ...timelineDot,
  background: "#f59e0b"
};

const evidenceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "14px",
  marginTop: "16px"
};

const evidenceCard = {
  background: "rgba(2,6,23,0.44)",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: "16px",
  padding: "12px",
  color: "#cbd5e1"
};

const evidencePreview = {
  height: "130px",
  borderRadius: "12px",
  overflow: "hidden",
  background: "rgba(2,6,23,0.75)",
  marginBottom: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const evidenceImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const evidenceIcon = {
  fontSize: "36px"
};

const smallButton = {
  background: "rgba(15,23,42,0.72)",
  color: "#e5e7eb",
  border: "1px solid rgba(148,163,184,0.22)",
  padding: "10px 13px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "800"
};

const outlineButton = {
  width: "100%",
  marginTop: "16px",
  background: "transparent",
  border: "1px solid rgba(53,208,195,0.28)",
  color: "#e5e7eb",
  padding: "13px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900"
};

const muted = {
  color: "#94a3b8",
  margin: 0
};

const chatBox = {
  display: "grid",
  gap: "12px",
  marginTop: "18px"
};

const chatMessage = {
  display: "flex",
  gap: "12px",
  background: "rgba(2,6,23,0.42)",
  border: "1px solid rgba(148,163,184,0.10)",
  borderRadius: "16px",
  padding: "14px",
  color: "#cbd5e1"
};

const moderatorMessage = {
  ...chatMessage,
  border: "1px solid rgba(53,208,195,0.24)"
};

const chatAvatar = {
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontWeight: "900"
};

const chatHeaderSmall = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  color: "white"
};

const chatInputRow = {
  display: "flex",
  gap: "10px",
  marginTop: "16px"
};

const chatInput = {
  flex: 1,
  background: "rgba(2,6,23,0.60)",
  border: "1px solid rgba(148,163,184,0.22)",
  color: "white",
  outline: "none",
  padding: "13px",
  borderRadius: "13px"
};

const sendButton = {
  width: "48px",
  borderRadius: "13px",
  border: "none",
  background: "#35d0c3",
  color: "#020617",
  cursor: "pointer",
  fontWeight: "900"
};

const aiPanel = {
  ...panel,
  border: "1px solid rgba(34,197,94,0.25)"
};

const successBadge = {
  background: "rgba(34,197,94,0.18)",
  color: "#86efac",
  padding: "8px 11px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px"
};

const aiRiskCircle = {
  width: "96px",
  height: "96px",
  margin: "18px auto",
  borderRadius: "50%",
  background: "rgba(53,208,195,0.12)",
  border: "1px solid rgba(53,208,195,0.24)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "42px"
};

const riskTitle = {
  color: "#35d0c3",
  fontSize: "34px",
  margin: "0 0 18px"
};

const checkList = {
  display: "grid",
  gap: "9px"
};

const check = {
  display: "flex",
  gap: "10px",
  color: "#cbd5e1"
};

const successRate = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "18px",
  color: "#cbd5e1"
};

const track = {
  height: "10px",
  background: "rgba(148,163,184,0.18)",
  borderRadius: "999px",
  overflow: "hidden",
  marginTop: "10px"
};

const fill = {
  height: "100%",
  background: "linear-gradient(90deg, #35d0c3, #22c55e)"
};

const escrowAmount = {
  color: "#facc15",
  fontSize: "34px",
  fontWeight: "900",
  margin: "18px 0"
};

const escrowStatus = {
  color: "#fde68a",
  fontWeight: "900"
};

const dangerButton = {
  ...outlineButton,
  color: "#fca5a5",
  border: "1px solid rgba(248,113,113,0.30)"
};

export default Disputes;