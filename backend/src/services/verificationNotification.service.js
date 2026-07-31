"use strict";

const nodemailer = require("nodemailer");

let prisma = null;

try {
  const prismaModule = require("../config/prisma");

  prisma =
    prismaModule.prisma ||
    prismaModule.default ||
    prismaModule;
} catch (error) {
  prisma = null;
}

let verificationHelpers = {};

try {
  verificationHelpers = require(
    "../utils/verificationHelpers"
  );
} catch (error) {
  verificationHelpers = {};
}

const {
  normalizeText = (value) =>
    String(value || "").trim(),

  normalizeId = (value) =>
    value !== null &&
    value !== undefined
      ? String(value)
      : null,

  getFirstDefinedValue = (
    source,
    paths = [],
    fallback = null
  ) => {
    for (const path of paths) {
      const value = String(path)
        .split(".")
        .reduce(
          (current, key) =>
            current &&
            current[key] !== undefined
              ? current[key]
              : undefined,
          source
        );

      if (
        value !== undefined &&
        value !== null
      ) {
        return value;
      }
    }

    return fallback;
  },

  buildFullName = (
    firstName,
    lastName
  ) =>
    [firstName, lastName]
      .filter(Boolean)
      .join(" ")
      .trim(),

  generateVerificationReference = () =>
    `KYC-${Date.now()}`,

  toISOStringSafe = (value) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date.toISOString();
  }
} = verificationHelpers;

/**
 * Tipos de notificación utilizados por el módulo KYC.
 */
const VERIFICATION_NOTIFICATION_TYPES = {
  SUBMITTED: "VERIFICATION_SUBMITTED",
  APPROVED: "VERIFICATION_APPROVED",
  REJECTED: "VERIFICATION_REJECTED",
  CORRECTION_REQUIRED:
    "VERIFICATION_CORRECTION_REQUIRED",
  EXPIRED: "VERIFICATION_EXPIRED"
};

/**
 * Canales disponibles para las notificaciones.
 */
const NOTIFICATION_CHANNELS = {
  IN_APP: "IN_APP",
  EMAIL: "EMAIL"
};

/**
 * Prioridades de las notificaciones.
 */
const NOTIFICATION_PRIORITIES = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
};

/**
 * Configuración general.
 */
const VERIFICATION_NOTIFICATION_CONFIG = {
  APP_NAME:
    process.env.APP_NAME ||
    "Quick Secure Market",

  FRONTEND_URL:
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173",

  SUPPORT_EMAIL:
    process.env.SUPPORT_EMAIL ||
    process.env.SMTP_FROM_EMAIL ||
    "support@qsm.local",

  FROM_NAME:
    process.env.SMTP_FROM_NAME ||
    process.env.APP_NAME ||
    "Quick Secure Market",

  EMAIL_ENABLED:
    String(
      process.env.EMAIL_ENABLED || "true"
    ).toLowerCase() !== "false"
};

/**
 * Crea el transporte SMTP solamente cuando existe
 * configuración suficiente.
 */
function createEmailTransporter() {
  if (
    !VERIFICATION_NOTIFICATION_CONFIG.EMAIL_ENABLED
  ) {
    return null;
  }

  const host =
    process.env.SMTP_HOST;

  const port =
    Number(process.env.SMTP_PORT || 587);

  const user =
    process.env.SMTP_USER;

  const password =
    process.env.SMTP_PASSWORD ||
    process.env.SMTP_PASS;

  if (
    !host ||
    !user ||
    !password
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host,

    port,

    secure:
      port === 465,

    auth: {
      user,
      pass: password
    }
  });
}

const emailTransporter =
  createEmailTransporter();

/**
 * Escapa texto para evitar HTML inválido dentro de
 * las plantillas de correo.
 */
function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Construye la plantilla HTML general.
 */
function buildEmailLayout({
  title,
  greeting,
  message,
  buttonText,
  buttonUrl,
  footerText
}) {
  const safeTitle =
    escapeHtml(title);

  const safeGreeting =
    escapeHtml(greeting);

  const safeMessage =
    escapeHtml(message);

  const safeButtonText =
    escapeHtml(buttonText);

  const safeButtonUrl =
    escapeHtml(buttonUrl);

  const safeFooter =
    escapeHtml(
      footerText ||
        `Este mensaje fue enviado automáticamente por ${VERIFICATION_NOTIFICATION_CONFIG.APP_NAME}.`
    );

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>${safeTitle}</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background: #f4f6f8;
          font-family: Arial, Helvetica, sans-serif;
          color: #1f2937;
        "
      >
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          role="presentation"
        >
          <tr>
            <td
              align="center"
              style="padding: 32px 16px;"
            >
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="
                  max-width: 620px;
                  background: #ffffff;
                  border-radius: 14px;
                  overflow: hidden;
                  box-shadow:
                    0 10px 30px
                    rgba(15, 23, 42, 0.08);
                "
              >
                <tr>
                  <td
                    style="
                      padding: 28px 32px;
                      background: #111827;
                      color: #ffffff;
                    "
                  >
                    <h1
                      style="
                        margin: 0;
                        font-size: 24px;
                        line-height: 1.3;
                      "
                    >
                      ${escapeHtml(
                        VERIFICATION_NOTIFICATION_CONFIG
                          .APP_NAME
                      )}
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td
                    style="padding: 32px;"
                  >
                    <h2
                      style="
                        margin:
                          0 0 18px;
                        font-size: 22px;
                        color: #111827;
                      "
                    >
                      ${safeTitle}
                    </h2>

                    <p
                      style="
                        margin:
                          0 0 16px;
                        font-size: 16px;
                        line-height: 1.7;
                      "
                    >
                      ${safeGreeting}
                    </p>

                    <p
                      style="
                        margin:
                          0 0 24px;
                        font-size: 16px;
                        line-height: 1.7;
                      "
                    >
                      ${safeMessage}
                    </p>

                    ${
                      buttonText &&
                      buttonUrl
                        ? `
                          <table
                            cellpadding="0"
                            cellspacing="0"
                            role="presentation"
                            style="margin: 24px 0;"
                          >
                            <tr>
                              <td
                                style="
                                  border-radius: 8px;
                                  background: #2563eb;
                                "
                              >
                                <a
                                  href="${safeButtonUrl}"
                                  style="
                                    display:
                                      inline-block;
                                    padding:
                                      13px 22px;
                                    color: #ffffff;
                                    text-decoration:
                                      none;
                                    font-weight: 700;
                                    font-size: 15px;
                                  "
                                >
                                  ${safeButtonText}
                                </a>
                              </td>
                            </tr>
                          </table>
                        `
                        : ""
                    }

                    <p
                      style="
                        margin:
                          28px 0 0;
                        padding-top: 22px;
                        border-top:
                          1px solid #e5e7eb;
                        font-size: 13px;
                        line-height: 1.6;
                        color: #6b7280;
                      "
                    >
                      ${safeFooter}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Envía un correo electrónico.
 */
async function sendEmail({
  to,
  subject,
  text,
  html
}) {
  if (
    !emailTransporter ||
    !to
  ) {
    return {
      sent: false,
      skipped: true,
      reason:
        "SMTP_NOT_CONFIGURED"
    };
  }

  try {
    const result =
      await emailTransporter.sendMail({
        from: `"${VERIFICATION_NOTIFICATION_CONFIG.FROM_NAME}" <${VERIFICATION_NOTIFICATION_CONFIG.SUPPORT_EMAIL}>`,

        to,

        subject,

        text,

        html
      });

    return {
      sent: true,
      skipped: false,
      messageId:
        result.messageId || null
    };
  } catch (error) {
    console.error(
      "[VerificationNotification] Error enviando correo:",
      error.message
    );

    return {
      sent: false,
      skipped: false,
      error:
        error.message
    };
  }
}

/**
 * Crea una notificación dentro de la plataforma.
 */
async function createInAppNotification({
  userId,
  type,
  title,
  message,
  priority =
    NOTIFICATION_PRIORITIES.NORMAL,
  metadata = {}
}) {
  if (
    !prisma ||
    !userId
  ) {
    return {
      created: false,
      skipped: true,
      reason:
        "PRISMA_OR_USER_NOT_AVAILABLE"
    };
  }

  const notificationModel =
    prisma.notification ||
    prisma.notifications;

  if (
    !notificationModel ||
    typeof notificationModel.create !==
      "function"
  ) {
    return {
      created: false,
      skipped: true,
      reason:
        "NOTIFICATION_MODEL_NOT_AVAILABLE"
    };
  }

  try {
    const notification =
      await notificationModel.create({
        data: {
          userId,

          type,

          title,

          message,

          priority,

          read: false,

          metadata
        }
      });

    return {
      created: true,
      skipped: false,
      notification
    };
  } catch (error) {
    console.error(
      "[VerificationNotification] Error creando notificación:",
      error.message
    );

    return {
      created: false,
      skipped: false,
      error:
        error.message
    };
  }
}

/**
 * Obtiene los datos principales del usuario.
 */
function resolveUserData(input = {}) {
  const user =
    input.user &&
    typeof input.user === "object"
      ? input.user
      : {};

  const firstName =
    getFirstDefinedValue(
      input,
      [
        "firstName",
        "user.firstName"
      ],
      user.firstName || ""
    );

  const lastName =
    getFirstDefinedValue(
      input,
      [
        "lastName",
        "user.lastName"
      ],
      user.lastName || ""
    );

  const fullName =
    buildFullName(
      firstName,
      lastName
    ) || "Usuario";

  return {
    id:
      normalizeId(
        getFirstDefinedValue(
          input,
          [
            "userId",
            "user.id",
            "user._id"
          ],
          null
        )
      ),

    firstName:
      normalizeText(firstName),

    lastName:
      normalizeText(lastName),

    fullName,

    email:
      getFirstDefinedValue(
        input,
        [
          "email",
          "user.email"
        ],
        user.email || null
      )
  };
}

/**
 * Obtiene la referencia pública de la verificación.
 */
function resolveVerificationReference(
  verification = {}
) {
  return getFirstDefinedValue(
    verification,
    [
      "reference",
      "verificationReference",
      "referenceCode"
    ],
    generateVerificationReference()
  );
}

/**
 * Notifica al usuario que su verificación fue enviada.
 */
async function sendVerificationSubmittedNotification(
  verification = {}
) {
  const user =
    resolveUserData(verification);

  const reference =
    resolveVerificationReference(
      verification
    );

  const verificationId =
    normalizeId(
      getFirstDefinedValue(
        verification,
        [
          "id",
          "_id",
          "verificationId"
        ],
        null
      )
    );

  const verificationUrl =
    `${VERIFICATION_NOTIFICATION_CONFIG.FRONTEND_URL}/verification`;

  const title =
    "Verificación enviada";

  const message =
    `Recibimos correctamente tu solicitud de verificación KYC. Nuestro equipo revisará tus documentos y te notificará cuando exista una actualización. Referencia: ${reference}.`;

  const emailSubject =
    `${title} - ${VERIFICATION_NOTIFICATION_CONFIG.APP_NAME}`;

  const emailText =
    `Hola ${user.fullName},\n\n${message}\n\nPuedes revisar el estado de tu verificación en: ${verificationUrl}`;

  const emailHtml =
    buildEmailLayout({
      title,

      greeting:
        `Hola ${user.fullName},`,

      message,

      buttonText:
        "Ver estado de verificación",

      buttonUrl:
        verificationUrl
    });

  const [
    inAppResult,
    emailResult
  ] = await Promise.all([
    createInAppNotification({
      userId:
        user.id,

      type:
        VERIFICATION_NOTIFICATION_TYPES
          .SUBMITTED,

      title,

      message,

      priority:
        NOTIFICATION_PRIORITIES.NORMAL,

      metadata: {
        verificationId,
        reference,
        status: "PENDING",
        submittedAt:
          toISOStringSafe(
            getFirstDefinedValue(
              verification,
              [
                "submittedAt",
                "createdAt"
              ],
              new Date()
            )
          )
      }
    }),

    sendEmail({
      to:
        user.email,

      subject:
        emailSubject,

      text:
        emailText,

      html:
        emailHtml
    })
  ]);

  return {
    success:
      Boolean(
        inAppResult.created ||
        emailResult.sent ||
        inAppResult.skipped ||
        emailResult.skipped
      ),

    type:
      VERIFICATION_NOTIFICATION_TYPES
        .SUBMITTED,

    userId:
      user.id,

    verificationId,

    reference,

    channels: {
      inApp:
        inAppResult,

      email:
        emailResult
    }
  };
}

/**
 * Notifica al usuario que su verificación fue aprobada.
 */
async function sendVerificationApprovedNotification(
  verification = {}
) {
  const user =
    resolveUserData(verification);

  const reference =
    resolveVerificationReference(
      verification
    );

  const verificationId =
    normalizeId(
      getFirstDefinedValue(
        verification,
        [
          "id",
          "_id",
          "verificationId"
        ],
        null
      )
    );

  const approvedAt =
    toISOStringSafe(
      getFirstDefinedValue(
        verification,
        [
          "approvedAt",
          "reviewedAt",
          "updatedAt"
        ],
        new Date()
      )
    );

  const verificationUrl =
    `${VERIFICATION_NOTIFICATION_CONFIG.FRONTEND_URL}/verification`;

  const marketplaceUrl =
    `${VERIFICATION_NOTIFICATION_CONFIG.FRONTEND_URL}/marketplace`;

  const title =
    "Verificación aprobada";

  const message =
    `Tu identidad fue verificada correctamente. Ya puedes utilizar las funciones protegidas de ${VERIFICATION_NOTIFICATION_CONFIG.APP_NAME}. Referencia: ${reference}.`;

  const emailSubject =
    `${title} - ${VERIFICATION_NOTIFICATION_CONFIG.APP_NAME}`;

  const emailText =
    `Hola ${user.fullName},\n\n${message}\n\nPuedes continuar en el marketplace: ${marketplaceUrl}`;

  const emailHtml =
    buildEmailLayout({
      title,

      greeting:
        `Hola ${user.fullName},`,

      message,

      buttonText:
        "Ir al Marketplace",

      buttonUrl:
        marketplaceUrl,

      footerText:
        `Puedes consultar los detalles de tu verificación desde ${verificationUrl}.`
    });

  const [
    inAppResult,
    emailResult
  ] = await Promise.all([
    createInAppNotification({
      userId:
        user.id,

      type:
        VERIFICATION_NOTIFICATION_TYPES
          .APPROVED,

      title,

      message,

      priority:
        NOTIFICATION_PRIORITIES.HIGH,

      metadata: {
        verificationId,
        reference,
        status: "APPROVED",
        approvedAt
      }
    }),

    sendEmail({
      to:
        user.email,

      subject:
        emailSubject,

      text:
        emailText,

      html:
        emailHtml
    })
  ]);

  return {
    success:
      Boolean(
        inAppResult.created ||
        emailResult.sent ||
        inAppResult.skipped ||
        emailResult.skipped
      ),

    type:
      VERIFICATION_NOTIFICATION_TYPES
        .APPROVED,

    userId:
      user.id,

    verificationId,

    reference,

    channels: {
      inApp:
        inAppResult,

      email:
        emailResult
    }
  };
}
/**
 * Notifica al usuario que su verificación fue rechazada.
 */
async function sendVerificationRejectedNotification(
  verification = {}
) {
  const user =
    resolveUserData(verification);

  const reference =
    resolveVerificationReference(
      verification
    );

  const verificationId =
    normalizeId(
      getFirstDefinedValue(
        verification,
        [
          "id",
          "_id",
          "verificationId"
        ],
        null
      )
    );

  const rejectionReason =
    normalizeText(
      getFirstDefinedValue(
        verification,
        [
          "rejectionReason",
          "declineReason",
          "reason",
          "adminNotes",
          "reviewNotes"
        ],
        "No fue posible validar la información proporcionada."
      )
    );

  const rejectedAt =
    toISOStringSafe(
      getFirstDefinedValue(
        verification,
        [
          "rejectedAt",
          "reviewedAt",
          "updatedAt"
        ],
        new Date()
      )
    );

  const verificationUrl =
    `${VERIFICATION_NOTIFICATION_CONFIG.FRONTEND_URL}/verification`;

  const supportUrl =
    `${VERIFICATION_NOTIFICATION_CONFIG.FRONTEND_URL}/support`;

  const title =
    "Verificación rechazada";

  const message =
    `No pudimos aprobar tu solicitud de verificación KYC. Motivo: ${rejectionReason} Referencia: ${reference}.`;

  const emailSubject =
    `${title} - ${VERIFICATION_NOTIFICATION_CONFIG.APP_NAME}`;

  const emailText =
    `Hola ${user.fullName},\n\n${message}\n\nPuedes revisar los detalles y enviar una nueva solicitud desde: ${verificationUrl}\n\nSoporte: ${supportUrl}`;

  const emailHtml =
    buildEmailLayout({
      title,

      greeting:
        `Hola ${user.fullName},`,

      message,

      buttonText:
        "Revisar verificación",

      buttonUrl:
        verificationUrl,

      footerText:
        `Si consideras que existe un error, comunícate con soporte: ${VERIFICATION_NOTIFICATION_CONFIG.SUPPORT_EMAIL}.`
    });

  const [
    inAppResult,
    emailResult
  ] = await Promise.all([
    createInAppNotification({
      userId:
        user.id,

      type:
        VERIFICATION_NOTIFICATION_TYPES
          .REJECTED,

      title,

      message,

      priority:
        NOTIFICATION_PRIORITIES.HIGH,

      metadata: {
        verificationId,
        reference,
        status: "REJECTED",
        rejectionReason,
        rejectedAt
      }
    }),

    sendEmail({
      to:
        user.email,

      subject:
        emailSubject,

      text:
        emailText,

      html:
        emailHtml
    })
  ]);

  return {
    success:
      Boolean(
        inAppResult.created ||
        emailResult.sent ||
        inAppResult.skipped ||
        emailResult.skipped
      ),

    type:
      VERIFICATION_NOTIFICATION_TYPES
        .REJECTED,

    userId:
      user.id,

    verificationId,

    reference,

    rejectionReason,

    channels: {
      inApp:
        inAppResult,

      email:
        emailResult
    }
  };
}
/**
 * Notifica al usuario que debe corregir información
 * antes de continuar con la verificación.
 */
async function sendVerificationCorrectionRequiredNotification(
  verification = {}
) {
  const user =
    resolveUserData(verification);

  const reference =
    resolveVerificationReference(
      verification
    );

  const verificationId =
    normalizeId(
      getFirstDefinedValue(
        verification,
        [
          "id",
          "_id",
          "verificationId"
        ],
        null
      )
    );

  const corrections =
    Array.isArray(
      verification.requiredCorrections
    )
      ? verification.requiredCorrections
      : Array.isArray(
          verification.corrections
        )
      ? verification.corrections
      : [];

  const correctionList =
    corrections.length > 0
      ? corrections.join(", ")
      : "Revisar la documentación enviada.";

  const requestedAt =
    toISOStringSafe(
      getFirstDefinedValue(
        verification,
        [
          "reviewedAt",
          "updatedAt",
          "requestedAt"
        ],
        new Date()
      )
    );

  const verificationUrl =
    `${VERIFICATION_NOTIFICATION_CONFIG.FRONTEND_URL}/verification`;

  const title =
    "Se requieren correcciones";

  const message =
    `Necesitamos que realices algunas correcciones para continuar con tu proceso de verificación KYC. Referencia: ${reference}.`;

  const emailSubject =
    `${title} - ${VERIFICATION_NOTIFICATION_CONFIG.APP_NAME}`;

  const emailText =
`Hola ${user.fullName},

${message}

Correcciones solicitadas:
${correctionList}

Puedes actualizar tu información desde:
${verificationUrl}`;

  const correctionHtml =
    corrections.length > 0
      ? `
        <ul style="padding-left:20px;">
          ${corrections
            .map(
              (item) =>
                `<li>${escapeHtml(item)}</li>`
            )
            .join("")}
        </ul>
      `
      : `
        <p>
          Revisa nuevamente la documentación enviada.
        </p>
      `;

  const emailHtml =
    buildEmailLayout({
      title,

      greeting:
        `Hola ${user.fullName},`,

      message:
        `${message}<br><br><strong>Correcciones solicitadas:</strong>${correctionHtml}`,

      buttonText:
        "Actualizar documentos",

      buttonUrl:
        verificationUrl,

      footerText:
        "Una vez realices las correcciones, tu solicitud volverá a ser revisada automáticamente."
    });

  const [
    inAppResult,
    emailResult
  ] = await Promise.all([
    createInAppNotification({
      userId:
        user.id,

      type:
        VERIFICATION_NOTIFICATION_TYPES
          .CORRECTION_REQUIRED,

      title,

      message,

      priority:
        NOTIFICATION_PRIORITIES.HIGH,

      metadata: {
        verificationId,
        reference,
        status:
          "RESUBMISSION_REQUIRED",
        corrections,
        requestedAt
      }
    }),

    sendEmail({
      to:
        user.email,

      subject:
        emailSubject,

      text:
        emailText,

      html:
        emailHtml
    })
  ]);

  return {
    success:
      Boolean(
        inAppResult.created ||
        emailResult.sent ||
        inAppResult.skipped ||
        emailResult.skipped
      ),

    type:
      VERIFICATION_NOTIFICATION_TYPES
        .CORRECTION_REQUIRED,

    userId:
      user.id,

    verificationId,

    reference,

    corrections,

    channels: {
      inApp:
        inAppResult,

      email:
        emailResult
    }
  };
}
/**
 * Notifica al usuario que su verificación ha expirado.
 */
async function sendVerificationExpiredNotification(
  verification = {}
) {
  const user =
    resolveUserData(verification);

  const reference =
    resolveVerificationReference(
      verification
    );

  const verificationId =
    normalizeId(
      getFirstDefinedValue(
        verification,
        [
          "id",
          "_id",
          "verificationId"
        ],
        null
      )
    );

  const expiredAt =
    toISOStringSafe(
      getFirstDefinedValue(
        verification,
        [
          "expiredAt",
          "updatedAt"
        ],
        new Date()
      )
    );

  const verificationUrl =
    `${VERIFICATION_NOTIFICATION_CONFIG.FRONTEND_URL}/verification`;

  const title =
    "Tu verificación ha expirado";

  const message =
    `Tu verificación KYC ya no es válida y debe renovarse para seguir utilizando todas las funciones protegidas de ${VERIFICATION_NOTIFICATION_CONFIG.APP_NAME}. Referencia: ${reference}.`;

  const emailSubject =
    `${title} - ${VERIFICATION_NOTIFICATION_CONFIG.APP_NAME}`;

  const emailText =
`Hola ${user.fullName},

${message}

Ingresa al siguiente enlace para iniciar una nueva verificación:

${verificationUrl}`;

  const emailHtml =
    buildEmailLayout({
      title,

      greeting:
        `Hola ${user.fullName},`,

      message,

      buttonText:
        "Renovar verificación",

      buttonUrl:
        verificationUrl,

      footerText:
        "Mantener tu identidad verificada ayuda a proteger tu cuenta y la confianza dentro del Marketplace."
    });

  const [
    inAppResult,
    emailResult
  ] = await Promise.all([
    createInAppNotification({
      userId:
        user.id,

      type:
        VERIFICATION_NOTIFICATION_TYPES
          .EXPIRED,

      title,

      message,

      priority:
        NOTIFICATION_PRIORITIES.CRITICAL,

      metadata: {
        verificationId,
        reference,
        status: "EXPIRED",
        expiredAt
      }
    }),

    sendEmail({
      to:
        user.email,

      subject:
        emailSubject,

      text:
        emailText,

      html:
        emailHtml
    })
  ]);

  return {
    success:
      Boolean(
        inAppResult.created ||
        emailResult.sent ||
        inAppResult.skipped ||
        emailResult.skipped
      ),

    type:
      VERIFICATION_NOTIFICATION_TYPES
        .EXPIRED,

    userId:
      user.id,

    verificationId,

    reference,

    expiredAt,

    channels: {
      inApp:
        inAppResult,

      email:
        emailResult
    }
  };
}
/**
 * Obtiene los administradores autorizados para recibir
 * alertas relacionadas con verificaciones KYC.
 */
async function getVerificationAdmins() {
  if (
    !prisma ||
    !prisma.user ||
    typeof prisma.user.findMany !== "function"
  ) {
    return [];
  }

  const adminRoles = [
    "SENIOR_ADMIN",
    "ADMIN",
    "KYC_ADMIN",
    "VERIFICATION_ADMIN",
    "AUDITOR"
  ];

  try {
    const admins =
      await prisma.user.findMany({
        where: {
          role: {
            in: adminRoles
          },

          status: {
            notIn: [
              "SUSPENDED",
              "BANNED",
              "DELETED"
            ]
          }
        },

        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true
        }
      });

    return Array.isArray(admins)
      ? admins
      : [];
  } catch (error) {
    console.error(
      "[VerificationNotification] Error obteniendo administradores:",
      error.message
    );

    return [];
  }
}

/**
 * Crea una notificación para varios administradores.
 */
async function notifyAdminUsers({
  admins = [],
  type,
  title,
  message,
  priority =
    NOTIFICATION_PRIORITIES.NORMAL,
  metadata = {}
}) {
  const validAdmins =
    Array.isArray(admins)
      ? admins.filter(
          (admin) =>
            admin &&
            admin.id
        )
      : [];

  if (validAdmins.length === 0) {
    return {
      total: 0,
      created: 0,
      failed: 0,
      skipped: true,
      results: []
    };
  }

  const results =
    await Promise.all(
      validAdmins.map(
        async (admin) => {
          const result =
            await createInAppNotification({
              userId:
                normalizeId(admin.id),

              type,

              title,

              message,

              priority,

              metadata: {
                ...metadata,
                recipientRole:
                  admin.role || null
              }
            });

          return {
            adminId:
              normalizeId(admin.id),

            role:
              admin.role || null,

            ...result
          };
        }
      )
    );

  const created =
    results.filter(
      (result) =>
        result.created
    ).length;

  const failed =
    results.filter(
      (result) =>
        !result.created &&
        !result.skipped
    ).length;

  return {
    total:
      results.length,

    created,

    failed,

    skipped: false,

    results
  };
}

/**
 * Notifica a los administradores cuando se crea una
 * nueva solicitud de verificación.
 */
async function notifyAdminsNewVerification(
  verification = {}
) {
  const user =
    resolveUserData(verification);

  const reference =
    resolveVerificationReference(
      verification
    );

  const verificationId =
    normalizeId(
      getFirstDefinedValue(
        verification,
        [
          "id",
          "_id",
          "verificationId"
        ],
        null
      )
    );

  const submittedAt =
    toISOStringSafe(
      getFirstDefinedValue(
        verification,
        [
          "submittedAt",
          "createdAt"
        ],
        new Date()
      )
    );

  const admins =
    await getVerificationAdmins();

  const title =
    "Nueva verificación pendiente";

  const message =
    `${user.fullName} envió una nueva solicitud de verificación KYC. Referencia: ${reference}.`;

  const result =
    await notifyAdminUsers({
      admins,

      type:
        VERIFICATION_NOTIFICATION_TYPES
          .SUBMITTED,

      title,

      message,

      priority:
        NOTIFICATION_PRIORITIES.HIGH,

      metadata: {
        verificationId,
        reference,
        userId:
          user.id,
        userName:
          user.fullName,
        status:
          "PENDING",
        submittedAt,
        adminUrl:
          `${VERIFICATION_NOTIFICATION_CONFIG.FRONTEND_URL}/admin/verifications`
      }
    });

  return {
    success:
      result.created > 0 ||
      result.skipped,

    type:
      VERIFICATION_NOTIFICATION_TYPES
        .SUBMITTED,

    verificationId,

    reference,

    recipients:
      result
  };
}

/**
 * Notifica a los administradores cuando el usuario
 * actualiza o reenvía su documentación.
 */
async function notifyAdminsVerificationUpdated(
  verification = {}
) {
  const user =
    resolveUserData(verification);

  const reference =
    resolveVerificationReference(
      verification
    );

  const verificationId =
    normalizeId(
      getFirstDefinedValue(
        verification,
        [
          "id",
          "_id",
          "verificationId"
        ],
        null
      )
    );

  const status =
    normalizeText(
      getFirstDefinedValue(
        verification,
        [
          "status",
          "verificationStatus",
          "kycStatus"
        ],
        "UNDER_REVIEW"
      )
    ).toUpperCase();

  const updatedAt =
    toISOStringSafe(
      getFirstDefinedValue(
        verification,
        [
          "updatedAt",
          "resubmittedAt"
        ],
        new Date()
      )
    );

  const admins =
    await getVerificationAdmins();

  const title =
    "Verificación actualizada";

  const message =
    `${user.fullName} actualizó la documentación de su verificación KYC. Referencia: ${reference}.`;

  const result =
    await notifyAdminUsers({
      admins,

      type:
        "VERIFICATION_UPDATED",

      title,

      message,

      priority:
        NOTIFICATION_PRIORITIES.HIGH,

      metadata: {
        verificationId,
        reference,
        userId:
          user.id,
        userName:
          user.fullName,
        status,
        updatedAt,
        adminUrl:
          `${VERIFICATION_NOTIFICATION_CONFIG.FRONTEND_URL}/admin/verifications`
      }
    });

  return {
    success:
      result.created > 0 ||
      result.skipped,

    type:
      "VERIFICATION_UPDATED",

    verificationId,

    reference,

    recipients:
      result
  };
}

/**
 * Envía la notificación correspondiente al nuevo estado
 * de una verificación.
 */
async function notifyVerificationStatusChange(
  verification = {},
  previousStatus = null
) {
  const currentStatus =
    normalizeText(
      getFirstDefinedValue(
        verification,
        [
          "status",
          "verificationStatus",
          "kycStatus"
        ],
        ""
      )
    ).toUpperCase();

  const normalizedPreviousStatus =
    normalizeText(
      previousStatus
    ).toUpperCase();

  if (
    normalizedPreviousStatus &&
    normalizedPreviousStatus ===
      currentStatus
  ) {
    return {
      success: true,
      skipped: true,
      reason:
        "STATUS_NOT_CHANGED",
      previousStatus:
        normalizedPreviousStatus,
      currentStatus
    };
  }

  let result;

  switch (currentStatus) {
    case "APPROVED":
      result =
        await sendVerificationApprovedNotification(
          verification
        );
      break;

    case "REJECTED":
      result =
        await sendVerificationRejectedNotification(
          verification
        );
      break;

    case "RESUBMISSION_REQUIRED":
    case "CORRECTION_REQUIRED":
    case "CHANGES_REQUIRED":
      result =
        await sendVerificationCorrectionRequiredNotification(
          verification
        );
      break;

    case "EXPIRED":
      result =
        await sendVerificationExpiredNotification(
          verification
        );
      break;

    case "PENDING":
    case "SUBMITTED":
      result =
        await sendVerificationSubmittedNotification(
          verification
        );
      break;

    case "UNDER_REVIEW":
      result =
        await notifyAdminsVerificationUpdated(
          verification
        );
      break;

    default:
      return {
        success: false,
        skipped: true,
        reason:
          "UNSUPPORTED_VERIFICATION_STATUS",
        previousStatus:
          normalizedPreviousStatus ||
          null,
        currentStatus:
          currentStatus || null
      };
  }

  return {
    ...result,

    previousStatus:
      normalizedPreviousStatus ||
      null,

    currentStatus
  };
}

/**
 * Verifica la conexión SMTP.
 */
async function verifyEmailTransporter() {
  if (!emailTransporter) {
    return {
      success: false,
      configured: false,
      reason:
        "SMTP_NOT_CONFIGURED"
    };
  }

  try {
    await emailTransporter.verify();

    return {
      success: true,
      configured: true
    };
  } catch (error) {
    console.error(
      "[VerificationNotification] Error verificando SMTP:",
      error.message
    );

    return {
      success: false,
      configured: true,
      error:
        error.message
    };
  }
}

/**
 * Devuelve el estado actual del servicio.
 */
function getVerificationNotificationServiceStatus() {
  return {
    emailEnabled:
      VERIFICATION_NOTIFICATION_CONFIG
        .EMAIL_ENABLED,

    smtpConfigured:
      Boolean(emailTransporter),

    prismaConfigured:
      Boolean(prisma),

    inAppNotificationAvailable:
      Boolean(
        prisma &&
        (
          prisma.notification ||
          prisma.notifications
        )
      ),

    appName:
      VERIFICATION_NOTIFICATION_CONFIG
        .APP_NAME,

    frontendUrl:
      VERIFICATION_NOTIFICATION_CONFIG
        .FRONTEND_URL,

    supportEmail:
      VERIFICATION_NOTIFICATION_CONFIG
        .SUPPORT_EMAIL
  };
}

module.exports = {
  VERIFICATION_NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  VERIFICATION_NOTIFICATION_CONFIG,

  createEmailTransporter,
  buildEmailLayout,
  escapeHtml,
  sendEmail,

  createInAppNotification,
  resolveUserData,
  resolveVerificationReference,

  sendVerificationSubmittedNotification,
  sendVerificationApprovedNotification,
  sendVerificationRejectedNotification,
  sendVerificationCorrectionRequiredNotification,
  sendVerificationExpiredNotification,

  getVerificationAdmins,
  notifyAdminUsers,
  notifyAdminsNewVerification,
  notifyAdminsVerificationUpdated,
  notifyVerificationStatusChange,

  verifyEmailTransporter,
  getVerificationNotificationServiceStatus
};