import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { useLocation } from "react-router-dom";

import chatService from "../services/chat.service";

import {
  connectSocket,
  emitStopTyping,
  emitTyping,
  joinConversation,
  leaveConversation,
  subscribeSocketEvent
} from "../services/socket.service";

import {
  formatUser,
  getOtherParticipant,
  getUnreadCount,
  normalizeSearch,
  safeJson
} from "../utils/message.utils";

function normalizeEntityId(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "object") {
    const nested =
      value.prismaId ??
      value.userId ??
      value.id ??
      value._id;

    if (
      nested !== undefined &&
      nested !== value
    ) {
      return normalizeEntityId(
        nested
      );
    }
  }

  const normalized =
    String(value).trim();

  return normalized ===
    "[object Object]"
      ? ""
      : normalized;
}

function getConversationId(value) {
  return normalizeEntityId(
    value?.conversationId ??
      value?.conversation ??
      value
  );
}

function getMessageId(value) {
  return normalizeEntityId(
    value?.messageId ??
      value?.id ??
      value?._id ??
      value
  );
}

function getMessageSenderId(message) {
  return normalizeEntityId(
    message?.sender ??
      message?.senderId
  );
}

function getMessageText(message) {
  if (
    message?.deletedForEveryone
  ) {
    return "Mensaje eliminado";
  }

  if (
    message?.isFlagged ||
    message?.status === "BLOCKED"
  ) {
    return "Mensaje bloqueado por seguridad";
  }

  return (
    message?.text ||
    message?.content ||
    message?.body ||
    message?.attachments?.[0]
      ?.name ||
    "Nuevo mensaje"
  );
}

function messageTimestamp(message) {
  const value =
    message?.createdAt ||
    message?.updatedAt ||
    0;

  const time =
    new Date(value).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}

function dedupeMessages(items = []) {
  const result = [];
  const positions = new Map();

  for (
    const item
    of Array.isArray(items)
      ? items
      : []
  ) {
    const id =
      getMessageId(item);

    if (!id) {
      result.push(item);
      continue;
    }

    if (positions.has(id)) {
      const index =
        positions.get(id);

      result[index] = {
        ...result[index],
        ...item
      };

      continue;
    }

    positions.set(
      id,
      result.length
    );

    result.push(item);
  }

  return result.sort(
    (left, right) =>
      messageTimestamp(left) -
      messageTimestamp(right)
  );
}

function conversationIdentity(
  conversation
) {
  const directId =
    normalizeEntityId(
      conversation
    );

  const participants = (
    conversation?.participants ||
    conversation?.users ||
    []
  )
    .map(normalizeEntityId)
    .filter(Boolean)
    .sort();

  if (!participants.length) {
    return directId
      ? `id:${directId}`
      : "";
  }

  const productId =
    normalizeEntityId(
      conversation?.productId ??
      conversation?.product
    );

  const orderId =
    normalizeEntityId(
      conversation?.orderId ??
      conversation?.order
    );

  return [
    `users:${participants.join(",")}`,
    `product:${productId || "NULL"}`,
    `order:${orderId || "NULL"}`
  ].join("|");
}

function dedupeConversations(
  items = []
) {
  const result = [];
  const positions = new Map();

  for (
    const item
    of Array.isArray(items)
      ? items
      : []
  ) {
    const key =
      conversationIdentity(
        item
      );

    if (!key) {
      result.push(item);
      continue;
    }

    if (positions.has(key)) {
      const index =
        positions.get(key);

      result[index] = {
        ...result[index],
        ...item
      };

      continue;
    }

    positions.set(
      key,
      result.length
    );

    result.push(item);
  }

  return result;
}

function conversationTimestamp(
  conversation
) {
  const value =
    conversation
      ?.lastMessage
      ?.createdAt ||
    conversation?.lastMessageAt ||
    conversation?.updatedAt ||
    conversation?.createdAt ||
    0;

  const time =
    new Date(value).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}

function sortConversations(
  conversations
) {
  return [
    ...conversations
  ].sort(
    (left, right) =>
      conversationTimestamp(right) -
      conversationTimestamp(left)
  );
}

function sameId(
  left,
  right
) {
  const first =
    normalizeEntityId(left);

  const second =
    normalizeEntityId(right);

  return Boolean(
    first &&
    second &&
    first === second
  );
}

function collectEntityIds(
  value
) {
  const candidates =
    value &&
    typeof value === "object"
      ? [
          value.prismaId,
          value.userId,
          value.id,
          value._id
        ]
      : [value];

  return [
    ...new Set(
      candidates
        .map(
          normalizeEntityId
        )
        .filter(Boolean)
    )
  ];
}

function conversationStateForUser(
  conversation,
  state,
  userIds = []
) {
  const definition = {
    favorite: {
      direct: [
        "isFavorite",
        "favorite"
      ],
      list: "favoriteBy"
    },

    mute: {
      direct: [
        "isMuted",
        "muted"
      ],
      list: "mutedBy"
    },

    archive: {
      direct: [
        "isArchived",
        "archived"
      ],
      list: "archivedBy"
    },

    block: {
      direct: [
        "isBlocked",
        "blocked"
      ],
      list: "blockedBy"
    }
  }[state];

  if (
    !definition ||
    !conversation
  ) {
    return false;
  }

  for (
    const field
    of definition.direct
  ) {
    if (
      typeof conversation?.[field] ===
        "boolean"
    ) {
      return conversation[field];
    }
  }

  const references =
    Array.isArray(
      conversation?.[
        definition.list
      ]
    )
      ? conversation[
          definition.list
        ]
      : [];

  return references.some(
    (reference) => {
      const normalized =
        normalizeEntityId(
          reference
        );

      return (
        Boolean(normalized) &&
        userIds.includes(
          normalized
        )
      );
    }
  );
}

export default function useMessages({ adminMode = false } = {}) {
  const location =
    useLocation();

  const endRef =
    useRef(null);

  const activeConversationRef =
    useRef(null);

  const conversationsRef =
    useRef([]);

  const textRef =
    useRef("");

  const typingTimerRef =
    useRef(null);

  const refreshTimerRef =
    useRef(null);

  const user = useMemo(
    () => adminMode
      ? (safeJson(localStorage.getItem("qsm_admin_user")) || safeJson(sessionStorage.getItem("qsm_admin_user")) || {})
      : (safeJson(localStorage.getItem("qsm_user")) || safeJson(localStorage.getItem("user")) || {}),
    [adminMode]
  );

  const authenticationToken = useMemo(
    () => adminMode
      ? (localStorage.getItem("qsm_admin_token") || sessionStorage.getItem("qsm_admin_token") || "")
      : "",
    [adminMode]
  );

  const serviceOptions = useMemo(() => ({ adminMode }), [adminMode]);

  const currentUserId =
    normalizeEntityId(user);

  const currentUserIds =
    useMemo(
      () =>
        collectEntityIds(
          user
        ),
      [user]
    );

  const params = useMemo(
    () =>
      new URLSearchParams(
        location.search
      ),
    [location.search]
  );

  const targetUserId =
    params.get("sellerId") ||
    params.get("buyerId") ||
    "";

  const orderId =
    params.get("orderId") ||
    "";

  const productId =
    params.get("productId") ||
    "";

  const [
    conversations,
    setConversations
  ] = useState([]);

  const [
    activeConversation,
    setActiveConversation
  ] = useState(null);

  const [
    messages,
    setMessages
  ] = useState([]);

  const [
    filter,
    setFilter
  ] = useState("ALL");

  const [
    search,
    setSearch
  ] = useState("");

  const [
    text,
    setTextState
  ] = useState("");

  const [
    replyTo,
    setReplyTo
  ] = useState(null);

  const [
    file,
    setFile
  ] = useState(null);

  const [
    preview,
    setPreview
  ] = useState("");

  const [
    viewer,
    setViewer
  ] = useState("");

  const [
    loadingConversations,
    setLoadingConversations
  ] = useState(true);

  const [
    loadingMessages,
    setLoadingMessages
  ] = useState(false);

  const [
    sending,
    setSending
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading
  ] = useState("");

  const [
    error,
    setError
  ] = useState("");

  const [
    notice,
    setNotice
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | QSM_BLOQUE9_2_SECURITY_ALERT_STATE
  |--------------------------------------------------------------------------
  */

  const [
    securityAlert,
    setSecurityAlert
  ] = useState(null);

  const [
    socketConnected,
    setSocketConnected
  ] = useState(false);

  const [
    typingUser,
    setTypingUser
  ] = useState(null);

  useEffect(() => {
    activeConversationRef.current =
      activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    conversationsRef.current =
      conversations;
  }, [conversations]);

  useEffect(() => {
    textRef.current =
      text;
  }, [text]);

  const clearFile =
    useCallback(() => {
      setFile(null);

      setPreview(
        (current) => {
          if (
            current?.startsWith(
              "blob:"
            )
          ) {
            URL.revokeObjectURL(
              current
            );
          }

          return "";
        }
      );
    }, []);

  const setConversationReadLocally =
    useCallback(
      (conversationId) => {
        if (!conversationId) {
          return;
        }

        setConversations(
          (current) =>
            current.map(
              (conversation) => {
                if (
                  !sameId(
                    conversation,
                    conversationId
                  )
                ) {
                  return conversation;
                }

                return {
                  ...conversation,
                  unreadCount: 0,
                  unread: {
                    ...(
                      conversation
                        ?.unread ||
                      {}
                    ),
                    [
                      currentUserId
                    ]: 0
                  }
                };
              }
            )
        );
      },
      [currentUserId]
    );

  const loadConversations =
    useCallback(
      async (
        options = {}
      ) => {
        const silent =
          options?.silent === true;

        try {
          if (!silent) {
            setLoadingConversations(
              true
            );
          }

          setError("");

          const received =
            await chatService.getConversations(serviceOptions);

          const list =
            sortConversations(
              dedupeConversations(
                Array.isArray(
                  received
                )
                  ? received
                  : []
              )
            );

          setConversations(list);

          const targetConversation =
            targetUserId
              ? list.find(
                  (
                    conversation
                  ) => {
                    const participants =
                      conversation
                        ?.participants ||
                      conversation
                        ?.users ||
                      [];

                    const hasTarget =
                      participants.some(
                        (participant) =>
                          sameId(
                            participant,
                            targetUserId
                          )
                      );

                    const sameProduct =
                      !productId ||
                      sameId(
                        conversation
                          ?.productId ??
                        conversation
                          ?.product,
                        productId
                      );

                    const sameOrder =
                      !orderId ||
                      sameId(
                        conversation
                          ?.orderId ??
                        conversation
                          ?.order,
                        orderId
                      );

                    return (
                      hasTarget &&
                      sameProduct &&
                      sameOrder
                    );
                  }
                )
              : null;

          if (
            targetConversation
          ) {
            setActiveConversation(
              targetConversation
            );
          } else if (
            targetUserId
          ) {
            const created =
              await chatService
                .createConversation(
                  {
                    receiverId:
                      targetUserId,
                    orderId:
                      orderId ||
                      undefined,
                    productId:
                      productId ||
                      undefined
                  },
                  serviceOptions
                );

            setActiveConversation(
              created
            );

            setConversations(
              (current) =>
                sortConversations(
                  dedupeConversations([
                    created,
                    ...current
                  ])
                )
            );
          } else {
            setActiveConversation(
              (current) => {
                const currentId =
                  normalizeEntityId(
                    current
                  );

                if (currentId) {
                  const refreshed =
                    list.find(
                      (
                        conversation
                      ) =>
                        sameId(
                          conversation,
                          currentId
                        )
                    );

                  if (refreshed) {
                    return {
                      ...current,
                      ...refreshed
                    };
                  }
                }

                return (
                  list[0] ||
                  null
                );
              }
            );
          }

          return list;
        } catch (
          requestError
        ) {
          setError(
            requestError?.response
              ?.data?.message ||
            "No se pudieron cargar las conversaciones."
          );

          return [];
        } finally {
          if (!silent) {
            setLoadingConversations(
              false
            );
          }
        }
      },
      [
        targetUserId,
        orderId,
        productId
      ]
    );

  const scheduleConversationRefresh =
    useCallback(() => {
      window.clearTimeout(
        refreshTimerRef.current
      );

      refreshTimerRef.current =
        window.setTimeout(
          () => {
            loadConversations({
              silent: true
            });
          },
          350
        );
    }, [loadConversations]);

  const loadMessages =
    useCallback(
      async (
        conversationId
      ) => {
        if (!conversationId) {
          setMessages([]);
          return;
        }

        try {
          setLoadingMessages(
            true
          );

          setError("");

          const received =
            await chatService
              .getMessages(
                conversationId,
                serviceOptions
              );

          setMessages(
            dedupeMessages(
              Array.isArray(
                received
              )
                ? received
                : []
            )
          );

          try {
            await chatService
              .markRead(conversationId, serviceOptions);

            setConversationReadLocally(
              conversationId
            );
          } catch {
            // El chat sigue cargando aunque
            // falle la confirmación de lectura.
          }
        } catch (
          requestError
        ) {
          setError(
            requestError?.response
              ?.data?.message ||
            "No se pudieron cargar los mensajes."
          );
        } finally {
          setLoadingMessages(
            false
          );
        }
      },
      [
        setConversationReadLocally
      ]
    );

  const updateConversationFromMessage =
    useCallback(
      (
        conversationId,
        message,
        {
          incrementUnread = false
        } = {}
      ) => {
        if (
          !conversationId ||
          !message
        ) {
          return;
        }

        const senderId =
          getMessageSenderId(
            message
          );

        const createdAt =
          message?.createdAt ||
          message?.updatedAt ||
          new Date().toISOString();

        setConversations(
          (current) => {
            let found = false;

            const updated =
              current.map(
                (
                  conversation
                ) => {
                  if (
                    !sameId(
                      conversation,
                      conversationId
                    )
                  ) {
                    return conversation;
                  }

                  found = true;

                  const unreadCount =
                    incrementUnread
                      ? Number(
                          conversation
                            ?.unreadCount ||
                          0
                        ) + 1
                      : Number(
                          conversation
                            ?.unreadCount ||
                          0
                        );

                  return {
                    ...conversation,
                    lastMessage: {
                      ...(
                        conversation
                          ?.lastMessage ||
                        {}
                      ),
                      text:
                        getMessageText(
                          message
                        ),
                      sender:
                        senderId ||
                        null,
                      createdAt
                    },
                    lastMessageAt:
                      createdAt,
                    updatedAt:
                      createdAt,
                    unreadCount,
                    unread:
                      incrementUnread
                        ? {
                            ...(
                              conversation
                                ?.unread ||
                              {}
                            ),
                            [
                              currentUserId
                            ]:
                              unreadCount
                          }
                        : conversation
                            ?.unread
                  };
                }
              );

            if (!found) {
              scheduleConversationRefresh();
              return current;
            }

            return sortConversations(
              updated
            );
          }
        );
      },
      [
        currentUserId,
        scheduleConversationRefresh
      ]
    );

  const upsertActiveMessage =
    useCallback(
      (
        conversationId,
        message
      ) => {
        const activeId =
          normalizeEntityId(
            activeConversationRef
              .current
          );

        if (
          !sameId(
            activeId,
            conversationId
          )
        ) {
          return false;
        }

        setMessages(
          (current) =>
            dedupeMessages([
              ...current,
              message
            ])
        );

        return true;
      },
      []
    );

  const handleIncomingMessage =
    useCallback(
      (payload = {}) => {
        const message =
          payload?.message ||
          payload?.data ||
          payload;

        if (!message) {
          return;
        }

        const conversationId =
          getConversationId(
            payload?.conversationId ??
            message
          );

        if (!conversationId) {
          return;
        }

        const senderId =
          getMessageSenderId(
            message
          );

        const mine =
          sameId(
            senderId,
            currentUserId
          );

        const active =
          upsertActiveMessage(
            conversationId,
            message
          );

        updateConversationFromMessage(
          conversationId,
          message,
          {
            incrementUnread:
              !mine &&
              !active
          }
        );

        if (
          active &&
          !mine
        ) {
          chatService
            .markRead(conversationId, serviceOptions)
            .then(() =>
              setConversationReadLocally(
                conversationId
              )
            )
            .catch(() => {});
        }
      },
      [
        currentUserId,
        setConversationReadLocally,
        updateConversationFromMessage,
        upsertActiveMessage
      ]
    );

  const handleMessageUpdated =
    useCallback(
      (payload = {}) => {
        const outerMessage =
          payload?.message ||
          payload?.data ||
          payload;

        const message =
          outerMessage
            ?.message ||
          outerMessage;

        if (!message) {
          return;
        }

        const conversationId =
          getConversationId(
            payload?.conversationId ??
            outerMessage
              ?.conversationId ??
            message
          );

        if (
          conversationId
        ) {
          upsertActiveMessage(
            conversationId,
            message
          );

          updateConversationFromMessage(
            conversationId,
            message
          );
        }

        scheduleConversationRefresh();
      },
      [
        scheduleConversationRefresh,
        updateConversationFromMessage,
        upsertActiveMessage
      ]
    );

  const handleMessageDeleted =
    useCallback(
      (payload = {}) => {
        const outerMessage =
          payload?.message ||
          payload?.data ||
          payload;

        const message =
          outerMessage
            ?.message ||
          outerMessage;

        const messageId =
          getMessageId(
            payload?.messageId ??
            message
          );

        const conversationId =
          getConversationId(
            payload?.conversationId ??
            outerMessage
              ?.conversationId ??
            message
          );

        if (
          conversationId &&
          message
        ) {
          upsertActiveMessage(
            conversationId,
            message
          );
        } else if (
          messageId
        ) {
          setMessages(
            (current) =>
              current.map(
                (item) =>
                  sameId(
                    item,
                    messageId
                  )
                    ? {
                        ...item,
                        deletedForEveryone:
                          true,
                        text:
                          "Mensaje eliminado",
                        content:
                          "Mensaje eliminado",
                        attachments:
                          []
                      }
                    : item
              )
          );
        }

        scheduleConversationRefresh();
      },
      [
        scheduleConversationRefresh,
        upsertActiveMessage
      ]
    );

  const applyConversationPatch =
    useCallback(
      (payload = {}) => {
        const patch =
          payload?.conversation ||
          payload;

        const conversationId =
          getConversationId(
            payload
              ?.conversationId ??
            patch
          );

        if (!conversationId) {
          return;
        }

        setConversations(
          (current) =>
            sortConversations(
              current.map(
                (
                  conversation
                ) =>
                  sameId(
                    conversation,
                    conversationId
                  )
                    ? {
                        ...conversation,
                        ...patch,
                        _id:
                          conversation
                            ?._id ??
                          patch?._id,
                        id:
                          conversation
                            ?.id ??
                          patch?.id,
                        participants:
                          patch
                            ?.participants ||
                          conversation
                            ?.participants,
                        product:
                          patch?.product ||
                          conversation
                            ?.product,
                        order:
                          patch?.order ||
                          conversation
                            ?.order,
                        lastMessage:
                          patch
                            ?.lastMessage
                            ? {
                                ...(
                                  conversation
                                    ?.lastMessage ||
                                  {}
                                ),
                                ...patch
                                  .lastMessage
                              }
                            : conversation
                                ?.lastMessage
                      }
                    : conversation
              )
            )
        );

        setActiveConversation(
          (current) =>
            sameId(
              current,
              conversationId
            )
              ? {
                  ...current,
                  ...patch,
                  participants:
                    patch
                      ?.participants ||
                    current
                      ?.participants,
                  product:
                    patch?.product ||
                    current?.product,
                  order:
                    patch?.order ||
                    current?.order,
                  lastMessage:
                    patch
                      ?.lastMessage
                      ? {
                          ...(
                            current
                              ?.lastMessage ||
                            {}
                          ),
                          ...patch
                            .lastMessage
                        }
                      : current
                          ?.lastMessage
                }
              : current
        );
      },
      []
    );

  const handleMessagesRead =
    useCallback(
      (payload = {}) => {
        const conversationId =
          getConversationId(
            payload
              ?.conversationId
          );

        if (
          !conversationId
        ) {
          return;
        }

        const readerId =
          normalizeEntityId(
            payload?.userId ??
            payload?.user
          );

        if (
          sameId(
            readerId,
            currentUserId
          )
        ) {
          setConversationReadLocally(
            conversationId
          );

          return;
        }

        setMessages(
          (current) =>
            current.map(
              (message) => {
                if (
                  !sameId(
                    getMessageSenderId(
                      message
                    ),
                    currentUserId
                  )
                ) {
                  return message;
                }

                return {
                  ...message,
                  status: "READ",
                  readAt:
                    payload?.readAt ||
                    new Date()
                      .toISOString()
                };
              }
            )
        );
      },
      [
        currentUserId,
        setConversationReadLocally
      ]
    );

  const handleTyping =
    useCallback(
      (payload = {}) => {
        const conversationId =
          getConversationId(
            payload
              ?.conversationId
          );

        if (
          !sameId(
            activeConversationRef
              .current,
            conversationId
          )
        ) {
          return;
        }

        const incomingUser =
          payload?.user ||
          {
            id:
              payload?.userId
          };

        setTypingUser(
          incomingUser
        );

        setActiveConversation(
          (current) => ({
            ...current,
            isTyping: true,
            typingUser:
              incomingUser
          })
        );
      },
      []
    );

  const handleStopTyping =
    useCallback(
      (payload = {}) => {
        const conversationId =
          getConversationId(
            payload
              ?.conversationId
          );

        if (
          conversationId &&
          !sameId(
            activeConversationRef
              .current,
            conversationId
          )
        ) {
          return;
        }

        setTypingUser(null);

        setActiveConversation(
          (current) =>
            current
              ? {
                  ...current,
                  isTyping:
                    false,
                  typingUser:
                    null
                }
              : current
        );
      },
      []
    );

  useEffect(() => {
    const socket =
      connectSocket(authenticationToken);

    if (!socket) {
      setSocketConnected(
        false
      );

      return undefined;
    }

    const setConnected = () =>
      setSocketConnected(
        true
      );

    const setDisconnected = () =>
      setSocketConnected(
        false
      );

    socket.on(
      "connect",
      setConnected
    );

    socket.on(
      "disconnect",
      setDisconnected
    );

    setSocketConnected(
      Boolean(
        socket.connected
      )
    );

    const cleanups = [
      subscribeSocketEvent(
        "message:new",
        handleIncomingMessage
      ),
      subscribeSocketEvent(
        "message:updated",
        handleMessageUpdated
      ),
      subscribeSocketEvent(
        "message:deleted",
        handleMessageDeleted
      ),
      subscribeSocketEvent(
        "message:read",
        handleMessagesRead
      ),
      subscribeSocketEvent(
        "conversation:updated",
        applyConversationPatch
      ),
      subscribeSocketEvent(
        "message:typing",
        handleTyping
      ),
      subscribeSocketEvent(
        "message:stopTyping",
        handleStopTyping
      )
    ];

    return () => {
      socket.off(
        "connect",
        setConnected
      );

      socket.off(
        "disconnect",
        setDisconnected
      );

      cleanups.forEach(
        (cleanup) =>
          cleanup?.()
      );
    };
  }, [
    applyConversationPatch,
    handleIncomingMessage,
    handleMessageDeleted,
    handleMessagesRead,
    handleMessageUpdated,
    handleStopTyping,
    handleTyping
  ]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const conversationId =
      normalizeEntityId(
        activeConversation
      );

    if (!conversationId) {
      setMessages([]);
      return undefined;
    }

    setTypingUser(null);

    setActiveConversation(
      (current) =>
        current
          ? {
              ...current,
              isTyping: false,
              typingUser: null
            }
          : current
    );

    loadMessages(
      conversationId
    );

    let cancelled = false;

    joinConversation(
      conversationId
    ).then(
      (result) => {
        if (
          !cancelled &&
          result?.success ===
            false
        ) {
          console.warn(
            "No se pudo entrar al chat live:",
            result?.message
          );
        }
      }
    );

    return () => {
      cancelled = true;

      window.clearTimeout(
        typingTimerRef.current
      );

      emitStopTyping(
        conversationId
      );

      leaveConversation(
        conversationId
      );

      setTypingUser(null);
    };
  }, [
    activeConversation?._id,
    activeConversation?.id,
    loadMessages
  ]);

  useEffect(() => {
    endRef.current
      ?.scrollIntoView({
        behavior: "smooth"
      });
  }, [messages]);

  useEffect(
    () => () => {
      if (
        preview?.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          preview
        );
      }
    },
    [preview]
  );

  useEffect(
    () => () => {
      window.clearTimeout(
        typingTimerRef.current
      );

      window.clearTimeout(
        refreshTimerRef.current
      );
    },
    []
  );

  const stopTyping =
    useCallback(() => {
      window.clearTimeout(
        typingTimerRef.current
      );

      const conversationId =
        normalizeEntityId(
          activeConversationRef
            .current
        );

      if (conversationId) {
        emitStopTyping(
          conversationId
        );
      }
    }, []);

  const notifyTyping =
    useCallback(() => {
      const conversationId =
        normalizeEntityId(
          activeConversationRef
            .current
        );

      if (!conversationId) {
        return;
      }

      emitTyping(
        conversationId
      );

      window.clearTimeout(
        typingTimerRef.current
      );

      typingTimerRef.current =
        window.setTimeout(
          stopTyping,
          1200
        );
    }, [stopTyping]);

  const setText =
    useCallback(
      (nextValue) => {
        const current =
          textRef.current;

        const next =
          typeof nextValue ===
          "function"
            ? nextValue(current)
            : nextValue;

        const normalized =
          String(next ?? "");

        textRef.current =
          normalized;

        setTextState(
          normalized
        );

        if (
          normalized.trim()
        ) {
          notifyTyping();
        } else {
          stopTyping();
        }
      },
      [
        notifyTyping,
        stopTyping
      ]
    );

  const filteredConversations =
    useMemo(() => {
      const term =
        normalizeSearch(
          search
        );

      return conversations.filter(
        (conversation) => {
          const other =
            getOtherParticipant(
              conversation,
              currentUserId
            );

          const unread =
            getUnreadCount(
              conversation,
              currentUserId
            );

          const isFavorite =
            conversationStateForUser(
              conversation,
              "favorite",
              currentUserIds
            );

          const isArchived =
            conversationStateForUser(
              conversation,
              "archive",
              currentUserIds
            );

          if (
            filter ===
              "ARCHIVED"
          ) {
            if (!isArchived) {
              return false;
            }
          } else if (
            isArchived
          ) {
            return false;
          }

          if (
            filter ===
              "UNREAD" &&
            unread === 0
          ) {
            return false;
          }

          if (
            filter ===
              "FAVORITES" &&
            !isFavorite
          ) {
            return false;
          }

          const searchable =
            normalizeSearch(
              [
                formatUser(
                  other,
                  ""
                ),
                other?.email,
                conversation
                  ?.product
                  ?.title,
                conversation
                  ?.lastMessage
                  ?.text,
                ...(
                  conversation
                    ?.labels ||
                  []
                ).map(
                  (label) =>
                    label?.name
                )
              ]
                .filter(Boolean)
                .join(" ")
            );

          return (
            !term ||
            searchable.includes(
              term
            )
          );
        }
      );
    }, [
      conversations,
      filter,
      search,
      currentUserId,
      currentUserIds
    ]);

  const selectFile =
    (selected) => {
      clearFile();

      if (!selected) {
        return;
      }

      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];

      if (
        !allowed.includes(
          selected.type
        )
      ) {
        setError(
          "Tipo de archivo no permitido."
        );

        return;
      }

      if (
        selected.size >
        20 * 1024 * 1024
      ) {
        setError(
          "El archivo supera el límite de 20 MB."
        );

        return;
      }

      setFile(selected);

      if (
        selected.type.startsWith(
          "image/"
        ) ||
        selected.type.startsWith(
          "video/"
        )
      ) {
        setPreview(
          URL.createObjectURL(
            selected
          )
        );
      }
    };

  const sendMessage =
    async () => {
      const conversationId =
        normalizeEntityId(
          activeConversationRef
            .current
        );

      if (!conversationId) {
        setError(
          "Selecciona una conversación."
        );

        return;
      }

      if (
        !textRef.current
          .trim() &&
        !file
      ) {
        return;
      }

      try {
        setSending(true);
        setError("");
        setNotice("");

        let uploaded = null;

        if (file) {
          uploaded =
            await chatService
              .upload(file, serviceOptions);
        }

        const currentConversation =
          activeConversationRef
            .current;

        const finalText =
          textRef.current.trim();

        const payload = {
          conversationId,
          text: finalText,
          content:
            finalText ||
            file?.name ||
            "Archivo adjunto",
          orderId:
            currentConversation
              ?.order?._id ||
            currentConversation
              ?.order?.id ||
            currentConversation
              ?.orderId ||
            orderId ||
            undefined,
          productId:
            currentConversation
              ?.product?._id ||
            currentConversation
              ?.product?.id ||
            currentConversation
              ?.productId ||
            productId ||
            undefined,
          replyTo:
            replyTo?._id ||
            replyTo?.id ||
            undefined
        };

        if (uploaded) {
          const mime =
            uploaded?.mimeType ||
            uploaded?.mimetype ||
            file?.type ||
            "";

          const type =
            mime.startsWith(
              "image/"
            )
              ? "IMAGE"
              : mime.startsWith(
                    "video/"
                  )
                ? "VIDEO"
                : mime ===
                    "application/pdf"
                  ? "PDF"
                  : "FILE";

          payload.messageType =
            type === "PDF"
              ? "FILE"
              : type;

          payload.attachments = [
            {
              name:
                uploaded
                  ?.originalName ||
                uploaded?.name ||
                file?.name,
              url:
                uploaded?.url ||
                uploaded?.path ||
                uploaded
                  ?.fileUrl,
              mimeType:
                mime,
              size:
                uploaded?.size ||
                file?.size,
              type
            }
          ];
        }

        const created =
          await chatService
            .sendMessage(
              payload,
              serviceOptions
            );

        /*
        |--------------------------------------------------------------------------
        | QSM_BLOQUE9_2_SECURITY_RESPONSE
        |--------------------------------------------------------------------------
        */

        const messageBlocked =
          Boolean(
            created?.isFlagged
          ) ||
          String(
            created?.status || ""
          ).toUpperCase() ===
            "BLOCKED";

        if (messageBlocked) {

          setSecurityAlert({
            riskLevel:
              String(
                created?.riskLevel ||
                "HIGH"
              ).toUpperCase(),

            score:
              Number(
                created?.securityScore ||
                0
              ),

            reason:
              created?.aiReason ||
              "LUNA detectó contenido potencialmente riesgoso.",

            reasons:
              Array.isArray(
                created?.securityReasons
              )
                ? created.securityReasons
                : []
          });

        } else {
          setSecurityAlert(null);
        }

        setMessages(
          (current) =>
            dedupeMessages([
              ...current,
              created
            ])
        );

        updateConversationFromMessage(
          conversationId,
          created
        );

        textRef.current = "";
        setTextState("");
        setReplyTo(null);
        clearFile();
        stopTyping();

        setNotice(
          messageBlocked
            ? "LUNA Security bloqueó este mensaje para proteger la conversación."
            : "Mensaje enviado."
        );
      } catch (
        requestError
      ) {
        setError(
          requestError?.response
            ?.data?.message ||
          "No se pudo enviar el mensaje."
        );
      } finally {
        setSending(false);
      }
    };

  const applyConversationUpdate =
    useCallback(
      (
        updatedConversation
      ) => {
        if (
          !updatedConversation
        ) {
          return;
        }

        applyConversationPatch(
          updatedConversation
        );
      },
      [applyConversationPatch]
    );

  const runConversationAction =
    async (action) => {
      const currentConversation =
        activeConversationRef
          .current;

      const id =
        normalizeEntityId(
          currentConversation
        );

      if (!id) {
        setError(
          "Selecciona una conversación."
        );

        return;
      }

      if (
        typeof chatService[
          action
        ] !== "function"
      ) {
        setError(
          "Esta acción todavía no está disponible."
        );

        return;
      }

      const wasEnabled =
        conversationStateForUser(
          currentConversation,
          action,
          currentUserIds
        );

      if (
        action === "block"
      ) {
        const confirmed =
          window.confirm(
            wasEnabled
              ? "¿Desbloquear a este usuario?"
              : "¿Bloquear a este usuario? Mientras esté bloqueado ninguno podrá enviar mensajes en esta conversación."
          );

        if (!confirmed) {
          return;
        }
      }

      try {
        setActionLoading(
          action
        );

        setError("");
        setNotice("");

        const updatedConversation =
          await chatService[action](
            id,
            serviceOptions
          );

        if (
          !updatedConversation ||
          typeof updatedConversation !==
            "object"
        ) {
          throw new Error(
            "El servidor no devolvió la conversación actualizada."
          );
        }

        applyConversationUpdate(
          updatedConversation
        );

        const isEnabled =
          conversationStateForUser(
            updatedConversation,
            action,
            currentUserIds
          );

        const notices = {
          favorite:
            isEnabled
              ? "Conversación marcada como favorita."
              : "Conversación eliminada de favoritas.",

          mute:
            isEnabled
              ? "Notificaciones de esta conversación silenciadas."
              : "Notificaciones de esta conversación activadas.",

          archive:
            isEnabled
              ? "Conversación archivada."
              : "Conversación restaurada.",

          block:
            isEnabled
              ? "Usuario bloqueado en esta conversación."
              : "Usuario desbloqueado."
        };

        setNotice(
          notices[action] ||
            "Conversación actualizada."
        );

        if (
          action === "favorite" &&
          filter === "FAVORITES" &&
          !isEnabled
        ) {
          stopTyping();
          setActiveConversation(
            null
          );
          setMessages([]);
          setReplyTo(null);
          clearFile();
        }

        if (
          action === "archive"
        ) {
          const leavesCurrentFilter =
            (
              isEnabled &&
              filter !==
                "ARCHIVED"
            ) ||
            (
              !isEnabled &&
              filter ===
                "ARCHIVED"
            );

          if (
            leavesCurrentFilter
          ) {
            stopTyping();

            setActiveConversation(
              null
            );

            setMessages([]);
            setReplyTo(null);
            clearFile();
          }
        }

        if (
          action === "block" &&
          isEnabled
        ) {
          stopTyping();
          setText("");
        }
      } catch (
        requestError
      ) {
        setError(
          requestError?.response
            ?.data?.message ||
          requestError?.message ||
          "No se pudo actualizar la conversación."
        );
      } finally {
        setActionLoading("");
      }
    };

  const pinMessage =
    async (message) => {
      const id =
        getMessageId(
          message
        );

      if (!id) {
        return;
      }

      try {
        setActionLoading(
          `pin-${id}`
        );

        setError("");
        setNotice("");

        const updatedConversation =
          await chatService
            .pinMessage(id, serviceOptions);

        applyConversationUpdate(
          updatedConversation
        );

        setNotice(
          "Estado del mensaje fijado actualizado."
        );
      } catch (
        requestError
      ) {
        setError(
          requestError?.response
            ?.data?.message ||
          "No se pudo fijar el mensaje."
        );
      } finally {
        setActionLoading("");
      }
    };

  const editMessage =
    async (message) => {
      const id =
        getMessageId(
          message
        );

      if (!id) {
        return;
      }

      const currentText =
        message?.text ||
        message?.content ||
        "";

      const nextText =
        window.prompt(
          "Editar mensaje:",
          currentText
        );

      if (
        !nextText ||
        !nextText.trim() ||
        nextText.trim() ===
          currentText.trim()
      ) {
        return;
      }

      try {
        setActionLoading(
          `edit-${id}`
        );

        setError("");

        const updated =
          await chatService
            .editMessage(
              id,
              nextText.trim(),
              serviceOptions
            );

        setMessages(
          (current) =>
            dedupeMessages([
              ...current,
              updated
            ])
        );

        updateConversationFromMessage(
          normalizeEntityId(
            activeConversationRef
              .current
          ),
          updated
        );

        setNotice(
          "Mensaje editado."
        );
      } catch (
        requestError
      ) {
        setError(
          requestError?.response
            ?.data?.message ||
          "No se pudo editar el mensaje."
        );
      } finally {
        setActionLoading("");
      }
    };

  const deleteMessage =
    async (message) => {
      const id =
        getMessageId(
          message
        );

      if (
        !id ||
        !window.confirm(
          "¿Eliminar este mensaje?"
        )
      ) {
        return;
      }

      try {
        setActionLoading(
          `delete-${id}`
        );

        setError("");

        const response =
          await chatService
            .deleteMessage(id, serviceOptions);

        const deleted =
          response?.data
            ?.message ||
          response?.message ||
          null;

        if (deleted) {
          setMessages(
            (current) =>
              dedupeMessages([
                ...current,
                deleted
              ])
          );
        } else {
          setMessages(
            (current) =>
              current.map(
                (item) =>
                  sameId(
                    item,
                    id
                  )
                    ? {
                        ...item,
                        deletedForEveryone:
                          true,
                        text:
                          "Mensaje eliminado",
                        content:
                          "Mensaje eliminado",
                        attachments:
                          []
                      }
                    : item
              )
          );
        }

        setNotice(
          "Mensaje eliminado."
        );

        scheduleConversationRefresh();
      } catch (
        requestError
      ) {
        setError(
          requestError?.response
            ?.data?.message ||
          "No se pudo eliminar el mensaje."
        );
      } finally {
        setActionLoading("");
      }
    };

  const createConversationWithUser =
    useCallback(
      async (target) => {
        const receiverId =
          normalizeEntityId(
            target
          );

        if (!receiverId) {
          setError(
            "Selecciona un destinatario válido."
          );

          return null;
        }

        try {
          setActionLoading(
            "new-conversation"
          );

          setError("");
          setNotice("");

          const created =
            await chatService
              .createConversation(
                {
                  receiverId
                },
                serviceOptions
              );

          setConversations(
            (current) =>
              sortConversations(
                dedupeConversations([
                  created,
                  ...current
                ])
              )
          );

          setActiveConversation(
            created
          );

          setNotice(
            target?.destinationType ===
              "INTERNAL"
              ? "Conversación interna abierta."
              : "Conversación oficial con el usuario abierta."
          );

          return created;
        } catch (
          requestError
        ) {
          setError(
            requestError?.response
              ?.data?.message ||
            "No se pudo abrir la conversación."
          );

          return null;
        } finally {
          setActionLoading("");
        }
      },
      [serviceOptions]
    );

  const selectConversation =
    useCallback(
      (conversation) => {
        stopTyping();

        setActiveConversation(
          conversation
        );

        setReplyTo(null);
        clearFile();
        setError("");
        setNotice("");
        setSecurityAlert(null);
      },
      [
        clearFile,
        stopTyping
      ]
    );

  return {
    currentUserId,
    currentUserIds,
    currentUser:
      user,
    socketConnected,
    typingUser,

    endRef,
    conversations,
    filteredConversations,
    activeConversation,

    activeOtherUser:
      activeConversation
        ? getOtherParticipant(
            activeConversation,
            currentUserId
          )
        : null,

    messages,

    filter,
    setFilter,

    search,
    setSearch,

    text,
    setText,

    replyTo,
    setReplyTo,

    file,
    preview,

    viewer,
    setViewer,

    loadingConversations,
    loadingMessages,
    sending,
    actionLoading,

    error,
    notice,

    securityAlert,
    setSecurityAlert,

    loadConversations,
    createConversationWithUser,
    selectConversation,

    selectFile,
    clearFile,

    sendMessage,
    runConversationAction,
    pinMessage,
    editMessage,
    deleteMessage
  };
}
