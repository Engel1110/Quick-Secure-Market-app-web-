const prisma = require("../utils/prisma");

const {
  releasePaymentToSeller,
  refundPaymentToBuyer
} = require("./payment.controller");

const FINANCE_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "FINANCE_MANAGER",
  "FINANCE_AGENT",
  "AUDITOR"
];

function normalize(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function hasFinanceAccess(req) {
  const role = normalize(req.user?.role);
  const department = normalize(
    req.user?.department
  );

  const departments = Array.isArray(
    req.user?.departments
  )
    ? req.user.departments.map(normalize)
    : [];

  const permissions = Array.isArray(
    req.user?.permissions
  )
    ? req.user.permissions.map(normalize)
    : [];

  return (
    FINANCE_ROLES.includes(role) ||
    department === "FINANCE" ||
    department === "AUDIT" ||
    departments.includes("FINANCE") ||
    departments.includes("AUDIT") ||
    permissions.includes("*") ||
    permissions.includes("FINANCE.VIEW")
  );
}

function getStartOfToday() {
  const value = new Date();

  value.setHours(0, 0, 0, 0);

  return value;
}

function sum(values) {
  return values.reduce(
    (total, value) =>
      total + Number(value || 0),
    0
  );
}

function paymentType(status) {
  const normalized = normalize(status);

  if (normalized === "RELEASED") {
    return "RELEASE";
  }

  if (normalized === "REFUNDED") {
    return "REFUND";
  }

  if (normalized === "FAILED") {
    return "CHARGEBACK";
  }

  return "ESCROW_HOLD";
}

function personName(user) {
  const name = [
    user?.firstName,
    user?.lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Usuario QSM";
}

function paymentMethodLabel(payment) {
  const method = normalize(
    payment?.method
  );

  const order = payment?.order || {};

  if (
    method === "CARD" &&
    order.cardLast4
  ) {
    return (
      (order.cardBrand ||
        "Tarjeta") +
      " terminada en " +
      order.cardLast4
    );
  }

  const labels = {
    QSM_ESCROW:
      "Escrow QSM",

    BANK_TRANSFER:
      "Transferencia bancaria",

    CASH_ON_DELIVERY:
      "Pago contra entrega",

    CARD:
      "Tarjeta"
  };

  return labels[method] || method;
}

function mapTransaction(payment) {
  const order = payment.order || {};
  const dispute = order.dispute || null;

  return {
    id:
      "FIN-" +
      String(payment.id),

    apiId:
      payment.id,

    orderId:
      order.orderCode ||
      "ORD-" + order.id,

    numericOrderId:
      order.id,

    user: {
      id:
        "USR-" +
        String(payment.buyer?.id || ""),

      name:
        personName(payment.buyer),

      email:
        payment.buyer?.email || ""
    },

    seller: {
      id:
        "USR-" +
        String(payment.seller?.id || ""),

      name:
        personName(payment.seller),

      email:
        payment.seller?.email || ""
    },

    product: {
      id:
        order.product?.id || null,

      name:
        order.product?.title ||
        "Producto QSM",

      qsmCode:
        order.product?.qsmCode || ""
    },

    type:
      paymentType(payment.status),

    amount:
      Number(payment.amount || 0),

    commission:
      Number(
        order.protectionFee || 0
      ),

    sellerNet:
      Number(
        order.price || 0
      ),

    shippingFee:
      Number(
        order.shippingFee || 0
      ),

    currency:
      "RD$",

    status:
      normalize(payment.status),

    paymentMethod:
      paymentMethodLabel(payment),

    reference:
      payment.transactionCode,

    createdAt:
      payment.createdAt,

    updatedAt:
      payment.updatedAt,

    lastUpdate:
      payment.updatedAt,

    riskLevel:
      normalize(
        order.product?.riskLevel ||
        "LOW"
      ),

    disputeId:
      dispute
        ? (
            dispute.disputeCode ||
            "DSP-" + dispute.id
          )
        : null,

    disputeStatus:
      dispute?.status || null,

    escrowStatus:
      order.escrowStatus,

    orderStatus:
      order.status
  };
}

async function getFinanceDashboard(
  req,
  res
) {
  try {
    if (!hasFinanceAccess(req)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes acceso al área de Finanzas."
      });
    }

    const payments =
      await prisma.payment.findMany({
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },

          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },

          order: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  qsmCode: true,
                  riskLevel: true
                }
              },

              dispute: {
                select: {
                  id: true,
                  disputeCode: true,
                  status: true
                }
              }
            }
          }
        },

        orderBy: {
          updatedAt: "desc"
        }
      });

    const today =
      getStartOfToday();

    const held =
      payments.filter(
        (payment) =>
          normalize(payment.status) ===
          "HELD"
      );

    const released =
      payments.filter(
        (payment) =>
          normalize(payment.status) ===
          "RELEASED"
      );

    const refunded =
      payments.filter(
        (payment) =>
          normalize(payment.status) ===
          "REFUNDED"
      );

    const failed =
      payments.filter(
        (payment) =>
          normalize(payment.status) ===
          "FAILED"
      );

    const updatedToday =
      payments.filter(
        (payment) =>
          new Date(
            payment.updatedAt
          ) >= today
      );

    const releasedToday =
      released.filter(
        (payment) =>
          new Date(
            payment.updatedAt
          ) >= today
      );

    const refundedToday =
      refunded.filter(
        (payment) =>
          new Date(
            payment.updatedAt
          ) >= today
      );

    const finalized =
      released.length +
      refunded.length +
      failed.length;

    const processedRate =
      payments.length > 0
        ? Math.round(
            (
              finalized /
              payments.length
            ) *
              100
          )
        : 0;

    const transactions =
      payments.map(
        mapTransaction
      );

    const methodSummary = {};

    for (const payment of payments) {
      const method = normalize(
        payment.method ||
        "QSM_ESCROW"
      );

      if (!methodSummary[method]) {
        methodSummary[method] = {
          method,
          transactions: 0,
          amount: 0
        };
      }

      methodSummary[method]
        .transactions += 1;

      methodSummary[method]
        .amount += Number(
          payment.amount || 0
        );
    }

    const alerts = [];

    for (const payment of held) {
      const ageInDays =
        (
          Date.now() -
          new Date(
            payment.createdAt
          ).getTime()
        ) /
        86400000;

      if (ageInDays >= 3) {
        alerts.push({
          id:
            "FIN-ALERT-" +
            payment.id,

          severity:
            ageInDays >= 7
              ? "HIGH"
              : "MEDIUM",

          title:
            "Pago retenido por tiempo prolongado",

          message:
            "La transacción " +
            payment.transactionCode +
            " lleva " +
            Math.floor(ageInDays) +
            " días en custodia.",

          transactionId:
            "FIN-" +
            payment.id
        });
      }
    }

    for (const payment of held) {
      if (payment.order?.dispute) {
        alerts.push({
          id:
            "FIN-DISPUTE-" +
            payment.id,

          severity:
            "HIGH",

          title:
            "Fondos bloqueados por disputa",

          message:
            "La orden " +
            (
              payment.order.orderCode ||
              payment.order.id
            ) +
            " tiene una disputa activa.",

          transactionId:
            "FIN-" +
            payment.id,

          disputeId:
            payment.order.dispute
              .disputeCode ||
            payment.order.dispute.id
        });
      }
    }

    return res.status(200).json({
      success: true,

      data: {
        generatedAt:
          new Date().toISOString(),

        kpis: {
          escrowHeld:
            sum(
              held.map(
                (payment) =>
                  payment.amount
              )
            ),

          releasedToday:
            sum(
              releasedToday.map(
                (payment) =>
                  payment.amount
              )
            ),

          refundsToday:
            sum(
              refundedToday.map(
                (payment) =>
                  payment.amount
              )
            ),

          commissionsToday:
            sum(
              releasedToday.map(
                (payment) =>
                  payment.order
                    ?.protectionFee
              )
            ),

          pendingPayouts:
            sum(
              held.map(
                (payment) =>
                  payment.order?.price
              )
            ),

          failedTransactions:
            failed.length,

          processedToday:
            updatedToday.length,

          processedRate
        },

        totals: {
          payments:
            payments.length,

          held:
            held.length,

          released:
            released.length,

          refunded:
            refunded.length,

          failed:
            failed.length,

          totalVolume:
            sum(
              payments.map(
                (payment) =>
                  payment.amount
              )
            ),

          totalCommissions:
            sum(
              released.map(
                (payment) =>
                  payment.order
                    ?.protectionFee
              )
            )
        },

        transactions,

        alerts,

        paymentMethods:
          Object.values(
            methodSummary
          ),

        payouts:
          held.map((payment) => ({
            id:
              "PAYOUT-" +
              payment.id,

            paymentId:
              "FIN-" +
              payment.id,

            seller:
              personName(
                payment.seller
              ),

            amount:
              Number(
                payment.order?.price ||
                0
              ),

            status:
              "PENDING",

            orderId:
              payment.order
                ?.orderCode ||
              payment.orderId
          }))
      }
    });
  } catch (error) {
    console.error(
      "Finance dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo cargar el Dashboard de Finanzas.",

      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
}

async function updateFinanceTransactionStatus(
  req,
  res
) {
  if (!hasFinanceAccess(req)) {
    return res.status(403).json({
      success: false,
      message:
        "No tienes permiso para gestionar Finanzas."
    });
  }

  const role =
    normalize(req.user?.role);

  const canDecide =
    [
      "SUPER_ADMIN",
      "SENIOR_ADMIN",
      "ADMIN",
      "FINANCE_MANAGER"
    ].includes(role) ||
    (
      Array.isArray(
        req.user?.permissions
      ) &&
      req.user.permissions
        .map(normalize)
        .includes("*")
    );

  if (!canDecide) {
    return res.status(403).json({
      success: false,
      message:
        "Solo un gerente financiero o administrador puede liberar o reembolsar fondos."
    });
  }

  const transactionId =
    String(
      req.params.transactionId ||
      ""
    );

  const numericId =
    Number(
      transactionId.replace(
        /\D/g,
        ""
      )
    );

  if (
    !Number.isInteger(numericId) ||
    numericId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        "La transacción financiera no es válida."
    });
  }

  const status =
    normalize(
      req.body?.status
    );

  const action =
    normalize(
      req.body?.action
    );

  req.params.paymentId =
    String(numericId);

  if (
    status === "RELEASED" ||
    [
      "RELEASE",
      "PAYOUT",
      "RELEASE_TO_SELLER"
    ].includes(action)
  ) {
    return releasePaymentToSeller(
      req,
      res
    );
  }

  if (
    status === "REFUNDED" ||
    [
      "REFUND",
      "REFUND_BUYER"
    ].includes(action)
  ) {
    return refundPaymentToBuyer(
      req,
      res
    );
  }

  return res.status(400).json({
    success: false,
    message:
      "La acción financiera debe ser RELEASED o REFUNDED."
  });
}

module.exports = {
  getFinanceDashboard,
  updateFinanceTransactionStatus
};
