import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import chatService from "../services/chat.service";
import {
  formatUser,
  getOtherParticipant,
  getUnreadCount,
  normalizeSearch,
  safeJson
} from "../utils/message.utils";

export default function useMessages() {
  const location = useLocation();
  const endRef = useRef(null);
  const user = useMemo(() => safeJson(localStorage.getItem("qsm_user")) || safeJson(localStorage.getItem("user")) || {}, []);
  const currentUserId = user?._id || user?.id || user?.userId || "";
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const targetUserId = params.get("sellerId") || params.get("buyerId") || "";
  const orderId = params.get("orderId") || "";
  const productId = params.get("productId") || "";

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [viewer, setViewer] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const clearFile = useCallback(() => {
    setFile(null);
    setPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      setError("");
      const received = await chatService.getConversations();
      const list = Array.isArray(received) ? received : [];
      setConversations(list);

      if (targetUserId) {
        const existing = list.find((conversation) =>
          (conversation?.getOtherParticipant || []).some((getOtherParticipant) => {
            const id = getOtherParticipant?._id || getOtherParticipant?.id || getOtherParticipant?.userId;
            return String(id || "") === String(targetUserId);
          })
        );

        if (existing) setActiveConversation(existing);
        else {
          const created = await chatService.createConversation({ receiverId: targetUserId, orderId: orderId || undefined, productId: productId || undefined });
          setActiveConversation(created);
          setConversations((current) => [created, ...current]);
        }
      } else {
        setActiveConversation((current) => current || list[0] || null);
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "No se pudieron cargar las conversaciones.");
    } finally {
      setLoadingConversations(false);
    }
  }, [targetUserId, orderId, productId]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      setLoadingMessages(true);
      setError("");
      const received = await chatService.getMessages(conversationId);
      setMessages(Array.isArray(received) ? received : []);
      try { await chatService.markRead(conversationId); } catch {}
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "No se pudieron cargar los mensajes.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { loadMessages(activeConversation?._id || activeConversation?.id); }, [activeConversation?._id, activeConversation?.id, loadMessages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const filteredConversations = useMemo(() => {
    const term = normalizeSearch(search);
    return conversations.filter((conversation) => {
      const other = getOtherParticipant(conversation, currentUserId);
      const unread = getUnreadCount(conversation, currentUserId);
      const favorites = Array.isArray(conversation?.favoriteBy) ? conversation.favoriteBy : [];
      const archived = Array.isArray(conversation?.archivedBy) ? conversation.archivedBy : [];
      const hasUser = (list) => list.some((value) => String(value?._id || value?.id || value) === String(currentUserId));
      if (filter === "UNREAD" && unread === 0) return false;
      if (filter === "FAVORITES" && !hasUser(favorites)) return false;
      if (filter === "ARCHIVED" && !hasUser(archived)) return false;
      const searchable = normalizeSearch([formatUser(other, ""), other?.email, conversation?.product?.title, conversation?.lastMessage?.text, ...(conversation?.labels || []).map((label) => label?.name)].filter(Boolean).join(" "));
      return !term || searchable.includes(term);
    });
  }, [conversations, filter, search, currentUserId]);

  const selectFile = (selected) => {
    clearFile();
    if (!selected) return;
    const allowed = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","application/pdf","text/plain","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(selected.type)) return setError("Tipo de archivo no permitido.");
    if (selected.size > 20 * 1024 * 1024) return setError("El archivo supera el límite de 20 MB.");
    setFile(selected);
    if (selected.type.startsWith("image/") || selected.type.startsWith("video/")) setPreview(URL.createObjectURL(selected));
  };

  const sendMessage = async () => {
    const conversationId = activeConversation?._id || activeConversation?.id;
    if (!conversationId) return setError("Selecciona una conversación.");
    if (!text.trim() && !file) return;

    try {
      setSending(true);
      setError("");
      setNotice("");
      let uploaded = null;
      if (file) uploaded = await chatService.upload(file);

      const payload = {
        conversationId,
        text: text.trim(),
        content: text.trim() || file?.name || "Archivo adjunto",
        orderId: activeConversation?.order?._id || activeConversation?.order || orderId || undefined,
        productId: activeConversation?.product?._id || activeConversation?.product || productId || undefined,
        replyTo: replyTo?._id || replyTo?.id || undefined
      };

      if (uploaded) {
        const mime = uploaded?.mimeType || uploaded?.mimetype || file?.type || "";
        const type = mime.startsWith("image/") ? "IMAGE" : mime.startsWith("video/") ? "VIDEO" : mime === "application/pdf" ? "PDF" : "FILE";
        payload.messageType = type === "PDF" ? "FILE" : type;
        payload.attachments = [{
          name: uploaded?.originalName || uploaded?.name || file?.name,
          url: uploaded?.url || uploaded?.path || uploaded?.fileUrl,
          mimeType: mime,
          size: uploaded?.size || file?.size,
          type
        }];
      }

      const created = await chatService.sendMessage(payload);
      setMessages((current) => [...current, created]);
      setText("");
      setReplyTo(null);
      clearFile();
      setNotice("Mensaje enviado.");
      await loadConversations();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  };

  const runConversationAction = async (action) => {
    const id = activeConversation?._id || activeConversation?.id;
    if (!id || !chatService[action]) return;
    try {
      setActionLoading(action);
      await chatService[action](id);
      setNotice("Conversación actualizada.");
      await loadConversations();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "No se pudo actualizar la conversación.");
    } finally { setActionLoading(""); }
  };

  const pinMessage = async (message) => {
    const id = message?._id || message?.id;
    if (!id) return;
    try {
      setActionLoading(`pin-${id}`);
      await chatService.pinMessage(id);
      setNotice("Mensaje fijado.");
      await loadMessages(activeConversation?._id || activeConversation?.id);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "No se pudo fijar el mensaje.");
    } finally { setActionLoading(""); }
  };


  const editMessage = async (message) => {
    const id = message?._id || message?.id;
    if (!id) return;

    const currentText = message?.text || message?.content || "";
    const nextText = window.prompt("Editar mensaje:", currentText);

    if (!nextText || !nextText.trim() || nextText.trim() === currentText.trim()) return;

    try {
      setActionLoading(`edit-${id}`);
      const updated = await chatService.editMessage(id, nextText.trim());
      setMessages((current) => current.map((item) =>
        String(item?._id || item?.id) === String(id) ? updated : item
      ));
      setNotice("Mensaje editado.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "No se pudo editar el mensaje.");
    } finally {
      setActionLoading("");
    }
  };

  const deleteMessage = async (message) => {
    const id = message?._id || message?.id;
    if (!id || !window.confirm("¿Eliminar este mensaje?")) return;
    try {
      setActionLoading(`delete-${id}`);
      await chatService.deleteMessage(id);
      setNotice("Mensaje eliminado.");
      await loadMessages(activeConversation?._id || activeConversation?.id);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "No se pudo eliminar el mensaje.");
    } finally { setActionLoading(""); }
  };

  return {
    currentUserId, endRef, filteredConversations, activeConversation,
    activeOtherUser: activeConversation ? getOtherParticipant(activeConversation, currentUserId) : null,
    messages, filter, setFilter, search, setSearch, text, setText, replyTo, setReplyTo,
    file, preview, viewer, setViewer, loadingConversations, loadingMessages, sending,
    actionLoading, error, notice, loadConversations,
    selectConversation: (conversation) => { setActiveConversation(conversation); setReplyTo(null); clearFile(); setError(""); setNotice(""); },
    selectFile, clearFile, sendMessage, runConversationAction, pinMessage, editMessage, deleteMessage
  };
}
