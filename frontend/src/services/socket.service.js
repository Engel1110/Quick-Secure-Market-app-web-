import { io } from "socket.io-client";

/**
 * =========================================================
 * QSM — SERVICIO GLOBAL Y ÚNICO DE SOCKET.IO
 * =========================================================
 *
 * Este archivo administra una sola conexión Socket.IO para:
 *
 * - Mensajes
 * - Disputas
 * - Dashboard
 * - Notificaciones
 * - Pedidos
 * - BackOffice
 *
 * No debes crear otra instancia de io() en ningún otro archivo.
 */

let socket = null;

/**
 * Tiempo máximo para esperar una confirmación del servidor.
 */
const ACK_TIMEOUT = 10000;

/**
 * Obtiene la URL base de Socket.IO.
 *
 * Prioridad:
 * 1. VITE_SOCKET_URL
 * 2. VITE_API_URL eliminando /api
 * 3. localhost
 */
const getSocketUrl = () => {
  const socketUrl = import.meta.env.VITE_SOCKET_URL;

  if (socketUrl) {
    return String(socketUrl).replace(/\/+$/, "");
  }

  const apiUrl =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

  return String(apiUrl)
    .replace(/\/api\/?$/, "")
    .replace(/\/+$/, "");
};

/**
 * Busca el token en las ubicaciones utilizadas por QSM.
 */
export const getStoredToken = () => {
  return (
    localStorage.getItem("qsm_token") ||
    sessionStorage.getItem("qsm_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
};

/**
 * Devuelve la instancia actual.
 */
export const getSocket = () => {
  return socket;
};

/**
 * Indica si el socket está conectado.
 */
export const isSocketConnected = () => {
  return Boolean(socket?.connected);
};

/**
 * Registra los eventos generales del socket.
 */
const registerBaseListeners = (socketInstance) => {
  socketInstance.on("connect", () => {
    console.log(
      "🔌 Socket.IO conectado:",
      socketInstance.id
    );
  });

  socketInstance.on("socket:ready", (payload) => {
    console.log(
      "✅ Socket.IO autenticado:",
      payload
    );
  });

  socketInstance.on("connect_error", (error) => {
    console.error(
      "❌ Error de conexión Socket.IO:",
      error?.message || error
    );
  });

  socketInstance.on("disconnect", (reason) => {
    console.warn(
      "⚠️ Socket.IO desconectado:",
      reason
    );
  });

  socketInstance.io.on("reconnect_attempt", (attempt) => {
    console.log(
      `🔄 Intento de reconexión Socket.IO: ${attempt}`
    );
  });

  socketInstance.io.on("reconnect", (attempt) => {
    console.log(
      `✅ Socket.IO reconectado después de ${attempt} intento(s).`
    );
  });

  socketInstance.io.on("reconnect_error", (error) => {
    console.error(
      "❌ Error intentando reconectar Socket.IO:",
      error?.message || error
    );
  });

  socketInstance.io.on("reconnect_failed", () => {
    console.error(
      "❌ Socket.IO no pudo reconectarse."
    );
  });
};

/**
 * Crea o reutiliza la conexión global.
 *
 * Puedes enviar el token manualmente:
 *
 * connectSocket(token)
 *
 * O dejar que lo busque automáticamente:
 *
 * connectSocket()
 */
export const connectSocket = (providedToken = "") => {
  const token =
    providedToken ||
    getStoredToken();

  if (!token) {
    console.warn(
      "No se pudo conectar Socket.IO: token ausente."
    );

    return null;
  }

  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,

      auth: {
        token
      },

      transports: [
        "websocket",
        "polling"
      ],

      withCredentials: true,

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      randomizationFactor: 0.5,

      timeout: 20000
    });

    registerBaseListeners(socket);
  }

  /**
   * Actualiza el token antes de cada conexión o reconexión.
   */
  socket.auth = {
    token
  };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

/**
 * Actualiza el token utilizado por Socket.IO.
 *
 * Útil después de renovar el JWT.
 */
export const updateSocketToken = (
  providedToken = ""
) => {
  const token =
    providedToken ||
    getStoredToken();

  if (!token) {
    console.warn(
      "No se pudo actualizar Socket.IO: token ausente."
    );

    return false;
  }

  if (!socket) {
    connectSocket(token);
    return true;
  }

  socket.auth = {
    token
  };

  /**
   * Para que el servidor valide el token nuevo,
   * se realiza una reconexión controlada.
   */
  if (socket.connected) {
    socket.disconnect();
  }

  socket.connect();

  return true;
};

/**
 * Desconecta completamente Socket.IO.
 *
 * Debe usarse principalmente al cerrar sesión.
 */
export const disconnectSocket = () => {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.io.removeAllListeners();
  socket.disconnect();

  socket = null;

  console.log(
    "🔌 Socket.IO cerrado completamente."
  );
};

/**
 * Garantiza que exista una conexión.
 */
const ensureSocket = () => {
  if (!socket) {
    return connectSocket();
  }

  if (!socket.connected) {
    socket.auth = {
      token: getStoredToken()
    };

    socket.connect();
  }

  return socket;
};

/**
 * Emite un evento sencillo sin esperar respuesta.
 */
const emitEvent = (
  eventName,
  payload = {}
) => {
  const socketInstance =
    ensureSocket();

  if (!socketInstance) {
    console.warn(
      `No se pudo emitir "${eventName}": socket no disponible.`
    );

    return false;
  }

  socketInstance.emit(
    eventName,
    payload
  );

  return true;
};

/**
 * Emite un evento esperando confirmación del backend.
 *
 * El servidor debe responder mediante callback:
 *
 * socket.on("evento", async (payload, callback) => {
 *   callback({ success: true });
 * });
 */
const emitWithAck = (
  eventName,
  payload = {},
  timeout = ACK_TIMEOUT
) => {
  const socketInstance =
    ensureSocket();

  if (!socketInstance) {
    return Promise.resolve({
      success: false,
      message:
        "Socket.IO no está disponible."
    });
  }

  return new Promise((resolve) => {
    let completed = false;

    const timer = window.setTimeout(
      () => {
        if (completed) {
          return;
        }

        completed = true;

        resolve({
          success: false,
          timeout: true,
          message:
            `El servidor no confirmó el evento "${eventName}".`
        });
      },
      timeout
    );

    socketInstance.emit(
      eventName,
      payload,
      (response = {}) => {
        if (completed) {
          return;
        }

        completed = true;
        window.clearTimeout(timer);

        resolve({
          success:
            response.success !== false,
          ...response
        });
      }
    );
  });
};

/**
 * Escucha un evento del servidor.
 *
 * Retorna una función para cancelar ese listener.
 */
export const subscribeSocketEvent = (
  eventName,
  handler
) => {
  const socketInstance =
    ensureSocket();

  if (
    !socketInstance ||
    !eventName ||
    typeof handler !== "function"
  ) {
    return () => {};
  }

  socketInstance.on(
    eventName,
    handler
  );

  return () => {
    socketInstance.off(
      eventName,
      handler
    );
  };
};

/**
 * Elimina un listener específico.
 */
export const unsubscribeSocketEvent = (
  eventName,
  handler
) => {
  if (
    !socket ||
    !eventName
  ) {
    return;
  }

  if (
    typeof handler === "function"
  ) {
    socket.off(
      eventName,
      handler
    );

    return;
  }

  socket.off(eventName);
};

/**
 * =========================================================
 * MENSAJES Y CONVERSACIONES
 * =========================================================
 */

export const joinConversation = (
  conversationId
) => {
  if (!conversationId) {
    return Promise.resolve({
      success: false,
      message:
        "ID de conversación inválido."
    });
  }

  return emitWithAck(
    "conversation:join",
    {
      conversationId
    }
  );
};

export const leaveConversation = (
  conversationId
) => {
  if (!conversationId) {
    return false;
  }

  return emitEvent(
    "conversation:leave",
    {
      conversationId
    }
  );
};

export const emitTyping = (
  conversationId
) => {
  if (!conversationId) {
    return false;
  }

  return emitEvent(
    "conversation:typing",
    {
      conversationId
    }
  );
};

export const emitStopTyping = (
  conversationId
) => {
  if (!conversationId) {
    return false;
  }

  /**
   * Nombre oficial consolidado:
   * conversation:stopTyping
   */
  return emitEvent(
    "conversation:stopTyping",
    {
      conversationId
    }
  );
};

export const emitMessageRead = (
  conversationId,
  messageIds = []
) => {
  if (!conversationId) {
    return Promise.resolve({
      success: false,
      message:
        "ID de conversación inválido."
    });
  }

  const normalizedIds =
    Array.isArray(messageIds)
      ? messageIds.filter(Boolean)
      : [messageIds].filter(Boolean);

  return emitWithAck(
    "message:read",
    {
      conversationId,
      messageIds: normalizedIds
    }
  );
};

export const emitSendMessage = (
  payload
) => {
  if (
    !payload?.conversationId
  ) {
    return Promise.resolve({
      success: false,
      message:
        "La conversación es obligatoria."
    });
  }

  return emitWithAck(
    "message:send",
    payload
  );
};

export const emitEditMessage = (
  payload
) => {
  if (
    !payload?.conversationId ||
    !payload?.messageId
  ) {
    return Promise.resolve({
      success: false,
      message:
        "Conversación y mensaje son obligatorios."
    });
  }

  return emitWithAck(
    "message:edit",
    payload
  );
};

export const emitDeleteMessage = (
  conversationId,
  messageId
) => {
  if (
    !conversationId ||
    !messageId
  ) {
    return Promise.resolve({
      success: false,
      message:
        "Conversación y mensaje son obligatorios."
    });
  }

  return emitWithAck(
    "message:delete",
    {
      conversationId,
      messageId
    }
  );
};

export const emitMessageReaction = (
  conversationId,
  messageId,
  emoji
) => {
  if (
    !conversationId ||
    !messageId ||
    !emoji
  ) {
    return Promise.resolve({
      success: false,
      message:
        "Datos de reacción incompletos."
    });
  }

  return emitWithAck(
    "message:reaction",
    {
      conversationId,
      messageId,
      emoji
    }
  );
};

/**
 * =========================================================
 * DISPUTAS
 * =========================================================
 */

export const joinDisputeRoom = (
  disputeId
) => {
  if (!disputeId) {
    return Promise.resolve({
      success: false,
      message:
        "ID de disputa inválido."
    });
  }

  return emitWithAck(
    "dispute:join",
    {
      disputeId
    }
  );
};

export const leaveDisputeRoom = (
  disputeId
) => {
  if (!disputeId) {
    return false;
  }

  return emitEvent(
    "dispute:leave",
    {
      disputeId
    }
  );
};

export const emitDisputeTyping = (
  disputeId
) => {
  if (!disputeId) {
    return false;
  }

  return emitEvent(
    "dispute:typing",
    {
      disputeId
    }
  );
};

export const emitDisputeStopTyping = (
  disputeId
) => {
  if (!disputeId) {
    return false;
  }

  return emitEvent(
    "dispute:stopTyping",
    {
      disputeId
    }
  );
};

export const markDisputeMessageRead = (
  disputeId,
  messageId
) => {
  if (
    !disputeId ||
    !messageId
  ) {
    return Promise.resolve({
      success: false,
      message:
        "Disputa y mensaje son obligatorios."
    });
  }

  return emitWithAck(
    "dispute:messageRead",
    {
      disputeId,
      messageId
    }
  );
};

export const emitDisputeMessage = (
  payload
) => {
  if (!payload?.disputeId) {
    return Promise.resolve({
      success: false,
      message:
        "La disputa es obligatoria."
    });
  }

  return emitWithAck(
    "dispute:messageSend",
    payload
  );
};

export const emitDisputeStatusUpdate = (
  disputeId,
  status,
  metadata = {}
) => {
  if (
    !disputeId ||
    !status
  ) {
    return Promise.resolve({
      success: false,
      message:
        "Disputa y estado son obligatorios."
    });
  }

  return emitWithAck(
    "dispute:statusUpdate",
    {
      disputeId,
      status,
      metadata
    }
  );
};

/**
 * =========================================================
 * DASHBOARD DE CONVERSACIONES
 * =========================================================
 */

export const joinDashboard = (
  conversationId
) => {
  if (!conversationId) {
    return Promise.resolve({
      success: false,
      message:
        "ID de conversación inválido."
    });
  }

  return emitWithAck(
    "dashboard:join",
    {
      conversationId
    }
  );
};

export const leaveDashboard = (
  conversationId
) => {
  if (!conversationId) {
    return false;
  }

  return emitEvent(
    "dashboard:leave",
    {
      conversationId
    }
  );
};

/**
 * =========================================================
 * PEDIDOS
 * =========================================================
 */

export const joinOrderRoom = (
  orderId
) => {
  if (!orderId) {
    return Promise.resolve({
      success: false,
      message:
        "ID de pedido inválido."
    });
  }

  return emitWithAck(
    "order:join",
    {
      orderId
    }
  );
};

export const leaveOrderRoom = (
  orderId
) => {
  if (!orderId) {
    return false;
  }

  return emitEvent(
    "order:leave",
    {
      orderId
    }
  );
};

/**
 * =========================================================
 * NOTIFICACIONES
 * =========================================================
 */

export const subscribeNotifications = () => {
  return emitWithAck(
    "notifications:subscribe",
    {}
  );
};

export const unsubscribeNotifications = () => {
  return emitEvent(
    "notifications:unsubscribe",
    {}
  );
};

export const markNotificationRead = (
  notificationId
) => {
  if (!notificationId) {
    return Promise.resolve({
      success: false,
      message:
        "ID de notificación inválido."
    });
  }

  return emitWithAck(
    "notification:read",
    {
      notificationId
    }
  );
};

/**
 * =========================================================
 * BACKOFFICE
 * =========================================================
 */

export const joinBackOffice = () => {
  return emitWithAck(
    "backoffice:join",
    {}
  );
};

export const leaveBackOffice = () => {
  return emitEvent(
    "backoffice:leave",
    {}
  );
};

/**
 * =========================================================
 * EXPORTACIÓN AGRUPADA OPCIONAL
 * =========================================================
 */

const socketService = {
  connectSocket,
  disconnectSocket,
  updateSocketToken,
  getSocket,
  getStoredToken,
  isSocketConnected,

  subscribeSocketEvent,
  unsubscribeSocketEvent,

  joinConversation,
  leaveConversation,
  emitTyping,
  emitStopTyping,
  emitMessageRead,
  emitSendMessage,
  emitEditMessage,
  emitDeleteMessage,
  emitMessageReaction,

  joinDisputeRoom,
  leaveDisputeRoom,
  emitDisputeTyping,
  emitDisputeStopTyping,
  markDisputeMessageRead,
  emitDisputeMessage,
  emitDisputeStatusUpdate,

  joinDashboard,
  leaveDashboard,

  joinOrderRoom,
  leaveOrderRoom,

  subscribeNotifications,
  unsubscribeNotifications,
  markNotificationRead,

  joinBackOffice,
  leaveBackOffice
};

export default socketService;