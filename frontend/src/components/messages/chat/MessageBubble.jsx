import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  createPortal
} from "react-dom";

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

/* QSM_FASE14_BLOCK1_SINGLE_FLOATING_MESSAGE_MENU */

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
  busy = false,
  menuOpen = false,
  onToggleMenu,
  onCloseMenu
}) {
  const [
    reactionOpen,
    setReactionOpen
  ] = useState(false);

  /* QSM_FASE14_BLOCK1_SINGLE_FLOATING_MESSAGE_MENU */
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);

  const [
    menuPosition,
    setMenuPosition
  ] = useState({
    top: 0,
    left: 0,
    placement: "right"
  });

  const updateMenuPosition = () => {
    const button =
      menuButtonRef.current;

    if (!button) {
      return;
    }

    const rect =
      button.getBoundingClientRect();

    const menuWidth = 190;
    const menuHeight =
      reactionOpen ? 330 : 250;

    const gap = 10;
    const safe = 12;

    const spaceRight =
      window.innerWidth -
      rect.right;

    const spaceLeft =
      rect.left;

    const openRight =
      spaceRight >=
        menuWidth + gap ||
      spaceRight >= spaceLeft;

    let left =
      openRight
        ? rect.right + gap
        : rect.left -
          menuWidth -
          gap;

    let top =
      rect.top - 10;

    if (
      top + menuHeight >
      window.innerHeight - safe
    ) {
      top =
        window.innerHeight -
        menuHeight -
        safe;
    }

    if (top < safe) {
      top = safe;
    }

    left = Math.max(
      safe,
      Math.min(
        left,
        window.innerWidth -
          menuWidth -
          safe
      )
    );

    setMenuPosition({
      top,
      left,
      placement:
        openRight
          ? "right"
          : "left"
    });
  };

  useEffect(() => {
    if (!menuOpen) {
      setReactionOpen(false);
      return undefined;
    }

    updateMenuPosition();

    const handleOutside = (event) => {
      const target = event.target;

      if (
        menuRef.current?.contains(
          target
        ) ||
        menuButtonRef.current?.contains(
          target
        )
      ) {
        return;
      }

      onCloseMenu?.();
    };

    const handleViewportChange = () => {
      updateMenuPosition();
    };

    document.addEventListener(
      "pointerdown",
      handleOutside,
      true
    );

    window.addEventListener(
      "resize",
      handleViewportChange
    );

    window.addEventListener(
      "scroll",
      handleViewportChange,
      true
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutside,
        true
      );

      window.removeEventListener(
        "resize",
        handleViewportChange
      );

      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true
      );
    };
  }, [
    menuOpen,
    reactionOpen
  ]);

  const text = getMessageText(message);

  const officialIdentity =
    message?.officialIdentity &&
    typeof message.officialIdentity === "object"
      ? message.officialIdentity
      : null;

  const official =
    officialIdentity?.official === true &&
    message?.official === true;

  const officialDepartment =
    officialIdentity?.departmentLabel ||
    message?.senderDepartmentLabel ||
    officialIdentity?.department ||
    message?.senderDepartment ||
    "Administración";

  const officialAgent =
    [message?.sender?.firstName, message?.sender?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    message?.sender?.name ||
    "Personal autorizado";

  const internalMessage =
    official &&
    String(
      message?.conversationType ||
      message?.channelType ||
      ""
    ).toUpperCase() === "INTERNAL";

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
    setReactionOpen(false);
    onCloseMenu?.();
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
        } ${
          official
            ? "is-qsm-official"
            : ""
        }`}
      >
        {official && !deleted && (
          <div className="qsm-official-message-identity">
            <span className="qsm-official-shield">🛡</span>

            <div>
              <strong>
                {internalMessage
                  ? "MENSAJE INTERNO QSM"
                  : "QSM OFICIAL"}
              </strong>

              <small>
                {officialDepartment}
                {" · "}
                {officialAgent}
                {officialIdentity?.employeeCode
                  ? ` · ${officialIdentity.employeeCode}`
                  : ""}
              </small>
            </div>

            <span className="qsm-official-check">✓</span>
          </div>
        )}

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
            ref={menuButtonRef}
            type="button"
            className="qsm-message-menu-button"
            onClick={(event) => {
              event.stopPropagation();

              setReactionOpen(false);
              onToggleMenu?.();
            }}
            aria-label="Acciones del mensaje"
            aria-expanded={
              menuOpen
            }
          >
            ⋯
          </button>
        )}

        {menuOpen &&
          !deleted &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={menuRef}
              className={`qsm-message-menu qsm-message-menu--floating is-${menuPosition.placement}`}
              style={{
                top:
                  menuPosition.top,
                left:
                  menuPosition.left
              }}
              role="menu"
              aria-label="Acciones del mensaje"
            >
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
            </div>,
            document.body
          )}
      </article>
    </div>
  );
}
