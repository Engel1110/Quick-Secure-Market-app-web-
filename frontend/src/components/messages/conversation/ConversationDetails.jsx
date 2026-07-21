import { Link } from "react-router-dom";

import {
  formatUser,
  getAvatar,
  getInitials
} from "../../../utils/message.utils";

export default function ConversationDetails({
  open,
  conversation,
  otherUser,
  actionLoading = false,
  onClose,
  onAction
}) {
  if (
    !open ||
    !conversation
  ) {
    return null;
  }

  const name =
    formatUser(
      otherUser,
      "Usuario QSM"
    );

  const avatar =
    getAvatar(otherUser);

  const product =
    conversation?.product &&
    typeof conversation.product ===
      "object"
      ? conversation.product
      : null;

  const order =
    conversation?.order;

  const orderId =
    typeof order === "object"
      ? order?._id || order?.id
      : order;

  const productId =
    product?._id ||
    product?.id;

  const orderCode =
    typeof order === "object"
      ? order?.orderCode ||
        order?.code ||
        (orderId
          ? `#${String(
              orderId
            )
              .slice(-8)
              .toUpperCase()}`
          : "")
      : orderId
      ? `#${String(orderId)
          .slice(-8)
          .toUpperCase()}`
      : "";

  const labels =
    Array.isArray(
      conversation?.labels
    )
      ? conversation.labels
      : [];

  const runAction = (
    action
  ) => {
    onAction?.(action);
  };

  return (
    <aside className="qsm-conversation-details">
      <div className="qsm-details-header">
        <h3>
          Información
        </h3>

        <button
          type="button"
          className="qsm-icon-button"
          onClick={onClose}
          aria-label="Cerrar información"
        >
          ×
        </button>
      </div>

      <div className="qsm-details-user">
        <div className="qsm-avatar qsm-avatar--details">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
            />
          ) : (
            <span>
              {getInitials(name)}
            </span>
          )}
        </div>

        <strong>
          {name}
        </strong>

        <span>
          {otherUser?.email ||
            "Usuario QSM"}
        </span>
      </div>

      <section className="qsm-details-section">
        <h4>
          Sobre esta conversación
        </h4>

        {productId && (
          <Link
            to={`/product/${productId}`}
            className="qsm-details-link"
          >
            <span aria-hidden="true">
              📦
            </span>

            <div>
              <strong>
                Producto
              </strong>

              <small>
                {product?.title ||
                  product?.name ||
                  "Producto QSM"}
              </small>
            </div>
          </Link>
        )}

        {orderId && (
          <Link
            to={`/orders/${orderId}`}
            className="qsm-details-link"
          >
            <span aria-hidden="true">
              🧾
            </span>

            <div>
              <strong>
                Orden
              </strong>

              <small>
                {orderCode}
              </small>
            </div>
          </Link>
        )}

        {labels.length > 0 && (
          <div className="qsm-label-list">
            {labels.map(
              (
                label,
                index
              ) => {
                const labelName =
                  typeof label ===
                  "string"
                    ? label
                    : label?.name ||
                      label?.title ||
                      "Etiqueta";

                return (
                  <span
                    key={
                      label?._id ||
                      label?.id ||
                      `${labelName}-${index}`
                    }
                  >
                    {labelName}
                  </span>
                );
              }
            )}
          </div>
        )}
      </section>

      <section className="qsm-details-section">
        <h4>
          Acciones rápidas
        </h4>

        <button
          type="button"
          onClick={() =>
            runAction(
              "favorite"
            )
          }
          disabled={
            Boolean(
              actionLoading
            )
          }
        >
          ☆ Marcar como favorita
        </button>

        <button
          type="button"
          onClick={() =>
            runAction("mute")
          }
          disabled={
            Boolean(
              actionLoading
            )
          }
        >
          ◇ Silenciar conversación
        </button>

        <button
          type="button"
          onClick={() =>
            runAction(
              "archive"
            )
          }
          disabled={
            Boolean(
              actionLoading
            )
          }
        >
          □ Archivar conversación
        </button>

        <button
          type="button"
          className="is-danger"
          onClick={() =>
            runAction("block")
          }
          disabled={
            Boolean(
              actionLoading
            )
          }
        >
          ⊘ Bloquear usuario
        </button>
      </section>

      <div className="qsm-details-security">
        <strong>
          🛡 Protegido por QSM
        </strong>

        <p>
          Mantén acuerdos, evidencia
          y pagos dentro de la
          plataforma.
        </p>
      </div>
    </aside>
  );
}