import {
  useLocation
} from "react-router-dom";

const CUSTOMER_MESSAGES = [
  "Hola, ¿sigue disponible?",
  "Perfecto, muchas gracias.",
  "¿Aceptas ofertas?",
  "¿Cuál es el precio final?",
  "¿Cuándo podríamos coordinar la entrega?",
  "Prefiero mantener toda la operación dentro de QSM."
];

const ADMIN_MESSAGES = [
  "Hola. Estamos revisando tu solicitud y te mantendremos informado.",
  "Recibimos correctamente la información enviada.",
  "Tu operación continúa en proceso de validación.",
  "Necesitamos información adicional para continuar con el caso.",
  "El producto fue recibido y se encuentra en inspección.",
  "La inspección fue completada correctamente.",
  "Tu caso fue transferido al área correspondiente.",
  "El agente de Delivery se encuentra en camino.",
  "La entrega fue confirmada correctamente mediante el PIN QSM.",
  "Finanzas está validando la liberación del pago.",
  "Gracias por utilizar Quick Secure Market."
];

export default function QuickMessages({
  open,
  onSelect,
  onClose
}) {
  const location = useLocation();

  if (!open) {
    return null;
  }

  const adminMode =
    location.pathname.startsWith(
      "/admin"
    );

  const messages =
    adminMode
      ? ADMIN_MESSAGES
      : CUSTOMER_MESSAGES;

  return (
    <div className="qsm-quick-messages">
      <div className="qsm-quick-messages__header">
        <strong>
          {adminMode
            ? "Respuestas administrativas"
            : "Respuestas rápidas"}
        </strong>

        <button
          type="button"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="qsm-quick-messages__list">
        {messages.map((message) => (
          <button
            type="button"
            key={message}
            onClick={() =>
              onSelect(message)
            }
          >
            {message}
          </button>
        ))}
      </div>
    </div>
  );
}
