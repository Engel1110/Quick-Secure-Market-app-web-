import {
  formatTime,
  formatUser,
  getAvatar,
  getInitials,
  getOtherParticipant,
  getUnreadCount
} from "../../../utils/message.utils";

const FILTERS = [
  ["ALL", "Todas"],
  ["UNREAD", "No leídas"],
  ["FAVORITES", "Favoritas"],
  ["ARCHIVED", "Archivadas"]
];

const getConversationId = (
  conversation
) =>
  conversation?._id ||
  conversation?.id ||
  "";

const getLastMessageText = (
  conversation
) => {
  const lastMessage =
    conversation?.lastMessage;

  if (
    typeof lastMessage ===
    "string"
  ) {
    return lastMessage;
  }

  return (
    lastMessage?.text ||
    lastMessage?.content ||
    lastMessage?.body ||
    conversation?.product?.title ||
    "Nueva conversación"
  );
};

/* QSM_FASE14_BLOCK2_UNIFORM_CONVERSATION_LIST */

const getConversationVisualState = (
  conversation,
  unread
) => {
  const channelType =
    String(
      conversation?.channelType ||
      ""
    ).toUpperCase();

  const status =
    String(
      conversation?.status ||
      conversation?.conversationStatus ||
      ""
    ).toUpperCase();

  const hasDispute =
    Boolean(
      conversation?.dispute ||
      conversation?.disputeId ||
      conversation?.hasDispute
    ) ||
    status.includes("DISPUT");

  const archived =
    Boolean(
      conversation?.archived ||
      conversation?.isArchived
    ) ||
    status === "ARCHIVED";

  const favorite =
    Boolean(
      conversation?.favorite ||
      conversation?.isFavorite
    );

  return {
    channelType,
    hasDispute,
    archived,
    favorite,
    unread: Number(unread || 0) > 0
  };
};

const getConversationContextLabel = (
  conversation,
  visualState
) => {
  if (visualState.hasDispute) {
    return "DISPUTA";
  }

  if (
    visualState.channelType ===
    "INTERNAL"
  ) {
    return "INTERNO";
  }

  if (
    conversation?.order ||
    conversation?.orderId
  ) {
    return "ORDEN";
  }

  if (conversation?.product) {
    return "PRODUCTO";
  }

  return "QSM";
};

/* QSM_FASE14_BLOCK2_UNIFORM_CONVERSATION_LIST */

export default function ConversationList({
  conversations = [],
  activeConversation,
  currentUserId,
  loading = false,
  filter = "ALL",
  setFilter,
  search = "",
  setSearch,
  onSelect,
  onRefresh,
  adminMode = false,
  onNewConversation
}) {
  const safeConversations =
    Array.isArray(conversations)
      ? conversations
      : [];

  const activeId =
    getConversationId(
      activeConversation
    );

  return (
    <aside className="qsm-conversations">
      <div className="qsm-conversations__header">
        <div>
          <p className="qsm-eyebrow">
            MENSAJES
          </p>

          <h2>
            Conversaciones
          </h2>
        </div>

        <div className="qsm-conversation-header-actions">
          {adminMode && (
            <button
              type="button"
              className="qsm-new-conversation-button"
              onClick={
                onNewConversation
              }
            >
              + Nueva
            </button>
          )}

          <button
            type="button"
            className="qsm-icon-button"
            onClick={() =>
              onRefresh?.()
            }
            disabled={loading}
            title="Actualizar conversaciones"
            aria-label="Actualizar conversaciones"
          >
            ↻
          </button>
        </div>
      </div>

      <label className="qsm-chat-search">
        <span aria-hidden="true">
          ⌕
        </span>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch?.(
              event.target.value
            )
          }
          placeholder="Buscar persona, producto o mensaje..."
          aria-label="Buscar conversaciones"
        />
      </label>

      <div className="qsm-chat-filters">
        {FILTERS.map(
          ([value, label]) => (
            <button
              type="button"
              key={value}
              className={
                filter === value
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                setFilter?.(value)
              }
            >
              {label}
            </button>
          )
        )}
      </div>

      <div className="qsm-conversation-list">
        {loading && (
          <div className="qsm-chat-empty qsm-chat-empty--small">
            Cargando conversaciones...
          </div>
        )}

        {!loading &&
          safeConversations.length ===
            0 && (
            <div className="qsm-chat-empty qsm-chat-empty--small">
              <strong>
                No hay conversaciones
              </strong>

              <span>
                Cuando contactes a
                alguien aparecerá aquí.
              </span>
            </div>
          )}

        {!loading &&
          safeConversations.map(
            (conversation) => {
              const conversationId =
                getConversationId(
                  conversation
                );

              const other =
                getOtherParticipant(
                  conversation,
                  currentUserId
                );

              const name =
                formatUser(other);

              const avatar =
                getAvatar(other);

              const unread =
                getUnreadCount(
                  conversation,
                  currentUserId
                );

              const visualState =
                getConversationVisualState(
                  conversation,
                  unread
                );

              const contextLabel =
                getConversationContextLabel(
                  conversation,
                  visualState
                );

              const active =
                String(activeId) ===
                String(
                  conversationId
                );

              const lastMessageDate =
                conversation
                  ?.lastMessage
                  ?.createdAt ||
                conversation
                  ?.updatedAt ||
                conversation
                  ?.createdAt;

              return (
                <button
                  type="button"
                  key={
                    conversationId
                  }
                  className={`qsm-conversation-item ${
                    active
                      ? "is-active"
                      : ""
                  } ${
                    visualState.unread
                      ? "has-unread"
                      : ""
                  } ${
                    visualState.favorite
                      ? "is-favorite"
                      : ""
                  } ${
                    visualState.archived
                      ? "is-archived"
                      : ""
                  } ${
                    visualState.hasDispute
                      ? "has-dispute"
                      : ""
                  }`}
                  onClick={() =>
                    onSelect?.(
                      conversation
                    )
                  }
                  aria-pressed={
                    active
                  }
                  aria-label={
                    `Abrir conversación con ${name}`
                  }
                  title={
                    `${name} · ${getLastMessageText(
                      conversation
                    )}`
                  }
                >
                  <div className="qsm-avatar qsm-avatar--conversation">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                      />
                    ) : (
                      <span>
                        {getInitials(
                          name
                        )}
                      </span>
                    )}

                    <i
                      className="qsm-online-dot"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="qsm-conversation-item__content">
                    <div className="qsm-conversation-item__top">
                      <div className="qsm-conversation-name-line">
                        <strong>
                          {name}
                        </strong>

                        {visualState.favorite && (
                          <span
                            className="qsm-conversation-favorite"
                            title="Conversación favorita"
                            aria-label="Conversación favorita"
                          >
                            ★
                          </span>
                        )}
                      </div>

                      <time>
                        {formatTime(
                          lastMessageDate
                        )}
                      </time>
                    </div>

                    <span className="qsm-conversation-product">
                      <b
                        className={`qsm-conversation-context-pill is-${contextLabel.toLowerCase()}`}
                      >
                        {contextLabel}
                      </b>

                      {adminMode && (
                        <b
                          className={
                            conversation?.channelType ===
                              "INTERNAL"
                              ? "qsm-channel-pill is-internal"
                              : "qsm-channel-pill is-external"
                          }
                        >
                          {conversation?.channelType ===
                            "INTERNAL"
                            ? "INTERNO"
                            : "USUARIO"}
                        </b>
                      )}

                      {conversation
                        ?.product
                        ?.title ||
                        conversation
                          ?.product
                          ?.name ||
                        (
                          conversation?.channelType ===
                            "INTERNAL"
                            ? "Conversación entre oficinas"
                            : "Conversación QSM"
                        )}
                    </span>

                    <div className="qsm-conversation-preview-line">
                      <p>
                        {getLastMessageText(
                          conversation
                        )}
                      </p>

                      {visualState.hasDispute && (
                        <span
                          className="qsm-conversation-risk-dot"
                          title="Conversación vinculada a una disputa"
                          aria-label="Conversación vinculada a una disputa"
                        />
                      )}
                    </div>
                  </div>

                  <div className="qsm-conversation-item__aside">
                    {unread > 0 && (
                      <span className="qsm-unread-badge">
                        {unread > 99
                          ? "99+"
                          : unread}
                      </span>
                    )}

                    {!unread &&
                      visualState.archived && (
                        <span
                          className="qsm-conversation-archived-icon"
                          title="Conversación archivada"
                          aria-label="Conversación archivada"
                        >
                          ◇
                        </span>
                      )}
                  </div>
                </button>
              );
            }
          )}
      </div>
    </aside>
  );
}
