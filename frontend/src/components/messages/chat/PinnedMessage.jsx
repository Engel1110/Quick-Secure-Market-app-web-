import { getMessageText } from "../../../utils/message.utils";

export default function PinnedMessage({
  message,
  onOpen
}) {
  if (!message) return null;

  return (
    <button
      type="button"
      className="qsm-pinned-message"
      onClick={() => onOpen?.(message)}
    >
      <span>📌</span>

      <div>
        <strong>Mensaje fijado</strong>
        <p>{getMessageText(message) || "Archivo o evidencia fijada"}</p>
      </div>

      <i>Ver</i>
    </button>
  );
}
