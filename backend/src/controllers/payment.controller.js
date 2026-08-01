const crypto = require("crypto");
const prisma = require("../utils/prisma");

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN"
];

const ALLOWED_METHODS = [
  "QSM_ESCROW",
  "CARD",
  "BANK_TRANSFER",
  "CASH_ON_DELIVERY"
];

const PAYMENT_INCLUDE = {
  order: {
    include: {
      product: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          images: true,
          status: true
        }
      }
    }
  },
  buyer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      trustScore: true,
      isVerified: true
    }
  },
  seller: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      trustScore: true,
      isVerified: true
    }
  }
};

function parsePositiveInt(value) {
  const number = Number(value);

  return Number.isInteger(number) &&
    number > 0
    ? number
    : null;
}

function normalizeUpper(
  value,
  fallback = ""
) {
  return String(
    value || fallback
  )
    .trim()
    .toUpperCase();
}

function normalizeMethod(value) {
  const method =
    normalizeUpper(
      value,
      "QSM_ESCROW"
    );

  if (method === "CASH") {
    return "CASH_ON_DELIVERY";
  }

  return method;
}

function generateTransactionCode() {
  return (
    "QSM-PAY-" +
    Date.now() +
    "-" +
    crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()
  );
}

function appendTimeline(
  timeline,
  event
) {
  const events =
    Array.isArray(timeline)
      ? [...timeline]
      : [];

  events.push({
    status: event.status,
    description:
      event.description,
    createdBy:
      event.createdBy || null,
    metadata:
      event.metadata || {},
    createdAt:
      new Date().toISOString()
  });

  return events;
}

async function resolvePrismaUser(req) {
  const possibleIds = [
    req.user?.id,
    req.user?.userId,
    req.user?._id
  ];

  for (const value of possibleIds) {
    const id =
      parsePositiveInt(value);

    if (!id) {
      continue;
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id
        }
      });

    if (user) {
      return user;
    }
  }

  const email =
    String(
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
}

async function createNotificationSafe(
  client,
  userId,
  type,
  title,
  message
) {
  if (!userId) {
    return;
  }

  try {
    await client.notification.create({
      data: {
        userId,
        title,
        message:
          "[" +
          type +
          "] " +
          message,
        read: false
      }
    });
  } catch (error) {
    console.error(
      "Payment notification error:",
      error.message
    );
  }
}

function serializePayment(payment) {
  if (!payment) {
    return null;
  }

  return {
    ...payment,
    _id:
      String(payment.id),
    orderId:
      payment.orderId,
    buyerId:
      payment.buyerId,
    sellerId:
      payment.sellerId,
    order:
      payment.order
        ? {
            ...payment.order,
            _id:
              String(
                payment.order.id
              )
          }
        : null,
    buyer:
      payment.buyer
        ? {
            ...payment.buyer,
            _id:
              String(
                payment.buyer.id
              )
          }
        : null,
    seller:
      payment.seller
        ? {
            ...payment.seller,
            _id:
              String(
                payment.seller.id
              )
          }
        : null
  };
}

function handleError(
  res,
  error,
  message
) {
  console.error(
    message,
    error
  );

  if (error?.code === "P2002") {
    return res.status(409).json({
      success: false,
      message:
        "Esta orden ya tiene un pago registrado."
    });
  }

  if (error?.code === "P2025") {
    return res.status(404).json({
      success: false,
      message:
        "El pago o la orden no fueron encontrados."
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
}

const createEscrowPayment = async (
  req,
  res
) => {
  try {
    const orderId =
      parsePositiveInt(
        req.body?.orderId
      );

    const method =
      normalizeMethod(
        req.body?.method
      );

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "orderId es obligatorio y debe ser numérico."
      });
    }

    if (
      !ALLOWED_METHODS.includes(
        method
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Método de pago no válido."
      });
    }

    const currentUser =
      await resolvePrismaUser(req);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message:
          "Usuario no encontrado en Supabase."
      });
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id: orderId
        },
        include: {
          payments: true
        }
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Orden no encontrada."
      });
    }

    if (
      order.buyerId !==
      currentUser.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo el comprador puede registrar el pago."
      });
    }

    const existingPayment =
      order.payments?.[0];

    if (existingPayment) {
      const recovered =
        await prisma.payment.findUnique({
          where: {
            id:
              existingPayment.id
          },
          include:
            PAYMENT_INCLUDE
        });

      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "La orden ya tenía un pago registrado.",
        payment:
          serializePayment(
            recovered
          )
      });
    }

    if (
      [
        "CANCELLED",
        "COMPLETED"
      ].includes(order.status) ||
      [
        "REFUNDED",
        "RELEASED"
      ].includes(
        order.escrowStatus
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "No se puede crear un pago para una orden finalizada."
      });
    }

    const amount =
      Number(
        order.totalAmount ||
        order.price ||
        0
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La orden no tiene un monto válido."
      });
    }

    const timeline =
      appendTimeline(
        order.timeline,
        {
          status:
            "PAYMENT_HELD",
          description:
            "El pago quedó retenido por QSM hasta completar la entrega.",
          createdBy:
            currentUser.id,
          metadata: {
            method,
            amount
          }
        }
      );

    const paymentId =
      await prisma.$transaction(
        async (tx) => {
          const payment =
            await tx.payment.create({
              data: {
                orderId:
                  order.id,
                buyerId:
                  order.buyerId,
                sellerId:
                  order.sellerId,
                amount,
                method,
                status:
                  "HELD",
                transactionCode:
                  generateTransactionCode(),
                notes:
                  "Pago retenido por QSM hasta confirmar la entrega."
              }
            });

          await tx.order.update({
            where: {
              id:
                order.id
            },
            data: {
              paymentMethod:
                method,
              paymentStatus:
                "HELD",
              escrowStatus:
                "HELD",
              timeline
            }
          });

          await createNotificationSafe(
            tx,
            order.buyerId,
            "PAYMENT_HELD",
            "Pago protegido",
            "Tu pago quedó retenido hasta confirmar la entrega."
          );

          await createNotificationSafe(
            tx,
            order.sellerId,
            "PAYMENT_HELD",
            "Pago retenido",
            "El comprador registró el pago. Los fondos permanecen protegidos por QSM."
          );

          return payment.id;
        },
        {
          maxWait: 20000,
          timeout: 60000
        }
      );

    const finalPayment =
      await prisma.payment.findUnique({
        where: {
          id: paymentId
        },
        include:
          PAYMENT_INCLUDE
      });

    return res.status(201).json({
      success: true,
      message:
        "Pago protegido creado correctamente.",
      payment:
        serializePayment(
          finalPayment
        )
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudo crear el pago protegido."
    );
  }
};

const releasePaymentToSeller =
  async (
    req,
    res
  ) => {
    try {
      const paymentId =
        parsePositiveInt(
          req.params.paymentId
        );

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message:
            "paymentId no es válido."
        });
      }

      const currentUser =
        await resolvePrismaUser(req);

      if (
        !currentUser ||
        !ADMIN_ROLES.includes(
          normalizeUpper(
            currentUser.role
          )
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Solo un administrador puede liberar pagos."
        });
      }

      const payment =
        await prisma.payment.findUnique({
          where: {
            id: paymentId
          },
          include:
            PAYMENT_INCLUDE
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Pago no encontrado."
        });
      }

      if (
        payment.status ===
        "RELEASED"
      ) {
        return res.status(200).json({
          success: true,
          recovered: true,
          message:
            "El pago ya había sido liberado.",
          payment:
            serializePayment(
              payment
            )
        });
      }

      if (
        payment.status ===
        "REFUNDED"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "El pago ya fue reembolsado."
        });
      }

      // QSM_5_3A_RELEASE_GUARD
      if (
        payment.order?.status !== "DELIVERED" ||
        payment.order?.buyerConfirmedReceipt !== true
      ) {
        return res.status(409).json({
          success: false,
          message:
            "No se puede liberar el pago antes de confirmar la entrega."
        });
      }

      const now =
        new Date();

      const timeline =
        appendTimeline(
          payment.order?.timeline,
          {
            status:
              "PAYMENT_RELEASED",
            description:
              "QSM liberó el pago al vendedor.",
            createdBy:
              currentUser.id
          }
        );

      await prisma.$transaction(
        async (tx) => {
          await tx.payment.update({
            where: {
              id:
                payment.id
            },
            data: {
              status:
                "RELEASED",
              notes:
                "Pago liberado al vendedor."
            }
          });

          await tx.order.update({
            where: {
              id:
                payment.orderId
            },
            data: {
              status:
                "COMPLETED",
              paymentStatus:
                "RELEASED",
              escrowStatus:
                "RELEASED",
              completedAt:
                payment.order
                  ?.completedAt ||
                now,
              releasedAt:
                now,
              timeline
            }
          });

          await createNotificationSafe(
            tx,
            payment.sellerId,
            "PAYMENT_RELEASED",
            "Pago liberado",
            "QSM liberó el pago de la orden a tu favor."
          );

          await createNotificationSafe(
            tx,
            payment.buyerId,
            "ORDER_COMPLETED",
            "Orden completada",
            "La orden fue completada y el pago fue liberado al vendedor."
          );
        },
        {
          maxWait: 20000,
          timeout: 60000
        }
      );

      const updated =
        await prisma.payment.findUnique({
          where: {
            id:
              payment.id
          },
          include:
            PAYMENT_INCLUDE
        });

      return res.status(200).json({
        success: true,
        message:
          "Pago liberado correctamente.",
        payment:
          serializePayment(
            updated
          )
      });
    } catch (error) {
      return handleError(
        res,
        error,
        "No se pudo liberar el pago."
      );
    }
  };

const refundPaymentToBuyer =
  async (
    req,
    res
  ) => {
    try {
      const paymentId =
        parsePositiveInt(
          req.params.paymentId
        );

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message:
            "paymentId no es válido."
        });
      }

      const currentUser =
        await resolvePrismaUser(req);

      if (
        !currentUser ||
        !ADMIN_ROLES.includes(
          normalizeUpper(
            currentUser.role
          )
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Solo un administrador puede reembolsar pagos."
        });
      }

      const payment =
        await prisma.payment.findUnique({
          where: {
            id: paymentId
          },
          include:
            PAYMENT_INCLUDE
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Pago no encontrado."
        });
      }

      if (
        payment.status ===
        "REFUNDED"
      ) {
        return res.status(200).json({
          success: true,
          recovered: true,
          message:
            "El pago ya había sido reembolsado.",
          payment:
            serializePayment(
              payment
            )
        });
      }

      if (
        payment.status ===
        "RELEASED"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "El pago ya fue liberado al vendedor."
        });
      }

      const now =
        new Date();

      const timeline =
        appendTimeline(
          payment.order?.timeline,
          {
            status:
              "PAYMENT_REFUNDED",
            description:
              "QSM reembolsó el pago al comprador.",
            createdBy:
              currentUser.id
          }
        );

      await prisma.$transaction(
        async (tx) => {
          await tx.payment.update({
            where: {
              id:
                payment.id
            },
            data: {
              status:
                "REFUNDED",
              notes:
                "Pago reembolsado al comprador."
            }
          });

          await tx.order.update({
            where: {
              id:
                payment.orderId
            },
            data: {
              status:
                "CANCELLED",
              paymentStatus:
                "REFUNDED",
              escrowStatus:
                "REFUNDED",
              refundAmount:
                payment.amount,
              refundedAt:
                now,
              cancelledAt:
                payment.order
                  ?.cancelledAt ||
                now,
              timeline
            }
          });

          await createNotificationSafe(
            tx,
            payment.buyerId,
            "PAYMENT_REFUNDED",
            "Pago reembolsado",
            "QSM registró el reembolso de la orden."
          );

          await createNotificationSafe(
            tx,
            payment.sellerId,
            "PAYMENT_REFUNDED",
            "Pago devuelto",
            "El pago de la orden fue reembolsado al comprador."
          );
        },
        {
          maxWait: 20000,
          timeout: 60000
        }
      );

      const updated =
        await prisma.payment.findUnique({
          where: {
            id:
              payment.id
          },
          include:
            PAYMENT_INCLUDE
        });

      return res.status(200).json({
        success: true,
        message:
          "Pago reembolsado correctamente.",
        payment:
          serializePayment(
            updated
          )
      });
    } catch (error) {
      return handleError(
        res,
        error,
        "No se pudo reembolsar el pago."
      );
    }
  };

const getMyPayments = async (
  req,
  res
) => {
  try {
    const currentUser =
      await resolvePrismaUser(req);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message:
          "Usuario no encontrado en Supabase."
      });
    }

    const records =
      await prisma.payment.findMany({
        where: {
          OR: [
            {
              buyerId:
                currentUser.id
            },
            {
              sellerId:
                currentUser.id
            }
          ]
        },
        include:
          PAYMENT_INCLUDE,
        orderBy: {
          createdAt:
            "desc"
        }
      });

    return res.status(200).json({
      success: true,
      count:
        records.length,
      payments:
        records.map(
          serializePayment
        )
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudieron obtener los pagos."
    );
  }
};

module.exports = {
  createEscrowPayment,
  releasePaymentToSeller,
  refundPaymentToBuyer,
  getMyPayments
};
