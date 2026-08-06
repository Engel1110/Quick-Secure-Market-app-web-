import { Link } from "react-router-dom";

import {
  formatUser,
  getAvatar,
  getInitials,
  resolveMediaUrl
} from "../../../utils/message.utils";

/* QSM_FASE14_BLOCK4_PROFESSIONAL_HEADER_DETAILS */

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

  const officialIdentity =
    otherUser?.officialIdentity &&
    typeof otherUser.officialIdentity === "object"
      ? otherUser.officialIdentity
      : null;

  const official =
    officialIdentity?.official === true;

  const internalChannel =
    conversation?.channelType === "INTERNAL" ||
    conversation?.isInternal === true;

  const departmentLabel =
    officialIdentity?.departmentLabel ||
    otherUser?.department ||
    "Administración";

  const publicUserId =
    otherUser?.prismaId ??
    otherUser?.userId ??
    otherUser?.id ??
    otherUser?._id ??
    "";

  const publicProfilePath =
    publicUserId && !official
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

  /* QSM_FASE14_BLOCK4_PROFESSIONAL_HEADER_DETAILS */

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

  const online =
    otherUser?.isOnline !== false;

  const orderStatus =
    typeof order === "object"
      ? String(
          order?.status ||
          order?.orderStatus ||
          ""
        ).toUpperCase()
      : "";

  const productPrice =
    Number(
      product?.price ||
      product?.amount ||
      0
    );

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
        <div className="qsm-header-name-line">
          <h2>{name}</h2>

          {official && (
            <span className="qsm-header-official-badge">
              🛡 QSM OFICIAL
            </span>
          )}
        </div>

        <div className="qsm-chat-header-meta">
          <span
            className={`qsm-chat-presence ${
              online
                ? "is-online"
                : "is-offline"
            }`}
          >
            <i aria-hidden="true" />

            {online
              ? "En línea"
              : "Desconectado"}
          </span>

          {verified && (
            <span className="qsm-chat-verified">
              ✓ Verificado
            </span>
          )}

          {!official && (
            <span className="qsm-chat-trust">
              Confianza {trustScore}/100
            </span>
          )}

          {internalChannel && (
            <span className="qsm-chat-department">
              {departmentLabel}
            </span>
          )}
        </div>
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
        <div className="qsm-chat-context qsm-chat-context--professional">
          <div className="qsm-chat-context__media">
            {productImage ? (
              <img
                src={
                  resolveMediaUrl(
                    productImage
                  )
                }
                alt={
                  product?.title ||
                  "Producto QSM"
                }
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span aria-hidden="true">
                📦
              </span>
            )}
          </div>

          <div className="qsm-chat-context__content">
            <div className="qsm-chat-context__top">
              <strong>
                {product?.title ||
                  product?.name ||
                  "Orden QSM"}
              </strong>

              {orderStatus && (
                <span
                  className={`qsm-order-status is-${orderStatus.toLowerCase()}`}
                >
                  {orderStatus}
                </span>
              )}
            </div>

            <div className="qsm-chat-context__meta">
              {orderCode && (
                <span>
                  {orderCode}
                </span>
              )}

              {productPrice > 0 && (
                <span>
                  RD$
                  {productPrice.toLocaleString(
                    "es-DO"
                  )}
                </span>
              )}
            </div>
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
          <span aria-hidden="true">
            ⌕
          </span>
        </button>

        {publicProfilePath && (
          <Link
            to={publicProfilePath}
            className="qsm-header-action"
          >
            <span aria-hidden="true">
              ◉
            </span>

            Perfil
          </Link>
        )}

        {productId && (
          <Link
            to={`/product/${productId}`}
            className="qsm-header-action"
          >
            <span aria-hidden="true">
              ▣
            </span>

            Producto
          </Link>
        )}

        {orderId && (
          <Link
            to={`/orders/${orderId}`}
            className="qsm-header-action"
          >
            <span aria-hidden="true">
              ◫
            </span>

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
