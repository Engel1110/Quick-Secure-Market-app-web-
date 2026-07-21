import {
  useEffect,
  useState
} from "react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

import {
  ChatWindow,
  ConversationDetails,
  ConversationList,
  ImageViewer
} from "../components/messages";

import useMessages from "../hooks/useMessages";

import "../styles/messages.css";

export default function Messages() {
  const chat = useMessages();

  const [
    detailsOpen,
    setDetailsOpen
  ] = useState(true);

  const [
    sidebarCollapsed,
    setSidebarCollapsed
  ] = useState(
    () =>
      localStorage.getItem(
        "qsm_sidebar_collapsed"
      ) === "true"
  );

  useEffect(() => {
    const sync = (
      event
    ) => {
      const collapsed =
        event?.detail
          ?.collapsed;

      setSidebarCollapsed(
        typeof collapsed ===
          "boolean"
          ? collapsed
          : localStorage.getItem(
              "qsm_sidebar_collapsed"
            ) === "true"
      );
    };

    window.addEventListener(
      "qsm-sidebar-changed",
      sync
    );

    window.addEventListener(
      "storage",
      sync
    );

    return () => {
      window.removeEventListener(
        "qsm-sidebar-changed",
        sync
      );

      window.removeEventListener(
        "storage",
        sync
      );
    };
  }, []);

  const handleCopyMessage = (
    message
  ) => {
    if (
      typeof chat.copyMessage ===
      "function"
    ) {
      chat.copyMessage(
        message
      );

      return;
    }

    const content =
      message?.text ||
      message?.content ||
      message?.body ||
      "";

    if (!content) {
      return;
    }

    navigator.clipboard
      ?.writeText(content)
      .catch(() => {});
  };

  const handleEditMessage = (
    message
  ) => {
    if (
      typeof chat.editMessage ===
      "function"
    ) {
      chat.editMessage(
        message
      );

      return;
    }

    if (
      typeof chat.startEditingMessage ===
      "function"
    ) {
      chat.startEditingMessage(
        message
      );

      return;
    }

    chat.setEditingMessage?.(
      message
    );

    chat.setText?.(
      message?.text ||
        message?.content ||
        message?.body ||
        ""
    );
  };

  const attachment =
    chat.attachment ||
    chat.file ||
    null;

  const attachmentPreview =
    chat.attachmentPreview ||
    chat.preview ||
    "";

  const selectAttachment =
    chat.selectAttachment ||
    chat.selectFile;

  const clearAttachment =
    chat.clearAttachment ||
    chat.clearFile;

  const viewerSource =
    chat.viewer ||
    chat.viewerSource ||
    "";

  return (
    <div className="qsm-messages-page">
      <div
        className="qsm-messages-shell"
        style={{
          gridTemplateColumns:
            sidebarCollapsed
              ? "96px minmax(0, 1fr)"
              : "300px minmax(0, 1fr)"
        }}
      >
        <div className="qsm-messages-sidebar">
          <Sidebar />
        </div>

        <main className="qsm-messages-main">
          <Topbar />

          <section className="qsm-messages-title">
            <div>
              <p className="qsm-eyebrow">
                CENTRO DE MENSAJES QSM
              </p>

              <h1>
                Conversaciones{" "}
                <span>
                  seguras
                </span>
              </h1>

              <p>
                Comunícate con
                compradores y
                vendedores, comparte
                evidencia y mantén
                cada acuerdo dentro
                de QSM.
              </p>
            </div>

            <div className="qsm-message-protection">
              <span aria-hidden="true">
                🛡
              </span>

              <div>
                <strong>
                  Protección activa
                </strong>

                <p>
                  Mensajes asociados a
                  productos y órdenes.
                </p>
              </div>
            </div>
          </section>

          {chat.error && (
            <div className="qsm-chat-alert is-error">
              {chat.error}
            </div>
          )}

          {chat.notice && (
            <div className="qsm-chat-alert is-success">
              {chat.notice}
            </div>
          )}

          <section
            className={`qsm-messages-layout ${
              detailsOpen &&
              chat.activeConversation
                ? "has-details"
                : ""
            }`}
          >
            <ConversationList
              conversations={
                chat.filteredConversations ||
                chat.conversations ||
                []
              }
              activeConversation={
                chat.activeConversation
              }
              currentUserId={
                chat.currentUserId
              }
              loading={
                Boolean(
                  chat.loadingConversations
                )
              }
              filter={
                chat.filter ||
                "ALL"
              }
              setFilter={
                chat.setFilter
              }
              search={
                chat.search ||
                ""
              }
              setSearch={
                chat.setSearch
              }
              onSelect={
                chat.selectConversation
              }
              onRefresh={
                chat.loadConversations
              }
            />

            <ChatWindow
              conversation={
                chat.activeConversation
              }
              otherUser={
                chat.activeOtherUser
              }
              messages={
                Array.isArray(
                  chat.messages
                )
                  ? chat.messages
                  : []
              }
              currentUserId={
                chat.currentUserId
              }
              loading={
                Boolean(
                  chat.loadingMessages
                )
              }
              sending={
                Boolean(
                  chat.sending
                )
              }
              actionLoading={
                Boolean(
                  chat.actionLoading
                )
              }
              endRef={
                chat.endRef
              }
              text={
                chat.text || ""
              }
              setText={
                chat.setText
              }
              replyTo={
                chat.replyTo
              }
              setReplyTo={
                chat.setReplyTo
              }
              editingMessage={
                chat.editingMessage
              }
              setEditingMessage={
                chat.setEditingMessage
              }
              attachment={
                attachment
              }
              attachmentPreview={
                attachmentPreview
              }
              onSelectAttachment={
                selectAttachment
              }
              onClearAttachment={
                clearAttachment
              }
              onSend={
                chat.sendMessage
              }
              onPin={
                chat.pinMessage
              }
              onDelete={
                chat.deleteMessage
              }
              onEdit={
                handleEditMessage
              }
              onCopy={
                handleCopyMessage
              }
              onReact={
                chat.reactToMessage ||
                chat.toggleReaction ||
                chat.addReaction
              }
              onOpenImage={
                chat.setViewer ||
                chat.setViewerSource
              }
              onReportMessage={
                chat.setReportedMessage ||
                chat.reportMessage
              }
              onToggleDetails={() =>
                setDetailsOpen(
                  (current) =>
                    !current
                )
              }
            />

            <ConversationDetails
              open={
                detailsOpen
              }
              conversation={
                chat.activeConversation
              }
              otherUser={
                chat.activeOtherUser
              }
              actionLoading={
                chat.actionLoading
              }
              onClose={() =>
                setDetailsOpen(
                  false
                )
              }
              onAction={
                chat.runConversationAction
              }
            />
          </section>
        </main>
      </div>

      <ImageViewer
        source={viewerSource}
        onClose={() => {
          chat.setViewer?.(
            ""
          );

          chat.setViewerSource?.(
            ""
          );
        }}
      />

      <AiAssistant pageContext="messages" />
    </div>
  );
}