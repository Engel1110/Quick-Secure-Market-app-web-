import { Link } from "react-router-dom";

import {
  formatUser,
  getAvatar,
  getInitials
} from "../../../utils/message.utils";

function normalizeReference(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "object"
  ) {
    const nested =
      value.prismaId ??
      value.userId ??
      value.id ??
      value._id;

    if (
      nested !== undefined &&
      nested !== value
    ) {
      return normalizeReference(
        nested
      );
    }
  }

  const normalized =
    String(value).trim();

  return normalized ===
    "[object Object]"
      ? ""
      : normalized;
}

function getConversationState(
  conversation,
  state,
  currentUserIds = []
) {
  const definition = {
    favorite: {
      direct: [
        "isFavorite",
        "favorite"
      ],
      list: "favoriteBy"
    },

    mute: {
      direct: [
        "isMuted",
        "muted"
      ],
      list: "mutedBy"
    },

    archive: {
      direct: [
        "isArchived",
        "archived"
      ],
      list: "archivedBy"
    },

    block: {
      direct: [
        "isBlocked",
        "blocked"
      ],
      list: "blockedBy"
    }
  }[state];

  if (
    !definition ||
    !conversation
  ) {
    return false;
  }

  for (
    const field
    of definition.direct
  ) {
    if (
      typeof conversation?.[field] ===
        "boolean"
    ) {
      return conversation[field];
    }
  }

  const references =
    Array.isArray(
      conversation?.[
        definition.list
      ]
    )
      ? conversation[
          definition.list
        ]
      : [];

  return references.some(
    (reference) => {
      const normalized =
        normalizeReference(
          reference
        );

      return (
        Boolean(normalized) &&
        currentUserIds.includes(
          normalized
        )
      );
    }
  );
}

/* QSM_FASE14_BLOCK4_PROFESSIONAL_HEADER_DETAILS */

export default function ConversationDetails({
  open,
  conversation,
  otherUser,
  currentUserIds = [],
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

  const publicUserId =
    otherUser?.prismaId ??
    otherUser?.userId ??
    otherUser?.id ??
    otherUser?._id ??
    "";

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

  /* QSM_FASE14_BLOCK4_PROFESSIONAL_HEADER_DETAILS */

  const productImage =
    product?.imageUrl ||
    product?.images?.[0] ||
    product?.image ||
    product?.thumbnail ||
    "";

  const productPrice =
    Number(
      product?.price ||
      product?.amount ||
      0
    );

  const verified =
    Boolean(
      otherUser?.isVerified ||
      otherUser?.verified ||
      otherUser?.status === "VERIFIED"
    );

  const trustScore =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          otherUser?.trustScore ||
          otherUser?.confidenceScore ||
          50
        )
      )
    );

  const orderStatus =
    typeof order === "object"
      ? String(
          order?.status ||
          order?.orderStatus ||
          "PENDIENTE"
        ).toUpperCase()
      : "";

  const paymentStatus =
    typeof order === "object"
      ? String(
          order?.paymentStatus ||
          order?.payment?.status ||
          ""
        ).toUpperCase()
      : "";

  const deliveryStatus =
    typeof order === "object"
      ? String(
          order?.deliveryStatus ||
          order?.shippingStatus ||
          order?.delivery?.status ||
          ""
        ).toUpperCase()
      : "";

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

  const isFavorite =
    getConversationState(
      conversation,
      "favorite",
      currentUserIds
    );

  const isMuted =
    getConversationState(
      conversation,
      "mute",
      currentUserIds
    );

  const isArchived =
    getConversationState(
      conversation,
      "archive",
      currentUserIds
    );

  const isBlocked =
    getConversationState(
      conversation,
      "block",
      currentUserIds
    );

  const runAction = (
    action
  ) => {
    onAction?.(action);
  };

  const isLoading = (
    action
  ) =>
    Boolean(actionLoading) &&
    actionLoading === action;

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

      <div className="qsm-details-user qsm-details-user--professional">
        <div className="qsm-details-user__identity">
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

          <div>
            <strong>
              {name}
            </strong>

            <span>
              {verified
                ? "Usuario verificado"
                : "Usuario QSM"}
            </span>
          </div>
        </div>

        <div className="qsm-details-trust">
          <div>
            <span>
              Confianza QSM
            </span>

            <strong>
              {trustScore}/100
            </strong>
          </div>

          <div className="qsm-details-trust__bar">
            <i
              style={{
                width:
                  `${trustScore}%`
              }}
            />
          </div>
        </div>

        {publicUserId && (
          <Link
            to={`/users/${publicUserId}`}
            className="qsm-details-profile-link"
          >
            Ver perfil público
          </Link>
        )}
      </div>

      <section className="qsm-details-section">
        <h4>
          Operación vinculada
        </h4>

        {productId && (
          <Link
            to={`/product/${productId}`}
            className="qsm-details-product-card"
          >
            <div className="qsm-details-product-card__media">
              {productImage ? (
                <img
                  src={productImage}
                  alt={
                    product?.title ||
                    "Producto QSM"
                  }
                  loading="lazy"
                />
              ) : (
                <span aria-hidden="true">
                  📦
                </span>
              )}
            </div>

            <div>
              <span>
                Producto
              </span>

              <strong>
                {product?.title ||
                  product?.name ||
                  "Producto QSM"}
              </strong>

              {productPrice > 0 && (
                <small>
                  RD$
                  {productPrice.toLocaleString(
                    "es-DO"
                  )}
                </small>
              )}
            </div>

            <i aria-hidden="true">
              →
            </i>
          </Link>
        )}

        {orderId && (
          <Link
            to={`/orders/${orderId}`}
            className="qsm-details-order-card"
          >
            <div className="qsm-details-order-card__top">
              <div>
                <span>
                  Orden vinculada
                </span>

                <strong>
                  {orderCode}
                </strong>
              </div>

              {orderStatus && (
                <b
                  className={`qsm-order-status is-${orderStatus.toLowerCase()}`}
                >
                  {orderStatus}
                </b>
              )}
            </div>

            <div className="qsm-details-order-card__states">
              <span>
                Pago
                <strong>
                  {paymentStatus ||
                    "PENDIENTE"}
                </strong>
              </span>

              <span>
                Entrega
                <strong>
                  {deliveryStatus ||
                    "PENDIENTE"}
                </strong>
              </span>
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

        <div className="qsm-details-actions-grid">

        <button
          type="button"
          className={
            isFavorite
              ? "is-active"
              : ""
          }
          aria-pressed={isFavorite}
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
          {isLoading("favorite")
            ? "Actualizando..."
            : isFavorite
            ? "★ Quitar de favoritas"
            : "☆ Marcar como favorita"}
        </button>

        <button
          type="button"
          className={
            isMuted
              ? "is-active"
              : ""
          }
          aria-pressed={isMuted}
          onClick={() =>
            runAction("mute")
          }
          disabled={
            Boolean(
              actionLoading
            )
          }
        >
          {isLoading("mute")
            ? "Actualizando..."
            : isMuted
            ? "🔔 Activar notificaciones"
            : "◇ Silenciar conversación"}
        </button>

        <button
          type="button"
          className={
            isArchived
              ? "is-active"
              : ""
          }
          aria-pressed={isArchived}
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
          {isLoading("archive")
            ? "Actualizando..."
            : isArchived
            ? "↩ Restaurar conversación"
            : "□ Archivar conversación"}
        </button>

        <button
          type="button"
          className={
            isBlocked
              ? "is-active"
              : "is-danger"
          }
          aria-pressed={isBlocked}
          onClick={() =>
            runAction("block")
          }
          disabled={
            Boolean(
              actionLoading
            )
          }
        >
          {isLoading("block")
            ? "Actualizando..."
            : isBlocked
            ? "✓ Desbloquear usuario"
            : "⊘ Bloquear usuario"}
        </button>
        </div>
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
