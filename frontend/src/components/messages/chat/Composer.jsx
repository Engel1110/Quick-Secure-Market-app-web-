import {
  useRef,
  useState
} from "react";

import EmojiPicker from "./EmojiPicker";
import QuickMessages from "./QuickMessages";

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

export default function Composer({
  text = "",
  setText,
  sending = false,
  replyTo,
  setReplyTo,
  editingMessage,
  onCancelEdit,
  attachment,
  attachmentPreview,
  onSelectAttachment,
  onClearAttachment,
  onSend
}) {
  const fileRef =
    useRef(null);

  const [
    emojiOpen,
    setEmojiOpen
  ] = useState(false);

  const [
    quickOpen,
    setQuickOpen
  ] = useState(false);

  const [
    localError,
    setLocalError
  ] = useState("");

  const canSend =
    !sending &&
    Boolean(
      String(text || "").trim() ||
        attachment
    );

  const submit = (
    event
  ) => {
    event?.preventDefault();

    if (!canSend) {
      return;
    }

    onSend?.();
  };

  const selectFile = (
    file
  ) => {
    setLocalError("");

    if (!file) {
      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setLocalError(
        "El archivo supera el límite de 20 MB."
      );

      return;
    }

    onSelectAttachment?.(
      file
    );
  };

  return (
    <form
      className="qsm-composer"
      onSubmit={submit}
    >
      {editingMessage && (
        <div className="qsm-composer-editing">
          <div>
            <strong>
              Editando mensaje
            </strong>

            <span>
              {editingMessage?.text ||
                editingMessage?.content ||
                editingMessage?.body ||
                "Mensaje"}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              onCancelEdit?.()
            }
            disabled={sending}
            aria-label="Cancelar edición"
          >
            ×
          </button>
        </div>
      )}

      {replyTo &&
        !editingMessage && (
          <div className="qsm-composer-reply">
            <div>
              <strong>
                Respondiendo
              </strong>

              <span>
                {replyTo?.text ||
                  replyTo?.content ||
                  replyTo?.body ||
                  "Mensaje"}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setReplyTo?.(
                  null
                )
              }
              disabled={sending}
              aria-label="Cancelar respuesta"
            >
              ×
            </button>
          </div>
        )}

      {attachment && (
        <div className="qsm-attachment-preview">
          {attachmentPreview &&
            attachment?.type?.startsWith(
              "image/"
            ) && (
              <img
                src={
                  attachmentPreview
                }
                alt="Vista previa"
              />
            )}

          {attachmentPreview &&
            attachment?.type?.startsWith(
              "video/"
            ) && (
              <video
                src={
                  attachmentPreview
                }
                controls
              />
            )}

          {!attachmentPreview && (
            <div className="qsm-attachment-file-preview">
              <span aria-hidden="true">
                📄
              </span>

              <div>
                <strong>
                  {attachment.name}
                </strong>

                <small>
                  {(
                    attachment.size /
                    1024 /
                    1024
                  ).toFixed(1)}{" "}
                  MB
                </small>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              onClearAttachment?.()
            }
            disabled={sending}
            aria-label="Eliminar archivo adjunto"
          >
            ×
          </button>
        </div>
      )}

      <div className="qsm-composer-tools">
        <button
          type="button"
          onClick={() => {
            setEmojiOpen(
              (current) =>
                !current
            );

            setQuickOpen(false);
          }}
          title="Emojis"
          disabled={sending}
        >
          ☺
        </button>

        <button
          type="button"
          onClick={() => {
            setQuickOpen(
              (current) =>
                !current
            );

            setEmojiOpen(false);
          }}
          title="Respuestas rápidas"
          disabled={sending}
        >
          ⚡
        </button>

        <button
          type="button"
          onClick={() =>
            fileRef.current?.click()
          }
          title="Adjuntar archivo"
          disabled={sending}
        >
          📎
        </button>
      </div>

      <EmojiPicker
        open={emojiOpen}
        onClose={() =>
          setEmojiOpen(false)
        }
        onSelect={(emoji) => {
          setText?.(
            (current) =>
              `${current || ""}${emoji}`
          );

          setEmojiOpen(false);
        }}
      />

      <QuickMessages
        open={quickOpen}
        onClose={() =>
          setQuickOpen(false)
        }
        onSelect={(message) => {
          setText?.(message);
          setQuickOpen(false);
        }}
      />

      <div className="qsm-composer__row">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.zip,.rar"
          hidden
          onChange={(event) => {
            selectFile(
              event.target
                .files?.[0]
            );

            event.target.value =
              "";
          }}
        />

        <textarea
          value={text || ""}
          onChange={(event) =>
            setText?.(
              event.target.value
            )
          }
          placeholder={
            editingMessage
              ? "Edita el mensaje..."
              : "Escribe un mensaje seguro..."
          }
          rows={1}
          disabled={sending}
          onKeyDown={(event) => {
            if (
              event.key ===
                "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();
              submit(event);
            }
          }}
        />

        <button
          type="submit"
          className="qsm-send-button"
          disabled={!canSend}
        >
          {sending
            ? "Enviando..."
            : editingMessage
            ? "Guardar"
            : "Enviar"}
        </button>
      </div>

      {localError && (
        <div className="qsm-composer-error">
          {localError}
        </div>
      )}

      <p className="qsm-composer-note">
        Imágenes, videos cortos,
        PDF y documentos. Máximo
        20 MB por archivo.
      </p>
    </form>
  );
}