import {
  useMemo,
  useState
} from "react";

import AttachmentMessage from "../media/AttachmentMessage";

import {
  formatTime,
  getMessageText
} from "../../../utils/message.utils";

const REACTIONS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "👏"
];

export default function MessageBubble({
  message,
  mine = false,
  grouped = false,
  onReply,
  onPin,
  onDelete,
  onEdit,
  onCopy,
  onReact,
  onOpenImage,
  onReport,
  busy = false
}) {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [
    reactionOpen,
    setReactionOpen
  ] = useState(false);

  const text = getMessageText(message);

  const attachments =
    Array.isArray(
      message?.attachments
    )
      ? message.attachments
      : [];

  const deleted =
    Boolean(
      message?.deletedForEveryone
    ) ||
    message?.status === "DELETED";

  const flagged =
    Boolean(message?.isFlagged) ||
    message?.status === "BLOCKED";

  const reactions = useMemo(() => {
    const values =
      Array.isArray(
        message?.reactions
      )
        ? message.reactions
        : [];

    const groupedReactions =
      new Map();

    values.forEach((reaction) => {
      const emoji =
        reaction?.emoji || "👍";

      groupedReactions.set(
        emoji,
        (
          groupedReactions.get(
            emoji
          ) || 0
        ) + 1
      );
    });

    return Array.from(
      groupedReactions.entries()
    );
  }, [message?.reactions]);

  const status =
    String(
      message?.status || "SENT"
    ).toUpperCase();

  const statusLabel =
    status === "READ"
      ? "Leído"
      : status === "DELIVERED"
      ? "Entregado"
      : status === "FAILED"
      ? "Error al enviar"
      : "Enviado";

  const closeMenu = () => {
    setMenuOpen(false);
    setReactionOpen(false);
  };

  return (
    <div
      className={`qsm-message-row ${
        mine
          ? "is-mine"
          : "is-other"
      } ${
        grouped
          ? "is-grouped"
          : ""
      }`}
    >
      <article
        className={`qsm-message-bubble ${
          mine
            ? "is-mine"
            : "is-other"
        } ${
          flagged
            ? "is-flagged"
            : ""
        } ${
          deleted
            ? "is-deleted"
            : ""
        }`}
      >
        {message?.replyTo && (
          <div className="qsm-message-reply">
            <strong>
              Respuesta
            </strong>

            <span>
              {getMessageText(
                message.replyTo
              ) ||
                "Mensaje anterior"}
            </span>
          </div>
        )}

        {deleted ? (
          <p className="qsm-message-deleted">
            Este mensaje fue eliminado.
          </p>
        ) : (
          <>
            {attachments.map(
              (
                attachment,
                index
              ) => (
                <AttachmentMessage
                  key={
                    attachment?._id ||
                    attachment?.id ||
                    `${attachment?.url || attachment?.name || "attachment"}-${index}`
                  }
                  attachment={
                    attachment
                  }
                  onOpenImage={
                    onOpenImage
                  }
                />
              )
            )}

            {text && (
              <p className="qsm-message-text">
                {text}
              </p>
            )}
          </>
        )}

        {flagged && !deleted && (
          <div
            className={`qsm-message-risk is-${String(
              message?.riskLevel ||
                "MEDIUM"
            ).toLowerCase()}`}
          >
            ⚠{" "}
            {message?.aiReason ||
              "Mensaje marcado por seguridad QSM."}
          </div>
        )}

        {reactions.length > 0 &&
          !deleted && (
            <div className="qsm-message-reactions">
              {reactions.map(
                ([emoji, count]) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() =>
                      onReact?.(
                        message,
                        emoji
                      )
                    }
                    disabled={
                      busy
                    }
                  >
                    {emoji} {count}
                  </button>
                )
              )}
            </div>
          )}

        <footer>
          <time
            dateTime={
              message?.createdAt ||
              undefined
            }
          >
            {formatTime(
              message?.createdAt
            )}
          </time>

          {message?.isEdited && (
            <span>
              Editado
            </span>
          )}

          {mine && !deleted && (
            <span
              className={`qsm-message-status is-${status.toLowerCase()}`}
              title={statusLabel}
            >
              {status === "READ" ||
              status === "DELIVERED"
                ? "✓✓"
                : status === "FAILED"
                ? "!"
                : "✓"}
            </span>
          )}
        </footer>

        {!deleted && (
          <button
            type="button"
            className="qsm-message-menu-button"
            onClick={() => {
              setMenuOpen(
                (current) =>
                  !current
              );

              setReactionOpen(
                false
              );
            }}
            aria-label="Acciones del mensaje"
            aria-expanded={
              menuOpen
            }
          >
            ⋯
          </button>
        )}

        {menuOpen && !deleted && (
          <div className="qsm-message-menu">
            <button
              type="button"
              onClick={() => {
                onReply?.(
                  message
                );

                closeMenu();
              }}
            >
              Responder
            </button>

            {text && (
              <button
                type="button"
                onClick={() => {
                  onCopy?.(
                    message
                  );

                  closeMenu();
                }}
              >
                Copiar
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setReactionOpen(
                  (current) =>
                    !current
                )
              }
            >
              Reaccionar
            </button>

            <button
              type="button"
              onClick={() => {
                onPin?.(
                  message
                );

                closeMenu();
              }}
              disabled={busy}
            >
              Fijar
            </button>

            {mine && (
              <button
                type="button"
                onClick={() => {
                  onEdit?.(
                    message
                  );

                  closeMenu();
                }}
                disabled={busy}
              >
                Editar
              </button>
            )}

            {!mine && (
              <button
                type="button"
                onClick={() => {
                  onReport?.(
                    message
                  );

                  closeMenu();
                }}
                disabled={busy}
              >
                Reportar
              </button>
            )}

            {mine && (
              <button
                type="button"
                className="is-danger"
                onClick={() => {
                  onDelete?.(
                    message
                  );

                  closeMenu();
                }}
                disabled={busy}
              >
                Eliminar
              </button>
            )}

            {reactionOpen && (
              <div className="qsm-message-reaction-picker">
                {REACTIONS.map(
                  (emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => {
                        onReact?.(
                          message,
                          emoji
                        );

                        closeMenu();
                      }}
                      disabled={
                        busy
                      }
                    >
                      {emoji}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}