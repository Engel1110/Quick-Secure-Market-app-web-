import ConversationFilterBar from "./ConversationFilterBar";
import ConversationLabels from "./ConversationLabels";
import ConversationOrganizationActions from "./ConversationOrganizationActions";

function normalizeId(value) {
  return String(
    value?._id ||
      value?.id ||
      value?.userId ||
      value ||
      ""
  );
}

function getConversationTitle(
  conversation,
  userId
) {
  if (conversation?.title) {
    return conversation.title;
  }

  const otherParticipant =
    (
      conversation?.participants ||
      conversation?.users ||
      []
    ).find(
      (participant) =>
        normalizeId(participant) !==
        String(userId || "")
    );

  if (!otherParticipant) {
    return "Conversación";
  }

  const fullName = `${otherParticipant.firstName || ""} ${
    otherParticipant.lastName || ""
  }`.trim();

  return (
    fullName ||
    otherParticipant.name ||
    otherParticipant.email ||
    "Conversación"
  );
}

function getLastMessageText(
  conversation
) {
  return (
    conversation?.lastMessage?.text ||
    conversation?.lastMessage?.content ||
    conversation?.lastMessage?.body ||
    "Sin mensajes todavía"
  );
}

function formatConversationDate(
  value
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    "es-DO",
    {
      day: "2-digit",
      month: "short"
    }
  );
}

export default function SmartConversationSidebar({
  conversations = [],
  selectedConversationId,
  onSelectConversation,
  activeFilter,
  onFilterChange,
  searchText = "",
  onSearchChange,
  summary,
  userId,
  onFavorite,
  onPin,
  onArchive,
  onRestore
}) {
  return (
    <aside className="qsm-smart-sidebar">
      <div className="qsm-smart-sidebar-header">
        <div>
          <small>QSM Messages</small>
          <h2>Conversaciones</h2>
        </div>

        <span className="qsm-total-badge">
          {summary?.total ??
            conversations.length}
        </span>
      </div>

      <div className="qsm-conversation-search">
        <input
          type="search"
          placeholder="Buscar conversaciones..."
          value={searchText}
          onChange={(event) =>
            onSearchChange?.(
              event.target.value
            )
          }
        />
      </div>

      <ConversationFilterBar
        activeFilter={activeFilter}
        onChange={onFilterChange}
        summary={summary}
      />

      <div className="qsm-smart-conversation-list">
        {conversations.map(
          (conversation) => {
            const conversationId =
              normalizeId(conversation);

            const selected =
              String(
                selectedConversationId ||
                  ""
              ) === conversationId;

            const title =
              getConversationTitle(
                conversation,
                userId
              );

            const lastMessage =
              getLastMessageText(
                conversation
              );

            return (
              <div
                key={conversationId}
                className={
                  selected
                    ? "qsm-smart-conversation is-selected"
                    : "qsm-smart-conversation"
                }
                role="button"
                tabIndex={0}
                onClick={() =>
                  onSelectConversation?.(
                    conversation
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();

                    onSelectConversation?.(
                      conversation
                    );
                  }
                }}
              >
                <div className="qsm-avatar">
                  {title
                    .slice(0, 1)
                    .toUpperCase()}
                </div>

                <div className="qsm-smart-conversation-body">
                  <div className="qsm-smart-conversation-top">
                    <strong>
                      {title}
                    </strong>

                    <span>
                      {formatConversationDate(
                        conversation.updatedAt ||
                          conversation
                            .lastMessage
                            ?.createdAt
                      )}
                    </span>
                  </div>

                  <p>{lastMessage}</p>

                  <div className="qsm-smart-conversation-meta">
                    <ConversationLabels
                      conversation={
                        conversation
                      }
                      userId={userId}
                      compact
                    />

                    {[
                      "HIGH",
                      "CRITICAL"
                    ].includes(
                      conversation.priority
                    ) && (
                      <span className="qsm-risk-badge">
                        {conversation.priority ===
                        "CRITICAL"
                          ? "Crítico"
                          : "Riesgo alto"}
                      </span>
                    )}
                  </div>
                </div>

                <ConversationOrganizationActions
                  conversation={
                    conversation
                  }
                  userId={userId}
                  onFavorite={onFavorite}
                  onPin={onPin}
                  onArchive={onArchive}
                  onRestore={onRestore}
                />
              </div>
            );
          }
        )}

        {!conversations.length && (
          <div className="qsm-empty-conversations">
            No hay conversaciones para
            este filtro.
          </div>
        )}
      </div>
    </aside>
  );
}