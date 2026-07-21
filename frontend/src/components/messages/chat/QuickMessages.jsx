const QUICK_MESSAGES = [
  "Hola, ¿sigue disponible?",
  "Perfecto, muchas gracias.",
  "¿Aceptas ofertas?",
  "¿Cuál es el precio final?",
  "¿Cuándo podríamos coordinar la entrega?",
  "Prefiero mantener toda la operación dentro de QSM."
];

export default function QuickMessages({ open, onSelect, onClose }) {
  if (!open) return null;

  return (
    <div className="qsm-quick-messages">
      <div className="qsm-quick-messages__header">
        <strong>Respuestas rápidas</strong>

        <button type="button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="qsm-quick-messages__list">
        {QUICK_MESSAGES.map((message) => (
          <button
            type="button"
            key={message}
            onClick={() => onSelect(message)}
          >
            {message}
          </button>
        ))}
      </div>
    </div>
  );
}
