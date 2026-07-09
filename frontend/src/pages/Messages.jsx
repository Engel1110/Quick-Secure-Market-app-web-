import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

function Messages() {
  const location = useLocation();
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const savedUser =
    safeJson(localStorage.getItem("qsm_user")) ||
    safeJson(localStorage.getItem("user")) ||
    {};

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
  const [quickOpen, setQuickOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const quickMessages = [
    "Hola, ¿sigue disponible?",
    "Me interesa. ¿Podemos continuar dentro de QSM?",
    "¿Cuál es el precio final?",
    "¿Dónde se puede entregar dentro de QSM?",
    "¿El producto tiene garantía?",
    "Estoy interesado, pero quiero mantener la compra dentro de QSM."
  ];

  const emojis = ["😀", "😂", "😍", "👍", "🙏", "🔥", "✅", "👀", "💯", "📦", "🛡️", "💬"];


  const getMessageConversationId = (message) => {
    const conversation = message?.conversation;
    if (!conversation) return "";
    return conversation._id || conversation.id || conversation;
  };

  const getMessageSenderId = (message) => {
    const sender = message?.sender;
    if (!sender) return "";
    return sender._id || sender.id || sender;
  };

  const getConversationLastText = (message) => {
    if (message?.deletedForEveryone) return "Mensaje eliminado";
    if (message?.isFlagged || message?.status === "BLOCKED") return "Mensaje bloqueado por seguridad";
    return message?.text || message?.content || message?.attachments?.[0]?.name || message?.attachments?.[0]?.url || "Archivo adjunto";
  };

  const refreshConversationPreview = (message) => {
    const conversationId = getMessageConversationId(message);
    if (!conversationId) return;

    setConversations((prev) =>
      prev.map((conversation) =>
        String(conversation._id) === String(conversationId)
          ? {
              ...conversation,
              lastMessage: {
                text: getConversationLastText(message),
                sender: message.sender,
                createdAt: message.createdAt || new Date().toISOString()
              }
            }
          : conversation
      )
    );
  };

  const upsertMessage = (incomingMessage) => {
    if (!incomingMessage?._id) return;

    setMessages((prev) => {
      const exists = prev.some((message) => String(message._id) === String(incomingMessage._id));
      if (exists) {
        return prev.map((message) =>
          String(message._id) === String(incomingMessage._id) ? incomingMessage : message
        );
      }
      return [...prev, incomingMessage];
    });

    refreshConversationPreview(incomingMessage);
  };

  const startReply = (message) => {
    if (!message || message.deletedForEveryone || message.status === "BLOCKED") return;

    setReplyingTo(message);
    setOpenMenuId(null);
    setEmojiOpen(false);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  useEffect(() => {
    const socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
      withCredentials: true
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("QSM Socket conectado:", socket.id);
    });

    socket.on("newMessage", (incomingMessage) => {
      const incomingSenderId = getMessageSenderId(incomingMessage);
      if (String(incomingSenderId) !== String(currentUserId)) {
        upsertMessage(incomingMessage);
      }
    });

    socket.on("messageUpdated", (updatedMessage) => {
      upsertMessage(updatedMessage);
    });

    socket.on("typing", ({ userId }) => {
      if (String(userId) !== String(currentUserId)) {
        setTypingUser(userId);
      }
    });

    socket.on("stopTyping", ({ userId }) => {
      if (String(userId) !== String(currentUserId)) {
        setTypingUser(null);
      }
    });

    socket.on("connect_error", () => {
      console.warn("Socket.IO no conectado. El chat seguirá funcionando por API.");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversation?._id) loadMessages(activeConversation._id);
  }, [activeConversation?._id]);


  useEffect(() => {
    const socket = socketRef.current;
    const conversationId = activeConversation?._id;

    if (!socket || !conversationId) return;

    socket.emit("joinConversation", conversationId);

    return () => {
      socket.emit("leaveConversation", conversationId);
      setTypingUser(null);
    };
  }, [activeConversation?._id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview);
      }
    };
  }, [attachmentPreview]);

  const useQuickMessage = (message) => {
    setText(message);
    setQuickOpen(false);
  };

  const getMessageTypeFromFile = (file) => {
    if (!file?.type) return "TEXT";
    if (file.type.startsWith("image/")) return "IMAGE";
    if (file.type.startsWith("video/")) return "VIDEO";
    if (file.type.startsWith("audio/")) return "AUDIO";
    return "TEXT";
  };

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const maxSize = 25 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("El archivo no puede superar los 25 MB.");
      event.target.value = "";
      return;
    }

    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
    }

    setSelectedFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
    setError("");
    setNotice("");
    event.target.value = "";
  };

  const clearSelectedFile = () => {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
    }

    setSelectedFile(null);
    setAttachmentPreview("");
  };

  const uploadChatFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/upload/chat", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    return response.data.file;
  };


  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      setError("");

      const response = await api.get("/messages/conversations");
      const list =
        response.data.conversations ||
        response.data.data ||
        response.data ||
        [];

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

      const conversation =
        response.data.conversation || response.data.data || response.data;

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

    if (!text.trim() && !selectedFile) return;

    if (!activeConversation?._id) {
      setError("Selecciona una conversación antes de enviar.");
      return;
    }

    try {
      setSending(true);
      setUploading(Boolean(selectedFile));
      setError("");
      setNotice("");

      let uploadedFile = null;

      if (selectedFile) {
        uploadedFile = await uploadChatFile(selectedFile);
      }

      const messageType = uploadedFile
        ? getMessageTypeFromFile(selectedFile)
        : "TEXT";

      const finalText =
        text.trim() ||
        (uploadedFile
          ? `Archivo adjunto: ${uploadedFile.originalName || uploadedFile.filename}`
          : "");

      const response = await api.post("/messages", {
        conversationId: activeConversation._id,
        text: finalText,
        messageType,
        attachments: uploadedFile ? [uploadedFile] : [],
        replyTo: replyingTo?._id || undefined,
        orderId:
          activeConversation.order?._id ||
          activeConversation.order ||
          orderId ||
          undefined,
        productId:
          activeConversation.product?._id ||
          activeConversation.product ||
          productId ||
          undefined
      });

      const newMessage = response.data.message || response.data.data || response.data;

      upsertMessage(newMessage);
      setText("");
      setReplyingTo(null);
      socketRef.current?.emit("stopTyping", { conversationId: activeConversation._id, userId: currentUserId });
      clearSelectedFile();

      if (newMessage.isFlagged || newMessage.status === "BLOCKED") {
        setNotice("QSM AI bloqueó un mensaje riesgoso.");
      } else {
        setNotice(uploadedFile ? "Archivo enviado." : "Mensaje enviado.");
      }

      await loadConversations();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo enviar el mensaje o subir el archivo."
      );
    } finally {
      setSending(false);
      setUploading(false);
    }
  };


  const editMessage = async (messageId, oldText) => {
    const newText = window.prompt("Editar mensaje:", oldText || "");

    if (!newText || !newText.trim()) return;

    try {
      setError("");
      setNotice("");

      const response = await api.patch(`/messages/${messageId}`, {
        text: newText.trim()
      });

      const updatedMessage = response.data.message || response.data.data || response.data;

      setMessages((prev) =>
        prev.map((message) =>
          message._id === messageId ? updatedMessage : message
        )
      );

      setOpenMenuId(null);
      setNotice("Mensaje editado.");
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo editar el mensaje.");
    }
  };

  const deleteMessage = async (messageId) => {
    const confirmDelete = window.confirm("¿Seguro que deseas eliminar este mensaje para todos?");

    if (!confirmDelete) return;

    try {
      setError("");
      setNotice("");

      const response = await api.delete(`/messages/${messageId}`);
      const deletedMessage = response.data.message || response.data.data || response.data;

      setMessages((prev) =>
        prev.map((message) =>
          message._id === messageId ? deletedMessage : message
        )
      );

      setOpenMenuId(null);
      setNotice("Mensaje eliminado.");
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo eliminar el mensaje.");
    }
  };

  const appendEmoji = (emoji) => {
    setText((prev) => `${prev}${emoji}`);
    setEmojiOpen(false);
  };


  const handleTypingChange = (event) => {
    const value = event.target.value;
    setText(value);

    const socket = socketRef.current;
    const conversationId = activeConversation?._id;

    if (!socket || !conversationId) return;

    socket.emit("typing", {
      conversationId,
      userId: currentUserId
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", {
        conversationId,
        userId: currentUserId
      });
    }, 900);
  };

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;

    const term = search.toLowerCase();

    return conversations.filter((conversation) => {
      const other = getOtherParticipant(conversation, currentUserId);
      const productTitle =
        conversation.product?.title ||
        conversation.product?.name ||
        conversation.productTitle ||
        "";

      return `${other.firstName || ""} ${other.lastName || ""} ${
        other.email || ""
      } ${productTitle}`
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
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main className="main-content" style={main}>
          <Topbar />

          <section style={hero}>
            <div>
              <p style={label}>MENSAJES QSM</p>
              <h1 style={title}>Centro de mensajes</h1>
              <p style={subtitle}>
                Comunícate con compradores y vendedores de forma segura. Cada
                conversación puede quedar asociada a una orden o producto.
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

                <button onClick={loadConversations} style={smallButton}>
                  Actualizar
                </button>
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
                    <p>
                      Cuando contactes un vendedor o comprador, aparecerá aquí.
                    </p>
                    <Link to="/marketplace" style={miniLink}>
                      Ir al Marketplace
                    </Link>
                  </div>
                )}

                {!loadingConversations &&
                  filteredConversations.map((conversation) => (
                    <button
                      key={conversation._id}
                      onClick={() => setActiveConversation(conversation)}
                      style={
                        activeConversation?._id === conversation._id
                          ? activeConversationCard
                          : conversationCard
                      }
                    >
                      <div style={conversationAvatar}>
                        {getInitial(
                          getOtherParticipant(conversation, currentUserId)
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong style={conversationName}>
                          {formatUser(
                            getOtherParticipant(conversation, currentUserId),
                            "Usuario QSM"
                          )}
                        </strong>

                        <p style={conversationPreview}>
                          {conversation.lastMessage?.text ||
                            conversation.product?.title ||
                            conversation.product?.name ||
                            "Nueva conversación"}
                        </p>
                      </div>

                      {conversation.unreadCount > 0 && (
                        <span style={unreadBadge}>
                          {conversation.unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            </aside>

            <section style={chatPanel}>
              {!activeConversation && (
                <div style={chatEmpty}>
                  <div style={chatEmptyIcon}>💬</div>
                  <h2>Selecciona una conversación</h2>
                  <p>
                    Desde aquí podrás escribir, revisar historial y ver datos de
                    la orden asociada.
                  </p>
                </div>
              )}

              {activeConversation && (
                <>
                  <header className="message-header" style={chatHeader}>
                    <div style={chatUser}>
                      <div style={chatAvatar}>{getInitial(activeOtherUser)}</div>

                      <div>
                        <h2>{formatUser(activeOtherUser, "Usuario QSM")}</h2>
                        <p>
                          {activeConversation.product?.title ||
                            activeConversation.product?.name ||
                            activeConversation.productTitle ||
                            "Conversación QSM"}
                        </p>
                      </div>
                    </div>

                    <div style={chatActions}>
                      {activeConversation.product?._id && (
                        <Link
                          to={`/product/${activeConversation.product._id}`}
                          style={outlineButton}
                        >
                          Ver producto
                        </Link>
                      )}

                      {(activeConversation.order?._id ||
                        activeConversation.order) && (
                        <Link
                          to={`/orders/${
                            activeConversation.order?._id ||
                            activeConversation.order
                          }`}
                          style={outlineButton}
                        >
                          Ver orden
                        </Link>
                      )}
                    </div>
                  </header>

                  <div style={securityBanner}>
                    <strong>🛡 Recomendación QSM:</strong>
                    <span>
                      No compartas claves, códigos bancarios ni información
                      sensible. Mantén la operación dentro de QSM.
                    </span>
                  </div>

                  <div style={messagesBox}>
                    {loadingMessages && (
                      <div style={chatEmpty}>
                        <p>Cargando mensajes...</p>
                      </div>
                    )}

                    {!loadingMessages && messages.length === 0 && (
                      <div style={chatEmpty}>
                        <h3>Aún no hay mensajes</h3>
                        <p>
                          Escribe el primer mensaje para iniciar la conversación.
                        </p>
                      </div>
                    )}

                    {!loadingMessages &&
                      messages.map((message, index) => {
                        const senderId =
                          message.sender?._id ||
                          message.sender?.id ||
                          message.sender ||
                          message.senderId;

                        const mine =
                          String(senderId || "") === String(currentUserId);

                        const blocked =
                          message.isFlagged || message.status === "BLOCKED";

                        const messageText =
                          message.text || message.content || message.body || "";

                        const deleted = message.deletedForEveryone;

                        return (
                          <div
                            key={message._id || index}
                            style={mine ? myMessageRow : otherMessageRow}
                          >
                            {!mine && <div style={smallAvatar}>{getInitial(message.sender)}</div>}

                            <div style={messageGroup}>
                              <div
                                style={
                                  deleted
                                    ? deletedBubble
                                    : blocked
                                    ? blockedBubble
                                    : mine
                                    ? myBubble
                                    : otherBubble
                                }
                              >
                                {deleted ? (
                                  <p style={bubbleText}>🗑 Mensaje eliminado</p>
                                ) : blocked ? (
                                  <>
                                    <strong style={blockedTitle}>
                                      🛡 Mensaje bloqueado por QSM AI
                                    </strong>

                                    <p style={bubbleText}>
                                      {message.aiReason ||
                                        "Este mensaje fue marcado como riesgoso."}
                                    </p>

                                    <small style={blockedMeta}>
                                      Riesgo: {message.riskLevel || "HIGH"}
                                    </small>
                                  </>
                                ) : (
                                  <>
                                    {message.replyTo && (
                                      <div style={quotedReplyBox}>
                                        <strong style={quotedReplyAuthor}>
                                          ↩ {formatUser(message.replyTo.sender, "Mensaje citado")}
                                        </strong>
                                        <p style={quotedReplyText}>{getMessagePlainText(message.replyTo)}</p>
                                      </div>
                                    )}

                                    {messageText && <p style={bubbleText}>{messageText}</p>}
                                    {Array.isArray(message.attachments) &&
                                      message.attachments.length > 0 &&
                                      message.attachments.map((attachment, attachmentIndex) =>
                                        renderAttachment(attachment, message.messageType, attachmentIndex)
                                      )}
                                  </>
                                )}

                                <div style={messageMetaRow}>
                                  {message.isEdited && !deleted && (
                                    <span style={editedText}>Editado</span>
                                  )}
                                  <span>{formatTime(message.createdAt)}</span>
                                </div>
                              </div>

                              {!deleted && !blocked && (
                                <div style={messageMenuWrapper}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenMenuId(openMenuId === message._id ? null : message._id)
                                    }
                                    style={messageMenuButton}
                                  >
                                    ⋮
                                  </button>

                                  {openMenuId === message._id && (
                                    <div style={messageMenu}>
                                      <button
                                        type="button"
                                        onClick={() => startReply(message)}
                                        style={menuOption}
                                      >
                                        ↩ Responder
                                      </button>

                                      {mine && (
                                        <button
                                          type="button"
                                          onClick={() => editMessage(message._id, messageText)}
                                          style={menuOption}
                                        >
                                          ✏️ Editar
                                        </button>
                                      )}

                                      {mine && (
                                        <button
                                          type="button"
                                          onClick={() => deleteMessage(message._id)}
                                          style={menuDangerOption}
                                        >
                                          🗑 Eliminar para todos
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {typingUser && (
                      <div style={typingIndicator}>Escribiendo...</div>
                    )}

                    <div ref={endRef} />
                  </div>

                  <form className="composer" onSubmit={sendMessage} style={composer}>
                    <div style={composerTools}>
                      <button
                        type="button"
                        onClick={() => setEmojiOpen(!emojiOpen)}
                        style={toolButton}
                        title="Emojis"
                      >
                        😀
                      </button>

                      <button
                        type="button"
                        style={toolButton}
                        title="Adjuntar archivo"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        📎
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,audio/*,.pdf"
                        onChange={handleFileSelected}
                        style={{ display: "none" }}
                      />

                      <button type="button" style={toolButton} title="Nota de voz próximamente">
                        🎙️
                      </button>
                    </div>

                    {replyingTo && (
                      <div style={replyPreviewCard}>
                        <div style={replyPreviewContent}>
                          <strong style={replyPreviewTitle}>
                            ↩ Respondiendo a {formatUser(replyingTo.sender, "Usuario QSM")}
                          </strong>
                          <p style={replyPreviewText}>{getMessagePlainText(replyingTo)}</p>
                        </div>

                        <button
                          type="button"
                          onClick={cancelReply}
                          style={replyCloseButton}
                          title="Cancelar respuesta"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {selectedFile && (
                      <div style={selectedFileCard}>
                        <div style={selectedFilePreview}>
                          {selectedFile.type.startsWith("image/") ? (
                            <img
                              src={attachmentPreview}
                              alt="Vista previa"
                              style={selectedFileImage}
                            />
                          ) : selectedFile.type.startsWith("video/") ? (
                            <video src={attachmentPreview} style={selectedFileVideo} controls />
                          ) : selectedFile.type.startsWith("audio/") ? (
                            <span style={selectedFileIcon}>🎵</span>
                          ) : (
                            <span style={selectedFileIcon}>📄</span>
                          )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <strong style={selectedFileName}>{selectedFile.name}</strong>
                          <p style={selectedFileSize}>{formatFileSize(selectedFile.size)}</p>
                        </div>

                        <button
                          type="button"
                          onClick={clearSelectedFile}
                          style={removeFileButton}
                          title="Quitar archivo"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div style={inputWrapper}>
                      {emojiOpen && (
                        <div style={emojiPanel}>
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => appendEmoji(emoji)}
                              style={emojiButton}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      <textarea
                        value={text}
                        onChange={handleTypingChange}
                        placeholder="Escribe un mensaje seguro..."
                        style={messageInput}
                        rows={2}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sending || (!text.trim() && !selectedFile)}
                      style={sendButton}
                    >
                      {uploading ? "Subiendo..." : sending ? "Enviando..." : "Enviar →"}
                    </button>
                  </form>
                </>
              )}
            </section>
          </section>
        </main>
      </div>

      <div style={quickBubbleWrapper}>
        {quickOpen && (
          <div style={quickPanel}>
            <strong>Mensajes rápidos</strong>

            {quickMessages.map((message, index) => (
              <button
                key={index}
                type="button"
                onClick={() => useQuickMessage(message)}
                style={quickMessageButton}
              >
                {message}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setQuickOpen(!quickOpen)}
          style={quickBubbleButton}
        >
          💬
        </button>
      </div>

      <AiAssistant pageContext="messages" />
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

function getMessagePlainText(message) {
  if (!message) return "Mensaje";
  if (message.deletedForEveryone) return "Mensaje eliminado";
  if (message.isFlagged || message.status === "BLOCKED") {
    return message.aiReason || "Mensaje bloqueado por QSM AI";
  }

  return (
    message.text ||
    message.content ||
    message.body ||
    message.attachments?.[0]?.name ||
    message.attachments?.[0]?.originalName ||
    message.attachments?.[0]?.url ||
    "Archivo adjunto"
  );
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

function getAssetUrl(path) {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  return `http://localhost:5000${path}`;
}

function getFileName(path) {
  return String(path || "").split("/").pop() || "archivo";
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${sizes[index]}`;
}

function renderAttachment(attachment, messageType, index) {
  const rawUrl = typeof attachment === "string" ? attachment : attachment?.url;
  const url = getAssetUrl(rawUrl);
  const name = typeof attachment === "string" ? getFileName(attachment) : attachment?.name || attachment?.originalName || getFileName(rawUrl);
  const mimeType = typeof attachment === "string" ? "" : attachment?.mimeType || "";
  const attachmentType = typeof attachment === "string" ? "" : attachment?.type || "";
  const type = String(attachmentType || messageType || "").toUpperCase();

  if (type === "IMAGE" || mimeType.startsWith("image/")) {
    return (
      <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" style={attachmentImageLink}>
        <img src={url} alt={name} style={attachmentImage} />
      </a>
    );
  }

  if (type === "VIDEO" || mimeType.startsWith("video/")) {
    return (
      <video key={`${url}-${index}`} src={url} controls style={attachmentVideo} />
    );
  }

  if (type === "AUDIO" || mimeType.startsWith("audio/")) {
    return (
      <audio key={`${url}-${index}`} src={url} controls style={attachmentAudio} />
    );
  }

  return (
    <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" style={attachmentFile}>
      <span style={attachmentFileIcon}>📄</span>
      <span style={attachmentFileName}>{name}</span>
      <span style={attachmentOpen}>Abrir</span>
    </a>
  );
}

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(139,92,246,.16), transparent 34%), radial-gradient(circle at 18% 15%, rgba(56,189,248,.09), transparent 28%), #020617",
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
  padding: "18px 26px 24px",
  overflowX: "hidden"
};

const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  margin: "12px 0 18px"
};

const label = {
  color: "#38bdf8",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  margin: 0
};

const title = {
  fontSize: "clamp(32px, 2.7vw, 46px)",
  lineHeight: "1",
  margin: "8px 0",
  letterSpacing: "-1.4px"
};

const subtitle = {
  color: "#cbd5e1",
  lineHeight: "25px",
  maxWidth: "690px",
  margin: 0
};

const heroBadge = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  minWidth: "280px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.18)",
  borderRadius: "22px",
  padding: "18px"
};

const messagesLayout = {
  display: "grid",
  gridTemplateColumns: "360px minmax(0, 1fr)",
  gap: "18px",
  height: "calc(100vh - 235px)",
  minHeight: "610px"
};

const conversationPanel = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "22px",
  padding: "16px",
  overflow: "hidden",
  height: "100%",
  display: "flex",
  flexDirection: "column"
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  marginBottom: "16px"
};

const smallButton = {
  background: "rgba(56,189,248,.12)",
  border: "1px solid rgba(56,189,248,.26)",
  color: "#7dd3fc",
  borderRadius: "12px",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: "900"
};

const searchBox = {
  height: "52px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "rgba(2,6,23,.45)",
  border: "1px solid rgba(148,163,184,.14)",
  borderRadius: "15px",
  padding: "0 14px",
  marginBottom: "14px"
};

const searchInput = {
  flex: 1,
  height: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "white"
};

const conversationList = {
  display: "grid",
  gap: "10px",
  overflowY: "auto",
  paddingRight: "4px"
};

const conversationCard = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  textAlign: "left",
  background: "rgba(2,6,23,.35)",
  border: "1px solid rgba(148,163,184,.12)",
  color: "white",
  borderRadius: "18px",
  padding: "13px",
  cursor: "pointer"
};

const activeConversationCard = {
  ...conversationCard,
  background: "linear-gradient(135deg, rgba(56,189,248,.18), rgba(139,92,246,.20))",
  border: "1px solid rgba(56,189,248,.38)"
};

const conversationAvatar = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950",
  flexShrink: 0
};

const conversationName = {
  display: "block",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const conversationPreview = {
  margin: "4px 0 0",
  color: "#94a3b8",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const unreadBadge = {
  minWidth: "24px",
  height: "24px",
  borderRadius: "999px",
  background: "#ef4444",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "950"
};

const chatPanel = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "22px",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  height: "100%"
};

const chatHeader = {
  padding: "16px 18px",
  borderBottom: "1px solid rgba(148,163,184,.12)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexShrink: 0
};

const chatUser = {
  display: "flex",
  alignItems: "center",
  gap: "14px"
};

const chatAvatar = {
  width: "56px",
  height: "56px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, #35d0c3, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950",
  fontSize: "22px"
};

const chatActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap"
};

const outlineButton = {
  color: "#7dd3fc",
  textDecoration: "none",
  border: "1px solid rgba(56,189,248,.26)",
  padding: "10px 13px",
  borderRadius: "12px",
  fontWeight: "900"
};

const securityBanner = {
  margin: "12px 18px 0",
  padding: "11px 14px",
  borderRadius: "14px",
  background: "rgba(53,208,195,.10)",
  border: "1px solid rgba(53,208,195,.25)",
  color: "#cbd5e1",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  flexShrink: 0
};

const messagesBox = {
  flex: 1,
  minHeight: 0,
  padding: "18px 20px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  textAlign: "left"
};

const myMessageRow = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  width: "100%"
};

const otherMessageRow = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "flex-end",
  gap: "8px",
  width: "100%"
};

const myBubble = {
  maxWidth: "520px",
  width: "fit-content",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  color: "white",
  padding: "10px 13px",
  borderRadius: "17px 17px 5px 17px",
  textAlign: "left",
  overflowWrap: "break-word",
  flexShrink: 0
};

const otherBubble = {
  maxWidth: "520px",
  width: "fit-content",
  background: "rgba(2,6,23,.55)",
  border: "1px solid rgba(148,163,184,.12)",
  color: "white",
  padding: "10px 13px",
  borderRadius: "17px 17px 17px 5px",
  textAlign: "left",
  overflowWrap: "break-word",
  flexShrink: 0
};

const blockedBubble = {
  maxWidth: "520px",
  width: "fit-content",
  background: "rgba(127,29,29,.35)",
  border: "1px solid rgba(248,113,113,.45)",
  color: "white",
  padding: "12px 14px",
  borderRadius: "17px",
  textAlign: "left",
  overflowWrap: "break-word",
  flexShrink: 0
};

const deletedBubble = {
  maxWidth: "420px",
  width: "fit-content",
  background: "rgba(71,85,105,.20)",
  border: "1px dashed rgba(148,163,184,.32)",
  color: "#cbd5e1",
  padding: "10px 13px",
  borderRadius: "17px",
  textAlign: "left",
  fontStyle: "italic",
  flexShrink: 0
};

const messageGroup = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  maxWidth: "78%",
  width: "fit-content",
  minWidth: 0
};

const bubbleText = {
  margin: 0,
  lineHeight: "20px",
  textAlign: "left",
  whiteSpace: "pre-wrap"
};

const blockedTitle = {
  color: "#fecaca",
  display: "block",
  textAlign: "left",
  marginBottom: "8px"
};

const blockedMeta = {
  color: "#fca5a5",
  fontWeight: "800",
  display: "block",
  textAlign: "left",
  marginTop: "8px"
};

const messageMetaRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "8px",
  marginTop: "5px",
  color: "rgba(255,255,255,.74)",
  fontSize: "11px",
  fontWeight: "700",
  whiteSpace: "nowrap"
};

const quotedReplyBox = {
  marginBottom: "8px",
  padding: "8px 10px",
  borderLeft: "3px solid rgba(255,255,255,.72)",
  background: "rgba(2,6,23,.26)",
  borderRadius: "10px",
  maxWidth: "100%"
};

const quotedReplyAuthor = {
  display: "block",
  color: "#e0f2fe",
  fontSize: "12px",
  marginBottom: "3px"
};

const quotedReplyText = {
  margin: 0,
  color: "rgba(255,255,255,.78)",
  fontSize: "12px",
  lineHeight: "17px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical"
};

const editedText = {
  opacity: 0.78,
  fontStyle: "italic"
};

const smallAvatar = {
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950",
  flexShrink: 0
};

const messageMenuWrapper = {
  position: "relative",
  display: "flex",
  alignItems: "center"
};

const messageMenuButton = {
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  border: "1px solid rgba(148,163,184,.16)",
  background: "rgba(15,23,42,.70)",
  color: "#cbd5e1",
  cursor: "pointer",
  fontWeight: "950"
};

const messageMenu = {
  position: "absolute",
  right: "0",
  bottom: "34px",
  width: "185px",
  background: "rgba(15,23,42,.98)",
  border: "1px solid rgba(56,189,248,.22)",
  borderRadius: "16px",
  padding: "8px",
  display: "grid",
  gap: "6px",
  zIndex: 50,
  boxShadow: "0 20px 50px rgba(0,0,0,.45)"
};

const menuOption = {
  width: "100%",
  border: "none",
  background: "rgba(2,6,23,.55)",
  color: "#e5e7eb",
  padding: "10px 12px",
  borderRadius: "11px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: "850"
};

const menuDangerOption = {
  ...menuOption,
  color: "#fecaca",
  background: "rgba(127,29,29,.24)"
};

const composer = {
  display: "grid",
  gridTemplateColumns: "128px minmax(0, 1fr) 140px",
  gap: "10px",
  padding: "14px 18px",
  borderTop: "1px solid rgba(148,163,184,.12)",
  alignItems: "center",
  flexShrink: 0
};

const composerTools = {
  display: "flex",
  gap: "8px",
  alignItems: "center"
};

const toolButton = {
  width: "38px",
  height: "38px",
  borderRadius: "12px",
  border: "1px solid rgba(148,163,184,.16)",
  background: "rgba(2,6,23,.55)",
  color: "white",
  cursor: "pointer",
  fontSize: "18px"
};

const inputWrapper = {
  position: "relative",
  minWidth: 0
};

const emojiPanel = {
  position: "absolute",
  left: 0,
  bottom: "68px",
  width: "280px",
  background: "rgba(15,23,42,.98)",
  border: "1px solid rgba(56,189,248,.22)",
  borderRadius: "18px",
  padding: "12px",
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: "8px",
  zIndex: 60,
  boxShadow: "0 20px 50px rgba(0,0,0,.45)"
};

const emojiButton = {
  border: "none",
  background: "rgba(2,6,23,.55)",
  borderRadius: "10px",
  height: "34px",
  cursor: "pointer",
  fontSize: "18px"
};

const messageInput = {
  width: "100%",
  resize: "none",
  outline: "none",
  background: "rgba(2,6,23,.55)",
  border: "1px solid rgba(148,163,184,.14)",
  color: "white",
  borderRadius: "16px",
  padding: "14px",
  lineHeight: "22px"
};

const sendButton = {
  border: "none",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  fontWeight: "950",
  cursor: "pointer"
};

const chatEmpty = {
  minHeight: "260px",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  color: "#cbd5e1",
  padding: "26px"
};

const chatEmptyIcon = {
  fontSize: "72px",
  marginBottom: "14px"
};

const emptyBox = {
  background: "rgba(2,6,23,.35)",
  border: "1px solid rgba(148,163,184,.12)",
  borderRadius: "18px",
  padding: "18px",
  color: "#cbd5e1",
  textAlign: "center"
};

const miniLink = {
  display: "inline-block",
  marginTop: "10px",
  color: "#7dd3fc",
  textDecoration: "none",
  fontWeight: "900"
};

const errorBox = {
  background: "rgba(127,29,29,.24)",
  border: "1px solid rgba(248,113,113,.30)",
  color: "#fecaca",
  padding: "14px 18px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontWeight: "800"
};

const successBox = {
  background: "rgba(34,197,94,.14)",
  border: "1px solid rgba(34,197,94,.32)",
  color: "#bbf7d0",
  padding: "14px 18px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontWeight: "800"
};

const quickBubbleWrapper = {
  position: "fixed",
  right: "28px",
  bottom: "92px",
  zIndex: 9999
};

const quickBubbleButton = {
  width: "58px",
  height: "58px",
  borderRadius: "50%",
  border: "none",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  fontSize: "24px",
  cursor: "pointer",
  boxShadow: "0 0 28px rgba(56,189,248,.45)"
};

const quickPanel = {
  width: "310px",
  marginBottom: "14px",
  background: "rgba(15,23,42,.96)",
  border: "1px solid rgba(56,189,248,.25)",
  borderRadius: "22px",
  padding: "16px",
  display: "grid",
  gap: "10px",
  boxShadow: "0 20px 60px rgba(0,0,0,.45)"
};

const quickMessageButton = {
  textAlign: "left",
  background: "rgba(2,6,23,.65)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "#e5e7eb",
  padding: "11px 13px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "800"
};


const typingIndicator = {
  alignSelf: "flex-start",
  background: "rgba(2,6,23,.55)",
  border: "1px solid rgba(148,163,184,.12)",
  color: "#94a3b8",
  padding: "8px 12px",
  borderRadius: "14px",
  fontSize: "13px",
  fontWeight: "800"
};


const attachmentImageLink = {
  display: "block",
  marginTop: "8px",
  width: "min(260px, 100%)",
  borderRadius: "14px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,.18)"
};

const attachmentImage = {
  display: "block",
  width: "100%",
  maxHeight: "260px",
  objectFit: "cover"
};

const attachmentVideo = {
  display: "block",
  marginTop: "8px",
  width: "min(320px, 100%)",
  maxHeight: "260px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,.18)"
};

const attachmentAudio = {
  display: "block",
  marginTop: "8px",
  width: "min(320px, 100%)"
};

const attachmentFile = {
  marginTop: "8px",
  display: "grid",
  gridTemplateColumns: "34px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: "14px",
  background: "rgba(2,6,23,.42)",
  border: "1px solid rgba(148,163,184,.18)",
  color: "white",
  textDecoration: "none"
};

const attachmentFileIcon = {
  fontSize: "22px"
};

const attachmentFileName = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: "850"
};

const attachmentOpen = {
  color: "#7dd3fc",
  fontSize: "12px",
  fontWeight: "950"
};

const replyPreviewCard = {
  gridColumn: "2 / 3",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 34px",
  alignItems: "center",
  gap: "10px",
  background: "rgba(56,189,248,.10)",
  border: "1px solid rgba(56,189,248,.24)",
  borderLeft: "4px solid #38bdf8",
  borderRadius: "16px",
  padding: "10px 12px"
};

const replyPreviewContent = {
  minWidth: 0
};

const replyPreviewTitle = {
  display: "block",
  color: "#7dd3fc",
  fontSize: "12px",
  fontWeight: "950",
  marginBottom: "3px"
};

const replyPreviewText = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "12px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const replyCloseButton = {
  width: "30px",
  height: "30px",
  borderRadius: "10px",
  border: "1px solid rgba(148,163,184,.18)",
  background: "rgba(2,6,23,.45)",
  color: "#e5e7eb",
  cursor: "pointer",
  fontWeight: "950"
};

const selectedFileCard = {
  gridColumn: "2 / 3",
  display: "grid",
  gridTemplateColumns: "52px minmax(0, 1fr) 34px",
  alignItems: "center",
  gap: "10px",
  background: "rgba(2,6,23,.58)",
  border: "1px solid rgba(56,189,248,.20)",
  borderRadius: "16px",
  padding: "8px 10px"
};

const selectedFilePreview = {
  width: "52px",
  height: "52px",
  borderRadius: "12px",
  background: "rgba(15,23,42,.80)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden"
};

const selectedFileImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const selectedFileVideo = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const selectedFileIcon = {
  fontSize: "24px"
};

const selectedFileName = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "white",
  fontSize: "13px"
};

const selectedFileSize = {
  margin: "3px 0 0",
  color: "#94a3b8",
  fontSize: "12px"
};

const removeFileButton = {
  width: "30px",
  height: "30px",
  borderRadius: "10px",
  border: "1px solid rgba(248,113,113,.24)",
  background: "rgba(127,29,29,.22)",
  color: "#fecaca",
  cursor: "pointer",
  fontWeight: "950"
};


export default Messages;