import { useEffect, useRef, useState } from "react";
import {
  connectSocket,
  emitMessageRead,
  emitStopTyping,
  emitTyping,
  joinConversation,
  leaveConversation
} from "../services/socket.service";

export default function useSocket({
  activeConversationId,
  onIncomingMessage,
  onMessageUpdated,
  onMessageDeleted,
  onConversationUpdated,
  onPresenceChanged,
  onTypingChanged
}) {
  const [connected, setConnected] = useState(false);
  const typingTimer = useRef(null);

  useEffect(() => {
    const socket = connectSocket();

    const handlers = {
      connect: () => setConnected(true),
      disconnect: () => setConnected(false),
      "message:new": (payload) => onIncomingMessage?.(payload?.message || payload),
      "message:updated": (payload) => onMessageUpdated?.(payload?.message || payload),
      "message:deleted": (payload) => onMessageDeleted?.(payload?.messageId || payload),
      "conversation:updated": (payload) => onConversationUpdated?.(payload?.conversation || payload),
      "presence:changed": (payload) => onPresenceChanged?.(payload),
      "conversation:typing": (payload) => onTypingChanged?.({ ...payload, typing: true }),
      "conversation:stop-typing": (payload) => onTypingChanged?.({ ...payload, typing: false })
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    setConnected(socket.connected);

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [onIncomingMessage, onMessageUpdated, onMessageDeleted, onConversationUpdated, onPresenceChanged, onTypingChanged]);

  useEffect(() => {
    if (!activeConversationId) return;
    joinConversation(activeConversationId);
    return () => leaveConversation(activeConversationId);
  }, [activeConversationId]);

  const notifyTyping = () => {
    if (!activeConversationId) return;
    emitTyping(activeConversationId);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitStopTyping(activeConversationId), 1200);
  };

  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (activeConversationId) emitStopTyping(activeConversationId);
  };

  const markReadRealtime = (messageIds = []) => {
    if (activeConversationId) emitMessageRead(activeConversationId, messageIds);
  };

  return { connected, notifyTyping, stopTyping, markReadRealtime };
}
