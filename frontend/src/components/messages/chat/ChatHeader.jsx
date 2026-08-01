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

  const avatar =
    getAvatar(otherUser);

  const publicUserId =
    otherUser?.prismaId ??
    otherUser?.userId ??
    otherUser?.id ??
    otherUser?._id ??
    "";

  const publicProfilePath =
    publicUserId
      ? `/users/${publicUserId}`
      : "";

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
    product?._id || product?.id;

  const productImage =
    product?.imageUrl ||
    product?.images?.[0] ||
    product?.image ||
    product?.thumbnail ||
    "";

  const orderCode =
    typeof order === "object"
      ? order?.orderCode ||
        order?.code ||
        (orderId
          ? `Orden #${String(
              orderId
            )
              .slice(-8)
              .toUpperCase()}`
          : "")
      : orderId
      ? `Orden #${String(
          orderId
        )
          .slice(-8)
          .toUpperCase()}`
      : "";

  const identity = (
    <>
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
          Ver perfil y reputación
        </p>
      </div>
    </>
  );

  return (
    <header className="qsm-chat-header">
      <div className="qsm-chat-header__user">
        {publicProfilePath ? (
          <Link
            to={publicProfilePath}
            className="qsm-chat-profile-link"
            title={`Ver perfil de ${name}`}
          >
            {identity}
          </Link>
        ) : (
          <div className="qsm-chat-profile-link">
            {identity}
          </div>
        )}
      </div>

      {(product || orderId) && (
        <div className="qsm-chat-context">
          {productImage && (
            <img
              src={
                resolveMediaUrl(
                  productImage
                )
              }
              alt={
                product?.title ||
                "Producto QSM"
              } loading="lazy" decoding="async" />
          )}

          <div>
            <strong>
              {product?.title ||
                product?.name ||
                "Orden QSM"}
            </strong>

            {orderCode && (
              <span>
                {orderCode}
              </span>
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

        {publicProfilePath && (
          <Link
            to={publicProfilePath}
            className="qsm-header-action"
          >
            Perfil
          </Link>
        )}

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
