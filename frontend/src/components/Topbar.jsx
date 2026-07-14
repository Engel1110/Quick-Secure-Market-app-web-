import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";

import api from "../api/axios";

import {
  useAuth
} from "../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Configuración
|--------------------------------------------------------------------------
*/

const DEFAULT_USER = {
  firstName: "Usuario",
  lastName: "QSM",
  email: "usuario@qsm.com",
  role: "USER",
  profilePhoto: "",
  avatar: "",
  trustScore: 50,
  isVerified: false,
  verificationStatus:
    "NOT_STARTED"
};

const INTERNAL_ROLES = [
  "ADMIN",
  "SENIOR_ADMIN",
  "AUDITOR",
  "DISPUTE_AGENT",
  "VERIFICATION_AGENT",
  "WAREHOUSE",
  "WAREHOUSE_MANAGER",
  "DELIVERY",
  "DELIVERY_MANAGER",
  "FINANCE",
  "FINANCE_MANAGER",
  "SECURITY",
  "SUPPORT"
];

function Topbar() {
  const navigate =
    useNavigate();

  const {
    user: authUser,
    logout
  } = useAuth();

  const topbarRef =
    useRef(null);

  const searchInputRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Usuario local como respaldo
  |--------------------------------------------------------------------------
  */

  const storedUser =
    useMemo(() => {
      return (
        safeJson(
          localStorage.getItem(
            "qsm_user"
          )
        ) ||
        safeJson(
          localStorage.getItem(
            "user"
          )
        ) ||
        {}
      );
    }, []);

  const currentUser =
    useMemo(() => {
      return {
        ...DEFAULT_USER,
        ...storedUser,
        ...(authUser || {})
      };
    }, [
      authUser,
      storedUser
    ]);

  /*
  |--------------------------------------------------------------------------
  | Estados visuales
  |--------------------------------------------------------------------------
  */

  const [
    openMenu,
    setOpenMenu
  ] = useState("");

  const [
    search,
    setSearch
  ] = useState("");

  const [
    notifications,
    setNotifications
  ] = useState([]);

  const [
    conversations,
    setConversations
  ] = useState([]);

  const [
    cartItems,
    setCartItems
  ] = useState([]);

  const [
    loadingMenu,
    setLoadingMenu
  ] = useState("");

  const [
    topbarError,
    setTopbarError
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Datos normalizados del usuario
  |--------------------------------------------------------------------------
  */

  const firstName =
    useMemo(() => {
      return (
        formatPersonName(
          currentUser?.firstName
        ) ||
        "Usuario"
      );
    }, [
      currentUser?.firstName
    ]);

  const lastName =
    useMemo(() => {
      return formatPersonName(
        currentUser?.lastName
      );
    }, [
      currentUser?.lastName
    ]);

  const fullName =
    useMemo(() => {
      return [
        firstName,
        lastName
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    }, [
      firstName,
      lastName
    ]);

  const profilePhoto =
    useMemo(() => {
      return getProfilePhotoUrl(
        currentUser
          ?.profilePhoto ||
        currentUser?.avatar ||
        currentUser?.photo ||
        ""
      );
    }, [
      currentUser?.profilePhoto,
      currentUser?.avatar,
      currentUser?.photo
    ]);

  const avatarLetter =
    firstName
      .charAt(0)
      .toUpperCase();

  const role =
    String(
      currentUser?.role ||
      "USER"
    ).toUpperCase();

  const isInternalUser =
    INTERNAL_ROLES.includes(
      role
    );

  const isVerified =
    Boolean(
      currentUser?.isVerified
    ) ||
    [
      "APPROVED",
      "VERIFIED"
    ].includes(
      String(
        currentUser
          ?.verificationStatus ||
        ""
      ).toUpperCase()
    );

  const userStatus =
    isVerified
      ? "Verificado"
      : "Pendiente";

  /*
  |--------------------------------------------------------------------------
  | Contadores
  |--------------------------------------------------------------------------
  */

  const unreadNotifications =
    useMemo(() => {
      return notifications.filter(
        (notification) =>
          !(
            notification?.isRead ||
            notification?.read ||
            notification?.readAt
          )
      ).length;
    }, [
      notifications
    ]);

  const unreadMessages =
    useMemo(() => {
      return conversations.reduce(
        (
          total,
          conversation
        ) =>
          total +
          Number(
            conversation
              ?.unreadCount ||
            conversation
              ?.unreadMessages ||
            0
          ),
        0
      );
    }, [
      conversations
    ]);

  const cartCount =
    useMemo(() => {
      return cartItems.reduce(
        (
          total,
          item
        ) =>
          total +
          Math.max(
            1,
            Number(
              item?.quantity ||
              1
            )
          ),
        0
      );
    }, [
      cartItems
    ]);

  const cartTotal =
    useMemo(() => {
      return cartItems.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item?.price ||
            item?.product
              ?.price ||
            0
          ) *
            Math.max(
              1,
              Number(
                item?.quantity ||
                1
              )
            ),
        0
      );
    }, [
      cartItems
    ]);

  /*
  |--------------------------------------------------------------------------
  | Abrir y cerrar menús
  |--------------------------------------------------------------------------
  */

  const toggleMenu = (
    menuName
  ) => {
    setTopbarError("");

    setOpenMenu(
      (
        currentMenu
      ) =>
        currentMenu ===
        menuName
          ? ""
          : menuName
    );
  };

  const closeMenus = () => {
    setOpenMenu("");
  };

  /*
  |--------------------------------------------------------------------------
  | Cargar carrito guardado
  |--------------------------------------------------------------------------
  */

  const loadLocalCart =
    useCallback(() => {
      const storedCart =
        safeJson(
          localStorage.getItem(
            "qsm_cart"
          )
        );

      setCartItems(
        Array.isArray(
          storedCart
        )
          ? storedCart
          : []
      );
    }, []);

  /*
  |--------------------------------------------------------------------------
  | Cargar notificaciones
  |--------------------------------------------------------------------------
  */

  const loadNotifications =
    useCallback(
      async () => {
        try {
          setLoadingMenu(
            "notifications"
          );

          const response =
            await api.get(
              "/notifications"
            );

          const items =
            extractArray(
              response?.data,
              [
                "notifications",
                "data",
                "items"
              ]
            );

          setNotifications(
            sortByNewest(
              items
            ).slice(
              0,
              8
            )
          );
        } catch (error) {
          console.error(
            "Error cargando notificaciones:",
            error
          );

          setNotifications(
            []
          );

          setTopbarError(
            "No se pudieron cargar las notificaciones."
          );
        } finally {
          setLoadingMenu("");
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | Cargar conversaciones
  |--------------------------------------------------------------------------
  */

  const loadConversations =
    useCallback(
      async () => {
        try {
          setLoadingMenu(
            "messages"
          );

          const response =
            await api.get(
              "/messages/conversations"
            );

          const items =
            extractArray(
              response?.data,
              [
                "conversations",
                "data",
                "items"
              ]
            );

          setConversations(
            sortByNewest(
              items
            ).slice(
              0,
              6
            )
          );
        } catch (error) {
          console.error(
            "Error cargando conversaciones:",
            error
          );

          setConversations(
            []
          );

          setTopbarError(
            "No se pudieron cargar los mensajes."
          );
        } finally {
          setLoadingMenu("");
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | Marcar notificación como leída
  |--------------------------------------------------------------------------
  */

  const markNotificationAsRead =
    async (
      notification
    ) => {
      const notificationId =
        notification?._id ||
        notification?.id;

      if (!notificationId) {
        return;
      }

      setNotifications(
        (
          currentItems
        ) =>
          currentItems.map(
            (item) =>
              String(
                item?._id ||
                item?.id
              ) ===
              String(
                notificationId
              )
                ? {
                    ...item,
                    isRead: true,
                    read: true,
                    readAt:
                      item?.readAt ||
                      new Date()
                        .toISOString()
                  }
                : item
          )
      );

      try {
        await api.patch(
          `/notifications/${notificationId}/read`
        );
      } catch (error) {
        console.error(
          "No se pudo marcar la notificación:",
          error
        );
      }

      const target =
        getNotificationTarget(
          notification
        );

      closeMenus();

      if (target) {
        navigate(target);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Eliminar un producto del carrito
  |--------------------------------------------------------------------------
  */

  const removeCartItem = (
    itemId
  ) => {
    setCartItems(
      (
        currentItems
      ) => {
        const updatedItems =
          currentItems.filter(
            (item) =>
              String(
                item?._id ||
                item?.id ||
                item?.product?._id ||
                item?.product?.id
              ) !==
              String(
                itemId
              )
          );

        localStorage.setItem(
          "qsm_cart",
          JSON.stringify(
            updatedItems
          )
        );

        window.dispatchEvent(
          new CustomEvent(
            "qsm-cart-updated",
            {
              detail:
                updatedItems
            }
          )
        );

        return updatedItems;
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Abrir conversación
  |--------------------------------------------------------------------------
  */

  const openConversation = (
    conversation
  ) => {
    const conversationId =
      conversation?._id ||
      conversation?.id ||
      conversation
        ?.conversationId;

    closeMenus();

    if (conversationId) {
      navigate(
        `/messages?conversationId=${encodeURIComponent(
          conversationId
        )}`
      );
    } else {
      navigate(
        "/messages"
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Buscar
  |--------------------------------------------------------------------------
  */

  const handleSearch = (
    event
  ) => {
    event.preventDefault();

    const cleanSearch =
      search.trim();

    closeMenus();

    if (!cleanSearch) {
      navigate(
        "/marketplace"
      );

      return;
    }

    navigate(
      `/marketplace?search=${encodeURIComponent(
        cleanSearch
      )}`
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Cerrar sesión
  |--------------------------------------------------------------------------
  */

  const handleLogout = () => {
    closeMenus();

    [
      "token",
      "qsm_token",
      "qsm_user",
      "user",
      "admin_token",
      "admin_user"
    ].forEach(
      (storageKey) =>
        localStorage.removeItem(
          storageKey
        )
    );

    if (
      typeof logout ===
      "function"
    ) {
      logout();
    }

    navigate(
      "/login",
      {
        replace: true
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Efectos
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadLocalCart();
    loadNotifications();
    loadConversations();
  }, [
    loadLocalCart,
    loadNotifications,
    loadConversations
  ]);

  useEffect(() => {
    const handleCartUpdated = (
      event
    ) => {
      if (
        Array.isArray(
          event?.detail
        )
      ) {
        setCartItems(
          event.detail
        );
      } else {
        loadLocalCart();
      }
    };

    window.addEventListener(
      "qsm-cart-updated",
      handleCartUpdated
    );

    window.addEventListener(
      "storage",
      loadLocalCart
    );

    return () => {
      window.removeEventListener(
        "qsm-cart-updated",
        handleCartUpdated
      );

      window.removeEventListener(
        "storage",
        loadLocalCart
      );
    };
  }, [
    loadLocalCart
  ]);

  useEffect(() => {
    const handleOutsideClick = (
      event
    ) => {
      if (
        topbarRef.current &&
        !topbarRef.current.contains(
          event.target
        )
      ) {
        closeMenus();
      }
    };

    const handleEscape = (
      event
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        closeMenus();
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);
    return (
    <>
      <div
        ref={topbarRef}
        style={topbar}
      >
        <style>{`
          * {
            box-sizing: border-box;
          }

          @media (max-width: 1180px) {
            .qsm-topbar {
              flex-direction: column;
              align-items: stretch !important;
            }

            .qsm-topbar-actions {
              justify-content: space-between !important;
            }

            .qsm-topbar-profile-text {
              display: none !important;
            }
          }

          @media (max-width: 760px) {
            .qsm-topbar-actions {
              gap: 8px !important;
            }

            .qsm-topbar-icon-button {
              width: 48px !important;
              height: 48px !important;
              border-radius: 14px !important;
            }

            .qsm-topbar-profile-button {
              min-width: 48px !important;
              width: 48px !important;
              padding: 0 !important;
              justify-content: center !important;
            }

            .qsm-topbar-search {
              grid-template-columns: 26px minmax(0, 1fr) !important;
              min-height: auto !important;
              padding: 10px 12px !important;
            }

            .qsm-topbar-search-button {
              grid-column: 1 / -1 !important;
              width: 100% !important;
            }

            .qsm-topbar-dropdown {
              position: fixed !important;
              left: 12px !important;
              right: 12px !important;
              top: 86px !important;
              width: auto !important;
              max-height: calc(100vh - 105px) !important;
            }
          }
        `}</style>

        <form
          onSubmit={handleSearch}
          className="qsm-topbar qsm-topbar-search"
          style={searchContainer}
        >
          <span style={searchIcon}>
            ⌕
          </span>

          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar compras, productos, ventas o reclamos..."
            aria-label="Buscar en QSM"
            style={searchInput}
          />

          <button
            type="submit"
            className="qsm-topbar-search-button"
            style={searchButton}
          >
            Buscar
          </button>
        </form>

        <div
          className="qsm-topbar-actions"
          style={actions}
        >
          {topbarError && (
            <div style={topbarErrorBox}>
              {topbarError}
            </div>
          )}

          <div style={iconContainer}>
            <button
              type="button"
              className="qsm-topbar-icon-button"
              style={iconButton(
                openMenu ===
                  "notifications"
              )}
              onClick={() => {
                toggleMenu(
                  "notifications"
                );

                if (
                  openMenu !==
                  "notifications"
                ) {
                  loadNotifications();
                }
              }}
              aria-label="Abrir notificaciones"
              aria-expanded={
                openMenu ===
                "notifications"
              }
            >
              🔔

              {unreadNotifications >
                0 && (
                <CounterBadge
                  value={
                    unreadNotifications
                  }
                />
              )}
            </button>

            {openMenu ===
              "notifications" && (
              <DropdownShell
                className="qsm-topbar-dropdown"
                title="Notificaciones"
                subtitle={
                  unreadNotifications >
                  0
                    ? `${unreadNotifications} sin leer`
                    : "Todo al día"
                }
                actionText="Ver todas"
                actionTo="/notifications"
                onClose={closeMenus}
              >
                {loadingMenu ===
                "notifications" ? (
                  <DropdownLoading text="Cargando notificaciones..." />
                ) : notifications.length ===
                  0 ? (
                  <DropdownEmpty
                    icon="🔔"
                    title="No tienes notificaciones"
                    text="Las novedades de tus compras, ventas y reclamos aparecerán aquí."
                  />
                ) : (
                  <div style={dropdownList}>
                    {notifications.map(
                      (
                        notification,
                        index
                      ) => {
                        const notificationId =
                          notification?._id ||
                          notification?.id ||
                          index;

                        const isRead =
                          Boolean(
                            notification?.isRead ||
                              notification?.read ||
                              notification?.readAt
                          );

                        return (
                          <button
                            key={
                              notificationId
                            }
                            type="button"
                            onClick={() =>
                              markNotificationAsRead(
                                notification
                              )
                            }
                            style={notificationItem(
                              isRead
                            )}
                          >
                            <div
                              style={notificationIcon(
                                notification?.type
                              )}
                            >
                              {getNotificationIcon(
                                notification?.type
                              )}
                            </div>

                            <div
                              style={
                                notificationContent
                              }
                            >
                              <div
                                style={
                                  notificationTitleRow
                                }
                              >
                                <strong
                                  style={
                                    notificationTitle
                                  }
                                >
                                  {notification?.title ||
                                    "Notificación QSM"}
                                </strong>

                                {!isRead && (
                                  <span
                                    style={
                                      unreadDot
                                    }
                                  />
                                )}
                              </div>

                              <p
                                style={
                                  notificationMessage
                                }
                              >
                                {notification?.message ||
                                  notification?.description ||
                                  "Tienes una nueva actualización."}
                              </p>

                              <span
                                style={
                                  notificationDate
                                }
                              >
                                {formatRelativeDate(
                                  notification?.createdAt
                                )}
                              </span>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </DropdownShell>
            )}
          </div>

          <div style={iconContainer}>
            <button
              type="button"
              className="qsm-topbar-icon-button"
              style={iconButton(
                openMenu ===
                  "messages"
              )}
              onClick={() => {
                toggleMenu(
                  "messages"
                );

                if (
                  openMenu !==
                  "messages"
                ) {
                  loadConversations();
                }
              }}
              aria-label="Abrir mensajes"
              aria-expanded={
                openMenu ===
                "messages"
              }
            >
              💬

              {unreadMessages > 0 && (
                <CounterBadge
                  value={
                    unreadMessages
                  }
                />
              )}
            </button>

            {openMenu ===
              "messages" && (
              <DropdownShell
                className="qsm-topbar-dropdown"
                title="Mensajes"
                subtitle={
                  unreadMessages > 0
                    ? `${unreadMessages} pendientes`
                    : "Conversaciones recientes"
                }
                actionText="Abrir mensajes"
                actionTo="/messages"
                onClose={closeMenus}
              >
                {loadingMenu ===
                "messages" ? (
                  <DropdownLoading text="Cargando conversaciones..." />
                ) : conversations.length ===
                  0 ? (
                  <DropdownEmpty
                    icon="💬"
                    title="No tienes conversaciones"
                    text="Cuando hables con un comprador o vendedor aparecerá aquí."
                  />
                ) : (
                  <div style={dropdownList}>
                    {conversations.map(
                      (
                        conversation,
                        index
                      ) => {
                        const conversationId =
                          conversation?._id ||
                          conversation?.id ||
                          index;

                        const participant =
                          getConversationParticipant(
                            conversation,
                            currentUser
                          );

                        const participantName =
                          getDisplayName(
                            participant
                          );

                        const participantPhoto =
                          getProfilePhotoUrl(
                            participant?.profilePhoto ||
                              participant?.avatar ||
                              ""
                          );

                        const productTitle =
                          conversation?.product?.title ||
                          conversation?.order?.product?.title ||
                          conversation?.productTitle ||
                          "Conversación QSM";

                        const lastMessage =
                          conversation?.lastMessage?.content ||
                          conversation?.lastMessage?.message ||
                          conversation?.lastMessage ||
                          conversation?.snippet ||
                          "Sin mensajes todavía.";

                        const unreadCount =
                          Number(
                            conversation?.unreadCount ||
                              conversation?.unreadMessages ||
                              0
                          );

                        return (
                          <button
                            key={
                              conversationId
                            }
                            type="button"
                            onClick={() =>
                              openConversation(
                                conversation
                              )
                            }
                            style={
                              conversationItem
                            }
                          >
                            <UserAvatar
                              photo={
                                participantPhoto
                              }
                              name={
                                participantName
                              }
                              size={44}
                            />

                            <div
                              style={
                                conversationContent
                              }
                            >
                              <div
                                style={
                                  conversationHeader
                                }
                              >
                                <strong
                                  style={
                                    conversationName
                                  }
                                >
                                  {
                                    participantName
                                  }
                                </strong>

                                {unreadCount >
                                  0 && (
                                  <span
                                    style={
                                      miniCountBadge
                                    }
                                  >
                                    {
                                      unreadCount
                                    }
                                  </span>
                                )}
                              </div>

                              <p
                                style={
                                  conversationProduct
                                }
                              >
                                {
                                  productTitle
                                }
                              </p>

                              <small
                                style={
                                  conversationMessage
                                }
                              >
                                {String(
                                  lastMessage
                                )}
                              </small>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </DropdownShell>
            )}
          </div>

          <div style={iconContainer}>
            <button
              type="button"
              className="qsm-topbar-icon-button"
              style={iconButton(
                openMenu ===
                  "cart"
              )}
              onClick={() =>
                toggleMenu("cart")
              }
              aria-label="Abrir carrito"
              aria-expanded={
                openMenu ===
                "cart"
              }
            >
              🛒

              {cartCount > 0 && (
                <CounterBadge
                  value={cartCount}
                />
              )}
            </button>

            {openMenu ===
              "cart" && (
              <DropdownShell
                className="qsm-topbar-dropdown"
                title="Carrito"
                subtitle={
                  cartCount > 0
                    ? `${cartCount} producto${
                        cartCount === 1
                          ? ""
                          : "s"
                      }`
                    : "Tu carrito está vacío"
                }
                actionText={
                  cartCount > 0
                    ? "Ver carrito"
                    : "Ir al Marketplace"
                }
                actionTo={
                  cartCount > 0
                    ? "/cart"
                    : "/marketplace"
                }
                onClose={closeMenus}
              >
                {cartItems.length ===
                0 ? (
                  <DropdownEmpty
                    icon="🛒"
                    title="Tu carrito está vacío"
                    text="Agrega productos desde el Marketplace para verlos aquí."
                  />
                ) : (
                  <>
                    <div
                      style={
                        dropdownList
                      }
                    >
                      {cartItems
                        .slice(0, 5)
                        .map(
                          (
                            item,
                            index
                          ) => {
                            const product =
                              item?.product ||
                              item;

                            const itemId =
                              product?._id ||
                              product?.id ||
                              item?._id ||
                              item?.id ||
                              index;

                            const image =
                              getProductImage(
                                product
                              );

                            const title =
                              product?.title ||
                              "Producto QSM";

                            const price =
                              Number(
                                item?.price ||
                                  product?.price ||
                                  0
                              );

                            return (
                              <div
                                key={
                                  itemId
                                }
                                style={
                                  cartItem
                                }
                              >
                                <div
                                  style={
                                    cartImageBox
                                  }
                                >
                                  {image ? (
                                    <img
                                      src={
                                        image
                                      }
                                      alt={
                                        title
                                      }
                                      style={
                                        cartImage
                                      }
                                    />
                                  ) : (
                                    <span>
                                      📦
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={
                                    cartItemContent
                                  }
                                >
                                  <strong
                                    style={
                                      cartItemTitle
                                    }
                                  >
                                    {
                                      title
                                    }
                                  </strong>

                                  <span
                                    style={
                                      cartItemPrice
                                    }
                                  >
                                    {formatMoney(
                                      price
                                    )}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeCartItem(
                                      itemId
                                    )
                                  }
                                  style={
                                    removeCartButton
                                  }
                                  aria-label={`Eliminar ${title} del carrito`}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          }
                        )}
                    </div>

                    <div
                      style={
                        cartSummary
                      }
                    >
                      <span>
                        Subtotal
                      </span>

                      <strong>
                        {formatMoney(
                          cartTotal
                        )}
                      </strong>
                    </div>
                  </>
                )}
              </DropdownShell>
            )}
          </div>

          <div style={profileContainer}>
            <button
              type="button"
              className="qsm-topbar-profile-button"
              style={profileButton(
                openMenu ===
                  "profile"
              )}
              onClick={() =>
                toggleMenu(
                  "profile"
                )
              }
              aria-label="Abrir menú de perfil"
              aria-expanded={
                openMenu ===
                "profile"
              }
            >
              <UserAvatar
                photo={profilePhoto}
                name={fullName}
                size={44}
              />

              <div
                className="qsm-topbar-profile-text"
                style={profileText}
              >
                <strong
                  style={
                    profileName
                  }
                >
                  {fullName}
                </strong>

                <span
                  style={profileStatus(
                    isVerified
                  )}
                >
                  {userStatus}
                </span>
              </div>

              <span
                className="qsm-topbar-profile-text"
                style={profileChevron}
              >
                {openMenu ===
                "profile"
                  ? "⌃"
                  : "⌄"}
              </span>
            </button>

            {openMenu ===
              "profile" && (
              <DropdownShell
                className="qsm-topbar-dropdown"
                title={fullName}
                subtitle={
                  currentUser?.email ||
                  "usuario@qsm.com"
                }
                onClose={closeMenus}
                compact
              >
                <div
                  style={
                    profileSummary
                  }
                >
                  <UserAvatar
                    photo={
                      profilePhoto
                    }
                    name={
                      fullName
                    }
                    size={58}
                  />

                  <div>
                    <strong
                      style={
                        profileSummaryName
                      }
                    >
                      {fullName}
                    </strong>

                    <span
                      style={
                        profileRole
                      }
                    >
                      {formatRole(
                        role
                      )}
                    </span>
                  </div>
                </div>

                <div
                  style={
                    profileMenuList
                  }
                >
                  <ProfileMenuLink
                    icon="👤"
                    label="Mi perfil"
                    to="/profile"
                    onClick={
                      closeMenus
                    }
                  />

                  <ProfileMenuLink
                    icon="📦"
                    label="Mis compras"
                    to="/orders"
                    onClick={
                      closeMenus
                    }
                  />

                  <ProfileMenuLink
                    icon="💰"
                    label="Mis ventas"
                    to="/sales"
                    onClick={
                      closeMenus
                    }
                  />

                  <ProfileMenuLink
                    icon="⚖"
                    label="Mis reclamos"
                    to="/disputes"
                    onClick={
                      closeMenus
                    }
                  />

                  <ProfileMenuLink
                    icon="🧾"
                    label="Verificar identidad"
                    to="/complete-profile"
                    onClick={
                      closeMenus
                    }
                  />

                  <ProfileMenuLink
                    icon="⚙"
                    label="Configuración"
                    to="/settings"
                    onClick={
                      closeMenus
                    }
                  />

                  {isInternalUser && (
                    <ProfileMenuLink
                      icon="🛠"
                      label="BackOffice QSM"
                      to="/admin"
                      onClick={
                        closeMenus
                      }
                      highlighted
                    />
                  )}
                </div>

                <button
                  type="button"
                  style={logoutButton}
                  onClick={
                    handleLogout
                  }
                >
                  🚪 Cerrar sesión
                </button>
              </DropdownShell>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
/*
|--------------------------------------------------------------------------
| Contador circular
|--------------------------------------------------------------------------
*/

function CounterBadge({
  value
}) {
  const safeValue =
    Number(value || 0);

  if (
    safeValue <= 0
  ) {
    return null;
  }

  return (
    <span style={badge}>
      {safeValue > 99
        ? "99+"
        : safeValue}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| Contenedor de menú desplegable
|--------------------------------------------------------------------------
*/

function DropdownShell({
  title,
  subtitle,
  actionText,
  actionTo,
  onClose,
  children,
  className = "",
  compact = false
}) {
  return (
    <section
      className={className}
      style={{
        ...dropdown,
        ...(compact
          ? compactDropdown
          : {})
      }}
      onClick={(
        event
      ) =>
        event.stopPropagation()
      }
    >
      <div style={dropdownHeader}>
        <div style={dropdownHeaderText}>
          <h4 style={dropdownTitle}>
            {title}
          </h4>

          {subtitle && (
            <p style={dropdownSubtitle}>
              {subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={dropdownCloseButton}
          aria-label="Cerrar menú"
        >
          ×
        </button>
      </div>

      <div style={dropdownBody}>
        {children}
      </div>

      {actionText &&
        actionTo && (
          <Link
            to={actionTo}
            onClick={onClose}
            style={dropdownFooterButton}
          >
            {actionText}
          </Link>
        )}
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| Estado de carga
|--------------------------------------------------------------------------
*/

function DropdownLoading({
  text
}) {
  return (
    <div style={dropdownState}>
      <div style={dropdownStateIcon}>
        ◌
      </div>

      <strong style={dropdownStateTitle}>
        Cargando
      </strong>

      <p style={dropdownStateText}>
        {text}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Estado vacío
|--------------------------------------------------------------------------
*/

function DropdownEmpty({
  icon,
  title,
  text
}) {
  return (
    <div style={dropdownState}>
      <div style={dropdownStateIcon}>
        {icon}
      </div>

      <strong style={dropdownStateTitle}>
        {title}
      </strong>

      <p style={dropdownStateText}>
        {text}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Avatar de usuario
|--------------------------------------------------------------------------
*/

function UserAvatar({
  photo,
  name,
  size = 44
}) {
  const [
    imageError,
    setImageError
  ] = useState(false);

  const safeName =
    String(
      name || "Usuario"
    ).trim();

  const letter =
    safeName
      .charAt(0)
      .toUpperCase() ||
    "U";

  return (
    <div
      style={{
        ...userAvatar,
        width: size,
        height: size,
        minWidth: size,
        fontSize:
          Math.max(
            15,
            Math.round(
              size * 0.4
            )
          )
      }}
    >
      {photo &&
      !imageError ? (
        <img
          src={photo}
          alt={`Foto de ${safeName}`}
          style={userAvatarImage}
          onError={() =>
            setImageError(true)
          }
        />
      ) : (
        letter
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Opción del menú de perfil
|--------------------------------------------------------------------------
*/

function ProfileMenuLink({
  icon,
  label,
  to,
  onClick,
  highlighted = false
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={
        highlighted
          ? menuItemHighlighted
          : menuItem
      }
    >
      <span style={menuItemIcon}>
        {icon}
      </span>

      <span style={menuItemLabel}>
        {label}
      </span>

      <span style={menuItemArrow}>
        →
      </span>
    </Link>
  );
}

/*
|--------------------------------------------------------------------------
| JSON seguro
|--------------------------------------------------------------------------
*/

function safeJson(value) {
  try {
    return value
      ? JSON.parse(value)
      : null;
  } catch {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Nombre correctamente capitalizado
|--------------------------------------------------------------------------
*/

function formatPersonName(
  value
) {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase(
      "es-DO"
    )
    .replace(
      /(^|[\s'-])\p{L}/gu,
      (letter) =>
        letter.toLocaleUpperCase(
          "es-DO"
        )
    );
}

/*
|--------------------------------------------------------------------------
| Nombre completo de una entidad
|--------------------------------------------------------------------------
*/

function getDisplayName(
  entity
) {
  if (!entity) {
    return "Usuario QSM";
  }

  if (
    typeof entity ===
    "string"
  ) {
    return "Usuario QSM";
  }

  const firstName =
    formatPersonName(
      entity?.firstName
    );

  const lastName =
    formatPersonName(
      entity?.lastName
    );

  const fullName = [
    firstName,
    lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    entity?.name ||
    entity?.email ||
    "Usuario QSM"
  );
}

/*
|--------------------------------------------------------------------------
| ID genérico
|--------------------------------------------------------------------------
*/

function getEntityId(
  entity
) {
  if (!entity) {
    return "";
  }

  if (
    typeof entity ===
    "string"
  ) {
    return entity;
  }

  return (
    entity?._id ||
    entity?.id ||
    entity?.userId ||
    ""
  );
}

/*
|--------------------------------------------------------------------------
| Encontrar participante contrario
|--------------------------------------------------------------------------
*/

function getConversationParticipant(
  conversation,
  currentUser
) {
  const currentUserId =
    getEntityId(
      currentUser
    );

  const participants =
    Array.isArray(
      conversation?.participants
    )
      ? conversation.participants
      : [];

  const otherParticipant =
    participants.find(
      (participant) =>
        String(
          getEntityId(
            participant
          )
        ) !==
        String(
          currentUserId
        )
    );

  if (otherParticipant) {
    return otherParticipant;
  }

  const buyer =
    conversation?.buyer ||
    conversation?.order?.buyer;

  const seller =
    conversation?.seller ||
    conversation?.order?.seller;

  if (
    String(
      getEntityId(buyer)
    ) !==
    String(currentUserId)
  ) {
    return buyer;
  }

  if (
    String(
      getEntityId(seller)
    ) !==
    String(currentUserId)
  ) {
    return seller;
  }

  return (
    conversation?.otherUser ||
    conversation?.receiver ||
    conversation?.sender ||
    {}
  );
}

/*
|--------------------------------------------------------------------------
| URL de foto de perfil
|--------------------------------------------------------------------------
*/

function getProfilePhotoUrl(
  value
) {
  if (!value) {
    return "";
  }

  const rawValue =
    typeof value ===
    "string"
      ? value
      : value?.url ||
        value?.path ||
        value?.secure_url ||
        value?.imageUrl ||
        "";

  if (!rawValue) {
    return "";
  }

  const cleanValue =
    String(rawValue)
      .trim()
      .replaceAll(
        "&#x2F;",
        "/"
      )
      .replaceAll(
        "&amp;",
        "&"
      )
      .replace(/\\/g, "/");

  if (
    cleanValue.startsWith(
      "http://"
    ) ||
    cleanValue.startsWith(
      "https://"
    ) ||
    cleanValue.startsWith(
      "data:image/"
    ) ||
    cleanValue.startsWith(
      "blob:"
    )
  ) {
    return cleanValue;
  }

  const apiOrigin =
    getApiOrigin();

  if (
    cleanValue.startsWith(
      "/uploads/"
    )
  ) {
    return `${apiOrigin}${cleanValue}`;
  }

  if (
    cleanValue.startsWith(
      "uploads/"
    )
  ) {
    return `${apiOrigin}/${cleanValue}`;
  }

  return `${apiOrigin}/uploads/profiles/${cleanValue}`;
}

/*
|--------------------------------------------------------------------------
| Imagen del producto
|--------------------------------------------------------------------------
*/

function getProductImage(
  product
) {
  if (!product) {
    return "";
  }

  const firstImage =
    Array.isArray(
      product?.images
    )
      ? product.images[0]
      : "";

  const image =
    product?.thumbnail ||
    product?.image ||
    product?.imageUrl ||
    firstImage ||
    "";

  return getImageUrl(
    image,
    "products/images"
  );
}

/*
|--------------------------------------------------------------------------
| URL genérica de imagen
|--------------------------------------------------------------------------
*/

function getImageUrl(
  value,
  folder = ""
) {
  if (!value) {
    return "";
  }

  const rawValue =
    typeof value ===
    "string"
      ? value
      : value?.url ||
        value?.path ||
        value?.secure_url ||
        value?.imageUrl ||
        value?.publicUrl ||
        "";

  if (!rawValue) {
    return "";
  }

  const cleanValue =
    String(rawValue)
      .trim()
      .replaceAll(
        "&#x2F;",
        "/"
      )
      .replaceAll(
        "&amp;",
        "&"
      )
      .replace(/\\/g, "/");

  if (
    cleanValue.startsWith(
      "http://"
    ) ||
    cleanValue.startsWith(
      "https://"
    ) ||
    cleanValue.startsWith(
      "data:image/"
    ) ||
    cleanValue.startsWith(
      "blob:"
    )
  ) {
    return cleanValue;
  }

  const apiOrigin =
    getApiOrigin();

  if (
    cleanValue.startsWith(
      "/uploads/"
    )
  ) {
    return `${apiOrigin}${cleanValue}`;
  }

  if (
    cleanValue.startsWith(
      "uploads/"
    )
  ) {
    return `${apiOrigin}/${cleanValue}`;
  }

  const safeFolder =
    String(
      folder || ""
    )
      .replace(/^\/+|\/+$/g, "");

  if (safeFolder) {
    return `${apiOrigin}/uploads/${safeFolder}/${cleanValue}`;
  }

  return `${apiOrigin}/uploads/${cleanValue}`;
}

/*
|--------------------------------------------------------------------------
| Origen del backend
|--------------------------------------------------------------------------
*/

function getApiOrigin() {
  const configuredUrl =
    import.meta.env
      .VITE_API_URL ||
    "http://localhost:5000/api";

  return String(
    configuredUrl
  )
    .trim()
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
}

/*
|--------------------------------------------------------------------------
| Extraer arreglos del backend
|--------------------------------------------------------------------------
*/

function extractArray(
  source,
  preferredKeys = []
) {
  if (
    Array.isArray(source)
  ) {
    return source;
  }

  if (
    !source ||
    typeof source !==
      "object"
  ) {
    return [];
  }

  for (
    const key of
    preferredKeys
  ) {
    const value =
      source?.[key];

    if (
      Array.isArray(value)
    ) {
      return value;
    }
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| Ordenar registros por fecha
|--------------------------------------------------------------------------
*/

function sortByNewest(
  items
) {
  if (
    !Array.isArray(items)
  ) {
    return [];
  }

  return [...items].sort(
    (
      first,
      second
    ) => {
      const firstDate =
        new Date(
          first?.updatedAt ||
          first?.createdAt ||
          0
        ).getTime();

      const secondDate =
        new Date(
          second?.updatedAt ||
          second?.createdAt ||
          0
        ).getTime();

      return (
        secondDate -
        firstDate
      );
    }
  );
}

/*
|--------------------------------------------------------------------------
| Formato monetario
|--------------------------------------------------------------------------
*/

function formatMoney(
  value
) {
  return new Intl.NumberFormat(
    "es-DO",
    {
      style: "currency",
      currency: "DOP",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );
}

/*
|--------------------------------------------------------------------------
| Fecha relativa
|--------------------------------------------------------------------------
*/

function formatRelativeDate(
  value
) {
  if (!value) {
    return "Ahora";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Ahora";
  }

  const difference =
    Date.now() -
    date.getTime();

  const seconds =
    Math.floor(
      difference / 1000
    );

  if (
    seconds < 60
  ) {
    return "Ahora";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (
    minutes < 60
  ) {
    return `Hace ${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (
    hours < 24
  ) {
    return `Hace ${hours} h`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (
    days < 7
  ) {
    return `Hace ${days} d`;
  }

  return new Intl.DateTimeFormat(
    "es-DO",
    {
      day: "2-digit",
      month: "short"
    }
  ).format(date);
}

/*
|--------------------------------------------------------------------------
| Icono de notificación
|--------------------------------------------------------------------------
*/

function getNotificationIcon(
  type
) {
  const normalizedType =
    String(
      type || ""
    ).toUpperCase();

  const map = {
    ORDER_CREATED: "🛒",
    ORDER_COMPLETED: "✅",
    ORDER_CANCELLED: "✕",
    PAYMENT_CONFIRMED: "💳",
    PRODUCT_SOLD: "💰",
    PRODUCT_APPROVED: "🛡",
    PRODUCT_REJECTED: "⚠",
    PRODUCT_SENT_TO_WAREHOUSE:
      "🏬",
    DELIVERY_REQUESTED: "🚚",
    DISPUTE_OPENED: "⚖",
    MESSAGE_RECEIVED: "💬",
    SECURITY_ALERT: "🔐",
    KYC_APPROVED: "✓",
    KYC_REJECTED: "!"
  };

  return (
    map[normalizedType] ||
    "🔔"
  );
}

/*
|--------------------------------------------------------------------------
| Ruta asociada a una notificación
|--------------------------------------------------------------------------
*/

function getNotificationTarget(
  notification
) {
  if (!notification) {
    return "";
  }

  if (
    notification?.url ||
    notification?.link ||
    notification?.targetUrl
  ) {
    return (
      notification?.url ||
      notification?.link ||
      notification?.targetUrl
    );
  }

  const orderId =
    notification?.order?._id ||
    notification?.order?.id ||
    notification?.orderId ||
    notification?.metadata
      ?.orderId;

  const productId =
    notification?.product?._id ||
    notification?.product?.id ||
    notification?.productId ||
    notification?.metadata
      ?.productId;

  const disputeId =
    notification?.dispute?._id ||
    notification?.dispute?.id ||
    notification?.disputeId ||
    notification?.metadata
      ?.disputeId;

  const conversationId =
    notification?.conversation?._id ||
    notification?.conversation?.id ||
    notification?.conversationId ||
    notification?.metadata
      ?.conversationId;

  const type =
    String(
      notification?.type ||
      ""
    ).toUpperCase();

  if (
    conversationId ||
    type.includes(
      "MESSAGE"
    )
  ) {
    return conversationId
      ? `/messages?conversationId=${encodeURIComponent(
          conversationId
        )}`
      : "/messages";
  }

  if (
    disputeId ||
    type.includes(
      "DISPUTE"
    )
  ) {
    return disputeId
      ? `/disputes?id=${encodeURIComponent(
          disputeId
        )}`
      : "/disputes";
  }

  if (
    orderId ||
    type.includes(
      "ORDER"
    ) ||
    type.includes(
      "PAYMENT"
    ) ||
    type.includes(
      "DELIVERY"
    )
  ) {
    return orderId
      ? `/orders/${orderId}`
      : "/orders";
  }

  if (
    productId ||
    type.includes(
      "PRODUCT"
    )
  ) {
    return productId
      ? `/product/${productId}`
      : "/marketplace";
  }

  if (
    type.includes(
      "KYC"
    )
  ) {
    return "/complete-profile";
  }

  if (
    type.includes(
      "SECURITY"
    )
  ) {
    return "/settings";
  }

  return "/dashboard";
}

/*
|--------------------------------------------------------------------------
| Rol legible
|--------------------------------------------------------------------------
*/

function formatRole(
  value
) {
  const role =
    String(
      value || "USER"
    ).toUpperCase();

  const map = {
    USER:
      "Usuario QSM",

    ADMIN:
      "Administrador",

    SENIOR_ADMIN:
      "Senior Admin",

    AUDITOR:
      "Auditor",

    DISPUTE_AGENT:
      "Agente de disputas",

    VERIFICATION_AGENT:
      "Agente de verificación",

    WAREHOUSE:
      "Agente de almacén",

    WAREHOUSE_MANAGER:
      "Encargado de almacén",

    DELIVERY:
      "Agente de delivery",

    DELIVERY_MANAGER:
      "Encargado de delivery",

    FINANCE:
      "Agente de finanzas",

    FINANCE_MANAGER:
      "Encargado de finanzas",

    SECURITY:
      "Seguridad",

    SUPPORT:
      "Soporte"
  };

  return (
    map[role] ||
    role
  );
}
/*
|--------------------------------------------------------------------------
| Barra superior
|--------------------------------------------------------------------------
*/

const topbar = {
  position: "relative",
  zIndex: 500,

  width: "100%",
  minWidth: 0,

  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",

  marginBottom: "22px"
};

/*
|--------------------------------------------------------------------------
| Buscador
|--------------------------------------------------------------------------
*/

const searchContainer = {
  width: "100%",
  maxWidth: "760px",
  minWidth: 0,
  minHeight: "56px",

  display: "grid",
  gridTemplateColumns:
    "28px minmax(0, 1fr) 104px",

  alignItems: "center",
  gap: "9px",

  padding: "6px 8px 6px 14px",

  borderRadius: "16px",

  border:
    "1px solid rgba(53, 208, 195, .16)",

  background:
    "rgba(8, 19, 37, .88)",

  boxShadow:
    "0 16px 42px rgba(0, 0, 0, .13)",

  backdropFilter: "blur(15px)"
};

const searchIcon = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  color: "#35d0c3",

  fontSize: "21px",
  lineHeight: 1
};

const searchInput = {
  width: "100%",
  height: "42px",
  minWidth: 0,

  border: "none",
  outline: "none",

  background: "transparent",

  color: "#f8fafc",

  fontSize: "12px"
};

const searchButton = {
  width: "100%",
  height: "42px",

  border: "none",
  borderRadius: "12px",

  background:
    "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6)",

  color: "#ffffff",

  fontSize: "11px",
  fontWeight: "950",

  cursor: "pointer",

  boxShadow:
    "0 10px 30px rgba(53, 208, 195, .22)"
};

/*
|--------------------------------------------------------------------------
| Acciones
|--------------------------------------------------------------------------
*/

const actions = {
  position: "relative",

  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "10px",

  flexShrink: 0
};

const iconContainer = {
  position: "relative"
};

const iconButton = (
  active = false
) => ({
  position: "relative",

  width: "52px",
  height: "52px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "15px",

  border: active
    ? "1px solid rgba(53, 208, 195, .48)"
    : "1px solid rgba(53, 208, 195, .14)",

  background: active
    ? "linear-gradient(135deg, rgba(53,208,195,.18), rgba(139,92,246,.18))"
    : "rgba(8, 19, 37, .88)",

  color: "#ffffff",

  fontSize: "20px",

  cursor: "pointer",

  boxShadow: active
    ? "0 14px 38px rgba(53, 208, 195, .16)"
    : "0 12px 32px rgba(0, 0, 0, .12)"
});

/*
|--------------------------------------------------------------------------
| Contador
|--------------------------------------------------------------------------
*/

const badge = {
  position: "absolute",

  top: "-4px",
  right: "-4px",

  minWidth: "20px",
  height: "20px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "0 5px",

  borderRadius: "999px",

  border:
    "2px solid #020617",

  background: "#ef4444",

  color: "#ffffff",

  fontSize: "9px",
  fontWeight: "950",

  lineHeight: 1
};

/*
|--------------------------------------------------------------------------
| Mensaje de error del Topbar
|--------------------------------------------------------------------------
*/

const topbarErrorBox = {
  position: "absolute",
  top: "62px",
  right: 0,

  width: "280px",

  padding: "10px 12px",

  borderRadius: "12px",

  border:
    "1px solid rgba(248, 113, 113, .30)",

  background:
    "rgba(127, 29, 29, .94)",

  color: "#fecaca",

  fontSize: "10px",
  lineHeight: "16px",

  boxShadow:
    "0 20px 55px rgba(0, 0, 0, .35)"
};

/*
|--------------------------------------------------------------------------
| Dropdown general
|--------------------------------------------------------------------------
*/

const dropdown = {
  position: "absolute",

  top: "64px",
  right: 0,

  width: "380px",
  maxHeight: "590px",

  display: "flex",
  flexDirection: "column",

  overflow: "hidden",

  borderRadius: "20px",

  border:
    "1px solid rgba(53, 208, 195, .20)",

  background:
    "linear-gradient(180deg, rgba(8, 19, 37, .99), rgba(2, 6, 23, .99))",

  boxShadow:
    "0 30px 90px rgba(0, 0, 0, .52)",

  backdropFilter: "blur(18px)",

  zIndex: 1000
};

const compactDropdown = {
  width: "310px"
};

const dropdownHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",

  padding: "17px 18px",

  borderBottom:
    "1px solid rgba(148, 163, 184, .10)"
};

const dropdownHeaderText = {
  minWidth: 0
};

const dropdownTitle = {
  margin: 0,

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "#f8fafc",

  fontSize: "15px",
  lineHeight: "20px"
};

const dropdownSubtitle = {
  margin: "4px 0 0",

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "#94a3b8",

  fontSize: "10px"
};

const dropdownCloseButton = {
  width: "31px",
  height: "31px",
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "10px",

  border:
    "1px solid rgba(148, 163, 184, .13)",

  background:
    "rgba(15, 23, 42, .72)",

  color: "#cbd5e1",

  fontSize: "19px",

  cursor: "pointer"
};

const dropdownBody = {
  minHeight: 0,
  overflowY: "auto"
};

const dropdownList = {
  display: "grid"
};

const dropdownFooterButton = {
  minHeight: "46px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  margin: "12px",

  padding: "10px 14px",

  borderRadius: "13px",

  border:
    "1px solid rgba(53, 208, 195, .24)",

  background:
    "linear-gradient(135deg, rgba(53,208,195,.15), rgba(139,92,246,.16))",

  color: "#a5f3fc",

  textDecoration: "none",

  fontSize: "11px",
  fontWeight: "950"
};

/*
|--------------------------------------------------------------------------
| Estados de dropdown
|--------------------------------------------------------------------------
*/

const dropdownState = {
  minHeight: "220px",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",

  padding: "28px",

  textAlign: "center"
};

const dropdownStateIcon = {
  width: "54px",
  height: "54px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  marginBottom: "12px",

  borderRadius: "17px",

  background:
    "linear-gradient(135deg, rgba(53,208,195,.15), rgba(139,92,246,.18))",

  fontSize: "25px"
};

const dropdownStateTitle = {
  color: "#f8fafc",

  fontSize: "13px"
};

const dropdownStateText = {
  maxWidth: "270px",

  margin: "7px 0 0",

  color: "#94a3b8",

  fontSize: "10px",
  lineHeight: "17px"
};

/*
|--------------------------------------------------------------------------
| Notificaciones
|--------------------------------------------------------------------------
*/

const notificationItem = (
  isRead
) => ({
  width: "100%",

  display: "grid",

  gridTemplateColumns:
    "42px minmax(0, 1fr)",

  gap: "11px",

  padding: "14px 16px",

  border: "none",
  borderBottom:
    "1px solid rgba(148, 163, 184, .08)",

  background: isRead
    ? "transparent"
    : "rgba(53, 208, 195, .055)",

  color: "#cbd5e1",

  textAlign: "left",

  cursor: "pointer"
});

const notificationIcon = (
  type
) => {
  const normalizedType =
    String(
      type || ""
    ).toUpperCase();

  const danger =
    normalizedType.includes(
      "REJECTED"
    ) ||
    normalizedType.includes(
      "CANCELLED"
    ) ||
    normalizedType.includes(
      "SECURITY"
    );

  const warning =
    normalizedType.includes(
      "DISPUTE"
    ) ||
    normalizedType.includes(
      "REVIEW"
    );

  const success =
    normalizedType.includes(
      "APPROVED"
    ) ||
    normalizedType.includes(
      "COMPLETED"
    ) ||
    normalizedType.includes(
      "CONFIRMED"
    );

  let background =
    "rgba(53, 208, 195, .13)";

  let border =
    "1px solid rgba(53, 208, 195, .22)";

  if (danger) {
    background =
      "rgba(239, 68, 68, .13)";

    border =
      "1px solid rgba(239, 68, 68, .24)";
  } else if (warning) {
    background =
      "rgba(245, 158, 11, .13)";

    border =
      "1px solid rgba(245, 158, 11, .24)";
  } else if (success) {
    background =
      "rgba(34, 197, 94, .13)";

    border =
      "1px solid rgba(34, 197, 94, .24)";
  }

  return {
    width: "42px",
    height: "42px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    borderRadius: "13px",

    background,
    border,

    fontSize: "18px"
  };
};

const notificationContent = {
  minWidth: 0
};

const notificationTitleRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px"
};

const notificationTitle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "#f8fafc",

  fontSize: "11px"
};

const unreadDot = {
  width: "7px",
  height: "7px",
  flexShrink: 0,

  borderRadius: "50%",

  background: "#35d0c3",

  boxShadow:
    "0 0 12px rgba(53, 208, 195, .65)"
};

const notificationMessage = {
  margin: "5px 0",

  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",

  overflow: "hidden",

  color: "#94a3b8",

  fontSize: "10px",
  lineHeight: "16px"
};

const notificationDate = {
  color: "#64748b",

  fontSize: "9px"
};

/*
|--------------------------------------------------------------------------
| Conversaciones
|--------------------------------------------------------------------------
*/

const conversationItem = {
  width: "100%",

  display: "grid",

  gridTemplateColumns:
    "44px minmax(0, 1fr)",

  gap: "11px",

  padding: "14px 16px",

  border: "none",
  borderBottom:
    "1px solid rgba(148, 163, 184, .08)",

  background: "transparent",

  color: "#cbd5e1",

  textAlign: "left",

  cursor: "pointer"
};

const conversationContent = {
  minWidth: 0
};

const conversationHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px"
};

const conversationName = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "#f8fafc",

  fontSize: "11px"
};

const miniCountBadge = {
  minWidth: "19px",
  height: "19px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "0 5px",

  borderRadius: "999px",

  background: "#35d0c3",

  color: "#020617",

  fontSize: "8px",
  fontWeight: "950"
};

const conversationProduct = {
  margin: "4px 0",

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "#35d0c3",

  fontSize: "9px"
};

const conversationMessage = {
  display: "block",

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "#94a3b8",

  fontSize: "9px"
};

/*
|--------------------------------------------------------------------------
| Avatar
|--------------------------------------------------------------------------
*/

const userAvatar = {
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  overflow: "hidden",

  borderRadius: "50%",

  border:
    "2px solid rgba(53, 208, 195, .38)",

  background:
    "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6)",

  color: "#ffffff",

  fontWeight: "950",

  boxShadow:
    "0 10px 28px rgba(53, 208, 195, .15)"
};

const userAvatarImage = {
  width: "100%",
  height: "100%",

  display: "block",

  objectFit: "cover",
  objectPosition: "center"
};

/*
|--------------------------------------------------------------------------
| Carrito
|--------------------------------------------------------------------------
*/

const cartItem = {
  display: "grid",

  gridTemplateColumns:
    "54px minmax(0, 1fr) 31px",

  alignItems: "center",
  gap: "11px",

  padding: "12px 15px",

  borderBottom:
    "1px solid rgba(148, 163, 184, .08)"
};

const cartImageBox = {
  width: "54px",
  height: "54px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  overflow: "hidden",

  borderRadius: "13px",

  border:
    "1px solid rgba(148, 163, 184, .12)",

  background:
    "linear-gradient(135deg, rgba(53,208,195,.12), rgba(139,92,246,.14))",

  fontSize: "21px"
};

const cartImage = {
  width: "100%",
  height: "100%",

  objectFit: "cover"
};

const cartItemContent = {
  minWidth: 0,

  display: "grid",
  gap: "5px"
};

const cartItemTitle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "#f8fafc",

  fontSize: "11px"
};

const cartItemPrice = {
  color: "#5eead4",

  fontSize: "10px",
  fontWeight: "900"
};

const removeCartButton = {
  width: "31px",
  height: "31px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "10px",

  border:
    "1px solid rgba(239, 68, 68, .22)",

  background:
    "rgba(239, 68, 68, .09)",

  color: "#fca5a5",

  fontSize: "18px",

  cursor: "pointer"
};

const cartSummary = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",

  margin: "12px",
  padding: "13px 15px",

  borderRadius: "13px",

  border:
    "1px solid rgba(53, 208, 195, .15)",

  background:
    "rgba(53, 208, 195, .07)",

  color: "#cbd5e1",

  fontSize: "11px"
};

/*
|--------------------------------------------------------------------------
| Perfil
|--------------------------------------------------------------------------
*/

const profileContainer = {
  position: "relative"
};

const profileButton = (
  active = false
) => ({
  minWidth: "205px",
  height: "52px",

  display: "flex",
  alignItems: "center",
  gap: "10px",

  padding: "4px 12px 4px 4px",

  borderRadius: "16px",

  border: active
    ? "1px solid rgba(53, 208, 195, .46)"
    : "1px solid rgba(53, 208, 195, .14)",

  background: active
    ? "linear-gradient(135deg, rgba(53,208,195,.15), rgba(139,92,246,.16))"
    : "rgba(8, 19, 37, .88)",

  color: "#ffffff",

  cursor: "pointer",

  boxShadow:
    "0 12px 32px rgba(0, 0, 0, .12)"
});

const profileText = {
  minWidth: 0,

  flex: 1,

  display: "grid",
  gap: "2px",

  textAlign: "left"
};

const profileName = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  color: "#f8fafc",

  fontSize: "11px"
};

const profileStatus = (
  verified
) => ({
  color: verified
    ? "#35d0c3"
    : "#fde68a",

  fontSize: "9px"
});

const profileChevron = {
  color: "#64748b",

  fontSize: "14px"
};

const profileSummary = {
  display: "flex",
  alignItems: "center",
  gap: "12px",

  margin: "12px",
  padding: "13px",

  borderRadius: "14px",

  border:
    "1px solid rgba(53, 208, 195, .14)",

  background:
    "rgba(53, 208, 195, .06)"
};

const profileSummaryName = {
  display: "block",

  color: "#f8fafc",

  fontSize: "12px"
};

const profileRole = {
  display: "block",

  marginTop: "4px",

  color: "#35d0c3",

  fontSize: "9px"
};

const profileMenuList = {
  display: "grid",

  padding: "4px 10px 10px"
};

const menuItem = {
  minHeight: "42px",

  display: "grid",

  gridTemplateColumns:
    "28px minmax(0, 1fr) 18px",

  alignItems: "center",
  gap: "8px",

  padding: "8px 10px",

  borderRadius: "11px",

  color: "#cbd5e1",

  textDecoration: "none",

  fontSize: "10px"
};

const menuItemHighlighted = {
  ...menuItem,

  border:
    "1px solid rgba(139, 92, 246, .22)",

  background:
    "linear-gradient(135deg, rgba(53,208,195,.09), rgba(139,92,246,.12))",

  color: "#ddd6fe"
};

const menuItemIcon = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  fontSize: "15px"
};

const menuItemLabel = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const menuItemArrow = {
  color: "#64748b",

  fontSize: "12px"
};

const logoutButton = {
  minHeight: "42px",

  display: "flex",
  alignItems: "center",

  margin: "0 10px 11px",
  padding: "9px 11px",

  borderRadius: "11px",

  border:
    "1px solid rgba(239, 68, 68, .22)",

  background:
    "rgba(239, 68, 68, .08)",

  color: "#fca5a5",

  fontSize: "10px",
  fontWeight: "900",

  cursor: "pointer"
};

export default Topbar;