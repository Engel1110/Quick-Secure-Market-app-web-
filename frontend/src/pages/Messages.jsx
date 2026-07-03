import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

function Messages() {
  const location = useLocation();
  const endRef = useRef(null);

  const savedUser = safeJson(localStorage.getItem("qsm_user")) || safeJson(localStorage.getItem("user")) || {};
  const currentUserId = savedUser._id || savedUser.id || savedUser.userId || "";

  const params = new URLSearchParams(location.search);
  const sellerId = params.get("sellerId") || "";
  const buyerId = params.get("buyerId") || "";
  const orderId = params.get("orderId") || "";
  const productId = params.get("productId") || "";

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversation?._id) loadMessages(activeConversation._id);
  }, [activeConversation?._id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      setError("");

      const response = await api.get("/messages/conversations");
      const list = response.data.conversations || response.data.data || response.data || [];
      const safeList = Array.isArray(list) ? list : [];

      setConversations(safeList);

      const targetUserId = sellerId || buyerId;

      if (targetUserId) {
        const existing = safeList.find((conversation) =>
          conversation.participants?.some((participant) => {
            const id = participant._id || participant.id || participant.userId;
            return String(id) === String(targetUserId);
          })
        );

        if (existing) {
          setActiveConversation(existing);
        } else {
          await startConversation(targetUserId);
        }
      } else if (safeList.length > 0) {
        setActiveConversation(safeList[0]);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudieron cargar los mensajes. Verifica GET /messages/conversations."
      );
    } finally {
      setLoadingConversations(false);
    }
  };

  const startConversation = async (receiverId) => {
    try {
      setError("");

      const response = await api.post("/messages/conversations", {
        receiverId,
        orderId: orderId || undefined,
        productId: productId || undefined
      });

      const conversation = response.data.conversation || response.data.data || response.data;

      setActiveConversation(conversation);
      setConversations((prev) => {
        const exists = prev.some((item) => item._id === conversation._id);
        return exists ? prev : [conversation, ...prev];
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo iniciar la conversación. Verifica POST /messages/conversations."
      );
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setLoadingMessages(true);
      setError("");

      const response = await api.get(`/messages/conversations/${conversationId}`);
      const list = response.data.messages || response.data.data || response.data || [];

      setMessages(Array.isArray(list) ? list : []);

      try {
        await api.patch(`/messages/conversations/${conversationId}/read`);
      } catch {}
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudieron cargar los mensajes de esta conversación."
      );
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();

    if (!text.trim()) return;
    if (!activeConversation?._id) {
      setError("Selecciona una conversación antes de enviar.");
      return;
    }

    try {
      setSending(true);
      setError("");
      setNotice("");

      const response = await api.post("/messages", {
        conversationId: activeConversation._id,
        text: text.trim(),
        orderId: activeConversation.order?._id || activeConversation.order || orderId || undefined,
        productId: activeConversation.product?._id || activeConversation.product || productId || undefined
      });

      const newMessage = response.data.message || response.data.data || response.data;

      setMessages((prev) => [...prev, newMessage]);
      setText("");
      setNotice("Mensaje enviado.");
      await loadConversations();
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo enviar el mensaje. Verifica POST /messages.");
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;

    const term = search.toLowerCase();

    return conversations.filter((conversation) => {
      const other = getOtherParticipant(conversation, currentUserId);
      const productTitle = conversation.product?.title || conversation.productTitle || "";

      return `${other.firstName || ""} ${other.lastName || ""} ${other.email || ""} ${productTitle}`
        .toLowerCase()
        .includes(term);
    });
  }, [conversations, search, currentUserId]);

  const activeOtherUser = activeConversation
    ? getOtherParticipant(activeConversation, currentUserId)
    : null;

  return (
    <div style={page}>
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root {
          margin: 0; padding: 0; width: 100%; min-height: 100%;
          background: #020617; font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
          overflow-x: hidden;
        }
        a, button, input, textarea { font-family: inherit; }
        a, button { transition: all .25s ease; }
        a:hover, button:hover { transform: translateY(-2px); }
        @media (max-width: 1200px) {
          .messages-page { grid-template-columns: 1fr !important; }
          .sidebar-wrapper { display: none !important; }
          .messages-layout { grid-template-columns: 1fr !important; }
          .conversation-panel { max-height: 380px !important; }
        }
        @media (max-width: 760px) {
          .main-content { padding: 18px !important; }
          .message-header { flex-direction: column !important; align-items: flex-start !important; }
          .composer { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="messages-page" style={layout}>
        <div className="sidebar-wrapper"><Sidebar /></div>

        <main className="main-content" style={main}>
          <Topbar />

          <section style={hero}>
            <div>
              <p style={label}>MENSAJES QSM</p>
              <h1 style={title}>Centro de mensajes</h1>
              <p style={subtitle}>
                Comunícate con compradores y vendedores de forma segura. Cada conversación puede quedar asociada a una orden o producto.
              </p>
            </div>

            <div style={heroBadge}>
              <span>🛡</span>
              <div>
                <strong>Chat protegido</strong>
                <p>Mensajes vinculados a órdenes QSM.</p>
              </div>
            </div>
          </section>

          {error && <div style={errorBox}>{error}</div>}
          {notice && <div style={successBox}>{notice}</div>}

          <section className="messages-layout" style={messagesLayout}>
            <aside className="conversation-panel" style={conversationPanel}>
              <div style={panelHeader}>
                <div>
                  <h2>Conversaciones</h2>
                  <p>{filteredConversations.length} conversaciones</p>
                </div>
                <button onClick={loadConversations} style={smallButton}>Actualizar</button>
              </div>

              <div style={searchBox}>
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar conversación..."
                  style={searchInput}
                />
              </div>

              <div style={conversationList}>
                {loadingConversations && (
                  <div style={emptyBox}>
                    <strong>Cargando...</strong>
                    <p>Consultando conversaciones.</p>
                  </div>
                )}

                {!loadingConversations && filteredConversations.length === 0 && (
                  <div style={emptyBox}>
                    <strong>No hay conversaciones</strong>
                    <p>Cuando contactes un vendedor o comprador, aparecerá aquí.</p>
                    <Link to="/marketplace" style={miniLink}>Ir al Marketplace</Link>
                  </div>
                )}

                {!loadingConversations &&
                  filteredConversations.map((conversation) => (
                    <button
                      key={conversation._id}
                      onClick={() => setActiveConversation(conversation)}
                      style={activeConversation?._id === conversation._id ? activeConversationCard : conversationCard}
                    >
                      <div style={conversationAvatar}>
                        {getInitial(getOtherParticipant(conversation, currentUserId))}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong style={conversationName}>
                          {formatUser(getOtherParticipant(conversation, currentUserId), "Usuario QSM")}
                        </strong>
                        <p style={conversationPreview}>
                          {conversation.lastMessage?.text || conversation.product?.title || "Nueva conversación"}
                        </p>
                      </div>

                      {conversation.unreadCount > 0 && <span style={unreadBadge}>{conversation.unreadCount}</span>}
                    </button>
                  ))}
              </div>
            </aside>

            <section style={chatPanel}>
              {!activeConversation && (
                <div style={chatEmpty}>
                  <div style={chatEmptyIcon}>💬</div>
                  <h2>Selecciona una conversación</h2>
                  <p>Desde aquí podrás escribir, revisar historial y ver datos de la orden asociada.</p>
                </div>
              )}

              {activeConversation && (
                <>
                  <header className="message-header" style={chatHeader}>
                    <div style={chatUser}>
                      <div style={chatAvatar}>{getInitial(activeOtherUser)}</div>
                      <div>
                        <h2>{formatUser(activeOtherUser, "Usuario QSM")}</h2>
                        <p>{activeConversation.product?.title || activeConversation.productTitle || "Conversación QSM"}</p>
                      </div>
                    </div>

                    <div style={chatActions}>
                      {activeConversation.product?._id && (
                        <Link to={`/product/${activeConversation.product._id}`} style={outlineButton}>
                          Ver producto
                        </Link>
                      )}

                      {(activeConversation.order?._id || activeConversation.order) && (
                        <Link to={`/orders/${activeConversation.order?._id || activeConversation.order}`} style={outlineButton}>
                          Ver orden
                        </Link>
                      )}
                    </div>
                  </header>

                  <div style={securityBanner}>
                    <strong>🛡 Recomendación QSM:</strong>
                    <span>No compartas claves, códigos bancarios ni información sensible. Mantén la operación dentro de QSM.</span>
                  </div>

                  <div style={messagesBox}>
                    {loadingMessages && <div style={chatEmpty}><p>Cargando mensajes...</p></div>}

                    {!loadingMessages && messages.length === 0 && (
                      <div style={chatEmpty}>
                        <h3>Aún no hay mensajes</h3>
                        <p>Escribe el primer mensaje para iniciar la conversación.</p>
                      </div>
                    )}

                    {!loadingMessages &&
                      messages.map((message, index) => {
                        const senderId =
                          message.sender?._id ||
                          message.sender?.id ||
                          message.sender ||
                          message.senderId;

                        const mine = String(senderId || "") === String(currentUserId);

                        return (
                          <div key={message._id || index} style={mine ? myMessageRow : otherMessageRow}>
                            <div style={mine ? myBubble : otherBubble}>
                              <p>{message.text || message.body || ""}</p>
                              <span>{formatTime(message.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}

                    <div ref={endRef} />
                  </div>

                  <form className="composer" onSubmit={sendMessage} style={composer}>
                    <textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="Escribe un mensaje seguro..."
                      style={messageInput}
                      rows={2}
                    />

                    <button type="submit" disabled={sending || !text.trim()} style={sendButton}>
                      {sending ? "Enviando..." : "Enviar →"}
                    </button>
                  </form>
                </>
              )}
            </section>
          </section>
        </main>
      </div>

      <AiAssistant pageContext="messages" />
    </div>
  );
}

function safeJson(value) {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}

function getOtherParticipant(conversation, currentUserId) {
  const participants = conversation.participants || conversation.users || [];

  return (
    participants.find((participant) => {
      const id = participant._id || participant.id || participant.userId;
      return String(id || "") !== String(currentUserId || "");
    }) ||
    conversation.receiver ||
    conversation.sender ||
    {}
  );
}

function formatUser(user, fallback) {
  if (!user || typeof user !== "object") return fallback;
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.name || user.email || fallback;
}

function getInitial(user) {
  return formatUser(user, "U").charAt(0).toUpperCase();
}

function formatTime(value) {
  if (!value) return "Ahora";
  return new Date(value).toLocaleString("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short"
  });
}

const page = { minHeight: "100vh", width: "100%", background: "radial-gradient(circle at top right, rgba(139,92,246,.16), transparent 34%), radial-gradient(circle at 18% 15%, rgba(56,189,248,.09), transparent 28%), #020617", color: "white" };
const layout = { width: "100%", minHeight: "100vh", display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", overflowX: "hidden" };
const main = { width: "100%", minWidth: 0, padding: "26px 34px 56px", overflowX: "hidden" };
const hero = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", margin: "22px 0" };
const label = { color: "#38bdf8", letterSpacing: "4px", fontSize: "12px", fontWeight: "950", textTransform: "uppercase", margin: 0 };
const title = { fontSize: "clamp(40px, 3.6vw, 62px)", lineHeight: "1", margin: "10px 0", letterSpacing: "-2px" };
const subtitle = { color: "#cbd5e1", lineHeight: "29px", maxWidth: "780px", margin: 0 };
const heroBadge = { display: "flex", alignItems: "center", gap: "14px", minWidth: "280px", background: "rgba(15,23,42,.72)", border: "1px solid rgba(56,189,248,.18)", borderRadius: "22px", padding: "18px" };
const messagesLayout = { display: "grid", gridTemplateColumns: "390px minmax(0, 1fr)", gap: "20px", minHeight: "680px" };
const conversationPanel = { background: "rgba(15,23,42,.72)", border: "1px solid rgba(56,189,248,.16)", borderRadius: "26px", padding: "18px", overflow: "hidden", maxHeight: "760px", display: "flex", flexDirection: "column" };
const panelHeader = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "16px" };
const smallButton = { background: "rgba(56,189,248,.12)", border: "1px solid rgba(56,189,248,.26)", color: "#7dd3fc", borderRadius: "12px", padding: "10px 12px", cursor: "pointer", fontWeight: "900" };
const searchBox = { height: "52px", display: "flex", alignItems: "center", gap: "12px", background: "rgba(2,6,23,.45)", border: "1px solid rgba(148,163,184,.14)", borderRadius: "15px", padding: "0 14px", marginBottom: "14px" };
const searchInput = { flex: 1, height: "100%", background: "transparent", border: "none", outline: "none", color: "white" };
const conversationList = { display: "grid", gap: "10px", overflowY: "auto", paddingRight: "4px" };
const conversationCard = { width: "100%", display: "flex", alignItems: "center", gap: "12px", textAlign: "left", background: "rgba(2,6,23,.35)", border: "1px solid rgba(148,163,184,.12)", color: "white", borderRadius: "18px", padding: "13px", cursor: "pointer" };
const activeConversationCard = { ...conversationCard, background: "linear-gradient(135deg, rgba(56,189,248,.18), rgba(139,92,246,.20))", border: "1px solid rgba(56,189,248,.38)" };
const conversationAvatar = { width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #38bdf8, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "950", flexShrink: 0 };
const conversationName = { display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const conversationPreview = { margin: "4px 0 0", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const unreadBadge = { minWidth: "24px", height: "24px", borderRadius: "999px", background: "#ef4444", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "950" };
const chatPanel = { background: "rgba(15,23,42,.72)", border: "1px solid rgba(56,189,248,.16)", borderRadius: "26px", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: "680px" };
const chatHeader = { padding: "20px", borderBottom: "1px solid rgba(148,163,184,.12)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "18px" };
const chatUser = { display: "flex", alignItems: "center", gap: "14px" };
const chatAvatar = { width: "56px", height: "56px", borderRadius: "18px", background: "linear-gradient(135deg, #35d0c3, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "950", fontSize: "22px" };
const chatActions = { display: "flex", gap: "10px", flexWrap: "wrap" };
const outlineButton = { color: "#7dd3fc", textDecoration: "none", border: "1px solid rgba(56,189,248,.26)", padding: "10px 13px", borderRadius: "12px", fontWeight: "900" };
const securityBanner = { margin: "14px 20px 0", padding: "13px 15px", borderRadius: "16px", background: "rgba(53,208,195,.10)", border: "1px solid rgba(53,208,195,.25)", color: "#cbd5e1", display: "flex", gap: "8px", flexWrap: "wrap" };
const messagesBox = { flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" };
const myMessageRow = { display: "flex", justifyContent: "flex-end" };
const otherMessageRow = { display: "flex", justifyContent: "flex-start" };
const myBubble = { maxWidth: "70%", background: "linear-gradient(135deg, #38bdf8, #8b5cf6)", color: "white", padding: "13px 15px", borderRadius: "18px 18px 4px 18px" };
const otherBubble = { maxWidth: "70%", background: "rgba(2,6,23,.55)", border: "1px solid rgba(148,163,184,.12)", color: "white", padding: "13px 15px", borderRadius: "18px 18px 18px 4px" };
const composer = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 150px", gap: "12px", padding: "18px", borderTop: "1px solid rgba(148,163,184,.12)" };
const messageInput = { width: "100%", resize: "none", outline: "none", background: "rgba(2,6,23,.55)", border: "1px solid rgba(148,163,184,.14)", color: "white", borderRadius: "16px", padding: "14px", lineHeight: "22px" };
const sendButton = { border: "none", borderRadius: "16px", background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)", color: "white", fontWeight: "950", cursor: "pointer" };
const chatEmpty = { minHeight: "260px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#cbd5e1", padding: "26px" };
const chatEmptyIcon = { fontSize: "72px", marginBottom: "14px" };
const emptyBox = { background: "rgba(2,6,23,.35)", border: "1px solid rgba(148,163,184,.12)", borderRadius: "18px", padding: "18px", color: "#cbd5e1", textAlign: "center" };
const miniLink = { display: "inline-block", marginTop: "10px", color: "#7dd3fc", textDecoration: "none", fontWeight: "900" };
const errorBox = { background: "rgba(127,29,29,.24)", border: "1px solid rgba(248,113,113,.30)", color: "#fecaca", padding: "14px 18px", borderRadius: "16px", marginBottom: "16px", fontWeight: "800" };
const successBox = { background: "rgba(34,197,94,.14)", border: "1px solid rgba(34,197,94,.32)", color: "#bbf7d0", padding: "14px 18px", borderRadius: "16px", marginBottom: "16px", fontWeight: "800" };

export default Messages;
