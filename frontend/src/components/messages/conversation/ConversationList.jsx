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
  onRefresh
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
                  }`}
                  onClick={() =>
                    onSelect?.(
                      conversation
                    )
                  }
                  aria-pressed={
                    active
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
                      <strong>
                        {name}
                      </strong>

                      <time>
                        {formatTime(
                          lastMessageDate
                        )}
                      </time>
                    </div>

                    <span className="qsm-conversation-product">
                      {conversation
                        ?.product
                        ?.title ||
                        conversation
                          ?.product
                          ?.name ||
                        "Conversación QSM"}
                    </span>

                    <p>
                      {getLastMessageText(
                        conversation
                      )}
                    </p>
                  </div>

                  {unread > 0 && (
                    <span className="qsm-unread-badge">
                      {unread > 99
                        ? "99+"
                        : unread}
                    </span>
                  )}
                </button>
              );
            }
          )}
      </div>
    </aside>
  );
}