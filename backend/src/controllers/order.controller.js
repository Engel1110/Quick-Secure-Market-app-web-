const crypto = require("crypto");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");

const {
  createNotification
} = require(
  "../services/notification.service"
);

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
  "SENIOR_ADMIN"
];

/*
|--------------------------------------------------------------------------
| Utilidades generales
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(
    id
  );
};

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    null
  );
};

const getUserRole = (req) => {
  return String(
    req.user?.role || "USER"
  ).toUpperCase();
};

const normalizeId = (value) => {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  return String(
    value?._id ||
    value?.id ||
    value
  );
};

const generateDeliveryPin = () => {
  return String(
    crypto.randomInt(
      100000,
      1000000
    )
  );
};

const generateOrderCode = () => {
  const timestamp = Date.now()
    .toString()
    .slice(-8);

  const random =
    crypto.randomInt(
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
  order,
  {
    status,
    description,
    createdBy = null,
    metadata = {}
  }
) => {
  if (
    !Array.isArray(order.timeline)
  ) {
    order.timeline = [];
  }

  order.timeline.push({
    status,
    description,
    createdBy,
    metadata,
    createdAt: new Date()
  });
};

/*
|--------------------------------------------------------------------------
| Permisos de la orden
|--------------------------------------------------------------------------
*/

const getOrderPermissions = (
  order,
  req
) => {
  const userId =
    normalizeId(
      getUserId(req)
    );

  const role =
    getUserRole(req);

  const buyerId =
    normalizeId(
      order?.buyer
    );

  const sellerId =
    normalizeId(
      order?.seller
    );

  const warehouseAgentId =
    normalizeId(
      order?.warehouseAgent
    );

  const deliveryAgentId =
    normalizeId(
      order?.deliveryAgent
    );

  return {
    userId,
    role,

    isBuyer:
      Boolean(userId) &&
      buyerId === userId,

    isSeller:
      Boolean(userId) &&
      sellerId === userId,

    isWarehouseAgent:
      Boolean(userId) &&
      warehouseAgentId === userId,

    isDeliveryAgent:
      Boolean(userId) &&
      deliveryAgentId === userId,

    isInternal:
      INTERNAL_ROLES.includes(
        role
      )
  };
};

const canAccessOrder = (
  order,
  req
) => {
  const permissions =
    getOrderPermissions(
      order,
      req
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
| Consulta poblada de una orden
|--------------------------------------------------------------------------
*/

const populateOrder = async (
  orderId
) => {
  return Order.findById(orderId)
    .populate(
      "product",
      [
        "title",
        "description",
        "price",
        "category",
        "condition",
        "images",
        "status",
        "riskLevel",
        "confidenceScore",
        "seller",
        "location"
      ].join(" ")
    )
    .populate(
      "buyer",
      [
        "firstName",
        "lastName",
        "email",
        "trustScore",
        "isVerified",
        "role"
      ].join(" ")
    )
    .populate(
      "seller",
      [
        "firstName",
        "lastName",
        "email",
        "trustScore",
        "isVerified",
        "role"
      ].join(" ")
    )
    .populate(
      "warehouseAgent",
      "firstName lastName email role"
    )
    .populate(
      "deliveryAgent",
      "firstName lastName email role"
    )
    .populate(
      "paymentConfirmedBy",
      "firstName lastName email role"
    )
    .populate(
      "deliveryPinVerifiedBy",
      "firstName lastName email role"
    )
    .populate(
      "cancelledBy",
      "firstName lastName email role"
    )
    .populate(
      "disputeOpenedBy",
      "firstName lastName email role"
    )
    .populate(
      "timeline.createdBy",
      "firstName lastName email role"
    );
};

/*
|--------------------------------------------------------------------------
| Voucher
|--------------------------------------------------------------------------
*/

const buildVoucher = (order) => {
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
        order?.product ||
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

      price:
        Number(
          product?.price ||
          order?.price ||
          0
        ),

      images:
        Array.isArray(
          product?.images
        )
          ? product.images
          : []
    },

    buyer:
      order?.buyer || null,

    seller:
      order?.seller || null,

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

    subtotal:
      Number(
        order?.price || 0
      ),

    protectionFee:
      Number(
        order?.protectionFee ||
        0
      ),

    shippingFee:
      Number(
        order?.shippingFee ||
        0
      ),

    totalAmount:
      Number(
        order?.totalAmount ||
        0
      ),

    depositPercentage:
      Number(
        order?.depositPercentage ||
        0
      ),

    depositAmount:
      Number(
        order?.depositAmount ||
        0
      ),

    remainingAmount:
      Number(
        order?.remainingAmount ||
        0
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
| Notificaciones seguras
|--------------------------------------------------------------------------
*/

const sendNotificationSafe =
  async (
    userId,
    type,
    title,
    message
  ) => {
    try {
      if (!userId) {
        return;
      }

      await createNotification(
        userId,
        type,
        title,
        message
      );
    } catch (error) {
      console.error(
        `Error enviando notificación ${type}:`,
        error.message
      );
    }
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
  let createdOrderId = null;
  let productIdForRollback = null;
  let originalProductStatus = null;

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

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Debes iniciar sesión para realizar una compra."
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador del producto es obligatorio."
      });
    }

    if (
      !isValidObjectId(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador del producto no es válido."
      });
    }

    if (
      !PAYMENT_METHODS.includes(
        paymentMethod
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
        deliveryMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selecciona Almacén QSM, Delivery QSM verificado o entrega coordinada."
      });
    }

    if (
      paymentMethod ===
        "BANK_TRANSFER" &&
      !String(
        bankName
      ).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Indica el banco para la transferencia."
      });
    }

    if (
      paymentMethod === "CARD" &&
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
      await Product.findById(
        productId
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Producto no encontrado."
      });
    }

    productIdForRollback =
      product._id;

    originalProductStatus =
      product.status;

    if (!product.seller) {
      return res.status(400).json({
        success: false,
        message:
          "El producto no tiene un vendedor asignado."
      });
    }

    if (
      normalizeId(
        product.seller
      ) ===
      normalizeId(userId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No puedes comprar tu propio producto."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Recuperar una compra existente del mismo comprador
    |--------------------------------------------------------------------------
    */

    const ownExistingOrder =
      await Order.findOne({
        product:
          product._id,

        buyer:
          userId,

        status: {
          $in:
            ACTIVE_ORDER_STATUSES
        }
      }).sort({
        createdAt: -1
      });

    if (ownExistingOrder) {
      const populatedExisting =
        await populateOrder(
          ownExistingOrder._id
        );

      const finalExistingOrder =
        populatedExisting ||
        ownExistingOrder;

      return res.status(200).json({
        success: true,

        recovered: true,

        message:
          "La compra ya existía. Se recuperó el voucher correctamente.",

        voucher:
          buildVoucher(
            finalExistingOrder
          ),

        order:
          finalExistingOrder
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Impedir una segunda compra activa de otro comprador
    |--------------------------------------------------------------------------
    */

    const otherExistingOrder =
      await Order.findOne({
        product:
          product._id,

        buyer: {
          $ne: userId
        },

        status: {
          $in:
            ACTIVE_ORDER_STATUSES
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
      String(
        product.status || ""
      ).toUpperCase() !==
      "ACTIVE"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Este producto no está disponible para una compra nueva."
      });
    }

    const price =
      Number(
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
      deliveryMethod ===
      "QSM_VERIFIED_DELIVERY"
        ? 500
        : 0;

    let paymentStatus = "PENDING";
    let escrowStatus = "NOT_FUNDED";

    switch (paymentMethod) {
      case "BANK_TRANSFER":
        paymentStatus = "PENDING_PROOF";
        escrowStatus = "PENDING";
        break;

      case "CARD":
        paymentStatus = "DEMO_AUTHORIZED";
        escrowStatus = "HELD";
        break;

      case "CASH_ON_DELIVERY":
      default:
        paymentStatus = "PENDING_DELIVERY";
        escrowStatus = "NOT_FUNDED";
        break;
    }

    let warehouseStatus = "NOT_REQUIRED";
    let deliveryStatus = "PENDING";
    let initialStatus = "WAITING_SELLER";

    switch (deliveryMethod) {

      case "QSM_WAREHOUSE":

        warehouseStatus =
          "WAITING_FOR_SELLER";

        deliveryStatus =
          "WAITING_FOR_SELLER";

        initialStatus =
          paymentMethod ===
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
          paymentMethod ===
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
          paymentMethod ===
          "BANK_TRANSFER"
            ? "WAITING_PAYMENT"
            : "WAITING_SELLER";
    }

    const timeline = [];

    addTimelineEvent(order = { timeline }, {
      status: "ORDER_CREATED",
      description:
        "La compra protegida fue creada correctamente.",
      createdBy: userId,
      metadata: {
        paymentMethod,
        deliveryMethod
      }
    });

    addTimelineEvent(order = { timeline }, {
      status: "PIN_GENERATED",
      description:
        "Se generó el PIN único de entrega.",
      createdBy: userId
    });

    if (paymentMethod === "CARD") {

      addTimelineEvent(
        { timeline },
        {
          status:
            "CARD_DEMO_AUTHORIZED",

          description:
            "Pago autorizado en modo demostración.",

          createdBy:
            userId
        }
      );

    }

    if (
      paymentMethod ===
      "BANK_TRANSFER"
    ) {

      addTimelineEvent(
        { timeline },
        {
          status:
            "WAITING_TRANSFER_CONFIRMATION",

          description:
            "La transferencia será confirmada durante la entrega.",

          createdBy:
            userId,

          metadata: {
            bankName
          }
        }
      );

    }

    if (
      paymentMethod ===
      "CASH_ON_DELIVERY"
    ) {

      addTimelineEvent(
        { timeline },
        {
          status:
            "WAITING_CASH_PAYMENT",

          description:
            "El efectivo será entregado durante la entrega.",

          createdBy:
            userId
        }
      );

    }

    if (
      deliveryMethod ===
      "QSM_WAREHOUSE"
    ) {

      addTimelineEvent(
        { timeline },
        {
          status:
            "WAITING_FOR_SELLER",

          description:
            "Esperando que el vendedor entregue el producto al almacén QSM.",

          createdBy:
            userId
        }
      );

    }

    if (
      deliveryMethod ===
      "QSM_VERIFIED_DELIVERY"
    ) {

      addTimelineEvent(
        { timeline },
        {
          status:
            "PICKUP_REQUESTED",

          description:
            "Se solicitó un Delivery QSM verificado.",

          createdBy:
            userId
        }
      );

    }

    const order = new Order({

      orderCode,

      product:
        product._id,

      buyer:
        userId,

      seller:
        product.seller,

      price,

      protectionFee,

      shippingFee,

      depositPercentage,

      status:
        initialStatus,

      paymentMethod,

      paymentStatus,

      escrowStatus,

      deliveryMethod,

      warehouseStatus,

      deliveryStatus,

      bankName:
        paymentMethod ===
        "BANK_TRANSFER"
          ? bankName.trim()
          : "",

      transferReference:
        paymentMethod ===
        "BANK_TRANSFER"
          ? transferReference.trim()
          : "",

      cardBrand:
        paymentMethod ===
        "CARD"
          ? cardBrand.trim()
          : "",

      cardLast4:
        paymentMethod ===
        "CARD"
          ? cardLast4.trim()
          : "",

      paymentTransactionId:
        paymentMethod ===
        "CARD"
          ? generateDemoTransactionId()
          : "",

      pickupAddress,

      deliveryAddress,

      buyerNotes,

      deliveryPin,

      timeline
    });

    await order.validate();

    await order.save();

    createdOrderId =
      order._id;

    product.status = "SOLD";

    await product.save();
        const sellerMessage =
      deliveryMethod ===
      "QSM_WAREHOUSE"
        ? `Tu producto "${product.title}" fue comprado. Debes prepararlo y entregarlo en el almacén QSM.`
        : deliveryMethod ===
          "QSM_VERIFIED_DELIVERY"
        ? `Tu producto "${product.title}" fue comprado. Se solicitó un Delivery QSM verificado para recogerlo.`
        : `Tu producto "${product.title}" fue comprado. Debes coordinar la entrega con el comprador.`;

    let buyerMessage =
      `Tu compra protegida de "${product.title}" fue creada correctamente. ` +
      `Código de orden: ${orderCode}. ` +
      `Tu PIN de entrega es ${deliveryPin}.`;

    if (
      paymentMethod ===
      "BANK_TRANSFER"
    ) {
      buyerMessage +=
        " La transferencia será validada durante la entrega.";
    }

    if (
      paymentMethod ===
      "CASH_ON_DELIVERY"
    ) {
      buyerMessage +=
        " El pago en efectivo será confirmado durante la entrega.";
    }

    if (
      paymentMethod === "CARD"
    ) {
      buyerMessage +=
        " El pago con tarjeta fue autorizado en modo demostración.";
    }

    await sendNotificationSafe(
      product.seller,
      "PRODUCT_SOLD",
      "Nueva venta en QSM",
      sellerMessage
    );

    await sendNotificationSafe(
      userId,
      "ORDER_CREATED",
      "Compra protegida creada",
      buyerMessage
    );

    const populatedOrder =
      await populateOrder(
        order._id
      );

    const finalOrder =
      populatedOrder || order;

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
        finalOrder
    });
  } catch (error) {
    console.error(
      "ERROR COMPLETO CREANDO ORDEN:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | Rollback de la orden
    |--------------------------------------------------------------------------
    | Si la orden llegó a guardarse, pero algo falló después, se elimina para
    | evitar órdenes incompletas.
    |--------------------------------------------------------------------------
    */

    if (createdOrderId) {
      try {
        await Order.findByIdAndDelete(
          createdOrderId
        );
      } catch (rollbackOrderError) {
        console.error(
          "No se pudo eliminar la orden incompleta:",
          rollbackOrderError.message
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Rollback del producto
    |--------------------------------------------------------------------------
    | Restaura el estado que tenía el producto antes de intentar la compra.
    |--------------------------------------------------------------------------
    */

    if (
      productIdForRollback &&
      originalProductStatus
    ) {
      try {
        await Product.findByIdAndUpdate(
          productIdForRollback,
          {
            status:
              originalProductStatus
          }
        );
      } catch (
        rollbackProductError
      ) {
        console.error(
          "No se pudo restaurar el producto:",
          rollbackProductError.message
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Conflicto de índice único
    |--------------------------------------------------------------------------
    */

    if (error.code === 11000) {
      const duplicatedField =
        Object.keys(
          error.keyPattern || {}
        )[0] ||
        "dato único";

      return res.status(409).json({
        success: false,

        message:
          duplicatedField ===
          "orderCode"
            ? "No se pudo generar un código único para la orden. Intenta nuevamente."
            : `Ya existe una orden con ese ${duplicatedField}.`,

        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Errores de validación de Mongoose
    |--------------------------------------------------------------------------
    */

    if (
      error.name ===
      "ValidationError"
    ) {
      const validationErrors =
        Object.values(
          error.errors || {}
        ).map((item) => ({
          field:
            item.path,

          message:
            item.message,

          value:
            item.value
        }));

      return res.status(400).json({
        success: false,

        message:
          validationErrors[0]
            ?.message ||
          "La orden contiene datos no válidos.",

        errors:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : validationErrors
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ObjectId inválido
    |--------------------------------------------------------------------------
    */

    if (
      error.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Uno de los identificadores enviados no es válido.",

        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message
      });
    }

    return res.status(500).json({
      success: false,

      message:
        "No se pudo crear la compra protegida.",

      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};
const getMyOrders = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Debes iniciar sesión para consultar tus órdenes."
      });
    }

    const {
      type = "all",
      status,
      limit = 100
    } = req.query || {};

    const query = {};

    if (type === "buy") {
      query.buyer = userId;
    } else if (type === "sell") {
      query.seller = userId;
    } else {
      query.$or = [
        {
          buyer: userId
        },
        {
          seller: userId
        }
      ];
    }

    if (
      status &&
      String(status).toUpperCase() !==
        "ALL"
    ) {
      query.status =
        String(status).toUpperCase();
    }

    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 100,
        1
      ),
      200
    );

    const orders =
      await Order.find(query)
        .populate(
          "product",
          [
            "title",
            "description",
            "price",
            "category",
            "condition",
            "images",
            "status",
            "riskLevel",
            "confidenceScore",
            "location"
          ].join(" ")
        )
        .populate(
          "buyer",
          [
            "firstName",
            "lastName",
            "email",
            "trustScore",
            "isVerified",
            "role"
          ].join(" ")
        )
        .populate(
          "seller",
          [
            "firstName",
            "lastName",
            "email",
            "trustScore",
            "isVerified",
            "role"
          ].join(" ")
        )
        .populate(
          "warehouseAgent",
          "firstName lastName email role"
        )
        .populate(
          "deliveryAgent",
          "firstName lastName email role"
        )
        .sort({
          createdAt: -1
        })
        .limit(safeLimit);

    const purchases =
      orders.filter(
        (order) =>
          normalizeId(
            order?.buyer
          ) ===
          normalizeId(userId)
      );

    const sales =
      orders.filter(
        (order) =>
          normalizeId(
            order?.seller
          ) ===
          normalizeId(userId)
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
    console.error(
      "Error obteniendo órdenes:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "No se pudieron obtener tus compras y ventas.",

      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Obtener una orden específica
|--------------------------------------------------------------------------
*/

const getOrderById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    const order =
      await populateOrder(id);

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
        req
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
        req
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

      order
    });
  } catch (error) {
    console.error(
      "Error obteniendo la orden:",
      error
    );

    if (
      error.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    return res.status(500).json({
      success: false,

      message:
        "No se pudo obtener la orden.",

      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
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
    const { id } =
      req.params;

    const {
      reason = "",
      requestedBy = ""
    } = req.body || {};

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Debes iniciar sesión para cancelar una orden."
      });
    }

    if (
      !isValidObjectId(id)
    ) {
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

    const order =
      await Order.findById(id);

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
        req
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
      const existingOrder =
        await populateOrder(
          order._id
        );

      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "La orden ya estaba cancelada.",
        voucher:
          buildVoucher(
            existingOrder ||
              order
          ),
        order:
          existingOrder ||
          order
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
    } else {
      const role =
        getUserRole(req);

      if (
        role === "WAREHOUSE" ||
        role ===
          "VERIFICATION_AGENT"
      ) {
        cancellationRequestedBy =
          "WAREHOUSE";
      }

      if (
        role === "DELIVERY"
      ) {
        cancellationRequestedBy =
          "DELIVERY";
      }
    }

    const requestedByValue =
      String(
        requestedBy || ""
      ).toUpperCase();

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

    order.status =
      "CANCELLED";

    order.cancellationReason =
      cleanReason;

    order.cancellationRequestedBy =
      cancellationRequestedBy;

    order.cancelledBy =
      userId;

    order.cancelledAt =
      now;

    /*
    |--------------------------------------------------------------------------
    | Reembolso y depósito
    |--------------------------------------------------------------------------
    */

    if (
      order.depositAmount > 0
    ) {
      if (
        cancellationRequestedBy ===
          "SELLER" ||
        cancellationRequestedBy ===
          "WAREHOUSE" ||
        cancellationRequestedBy ===
          "DELIVERY" ||
        cancellationRequestedBy ===
          "ADMIN"
      ) {
        order.refundAmount =
          Number(
            order.depositAmount ||
            0
          );

        order.depositStatus =
          "REFUNDED";
      } else if (
        cancellationRequestedBy ===
        "BUYER"
      ) {
        const cancellationFee =
          order.status ===
          "WAITING_WAREHOUSE"
            ? Number(
                order.depositAmount ||
                0
              ) * 0.25
            : 0;

        order.refundAmount =
          Math.max(
            Number(
              order.depositAmount ||
              0
            ) -
              cancellationFee,
            0
          );

        order.depositStatus =
          cancellationFee > 0
            ? "PARTIALLY_REFUNDED"
            : "REFUNDED";
      }
    } else {
      order.refundAmount = 0;
    }

    /*
    |--------------------------------------------------------------------------
    | Estado financiero después de cancelar
    |--------------------------------------------------------------------------
    */

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
      order.escrowStatus =
        "REFUNDED";

      order.paymentStatus =
        "REFUNDED";

      order.refundedAt =
        now;
    }

    addTimelineEvent(
      order,
      {
        status:
          "ORDER_CANCELLED",

        description:
          `La orden fue cancelada por ${cancellationRequestedBy.toLowerCase()}. Motivo: ${cleanReason}`,

        createdBy:
          userId,

        metadata: {
          requestedBy:
            cancellationRequestedBy,

          refundAmount:
            Number(
              order.refundAmount ||
              0
            ),

          depositStatus:
            order.depositStatus
        }
      }
    );

    await order.save();

    /*
    |--------------------------------------------------------------------------
    | Restaurar producto
    |--------------------------------------------------------------------------
    | El producto vuelve a estar disponible si no existe otra orden activa.
    |--------------------------------------------------------------------------
    */

    const anotherActiveOrder =
      await Order.findOne({
        _id: {
          $ne: order._id
        },

        product:
          order.product,

        status: {
          $in:
            ACTIVE_ORDER_STATUSES
        }
      });

    if (!anotherActiveOrder) {
      await Product.findByIdAndUpdate(
        order.product,
        {
          status: "ACTIVE"
        }
      );
    }

    const buyerId =
      normalizeId(
        order.buyer
      );

    const sellerId =
      normalizeId(
        order.seller
      );

    const notificationText =
      `La orden ${order.orderCode} fue cancelada. ` +
      `Motivo: ${cleanReason}`;

    if (
      buyerId &&
      buyerId !==
        normalizeId(userId)
    ) {
      await sendNotificationSafe(
        buyerId,
        "ORDER_CANCELLED",
        "Compra cancelada",
        notificationText
      );
    }

    if (
      sellerId &&
      sellerId !==
        normalizeId(userId)
    ) {
      await sendNotificationSafe(
        sellerId,
        "ORDER_CANCELLED",
        "Venta cancelada",
        notificationText
      );
    }

    const populatedOrder =
      await populateOrder(
        order._id
      );

    const finalOrder =
      populatedOrder || order;

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
        finalOrder
    });
  } catch (error) {
    console.error(
      "Error cancelando orden:",
      error
    );

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          Object.values(
            error.errors || {}
          )[0]?.message ||
          "La cancelación contiene datos no válidos."
      });
    }

    return res.status(500).json({
      success: false,

      message:
        "No se pudo cancelar la orden.",

      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};
/*
|--------------------------------------------------------------------------
| Confirmar recepción del producto
|--------------------------------------------------------------------------
*/

const confirmReceipt = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Debes iniciar sesión para confirmar la recepción."
      });
    }

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    const order =
      await Order.findById(id);

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
        req
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
      const existingOrder =
        await populateOrder(
          order._id
        );

      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "La recepción ya había sido confirmada.",
        voucher:
          buildVoucher(
            existingOrder ||
              order
          ),
        order:
          existingOrder ||
          order
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

    order.buyerConfirmedReceipt =
      true;

    order.buyerConfirmedReceiptAt =
      now;

    order.status =
      "COMPLETED";

    order.deliveryStatus =
      "DELIVERED";

    order.deliveredAt =
      order.deliveredAt ||
      now;

    order.completedAt =
      now;

    if (
      order.deliveryMethod ===
      "QSM_WAREHOUSE"
    ) {
      order.warehouseStatus =
        "DELIVERED";

      order.warehouseConfirmedDelivery =
        true;

      order.warehouseConfirmedDeliveryAt =
        order
          .warehouseConfirmedDeliveryAt ||
        now;
    }

    if (
      order.paymentMethod ===
        "CASH_ON_DELIVERY" ||
      order.paymentMethod ===
        "BANK_TRANSFER"
    ) {
      order.paymentStatus =
        "CONFIRMED";

      order.paymentConfirmedAt =
        order.paymentConfirmedAt ||
        now;

      order.paymentConfirmedBy =
        userId;
    }

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
      order.escrowStatus =
        "RELEASED";

      order.releasedAt =
        now;
    }

    if (
      order.depositAmount > 0
    ) {
      order.depositStatus =
        "APPLIED_TO_TOTAL";
    }

    addTimelineEvent(
      order,
      {
        status:
          "BUYER_CONFIRMED_RECEIPT",

        description:
          "El comprador confirmó que recibió el producto correctamente.",

        createdBy:
          userId,

        metadata: {
          paymentStatus:
            order.paymentStatus,

          escrowStatus:
            order.escrowStatus
        }
      }
    );

    addTimelineEvent(
      order,
      {
        status:
          "ORDER_COMPLETED",

        description:
          "La compra protegida fue completada y el pago quedó liberado.",

        createdBy:
          userId,

        metadata: {
          completedAt:
            now
        }
      }
    );

    await order.save();

    await sendNotificationSafe(
      normalizeId(
        order.seller
      ),
      "ORDER_COMPLETED",
      "Venta completada",
      `La orden ${order.orderCode} fue completada. El comprador confirmó la recepción del producto.`
    );

    const populatedOrder =
      await populateOrder(
        order._id
      );

    const finalOrder =
      populatedOrder ||
      order;

    return res.status(200).json({
      success: true,

      message:
        "Recepción confirmada. La compra fue completada correctamente.",

      voucher:
        buildVoucher(
          finalOrder
        ),

      order:
        finalOrder
    });
  } catch (error) {
    console.error(
      "Error confirmando recepción:",
      error
    );

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          Object.values(
            error.errors || {}
          )[0]?.message ||
          "Los datos de confirmación no son válidos."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "No se pudo confirmar la recepción del producto.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Abrir un reclamo
|--------------------------------------------------------------------------
*/

const openDispute = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const {
      reason = ""
    } = req.body || {};

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Debes iniciar sesión para abrir un reclamo."
      });
    }

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    const cleanReason =
      String(reason).trim();

    if (
      cleanReason.length < 10
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Describe el reclamo con al menos 10 caracteres."
      });
    }

    const order =
      await Order.findById(id);

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
        req
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
      "DISPUTED"
    ) {
      const existingOrder =
        await populateOrder(
          order._id
        );

      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "Esta orden ya tiene un reclamo abierto.",
        voucher:
          buildVoucher(
            existingOrder ||
              order
          ),
        order:
          existingOrder ||
          order
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

    order.status =
      "DISPUTED";

    order.disputeReason =
      cleanReason;

    order.disputeOpenedBy =
      userId;

    order.disputeOpenedAt =
      now;

    if (
      [
        "HELD",
        "PENDING",
        "READY_TO_RELEASE"
      ].includes(
        order.escrowStatus
      )
    ) {
      order.escrowStatus =
        "UNDER_REVIEW";
    }

    addTimelineEvent(
      order,
      {
        status:
          "DISPUTE_OPENED",

        description:
          `Se abrió un reclamo: ${cleanReason}`,

        createdBy:
          userId,

        metadata: {
          openedBy:
            permissions.isBuyer
              ? "BUYER"
              : permissions.isSeller
              ? "SELLER"
              : "INTERNAL",

          escrowStatus:
            order.escrowStatus
        }
      }
    );

    await order.save();

    const buyerId =
      normalizeId(
        order.buyer
      );

    const sellerId =
      normalizeId(
        order.seller
      );

    const currentUserId =
      normalizeId(userId);

    if (
      buyerId &&
      buyerId !==
        currentUserId
    ) {
      await sendNotificationSafe(
        buyerId,
        "DISPUTE_OPENED",
        "Reclamo abierto",
        `Se abrió un reclamo en la orden ${order.orderCode}. QSM revisará el caso.`
      );
    }

    if (
      sellerId &&
      sellerId !==
        currentUserId
    ) {
      await sendNotificationSafe(
        sellerId,
        "DISPUTE_OPENED",
        "Reclamo abierto",
        `Se abrió un reclamo en la orden ${order.orderCode}. QSM revisará el caso.`
      );
    }

    const populatedOrder =
      await populateOrder(
        order._id
      );

    const finalOrder =
      populatedOrder ||
      order;

    return res.status(201).json({
      success: true,

      message:
        "El reclamo fue abierto correctamente.",

      voucher:
        buildVoucher(
          finalOrder
        ),

      order:
        finalOrder
    });
  } catch (error) {
    console.error(
      "Error abriendo reclamo:",
      error
    );

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          Object.values(
            error.errors || {}
          )[0]?.message ||
          "Los datos del reclamo no son válidos."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "No se pudo abrir el reclamo.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
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
    const { id } =
      req.params;

    const {
      notes = "",
      trackingNumber = "",
      trackingCompany = ""
    } = req.body || {};

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Debes iniciar sesión para actualizar la entrega."
      });
    }

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    const order =
      await Order.findById(id);

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
        req
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
      const existingOrder =
        await populateOrder(
          order._id
        );

      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "El producto ya estaba marcado como enviado al almacén.",
        voucher:
          buildVoucher(
            existingOrder ||
              order
          ),
        order:
          existingOrder ||
          order
      });
    }

    order.status =
      "WAITING_WAREHOUSE";

    order.warehouseStatus =
      "IN_TRANSIT_TO_WAREHOUSE";

    order.deliveryStatus =
      "IN_TRANSIT_TO_WAREHOUSE";

    order.sellerNotes =
      String(notes).trim();

    if (trackingNumber) {
      order.trackingNumber =
        String(
          trackingNumber
        ).trim();
    }

    if (trackingCompany) {
      order.trackingCompany =
        String(
          trackingCompany
        ).trim();
    }

    addTimelineEvent(
      order,
      {
        status:
          "PRODUCT_SENT_TO_WAREHOUSE",

        description:
          "El vendedor confirmó que el producto fue enviado o entregado al almacén QSM.",

        createdBy:
          userId,

        metadata: {
          trackingNumber:
            order.trackingNumber,

          trackingCompany:
            order.trackingCompany,

          notes:
            order.sellerNotes
        }
      }
    );

    await order.save();

    await sendNotificationSafe(
      normalizeId(
        order.buyer
      ),
      "PRODUCT_SENT_TO_WAREHOUSE",
      "Producto enviado al almacén",
      `El vendedor envió el producto de la orden ${order.orderCode} al almacén QSM.`
    );

    const populatedOrder =
      await populateOrder(
        order._id
      );

    const finalOrder =
      populatedOrder ||
      order;

    return res.status(200).json({
      success: true,

      message:
        "El producto fue marcado como enviado al almacén QSM.",

      voucher:
        buildVoucher(
          finalOrder
        ),

      order:
        finalOrder
    });
  } catch (error) {
    console.error(
      "Error enviando producto al almacén:",
      error
    );

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          Object.values(
            error.errors || {}
          )[0]?.message ||
          "Los datos del envío no son válidos."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "No se pudo registrar el envío al almacén.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
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
      const { id } =
        req.params;

      const {
        pickupAddress = "",
        deliveryAddress = "",
        notes = ""
      } = req.body || {};

      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Debes iniciar sesión para solicitar el delivery."
        });
      }

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador de la orden no es válido."
        });
      }

      const order =
        await Order.findById(id);

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
          req
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
        const existingOrder =
          await populateOrder(
            order._id
          );

        return res.status(200).json({
          success: true,
          recovered: true,
          message:
            "La recogida por Delivery QSM ya había sido solicitada.",
          voucher:
            buildVoucher(
              existingOrder ||
                order
            ),
          order:
            existingOrder ||
            order
        });
      }

      order.status =
        "WAITING_SELLER";

      order.deliveryStatus =
        "PICKUP_REQUESTED";

      if (
        String(
          pickupAddress
        ).trim()
      ) {
        order.pickupAddress =
          String(
            pickupAddress
          ).trim();
      }

      if (
        String(
          deliveryAddress
        ).trim()
      ) {
        order.deliveryAddress =
          String(
            deliveryAddress
          ).trim();
      }

      order.deliveryNotes =
        String(notes).trim();

      addTimelineEvent(
        order,
        {
          status:
            "VERIFIED_DELIVERY_REQUESTED",

          description:
            "El vendedor solicitó un Delivery QSM verificado para recoger el producto.",

          createdBy:
            userId,

          metadata: {
            pickupAddress:
              order.pickupAddress,

            deliveryAddress:
              order.deliveryAddress,

            shippingFee:
              Number(
                order.shippingFee ||
                0
              )
          }
        }
      );

      await order.save();

      await sendNotificationSafe(
        normalizeId(
          order.buyer
        ),
        "DELIVERY_REQUESTED",
        "Delivery QSM solicitado",
        `Se solicitó un Delivery QSM verificado para la orden ${order.orderCode}.`
      );

      const populatedOrder =
        await populateOrder(
          order._id
        );

      const finalOrder =
        populatedOrder ||
        order;

      return res.status(200).json({
        success: true,

        message:
          "La recogida por Delivery QSM fue solicitada correctamente.",

        voucher:
          buildVoucher(
            finalOrder
          ),

        order:
          finalOrder
      });
    } catch (error) {
      console.error(
        "Error solicitando Delivery QSM:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            Object.values(
              error.errors || {}
            )[0]?.message ||
            "Los datos del delivery no son válidos."
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "No se pudo solicitar el Delivery QSM.",
        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message
      });
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