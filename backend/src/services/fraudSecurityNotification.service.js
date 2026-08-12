/*
|--------------------------------------------------------------------------
| QSM_BLOQUE9_8_LUNA_NOTIFICATION_BRANDING
|--------------------------------------------------------------------------
*/

"use strict";

const prisma =
  require("../utils/prisma");

const {
  createNotification
} =
  require("./notification.service");


/*
|--------------------------------------------------------------------------
| QSM_BLOQUE9_6_1_FRAUD_SECURITY_NOTIFICATION_SERVICE
|--------------------------------------------------------------------------
*/

const SECURITY_NOTIFICATION_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SECURITY_MANAGER",
  "SECURITY_ANALYST"
];


const getSecurityRecipients =
  async () => {

    return prisma.user.findMany({
      where: {
        status:
          "ACTIVE",

        notificationsEnabled:
          true,

        OR: [
          {
            role: {
              in:
                SECURITY_NOTIFICATION_ROLES
            }
          },

          {
            department:
              "SECURITY"
          },

          {
            departments: {
              has:
                "SECURITY"
            }
          }
        ]
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });
  };


const notificationAlreadyExists =
  async ({
    userId,
    alertId,
    minutes = 15
  }) => {

    const since =
      new Date(
        Date.now() -
        minutes * 60 * 1000
      );

    const marker =
      "[FA-" +
      String(alertId) +
      "]";


    const existing =
      await prisma.notification.findFirst({
        where: {
          userId,

          createdAt: {
            gte:
              since
          },

          message: {
            contains:
              marker
          }
        },

        orderBy: {
          createdAt:
            "desc"
        }
      });


    return Boolean(
      existing
    );
  };


const notifySecurityTeam =
  async ({
    alertId,
    riskLevel,
    productTitle = "",
    conversationId = null,
    message = "",
    force = false
  }) => {

    try {

      const level =
        String(
          riskLevel ||
          "LOW"
        ).toUpperCase();


      if (
        !force &&
        ![
          "HIGH",
          "CRITICAL"
        ].includes(
          level
        )
      ) {

        return {
          success: true,
          sent: 0,
          skipped: true,
          reason:
            "RISK_LEVEL_NOT_NOTIFIABLE"
        };
      }


      const recipients =
        await getSecurityRecipients();


      if (
        recipients.length === 0
      ) {

        return {
          success: true,
          sent: 0,
          skipped: true,
          reason:
            "NO_SECURITY_RECIPIENTS"
        };
      }


      const levelLabel =
        level === "CRITICAL"
          ? "Crítico"
          : level === "HIGH"
            ? "Alto"
            : level === "MEDIUM"
              ? "Medio"
              : "Bajo";


      const title =
        level === "CRITICAL"
          ? "LUNA Security · Alerta crítica"
          : "LUNA Security · Alerta de riesgo alto";


      const type =
        level === "CRITICAL"
          ? "FRAUD_CRITICAL"
          : "FRAUD_HIGH";


      const notificationMessage =
        [
          "[FA-" +
            String(alertId) +
            "]",

          "Nivel: " +
            levelLabel +
            ".",

          productTitle
            ? "Producto: " +
              String(
                productTitle
              ) +
              "."
            : "",

          conversationId
            ? "Conversación: " +
              String(
                conversationId
              ) +
              "."
            : "",

          message
            ? String(
                message
              )
                .trim()
                .slice(
                  0,
                  600
                )
            : "",

          "LUNA Security registró el caso en FraudShield. Revísalo en Centro de Seguridad → FraudShield."
        ]
          .filter(Boolean)
          .join(" ");


      let sent = 0;
      let deduplicated = 0;


      for (
        const recipient of
        recipients
      ) {

        const duplicate =
          await notificationAlreadyExists({
            userId:
              recipient.id,

            alertId,

            minutes:
              15
          });


        if (duplicate) {

          deduplicated++;

          continue;
        }


        const created =
          await createNotification(
            recipient.id,
            type,
            title,
            notificationMessage
          );


        if (created) {
          sent++;
        }
      }


      return {
        success: true,
        sent,
        deduplicated,
        skipped: false
      };


    } catch (error) {

      console.error(
        "FraudShield Security Notification:",
        error
      );


      return {
        success: false,
        sent: 0,
        skipped: false,
        error:
          error.message
      };
    }
  };


module.exports = {
  getSecurityRecipients,
  notificationAlreadyExists,
  notifySecurityTeam
};
