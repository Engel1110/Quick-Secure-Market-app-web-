import { useEffect, useMemo, useState } from "react";

import ChatHeader from "./ChatHeader";
import Composer from "./Composer";
import DateSeparator from "./DateSeparator";
import MessageBubble from "./MessageBubble";
import MessageSkeleton from "./MessageSkeleton";
import PinnedMessage from "./PinnedMessage";
import TypingIndicator from "./TypingIndicator";

import {
  formatUser,
  getMessageText,
  isSameMessageDay,
  normalizeSearch
} from "../../../utils/message.utils";

const getMessageId = (message) =>
  message?._id ||
  message?.id ||
  "";

const getSenderId = (message) =>
  message?.sender?.prismaId ??
  message?.sender?.userId ??
  message?.sender?.id ??
  message?.sender?._id ??
  message?.senderId ??
  message?.sender ??
  "";

/* QSM_FASE14_BLOCK1_SINGLE_FLOATING_MESSAGE_MENU */

export default function ChatWindow({
  conversation,
  otherUser,
  messages = [],
  currentUserId,
  loading = false,
  sending = false,
  actionLoading = false,
  endRef,

  text,
  setText,

  replyTo,
  setReplyTo,

  editingMessage,
  setEditingMessage,

  attachment,
  attachmentPreview,
  onSelectAttachment,
  onClearAttachment,

  onSend,
  onPin,
  onDelete,
  onEdit,
  onCopy,
  onReact,
  onOpenImage,
  onReportMessage,
  onToggleDetails
}) {
  const [searchOpen, setSearchOpen] =
    useState(false);

  const [messageSearch, setMessageSearch] =
    useState("");

  /* QSM_FASE14_BLOCK1_SINGLE_FLOATING_MESSAGE_MENU */
  const [
    openMessageMenuId,
    setOpenMessageMenuId
  ] = useState("");

  const closeMessageMenu = () => {
    setOpenMessageMenuId("");
  };

  useEffect(() => {
    closeMessageMenu();
  }, [
    conversation?._id,
    conversation?.id
  ]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        closeMessageMenu();
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        closeOnEscape
      );
    };
  }, []);

  const safeMessages = useMemo(
    () =>
      Array.isArray(messages)
        ? messages
        : [],
    [messages]
  );

  const filteredMessages = useMemo(() => {
    const term =
      normalizeSearch(messageSearch);

    if (!term) {
      return safeMessages;
    }

    return safeMessages.filter(
      (message) => {
        const attachmentNames =
          Array.isArray(
            message?.attachments
          )
            ? message.attachments
                .map(
                  (attachment) =>
                    attachment?.name ||
                    attachment
                      ?.originalName ||
                    ""
                )
                .join(" ")
            : "";

        const searchableContent = [
          getMessageText(message),
          attachmentNames,
          message?.sender?.name,
          message?.sender?.firstName,
          message?.sender?.lastName
        ]
          .filter(Boolean)
          .join(" ");

        return normalizeSearch(
          searchableContent
        ).includes(term);
      }
    );
  }, [
    safeMessages,
    messageSearch
  ]);

  const pinnedMessage = useMemo(() => {
    const pinnedValues =
      Array.isArray(
        conversation?.pinnedMessages
      )
        ? conversation.pinnedMessages
        : [];

    const pinnedIds = new Set(
      pinnedValues
        .map((value) =>
          String(
            value?._id ||
              value?.id ||
              value ||
              ""
          )
        )
        .filter(Boolean)
    );

    return (
      safeMessages.find((message) =>
        pinnedIds.has(
          String(getMessageId(message))
        )
      ) ||
      pinnedValues.find(
        (value) =>
          value &&
          typeof value === "object"
      ) ||
      null
    );
  }, [
    conversation?.pinnedMessages,
    safeMessages
  ]);

  const closeSearch = () => {
    setMessageSearch("");
    setSearchOpen(false);
  };

  const cancelEditing = () => {
    setEditingMessage?.(null);
    setText?.("");
  };

  const openPinnedMessage = () => {
    const messageId =
      getMessageId(pinnedMessage);

    if (!messageId) {
      return;
    }

    document
      .getElementById(
        `message-${messageId}`
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
  };

  if (!conversation) {
    return (
      <section className="qsm-chat-window">
        <div className="qsm-chat-empty">
          <span className="qsm-chat-empty__icon">
            💬
          </span>

          <h2>
            Selecciona una conversación
          </h2>

          <p>
            Revisa mensajes, archivos y
            datos asociados a una compra
            o venta.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="qsm-chat-window">
      <ChatHeader
        conversation={conversation}
        otherUser={otherUser}
        searchOpen={searchOpen}
        onToggleSearch={() => {
          setSearchOpen(
            (current) => !current
          );

          if (searchOpen) {
            setMessageSearch("");
          }
        }}
        onToggleDetails={
          onToggleDetails
        }
      />

      {searchOpen && (
        <div className="qsm-message-search">
          <span aria-hidden="true">
            ⌕
          </span>

          <input
            type="search"
            value={messageSearch}
            onChange={(event) =>
              setMessageSearch(
                event.target.value
              )
            }
            placeholder="Buscar dentro de esta conversación..."
            aria-label="Buscar mensajes"
            autoFocus
          />

          <button
            type="button"
            onClick={closeSearch}
            aria-label="Cerrar búsqueda"
          >
            ×
          </button>
        </div>
      )}

      <div className="qsm-security-banner">
        <strong>
          🛡 Conversación protegida
        </strong>

        <span>
          No compartas contraseñas,
          códigos bancarios ni realices
          pagos fuera de QSM.
        </span>
      </div>

      <PinnedMessage
        message={pinnedMessage}
        onOpen={openPinnedMessage}
      />

      <div
        className="qsm-message-list"
        onScroll={closeMessageMenu}
      >
        {loading && (
          <MessageSkeleton />
        )}

        {!loading &&
          filteredMessages.length ===
            0 && (
            <div className="qsm-chat-empty">
              <span className="qsm-chat-empty__icon">
                {messageSearch
                  ? "⌕"
                  : "✦"}
              </span>

              <h3>
                {messageSearch
                  ? "No encontramos coincidencias"
                  : "Inicia la conversación"}
              </h3>

              <p>
                {messageSearch
                  ? "Prueba con otra palabra o con el nombre de un archivo."
                  : "Escribe un mensaje claro y mantén toda la operación dentro de QSM."}
              </p>
            </div>
          )}

        {!loading &&
          filteredMessages.map(
            (message, index) => {
              const previous =
                filteredMessages[
                  index - 1
                ];

              const messageId =
                getMessageId(message) ||
                `temporary-${index}`;

              const senderId =
                getSenderId(message);

              const previousSenderId =
                getSenderId(previous);

              const mine =
                String(senderId) ===
                String(
                  currentUserId || ""
                );

              const sameDay =
                Boolean(previous) &&
                isSameMessageDay(
                  previous?.createdAt,
                  message?.createdAt
                );

              const grouped =
                Boolean(previous) &&
                sameDay &&
                String(
                  previousSenderId
                ) ===
                  String(senderId);

              const showDate =
                !previous || !sameDay;

              return (
                <div
                  key={messageId}
                  id={`message-${messageId}`}
                  className="qsm-message-wrapper"
                >
                  {showDate && (
                    <DateSeparator
                      value={
                        message?.createdAt
                      }
                    />
                  )}

                  <MessageBubble
                    message={message}
                    mine={mine}
                    grouped={grouped}
                    onReply={
                      setReplyTo
                    }
                    onPin={onPin}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onCopy={onCopy}
                    onReact={onReact}
                    onOpenImage={
                      onOpenImage
                    }
                    onReport={
                      onReportMessage
                    }
                    busy={Boolean(
                      actionLoading
                    )}
                    menuOpen={
                      String(
                        openMessageMenuId
                      ) ===
                      String(messageId)
                    }
                    onToggleMenu={() => {
                      setOpenMessageMenuId(
                        (current) =>
                          String(current) ===
                          String(messageId)
                            ? ""
                            : messageId
                      );
                    }}
                    onCloseMenu={
                      closeMessageMenu
                    }
                  />
                </div>
              );
            }
          )}

        <TypingIndicator
          name={formatUser(otherUser)}
          visible={Boolean(
            conversation?.isTyping
          )}
        />

        <div ref={endRef} />
      </div>

      <Composer
        text={text}
        setText={setText}
        sending={sending}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        editingMessage={
          editingMessage
        }
        onCancelEdit={
          cancelEditing
        }
        attachment={attachment}
        attachmentPreview={
          attachmentPreview
        }
        onSelectAttachment={
          onSelectAttachment
        }
        onClearAttachment={
          onClearAttachment
        }
        onSend={onSend}
      />
    </section>
  );
}
