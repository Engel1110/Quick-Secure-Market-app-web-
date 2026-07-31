const crypto = require("crypto");
const prisma = require("../utils/prisma");

/*
|--------------------------------------------------------------------------
| Valores permitidos
|--------------------------------------------------------------------------
*/

const PAYMENT_METHODS = [
  "BANK_TRANSFER",
  "CASH_ON_DELIVERY",
  "CARD"
];

const DELIVERY_METHODS = [
  "QSM_WAREHOUSE",
  "QSM_VERIFIED_DELIVERY",
  "DIRECT_DELIVERY"
];

const ACTIVE_ORDER_STATUSES = [
  "PENDING",
  "WAITING_PAYMENT",
  "PAYMENT_UNDER_REVIEW",
  "PAYMENT_CONFIRMED",
  "WAITING_SELLER",
  "WAITING_WAREHOUSE",
  "IN_WAREHOUSE",
  "UNDER_INSPECTION",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "WAITING_PIN",
  "DELIVERED",
  "DISPUTED"
];

const CANCELLABLE_ORDER_STATUSES = [
  "PENDING",
  "WAITING_PAYMENT",
  "PAYMENT_UNDER_REVIEW",
  "PAYMENT_CONFIRMED",
  "WAITING_SELLER",
  "WAITING_WAREHOUSE"
];

const DISPUTABLE_ORDER_STATUSES = [
  "PAYMENT_CONFIRMED",
  "WAITING_SELLER",
  "WAITING_WAREHOUSE",
  "IN_WAREHOUSE",
  "UNDER_INSPECTION",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "WAITING_PIN",
  "DELIVERED"
];

const INTERNAL_ROLES = [
  "VERIFICATION_AGENT",
  "WAREHOUSE",
  "DELIVERY",
  "ADMIN",
  "SENIOR_ADMIN",
  "SUPER_ADMIN"
];

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  trustScore: true,
  isVerified: true,
  role: true,
  status: true
};

const PRODUCT_SELECT = {
  id: true,
  title: true,
  description: true,
  price: true,
  category: true,
  condition: true,
  images: true,
  imageUrl: true,
  status: true,
  riskLevel: true,
  confidenceScore: true,
  sellerId: true,
  location: true,
  seller: {
    select: USER_SELECT
  }
};

const ORDER_INCLUDE = {
  product: {
    select: PRODUCT_SELECT
  },
  buyer: {
    select: USER_SELECT
  },
  seller: {
    select: USER_SELECT
  },
  warehouseAgent: {
    select: USER_SELECT
  },
  deliveryAgent: {
    select: USER_SELECT
  },
  paymentConfirmedBy: {
    select: USER_SELECT
  },
  deliveryPinVerifiedBy: {
    select: USER_SELECT
  },
  cancelledBy: {
    select: USER_SELECT
  },
  disputeOpenedBy: {
    select: USER_SELECT
  },
  dispute: true,
  payments: true
};

/*
|--------------------------------------------------------------------------
| Utilidades
|--------------------------------------------------------------------------
*/

const parsePositiveInt = (value) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const normalizeUpper = (value, fallback = "") => {
  return String(value || fallback)
    .trim()
    .toUpperCase();
};

const generateDeliveryPin = () => {
  return String(
    crypto.randomInt(100000, 1000000)
  );
};

const generateOrderCode = () => {
  const timestamp = Date.now()
    .toString()
    .slice(-8);

  const random = crypto.randomInt(
    100,
    1000
  );

  return `QSM-${timestamp}-${random}`;
};

const generateDemoTransactionId = () => {
  return `DEMO-${crypto
    .randomBytes(8)
    .toString("hex")
    .toUpperCase()}`;
};

const addTimelineEvent = (
  timeline,
  {
    status,
    description,
    createdBy = null,
    metadata = {}
  }
) => {
  const safeTimeline = Array.isArray(timeline)
    ? [...timeline]
    : [];

  safeTimeline.push({
    status,
    description,
    createdBy,
    metadata,
    createdAt: new Date().toISOString()
  });

  return safeTimeline;
};

/*
|--------------------------------------------------------------------------
| Puente temporal MongoDB Auth -> Prisma/Supabase
|--------------------------------------------------------------------------
*/

const resolvePrismaUser = async (req) => {
  const possibleIds = [
    req.user?.id,
    req.user?.userId,
    req.user?._id
  ];

  for (const possibleId of possibleIds) {
    const numericId = parsePositiveInt(
      possibleId
    );

    if (numericId) {
      const userById =
        await prisma.user.findUnique({
          where: {
            id: numericId
          }
        });

      if (userById) {
        return userById;
      }
    }
  }

  const email = String(
    req.user?.email || ""
  )
    .trim()
    .toLowerCase();

  if (!email) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      email
    }
  });
};

const getRequestRole = (
  req,
  prismaUser
) => {
  return normalizeUpper(
    req.user?.role ||
    prismaUser?.role ||
    "USER",
    "USER"
  );
};

/*
|--------------------------------------------------------------------------
| Serialización compatible con el frontend anterior
|--------------------------------------------------------------------------
*/

const serializeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    ...user,
    _id: String(user.id)
  };
};

const serializeProduct = (product) => {
  if (!product) {
    return null;
  }

  return {
    ...product,
    _id: String(product.id),
    seller: serializeUser(
      product.seller
    )
  };
};

const serializePayment = (payment) => {
  if (!payment) {
    return null;
  }

  return {
    ...payment,
    _id: String(payment.id),
    order: String(payment.orderId),
    buyer: String(payment.buyerId),
    seller: String(payment.sellerId)
  };
};

const serializeDispute = (dispute) => {
  if (!dispute) {
    return null;
  }

  return {
    ...dispute,
    _id: String(dispute.id),
    order: String(dispute.orderId)
  };
};

const serializeOrder = (order) => {
  if (!order) {
    return null;
  }

  return {
    ...order,
    _id: String(order.id),

    product: order.product
      ? serializeProduct(order.product)
      : String(order.productId),

    buyer: order.buyer
      ? serializeUser(order.buyer)
      : String(order.buyerId),

    seller: order.seller
      ? serializeUser(order.seller)
      : String(order.sellerId),

    warehouseAgent:
      serializeUser(
        order.warehouseAgent
      ),

    deliveryAgent:
      serializeUser(
        order.deliveryAgent
      ),

    paymentConfirmedBy:
      serializeUser(
        order.paymentConfirmedBy
      ),

    deliveryPinVerifiedBy:
      serializeUser(
        order.deliveryPinVerifiedBy
      ),

    cancelledBy:
      serializeUser(
        order.cancelledBy
      ),

    disputeOpenedBy:
      serializeUser(
        order.disputeOpenedBy
      ),

    dispute:
      serializeDispute(
        order.dispute
      ),

    payments:
      Array.isArray(order.payments)
        ? order.payments.map(
            serializePayment
          )
        : [],

    timeline:
      Array.isArray(order.timeline)
        ? order.timeline
        : []
  };
};

/*
|--------------------------------------------------------------------------
| Consulta completa de una orden
|--------------------------------------------------------------------------
*/

const getOrderRecord = async (
  orderId,
  client = prisma
) => {
  return client.order.findUnique({
    where: {
      id: orderId
    },
    include: ORDER_INCLUDE
  });
};

/*
|--------------------------------------------------------------------------
| Permisos
|--------------------------------------------------------------------------
*/

const getOrderPermissions = (
  order,
  prismaUser,
  role
) => {
  const userId = prismaUser?.id || null;

  return {
    userId,
    role,

    isBuyer:
      Boolean(userId) &&
      order.buyerId === userId,

    isSeller:
      Boolean(userId) &&
      order.sellerId === userId,

    isWarehouseAgent:
      Boolean(userId) &&
      order.warehouseAgentId === userId,

    isDeliveryAgent:
      Boolean(userId) &&
      order.deliveryAgentId === userId,

    isInternal:
      INTERNAL_ROLES.includes(role)
  };
};

const canAccessOrder = (
  order,
  prismaUser,
  role
) => {
  const permissions =
    getOrderPermissions(
      order,
      prismaUser,
      role
    );

  return (
    permissions.isBuyer ||
    permissions.isSeller ||
    permissions.isWarehouseAgent ||
    permissions.isDeliveryAgent ||
    permissions.isInternal
  );
};

/*
|--------------------------------------------------------------------------
| Voucher
|--------------------------------------------------------------------------
*/

const buildVoucher = (rawOrder) => {
  const order = serializeOrder(
    rawOrder
  );

  const product =
    order?.product || {};

  return {
    orderId:
      order?._id ||
      order?.id ||
      "",

    orderCode:
      order?.orderCode ||
      "",

    deliveryPin:
      order?.deliveryPin ||
      "",

    product: {
      id:
        product?._id ||
        product?.id ||
        order?.productId ||
        "",

      title:
        product?.title ||
        "Producto QSM",

      description:
        product?.description ||
        "",

      category:
        product?.category ||
        "",

      condition:
        product?.condition ||
        "",

      price: Number(
        product?.price ||
        order?.price ||
        0
      ),

      images:
        Array.isArray(product?.images)
          ? product.images
          : []
    },

    buyer:
      order?.buyer ||
      null,

    seller:
      order?.seller ||
      null,

    paymentMethod:
      order?.paymentMethod ||
      "PENDING",

    paymentStatus:
      order?.paymentStatus ||
      "PENDING",

    escrowStatus:
      order?.escrowStatus ||
      "NOT_FUNDED",

    deliveryMethod:
      order?.deliveryMethod ||
      "PENDING",

    deliveryStatus:
      order?.deliveryStatus ||
      "PENDING",

    warehouseStatus:
      order?.warehouseStatus ||
      "NOT_REQUIRED",

    subtotal: Number(
      order?.price || 0
    ),

    protectionFee: Number(
      order?.protectionFee || 0
    ),

    shippingFee: Number(
      order?.shippingFee || 0
    ),

    totalAmount: Number(
      order?.totalAmount || 0
    ),

    depositPercentage: Number(
      order?.depositPercentage || 0
    ),

    depositAmount: Number(
      order?.depositAmount || 0
    ),

    remainingAmount: Number(
      order?.remainingAmount || 0
    ),

    depositStatus:
      order?.depositStatus ||
      "NOT_REQUIRED",

    status:
      order?.status ||
      "PENDING",

    createdAt:
      order?.createdAt ||
      new Date(),

    updatedAt:
      order?.updatedAt ||
      new Date()
  };
};

/*
|--------------------------------------------------------------------------
| Notificaciones en Prisma/Supabase
|--------------------------------------------------------------------------
*/

const createNotificationSafe = async (
  client,
  userId,
  type,
  title,
  message
) => {
  try {
    if (!userId) {
      return;
    }

    await client.notification.create({
      data: {
        userId,
        title,
        message:
          type
            ? `[${type}] ${message}`
            : message,
        read: false
      }
    });
  } catch (error) {
    console.error(
      `Error enviando notificación ${type}:`,
      error.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| Manejo de errores
|--------------------------------------------------------------------------
*/

const handleError = (
  res,
  error,
  message
) => {
  console.error(message, error);

  if (error?.code === "P2002") {
    return res.status(409).json({
      success: false,
      message:
        "Ya existe un registro con uno de los valores únicos enviados."
    });
  }

  if (error?.code === "P2025") {
    return res.status(404).json({
      success: false,
      message:
        "El registro solicitado no fue encontrado."
    });
  }

  return res.status(500).json({
    success: false,
    message,
    error:
      process.env.NODE_ENV ===
      "production"
        ? undefined
        : error.message
  });
};

/*
|--------------------------------------------------------------------------
| Crear orden
|--------------------------------------------------------------------------
*/

const createOrder = async (
  req,
  res
) => {
  try {
    const {
      productId,
      paymentMethod,
      deliveryMethod,

      bankName = "",
      transferReference = "",

      cardBrand = "",
      cardLast4 = "",

      pickupAddress = "",
      deliveryAddress = "",

      buyerNotes = "",

      useDeposit = false
    } = req.body || {};

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const numericProductId =
      parsePositiveInt(productId);

    if (!numericProductId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador del producto no es válido."
      });
    }

    const normalizedPaymentMethod =
      normalizeUpper(paymentMethod);

    const normalizedDeliveryMethod =
      normalizeUpper(deliveryMethod);

    if (
      !PAYMENT_METHODS.includes(
        normalizedPaymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selecciona transferencia bancaria, efectivo contra entrega o tarjeta."
      });
    }

    if (
      !DELIVERY_METHODS.includes(
        normalizedDeliveryMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selecciona Almacén QSM, Delivery QSM verificado o entrega coordinada."
      });
    }

    if (
      normalizedPaymentMethod ===
        "BANK_TRANSFER" &&
      !String(bankName).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Indica el banco para la transferencia."
      });
    }

    if (
      normalizedPaymentMethod ===
        "CARD" &&
      cardLast4 &&
      !/^\d{4}$/.test(
        String(cardLast4)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Los últimos cuatro números de la tarjeta no son válidos."
      });
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: numericProductId
        },
        include: {
          seller: {
            select: USER_SELECT
          }
        }
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Producto no encontrado."
      });
    }

    if (!product.sellerId) {
      return res.status(400).json({
        success: false,
        message:
          "El producto no tiene un vendedor asignado."
      });
    }

    if (
      product.sellerId ===
      prismaUser.id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No puedes comprar tu propio producto."
      });
    }

    const ownExistingOrder =
      await prisma.order.findFirst({
        where: {
          productId: numericProductId,
          buyerId: prismaUser.id,
          status: {
            in: ACTIVE_ORDER_STATUSES
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        include: ORDER_INCLUDE
      });

    if (ownExistingOrder) {
      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "La compra ya existía. Se recuperó el voucher correctamente.",
        voucher:
          buildVoucher(
            ownExistingOrder
          ),
        order:
          serializeOrder(
            ownExistingOrder
          )
      });
    }

    const otherExistingOrder =
      await prisma.order.findFirst({
        where: {
          productId: numericProductId,
          buyerId: {
            not: prismaUser.id
          },
          status: {
            in: ACTIVE_ORDER_STATUSES
          }
        },
        select: {
          id: true
        }
      });

    if (otherExistingOrder) {
      return res.status(409).json({
        success: false,
        message:
          "Este producto ya tiene una compra en proceso."
      });
    }

    if (
      normalizeUpper(product.status) !==
      "ACTIVE"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Este producto no está disponible para una compra nueva."
      });
    }

    const price = Number(
      product.price || 0
    );

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El producto no tiene un precio válido."
      });
    }

    const deliveryPin =
      generateDeliveryPin();

    const orderCode =
      generateOrderCode();

    const depositPercentage =
      useDeposit === true ||
      useDeposit === "true"
        ? 3
        : 0;

    const protectionFee = 0;

    const shippingFee =
      normalizedDeliveryMethod ===
      "QSM_VERIFIED_DELIVERY"
        ? 500
        : 0;

    const totalAmount =
      price +
      protectionFee +
      shippingFee;

    const depositAmount =
      depositPercentage > 0
        ? price *
          (depositPercentage / 100)
        : 0;

    const remainingAmount =
      Math.max(
        price - depositAmount,
        0
      );

    let paymentStatus = "PENDING";
    let escrowStatus = "NOT_FUNDED";

    switch (
      normalizedPaymentMethod
    ) {
      case "BANK_TRANSFER":
        paymentStatus =
          "PENDING_PROOF";
        escrowStatus =
          "PENDING";
        break;

      case "CARD":
        paymentStatus =
          "DEMO_AUTHORIZED";
        escrowStatus =
          "HELD";
        break;

      case "CASH_ON_DELIVERY":
      default:
        paymentStatus =
          "PENDING_DELIVERY";
        escrowStatus =
          "NOT_FUNDED";
        break;
    }

    let warehouseStatus =
      "NOT_REQUIRED";

    let deliveryStatus =
      "PENDING";

    let initialStatus =
      "WAITING_SELLER";

    switch (
      normalizedDeliveryMethod
    ) {
      case "QSM_WAREHOUSE":
        warehouseStatus =
          "WAITING_FOR_SELLER";

        deliveryStatus =
          "WAITING_FOR_SELLER";

        initialStatus =
          normalizedPaymentMethod ===
          "BANK_TRANSFER"
            ? "WAITING_PAYMENT"
            : "WAITING_WAREHOUSE";
        break;

      case "QSM_VERIFIED_DELIVERY":
        warehouseStatus =
          "NOT_REQUIRED";

        deliveryStatus =
          "PICKUP_REQUESTED";

        initialStatus =
          normalizedPaymentMethod ===
          "BANK_TRANSFER"
            ? "WAITING_PAYMENT"
            : "WAITING_SELLER";
        break;

      default:
        warehouseStatus =
          "NOT_REQUIRED";

        deliveryStatus =
          "WAITING_FOR_SELLER";

        initialStatus =
          normalizedPaymentMethod ===
          "BANK_TRANSFER"
            ? "WAITING_PAYMENT"
            : "WAITING_SELLER";
    }

    let timeline = [];

    timeline = addTimelineEvent(
      timeline,
      {
        status:
          "ORDER_CREATED",
        description:
          "La compra protegida fue creada correctamente.",
        createdBy:
          prismaUser.id,
        metadata: {
          paymentMethod:
            normalizedPaymentMethod,
          deliveryMethod:
            normalizedDeliveryMethod
        }
      }
    );

    timeline = addTimelineEvent(
      timeline,
      {
        status:
          "PIN_GENERATED",
        description:
          "Se generó el PIN único de entrega.",
        createdBy:
          prismaUser.id
      }
    );

    if (
      normalizedPaymentMethod ===
      "CARD"
    ) {
      timeline = addTimelineEvent(
        timeline,
        {
          status:
            "CARD_DEMO_AUTHORIZED",
          description:
            "Pago autorizado en modo demostración.",
          createdBy:
            prismaUser.id
        }
      );
    }

    if (
      normalizedPaymentMethod ===
      "BANK_TRANSFER"
    ) {
      timeline = addTimelineEvent(
        timeline,
        {
          status:
            "WAITING_TRANSFER_CONFIRMATION",
          description:
            "La transferencia será confirmada durante la entrega.",
          createdBy:
            prismaUser.id,
          metadata: {
            bankName:
              String(bankName).trim()
          }
        }
      );
    }

    if (
      normalizedPaymentMethod ===
      "CASH_ON_DELIVERY"
    ) {
      timeline = addTimelineEvent(
        timeline,
        {
          status:
            "WAITING_CASH_PAYMENT",
          description:
            "El efectivo será entregado durante la entrega.",
          createdBy:
            prismaUser.id
        }
      );
    }

    if (
      normalizedDeliveryMethod ===
      "QSM_WAREHOUSE"
    ) {
      timeline = addTimelineEvent(
        timeline,
        {
          status:
            "WAITING_FOR_SELLER",
          description:
            "Esperando que el vendedor entregue el producto al almacén QSM.",
          createdBy:
            prismaUser.id
        }
      );
    }

    if (
      normalizedDeliveryMethod ===
      "QSM_VERIFIED_DELIVERY"
    ) {
      timeline = addTimelineEvent(
        timeline,
        {
          status:
            "PICKUP_REQUESTED",
          description:
            "Se solicitó un Delivery QSM verificado.",
          createdBy:
            prismaUser.id
        }
      );
    }

    const createdOrderId =
      await prisma.$transaction(
        async (tx) => {
          const createdOrder =
            await tx.order.create({
              data: {
                orderCode,
                productId:
                  numericProductId,
                buyerId:
                  prismaUser.id,
                sellerId:
                  product.sellerId,

                price,
                protectionFee,
                shippingFee,
                totalAmount,
                reserveFee: 0,

                depositPercentage,
                depositAmount,
                remainingAmount,
                depositStatus:
                  depositPercentage > 0
                    ? "PENDING"
                    : "NOT_REQUIRED",

                status:
                  initialStatus,

                paymentMethod:
                  normalizedPaymentMethod,
                paymentStatus,
                escrowStatus,

                deliveryMethod:
                  normalizedDeliveryMethod,
                deliveryStatus,
                warehouseStatus,

                bankName:
                  normalizedPaymentMethod ===
                  "BANK_TRANSFER"
                    ? String(
                        bankName
                      ).trim()
                    : "",

                transferReference:
                  normalizedPaymentMethod ===
                  "BANK_TRANSFER"
                    ? String(
                        transferReference
                      ).trim()
                    : "",

                cardBrand:
                  normalizedPaymentMethod ===
                  "CARD"
                    ? String(
                        cardBrand
                      ).trim()
                    : "",

                cardLast4:
                  normalizedPaymentMethod ===
                  "CARD"
                    ? String(
                        cardLast4
                      ).trim()
                    : "",

                paymentTransactionId:
                  normalizedPaymentMethod ===
                  "CARD"
                    ? generateDemoTransactionId()
                    : "",

                pickupAddress:
                  String(
                    pickupAddress
                  ).trim(),

                deliveryAddress:
                  String(
                    deliveryAddress
                  ).trim(),

                buyerNotes:
                  String(
                    buyerNotes
                  ).trim(),

                deliveryPin,
                timeline
              }
            });

          await tx.product.update({
            where: {
              id: numericProductId
            },
            data: {
              status: "SOLD"
            }
          });

          const sellerMessage =
            normalizedDeliveryMethod ===
            "QSM_WAREHOUSE"
              ? `Tu producto "${product.title}" fue comprado. Debes prepararlo y entregarlo en el almacén QSM.`
              : normalizedDeliveryMethod ===
                "QSM_VERIFIED_DELIVERY"
              ? `Tu producto "${product.title}" fue comprado. Se solicitó un Delivery QSM verificado para recogerlo.`
              : `Tu producto "${product.title}" fue comprado. Debes coordinar la entrega con el comprador.`;

          let buyerMessage =
            `Tu compra protegida de "${product.title}" fue creada correctamente. ` +
            `Código de orden: ${orderCode}. ` +
            `Tu PIN de entrega es ${deliveryPin}.`;

          if (
            normalizedPaymentMethod ===
            "BANK_TRANSFER"
          ) {
            buyerMessage +=
              " La transferencia será validada durante la entrega.";
          }

          if (
            normalizedPaymentMethod ===
            "CASH_ON_DELIVERY"
          ) {
            buyerMessage +=
              " El pago en efectivo será confirmado durante la entrega.";
          }

          if (
            normalizedPaymentMethod ===
            "CARD"
          ) {
            buyerMessage +=
              " El pago con tarjeta fue autorizado en modo demostración.";
          }

          await createNotificationSafe(
            tx,
            product.sellerId,
            "PRODUCT_SOLD",
            "Nueva venta en QSM",
            sellerMessage
          );

          await createNotificationSafe(
            tx,
            prismaUser.id,
            "ORDER_CREATED",
            "Compra protegida creada",
            buyerMessage
          );

          return createdOrder.id;
        },
        {
          maxWait: 20000,
          timeout: 60000
        }
      );

    const finalOrder =
      await getOrderRecord(
        createdOrderId
      );

    return res.status(201).json({
      success: true,
      recovered: false,
      message:
        "Compra protegida creada correctamente.",
      voucher:
        buildVoucher(
          finalOrder
        ),
      order:
        serializeOrder(
          finalOrder
        )
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudo crear la compra protegida."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Obtener compras y ventas
|--------------------------------------------------------------------------
*/

const getMyOrders = async (
  req,
  res
) => {
  try {
    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const {
      type = "all",
      status,
      limit = 100
    } = req.query || {};

    const where = {};

    if (type === "buy") {
      where.buyerId =
        prismaUser.id;
    } else if (type === "sell") {
      where.sellerId =
        prismaUser.id;
    } else {
      where.OR = [
        {
          buyerId:
            prismaUser.id
        },
        {
          sellerId:
            prismaUser.id
        }
      ];
    }

    if (
      status &&
      normalizeUpper(status) !==
      "ALL"
    ) {
      where.status =
        normalizeUpper(status);
    }

    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 100,
        1
      ),
      200
    );

    const records =
      await prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: {
          createdAt: "desc"
        },
        take: safeLimit
      });

    const orders =
      records.map(
        serializeOrder
      );

    const purchases =
      records.filter(
        (order) =>
          order.buyerId ===
          prismaUser.id
      );

    const sales =
      records.filter(
        (order) =>
          order.sellerId ===
          prismaUser.id
      );

    return res.status(200).json({
      success: true,
      count:
        orders.length,
      purchaseCount:
        purchases.length,
      salesCount:
        sales.length,
      orders
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudieron obtener tus compras y ventas."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Obtener una orden
|--------------------------------------------------------------------------
*/

const getOrderById = async (
  req,
  res
) => {
  try {
    const orderId =
      parsePositiveInt(
        req.params.id
      );

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const role =
      getRequestRole(
        req,
        prismaUser
      );

    const order =
      await getOrderRecord(
        orderId
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Orden no encontrada."
      });
    }

    if (
      !canAccessOrder(
        order,
        prismaUser,
        role
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para consultar esta orden."
      });
    }

    const permissions =
      getOrderPermissions(
        order,
        prismaUser,
        role
      );

    return res.status(200).json({
      success: true,

      permissions: {
        isBuyer:
          permissions.isBuyer,
        isSeller:
          permissions.isSeller,
        isWarehouseAgent:
          permissions.isWarehouseAgent,
        isDeliveryAgent:
          permissions.isDeliveryAgent,
        isInternal:
          permissions.isInternal
      },

      voucher:
        buildVoucher(order),

      order:
        serializeOrder(order)
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudo obtener la orden."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Cancelar una orden
|--------------------------------------------------------------------------
*/

const cancelOrder = async (
  req,
  res
) => {
  try {
    const orderId =
      parsePositiveInt(
        req.params.id
      );

    const {
      reason = "",
      requestedBy = ""
    } = req.body || {};

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    const cleanReason =
      String(reason).trim();

    if (
      cleanReason.length < 5
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar un motivo de cancelación de al menos 5 caracteres."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const role =
      getRequestRole(
        req,
        prismaUser
      );

    const order =
      await getOrderRecord(
        orderId
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Orden no encontrada."
      });
    }

    const permissions =
      getOrderPermissions(
        order,
        prismaUser,
        role
      );

    if (
      !permissions.isBuyer &&
      !permissions.isSeller &&
      !permissions.isInternal
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para cancelar esta orden."
      });
    }

    if (
      order.status ===
      "CANCELLED"
    ) {
      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "La orden ya estaba cancelada.",
        voucher:
          buildVoucher(order),
        order:
          serializeOrder(order)
      });
    }

    if (
      !CANCELLABLE_ORDER_STATUSES.includes(
        order.status
      ) &&
      !permissions.isInternal
    ) {
      return res.status(409).json({
        success: false,
        message:
          "La orden ya avanzó demasiado y no puede cancelarse directamente. Debes abrir un reclamo."
      });
    }

    let cancellationRequestedBy =
      "ADMIN";

    if (
      permissions.isBuyer
    ) {
      cancellationRequestedBy =
        "BUYER";
    } else if (
      permissions.isSeller
    ) {
      cancellationRequestedBy =
        "SELLER";
    } else if (
      role === "WAREHOUSE" ||
      role ===
        "VERIFICATION_AGENT"
    ) {
      cancellationRequestedBy =
        "WAREHOUSE";
    } else if (
      role === "DELIVERY"
    ) {
      cancellationRequestedBy =
        "DELIVERY";
    }

    const requestedByValue =
      normalizeUpper(
        requestedBy
      );

    if (
      permissions.isInternal &&
      [
        "BUYER",
        "SELLER",
        "WAREHOUSE",
        "DELIVERY",
        "ADMIN"
      ].includes(
        requestedByValue
      )
    ) {
      cancellationRequestedBy =
        requestedByValue;
    }

    const now =
      new Date();

    const previousStatus =
      order.status;

    let refundAmount =
      Number(
        order.refundAmount || 0
      );

    let depositStatus =
      order.depositStatus;

    if (
      order.depositAmount > 0
    ) {
      if (
        [
          "SELLER",
          "WAREHOUSE",
          "DELIVERY",
          "ADMIN"
        ].includes(
          cancellationRequestedBy
        )
      ) {
        refundAmount =
          Number(
            order.depositAmount || 0
          );

        depositStatus =
          "REFUNDED";
      } else if (
        cancellationRequestedBy ===
        "BUYER"
      ) {
        const cancellationFee =
          previousStatus ===
          "WAITING_WAREHOUSE"
            ? Number(
                order.depositAmount ||
                0
              ) * 0.25
            : 0;

        refundAmount =
          Math.max(
            Number(
              order.depositAmount ||
              0
            ) -
              cancellationFee,
            0
          );

        depositStatus =
          cancellationFee > 0
            ? "PARTIALLY_REFUNDED"
            : "REFUNDED";
      }
    } else {
      refundAmount = 0;
    }

    let escrowStatus =
      order.escrowStatus;

    let paymentStatus =
      order.paymentStatus;

    let refundedAt =
      order.refundedAt;

    if (
      [
        "HELD",
        "PENDING",
        "UNDER_REVIEW",
        "READY_TO_RELEASE"
      ].includes(
        order.escrowStatus
      )
    ) {
      escrowStatus =
        "REFUNDED";

      paymentStatus =
        "REFUNDED";

      refundedAt =
        now;
    }

    const timeline =
      addTimelineEvent(
        order.timeline,
        {
          status:
            "ORDER_CANCELLED",
          description:
            `La orden fue cancelada por ${cancellationRequestedBy.toLowerCase()}. Motivo: ${cleanReason}`,
          createdBy:
            prismaUser.id,
          metadata: {
            requestedBy:
              cancellationRequestedBy,
            refundAmount,
            depositStatus
          }
        }
      );

    await prisma.$transaction(
      async (tx) => {
        await tx.order.update({
          where: {
            id: order.id
          },
          data: {
            status:
              "CANCELLED",
            cancellationReason:
              cleanReason,
            cancellationRequestedBy,
            cancelledById:
              prismaUser.id,
            cancelledAt:
              now,
            refundAmount,
            depositStatus,
            escrowStatus,
            paymentStatus,
            refundedAt,
            timeline
          }
        });

        const anotherActiveOrder =
          await tx.order.findFirst({
            where: {
              id: {
                not: order.id
              },
              productId:
                order.productId,
              status: {
                in: ACTIVE_ORDER_STATUSES
              }
            },
            select: {
              id: true
            }
          });

        if (!anotherActiveOrder) {
          await tx.product.update({
            where: {
              id: order.productId
            },
            data: {
              status: "ACTIVE"
            }
          });
        }

        const notificationText =
          `La orden ${order.orderCode} fue cancelada. ` +
          `Motivo: ${cleanReason}`;

        if (
          order.buyerId !==
          prismaUser.id
        ) {
          await createNotificationSafe(
            tx,
            order.buyerId,
            "ORDER_CANCELLED",
            "Compra cancelada",
            notificationText
          );
        }

        if (
          order.sellerId !==
          prismaUser.id
        ) {
          await createNotificationSafe(
            tx,
            order.sellerId,
            "ORDER_CANCELLED",
            "Venta cancelada",
            notificationText
          );
        }
      },
      {
        maxWait: 20000,
        timeout: 60000
      }
    );

    const finalOrder =
      await getOrderRecord(
        order.id
      );

    return res.status(200).json({
      success: true,
      message:
        "La orden fue cancelada correctamente.",

      refund: {
        amount:
          Number(
            finalOrder.refundAmount ||
            0
          ),
        depositStatus:
          finalOrder.depositStatus,
        escrowStatus:
          finalOrder.escrowStatus
      },

      voucher:
        buildVoucher(
          finalOrder
        ),

      order:
        serializeOrder(
          finalOrder
        )
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudo cancelar la orden."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Confirmar recepción
|--------------------------------------------------------------------------
*/

const confirmReceipt = async (
  req,
  res
) => {
  try {
    const orderId =
      parsePositiveInt(
        req.params.id
      );

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const role =
      getRequestRole(
        req,
        prismaUser
      );

    const order =
      await getOrderRecord(
        orderId
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Orden no encontrada."
      });
    }

    const permissions =
      getOrderPermissions(
        order,
        prismaUser,
        role
      );

    if (
      !permissions.isBuyer &&
      !permissions.isInternal
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo el comprador o un administrador puede confirmar la recepción."
      });
    }

    if (
      order.status ===
      "COMPLETED"
    ) {
      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "La recepción ya había sido confirmada.",
        voucher:
          buildVoucher(order),
        order:
          serializeOrder(order)
      });
    }

    const validStatuses = [
      "WAITING_PIN",
      "DELIVERED",
      "OUT_FOR_DELIVERY",
      "READY_FOR_PICKUP"
    ];

    if (
      !validStatuses.includes(
        order.status
      ) &&
      !permissions.isInternal
    ) {
      return res.status(409).json({
        success: false,
        message:
          "La orden todavía no está lista para confirmar la recepción."
      });
    }

    const now =
      new Date();

    let paymentStatus =
      order.paymentStatus;

    let paymentConfirmedAt =
      order.paymentConfirmedAt;

    let paymentConfirmedById =
      order.paymentConfirmedById;

    if (
      [
        "CASH_ON_DELIVERY",
        "BANK_TRANSFER"
      ].includes(
        order.paymentMethod
      )
    ) {
      paymentStatus =
        "CONFIRMED";

      paymentConfirmedAt =
        paymentConfirmedAt ||
        now;

      paymentConfirmedById =
        prismaUser.id;
    }

    let escrowStatus =
      order.escrowStatus;

    let releasedAt =
      order.releasedAt;

    if (
      [
        "HELD",
        "PENDING",
        "UNDER_REVIEW",
        "READY_TO_RELEASE"
      ].includes(
        order.escrowStatus
      )
    ) {
      escrowStatus =
        "RELEASED";

      releasedAt =
        now;
    }

    const depositStatus =
      order.depositAmount > 0
        ? "APPLIED_TO_TOTAL"
        : order.depositStatus;

    let timeline =
      addTimelineEvent(
        order.timeline,
        {
          status:
            "BUYER_CONFIRMED_RECEIPT",
          description:
            "El comprador confirmó que recibió el producto correctamente.",
          createdBy:
            prismaUser.id,
          metadata: {
            paymentStatus,
            escrowStatus
          }
        }
      );

    timeline =
      addTimelineEvent(
        timeline,
        {
          status:
            "ORDER_COMPLETED",
          description:
            "La compra protegida fue completada y el pago quedó liberado.",
          createdBy:
            prismaUser.id,
          metadata: {
            completedAt:
              now.toISOString()
          }
        }
      );

    await prisma.$transaction(
      async (tx) => {
        await tx.order.update({
          where: {
            id: order.id
          },
          data: {
            buyerConfirmedReceipt:
              true,
            buyerConfirmedReceiptAt:
              now,
            status:
              "COMPLETED",
            deliveryStatus:
              "DELIVERED",
            deliveredAt:
              order.deliveredAt ||
              now,
            completedAt:
              now,
            warehouseStatus:
              order.deliveryMethod ===
              "QSM_WAREHOUSE"
                ? "DELIVERED"
                : order.warehouseStatus,
            warehouseConfirmedDelivery:
              order.deliveryMethod ===
              "QSM_WAREHOUSE"
                ? true
                : order.warehouseConfirmedDelivery,
            warehouseConfirmedDeliveryAt:
              order.deliveryMethod ===
              "QSM_WAREHOUSE"
                ? order
                    .warehouseConfirmedDeliveryAt ||
                  now
                : order
                    .warehouseConfirmedDeliveryAt,
            paymentStatus,
            paymentConfirmedAt,
            paymentConfirmedById,
            escrowStatus,
            releasedAt,
            depositStatus,
            timeline
          }
        });

        await createNotificationSafe(
          tx,
          order.sellerId,
          "ORDER_COMPLETED",
          "Venta completada",
          `La orden ${order.orderCode} fue completada. El comprador confirmó la recepción del producto.`
        );
      },
      {
        maxWait: 20000,
        timeout: 60000
      }
    );

    const finalOrder =
      await getOrderRecord(
        order.id
      );

    return res.status(200).json({
      success: true,
      message:
        "Recepción confirmada. La compra fue completada correctamente.",
      voucher:
        buildVoucher(
          finalOrder
        ),
      order:
        serializeOrder(
          finalOrder
        )
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudo confirmar la recepción del producto."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Abrir reclamo
|--------------------------------------------------------------------------
*/

const openDispute = async (
  req,
  res
) => {
  try {
    const orderId =
      parsePositiveInt(
        req.params.id
      );

    const cleanReason =
      String(
        req.body?.reason || ""
      ).trim();

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    if (
      cleanReason.length < 10
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Describe el reclamo con al menos 10 caracteres."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const role =
      getRequestRole(
        req,
        prismaUser
      );

    const order =
      await getOrderRecord(
        orderId
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Orden no encontrada."
      });
    }

    const permissions =
      getOrderPermissions(
        order,
        prismaUser,
        role
      );

    if (
      !permissions.isBuyer &&
      !permissions.isSeller &&
      !permissions.isInternal
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para abrir un reclamo en esta orden."
      });
    }

    if (
      order.status ===
      "DISPUTED" ||
      order.dispute
    ) {
      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "Esta orden ya tiene un reclamo abierto.",
        voucher:
          buildVoucher(order),
        order:
          serializeOrder(order)
      });
    }

    if (
      !DISPUTABLE_ORDER_STATUSES.includes(
        order.status
      ) &&
      !permissions.isInternal
    ) {
      return res.status(409).json({
        success: false,
        message:
          "No se puede abrir un reclamo en el estado actual de la orden."
      });
    }

    const now =
      new Date();

    const escrowStatus =
      [
        "HELD",
        "PENDING",
        "READY_TO_RELEASE"
      ].includes(
        order.escrowStatus
      )
        ? "UNDER_REVIEW"
        : order.escrowStatus;

    const timeline =
      addTimelineEvent(
        order.timeline,
        {
          status:
            "DISPUTE_OPENED",
          description:
            `Se abrió un reclamo: ${cleanReason}`,
          createdBy:
            prismaUser.id,
          metadata: {
            openedBy:
              permissions.isBuyer
                ? "BUYER"
                : permissions.isSeller
                ? "SELLER"
                : "INTERNAL",
            escrowStatus
          }
        }
      );

    await prisma.$transaction(
      async (tx) => {
        await tx.order.update({
          where: {
            id: order.id
          },
          data: {
            status:
              "DISPUTED",
            disputeReason:
              cleanReason,
            disputeOpenedById:
              prismaUser.id,
            disputeOpenedAt:
              now,
            escrowStatus,
            timeline
          }
        });

        await tx.dispute.create({
          data: {
            orderId:
              order.id,
            reason:
              cleanReason,
            status:
              "OPEN"
          }
        });

        if (
          order.buyerId !==
          prismaUser.id
        ) {
          await createNotificationSafe(
            tx,
            order.buyerId,
            "DISPUTE_OPENED",
            "Reclamo abierto",
            `Se abrió un reclamo en la orden ${order.orderCode}. QSM revisará el caso.`
          );
        }

        if (
          order.sellerId !==
          prismaUser.id
        ) {
          await createNotificationSafe(
            tx,
            order.sellerId,
            "DISPUTE_OPENED",
            "Reclamo abierto",
            `Se abrió un reclamo en la orden ${order.orderCode}. QSM revisará el caso.`
          );
        }
      },
      {
        maxWait: 20000,
        timeout: 60000
      }
    );

    const finalOrder =
      await getOrderRecord(
        order.id
      );

    return res.status(201).json({
      success: true,
      message:
        "El reclamo fue abierto correctamente.",
      voucher:
        buildVoucher(
          finalOrder
        ),
      order:
        serializeOrder(
          finalOrder
        )
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudo abrir el reclamo."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Enviar producto al almacén
|--------------------------------------------------------------------------
*/

const sendToWarehouse = async (
  req,
  res
) => {
  try {
    const orderId =
      parsePositiveInt(
        req.params.id
      );

    const {
      notes = "",
      trackingNumber = "",
      trackingCompany = ""
    } = req.body || {};

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const role =
      getRequestRole(
        req,
        prismaUser
      );

    const order =
      await getOrderRecord(
        orderId
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Orden no encontrada."
      });
    }

    const permissions =
      getOrderPermissions(
        order,
        prismaUser,
        role
      );

    if (
      !permissions.isSeller &&
      !permissions.isInternal
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo el vendedor o el personal de QSM puede enviar el producto al almacén."
      });
    }

    if (
      order.deliveryMethod !==
      "QSM_WAREHOUSE"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Esta orden no utiliza el método Almacén QSM."
      });
    }

    const validStatuses = [
      "WAITING_PAYMENT",
      "PAYMENT_UNDER_REVIEW",
      "PAYMENT_CONFIRMED",
      "WAITING_SELLER",
      "WAITING_WAREHOUSE"
    ];

    if (
      !validStatuses.includes(
        order.status
      ) &&
      !permissions.isInternal
    ) {
      return res.status(409).json({
        success: false,
        message:
          "La orden no puede enviarse al almacén en su estado actual."
      });
    }

    if (
      order.warehouseStatus ===
      "IN_TRANSIT_TO_WAREHOUSE"
    ) {
      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "El producto ya estaba marcado como enviado al almacén.",
        voucher:
          buildVoucher(order),
        order:
          serializeOrder(order)
      });
    }

    const sellerNotes =
      String(notes).trim();

    const cleanTrackingNumber =
      String(
        trackingNumber
      ).trim();

    const cleanTrackingCompany =
      String(
        trackingCompany
      ).trim();

    const timeline =
      addTimelineEvent(
        order.timeline,
        {
          status:
            "PRODUCT_SENT_TO_WAREHOUSE",
          description:
            "El vendedor confirmó que el producto fue enviado o entregado al almacén QSM.",
          createdBy:
            prismaUser.id,
          metadata: {
            trackingNumber:
              cleanTrackingNumber,
            trackingCompany:
              cleanTrackingCompany,
            notes:
              sellerNotes
          }
        }
      );

    await prisma.$transaction(
      async (tx) => {
        await tx.order.update({
          where: {
            id: order.id
          },
          data: {
            status:
              "WAITING_WAREHOUSE",
            warehouseStatus:
              "IN_TRANSIT_TO_WAREHOUSE",
            deliveryStatus:
              "IN_TRANSIT_TO_WAREHOUSE",
            sellerNotes,
            trackingNumber:
              cleanTrackingNumber,
            trackingCompany:
              cleanTrackingCompany,
            timeline
          }
        });

        await createNotificationSafe(
          tx,
          order.buyerId,
          "PRODUCT_SENT_TO_WAREHOUSE",
          "Producto enviado al almacén",
          `El vendedor envió el producto de la orden ${order.orderCode} al almacén QSM.`
        );
      },
      {
        maxWait: 20000,
        timeout: 60000
      }
    );

    const finalOrder =
      await getOrderRecord(
        order.id
      );

    return res.status(200).json({
      success: true,
      message:
        "El producto fue marcado como enviado al almacén QSM.",
      voucher:
        buildVoucher(
          finalOrder
        ),
      order:
        serializeOrder(
          finalOrder
        )
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudo registrar el envío al almacén."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Solicitar Delivery QSM
|--------------------------------------------------------------------------
*/

const requestVerifiedDelivery =
  async (
    req,
    res
  ) => {
    try {
      const orderId =
        parsePositiveInt(
          req.params.id
        );

      const {
        pickupAddress = "",
        deliveryAddress = "",
        notes = ""
      } = req.body || {};

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador de la orden no es válido."
        });
      }

      const prismaUser =
        await resolvePrismaUser(req);

      if (!prismaUser) {
        return res.status(401).json({
          success: false,
          message:
            "Tu usuario autenticado todavía no existe en Supabase."
        });
      }

      const role =
        getRequestRole(
          req,
          prismaUser
        );

      const order =
        await getOrderRecord(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Orden no encontrada."
        });
      }

      const permissions =
        getOrderPermissions(
          order,
          prismaUser,
          role
        );

      if (
        !permissions.isSeller &&
        !permissions.isInternal
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Solo el vendedor o el personal de QSM puede solicitar la recogida."
        });
      }

      if (
        order.deliveryMethod !==
        "QSM_VERIFIED_DELIVERY"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Esta orden no utiliza Delivery QSM verificado."
        });
      }

      const validStatuses = [
        "WAITING_PAYMENT",
        "PAYMENT_UNDER_REVIEW",
        "PAYMENT_CONFIRMED",
        "WAITING_SELLER"
      ];

      if (
        !validStatuses.includes(
          order.status
        ) &&
        !permissions.isInternal
      ) {
        return res.status(409).json({
          success: false,
          message:
            "No se puede solicitar el delivery en el estado actual de la orden."
        });
      }

      if (
        [
          "PICKUP_REQUESTED",
          "PICKUP_SCHEDULED",
          "AGENT_ASSIGNED",
          "AGENT_ON_THE_WAY",
          "PRODUCT_COLLECTED"
        ].includes(
          order.deliveryStatus
        )
      ) {
        return res.status(200).json({
          success: true,
          recovered: true,
          message:
            "La recogida por Delivery QSM ya había sido solicitada.",
          voucher:
            buildVoucher(order),
          order:
            serializeOrder(order)
        });
      }

      const finalPickupAddress =
        String(pickupAddress).trim() ||
        order.pickupAddress;

      const finalDeliveryAddress =
        String(deliveryAddress).trim() ||
        order.deliveryAddress;

      const deliveryNotes =
        String(notes).trim();

      const timeline =
        addTimelineEvent(
          order.timeline,
          {
            status:
              "VERIFIED_DELIVERY_REQUESTED",
            description:
              "El vendedor solicitó un Delivery QSM verificado para recoger el producto.",
            createdBy:
              prismaUser.id,
            metadata: {
              pickupAddress:
                finalPickupAddress,
              deliveryAddress:
                finalDeliveryAddress,
              shippingFee:
                Number(
                  order.shippingFee ||
                  0
                )
            }
          }
        );

      await prisma.$transaction(
        async (tx) => {
          await tx.order.update({
            where: {
              id: order.id
            },
            data: {
              status:
                "WAITING_SELLER",
              deliveryStatus:
                "PICKUP_REQUESTED",
              pickupAddress:
                finalPickupAddress,
              deliveryAddress:
                finalDeliveryAddress,
              deliveryNotes,
              timeline
            }
          });

          await createNotificationSafe(
            tx,
            order.buyerId,
            "DELIVERY_REQUESTED",
            "Delivery QSM solicitado",
            `Se solicitó un Delivery QSM verificado para la orden ${order.orderCode}.`
          );
        },
        {
          maxWait: 20000,
          timeout: 60000
        }
      );

      const finalOrder =
        await getOrderRecord(
          order.id
        );

      return res.status(200).json({
        success: true,
        message:
          "La recogida por Delivery QSM fue solicitada correctamente.",
        voucher:
          buildVoucher(
            finalOrder
          ),
        order:
          serializeOrder(
            finalOrder
          )
      });
    } catch (error) {
      return handleError(
        res,
        error,
        "No se pudo solicitar el Delivery QSM."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Exportación
|--------------------------------------------------------------------------
*/

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  confirmReceipt,
  openDispute,
  sendToWarehouse,
  requestVerifiedDelivery
};
