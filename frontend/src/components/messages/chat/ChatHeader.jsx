import { Link } from "react-router-dom";

import {
  formatUser,
  getAvatar,
  getInitials,
  resolveMediaUrl
} from "../../../utils/message.utils";

export default function ChatHeader({
  conversation,
  otherUser,
  searchOpen = false,
  onToggleSearch,
  onToggleDetails
}) {
  const name = formatUser(
    otherUser,
    "Usuario QSM"
  );

  const avatar = getAvatar(otherUser);

  const product =
    conversation?.product &&
    typeof conversation.product === "object"
      ? conversation.product
      : null;

  const order = conversation?.order;

  const orderId =
    typeof order === "object"
      ? order?._id || order?.id
      : order;

  const productId =
    product?._id || product?.id;

  const productImage =
    product?.images?.[0] ||
    product?.image ||
    product?.thumbnail ||
    "";

  const orderCode =
    typeof order === "object"
      ? order?.orderCode ||
        order?.code ||
        (orderId
          ? `Orden #${String(orderId).slice(-8).toUpperCase()}`
          : "")
      : orderId
      ? `Orden #${String(orderId).slice(-8).toUpperCase()}`
      : "";

  return (
    <header className="qsm-chat-header">
      <div className="qsm-chat-header__user">
        <div className="qsm-avatar qsm-avatar--header">
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

          <i
            className="qsm-online-dot"
            aria-hidden="true"
          />
        </div>

        <div>
          <h2>{name}</h2>

          <p>
            Conversación protegida por QSM
          </p>
        </div>
      </div>

      {(product || orderId) && (
        <div className="qsm-chat-context">
          {productImage && (
            <img
              src={resolveMediaUrl(productImage)}
              alt={
                product?.title ||
                "Producto QSM"
              }
            />
          )}

          <div>
            <strong>
              {product?.title ||
                product?.name ||
                "Orden QSM"}
            </strong>

            {orderCode && (
              <span>{orderCode}</span>
            )}
          </div>
        </div>
      )}

      <div className="qsm-chat-header__actions">
        <button
          type="button"
          className={`qsm-icon-button ${
            searchOpen
              ? "is-active"
              : ""
          }`}
          onClick={onToggleSearch}
          title="Buscar en la conversación"
          aria-label="Buscar en la conversación"
        >
          ⌕
        </button>

        {productId && (
          <Link
            to={`/product/${productId}`}
            className="qsm-header-action"
          >
            Producto
          </Link>
        )}

        {orderId && (
          <Link
            to={`/orders/${orderId}`}
            className="qsm-header-action"
          >
            Orden
          </Link>
        )}

        <button
          type="button"
          className="qsm-icon-button"
          onClick={onToggleDetails}
          title="Información de la conversación"
          aria-label="Información de la conversación"
        >
          ⋯
        </button>
      </div>
    </header>
  );
}