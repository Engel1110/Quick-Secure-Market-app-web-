"use strict";

const {
  prisma,
  parsePositiveInt
} = require(
  "../utils/prismaCompat"
);

const {
  createNotification
} = require(
  "../services/notification.service"
);

const {
  buildAnalysis,
  MODULES
} = require(
  "../services/qsm-ai-core.service"
);

const {
  analyzeProductWithGemini,
  getCompositeRiskLevel,
  getCompositeDecision
} = require(
  "../services/fraudshield-gemini.service"
);




/*
|--------------------------------------------------------------------------
| QSM_BLOQUE9_6_SECURITY_NOTIFICATIONS
|--------------------------------------------------------------------------
*/

const SECURITY_NOTIFICATION_ROLES =
  [
    "SUPER_ADMIN",
    "SENIOR_ADMIN",
    "ADMIN",
    "SECURITY_MANAGER",
    "SECURITY_ANALYST"
  ];


const getSecurityRecipients =
  async () => {

    const prisma =
      require("../utils/prisma");

    return prisma.user.findMany({
      where: {
        status: "ACTIVE",

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
        ],

        notificationsEnabled:
          true
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        department: true
      }
    });
  };


const createSecurityNotificationSafe =
  async ({
    userId,
    type,
    title,
    message
  }) => {

    try {

      await createNotification(
        userId,
        type,
        title,
        message
      );

      return true;

    } catch (error) {

      console.error(
        "No se pudo crear notificación de Seguridad:",
        error.message
      );

      return false;
    }
  };


const securityNotificationExists =
  async ({
    userId,
    type,
    alertId,
    minutes = 15
  }) => {

    const prisma =
      require("../utils/prisma");

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
          },

          title: {
            contains:
              type
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
    message = "",
    conversationId = null,
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
          sent: 0,
          skipped: true
        };
      }


      const recipients =
        await getSecurityRecipients();


      if (
        !recipients.length
      ) {

        console.warn(
          "FraudShield: no hay usuarios activos de Seguridad para notificar."
        );

        return {
          sent: 0,
          skipped: false
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


      const type =
        level === "CRITICAL"
          ? "FRAUD_CRITICAL"
          : "FRAUD_HIGH";


      const title =
        level === "CRITICAL"
          ? "FraudShield: alerta crítica"
          : "FraudShield: alerta de riesgo alto";


      const description =
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
                  500
                )
            : "",

          "Revisa la alerta en Centro de Seguridad → FraudShield."
        ]
          .filter(Boolean)
          .join(" ");


      let sent = 0;


      for (
        const user of
        recipients
      ) {

        const duplicate =
          await securityNotificationExists({
            userId:
              user.id,

            type:
              "FraudShield",

            alertId,

            minutes:
              15
          });


        if (
          duplicate
        ) {
          continue;
        }


        const created =
          await createSecurityNotificationSafe({
            userId:
              user.id,

            type,

            title,

            message:
              description
          });


        if (
          created
        ) {
          sent++;
        }
      }


      return {
        sent,
        skipped: false
      };


    } catch (error) {

      console.error(
        "Error notificando al equipo de Seguridad:",
        error.message
      );

      return {
        sent: 0,
        skipped: false,
        error:
          error.message
      };
    }
  };


const notifyFraudAssignee =
  async ({
    userId,
    alertId,
    action,
    actorName = ""
  }) => {

    if (
      !userId
    ) {
      return false;
    }


    const actionText = {

      TAKE_OWNERSHIP:
        "El caso fue asignado a tu cuenta.",

      START_REVIEW:
        "La revisión del caso fue iniciada.",

      ESCALATE:
        "El caso fue escalado y requiere atención.",

      RESOLVE:
        "La alerta fue marcada como resuelta.",

      DISMISS:
        "La alerta fue descartada como falso positivo.",

      REOPEN:
        "La alerta fue reabierta."
    }[
      String(
        action ||
        ""
      ).toUpperCase()
    ] ||
    "La alerta fue actualizada.";


    return createSecurityNotificationSafe({
      userId,

      type:
        "FRAUD_CASE_UPDATE",

      title:
        "FraudShield · Actualización de caso",

      message:
        "[FA-" +
        String(alertId) +
        "] " +
        actionText +
        (
          actorName
            ? " Acción realizada por " +
              String(
                actorName
              ) +
              "."
            : ""
        )
    });
  };


const riskLevelSpanish = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  CRITICAL: "Crítico"
};


const RISK_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};


function asObject(value) {

  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value
    : {};
}


function clampScore(value) {

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Number(value || 0)
      )
    )
  );
}


function highestRiskLevel(
  first,
  second
) {

  const a =
    String(
      first || "LOW"
    ).toUpperCase();

  const b =
    String(
      second || "LOW"
    ).toUpperCase();


  return (
    (RISK_PRIORITY[b] || 0) >
    (RISK_PRIORITY[a] || 0)
  )
    ? b
    : a;
}


function sanitizeSellerForResponse(
  seller
) {

  if (
    !seller ||
    typeof seller !== "object"
  ) {
    return null;
  }

  return {

    id:
      seller.id,

    firstName:
      seller.firstName || "",

    lastName:
      seller.lastName || "",

    isVerified:
      seller.isVerified === true,

    trustScore:
      Number(
        seller.trustScore ?? 50
      ),

    verificationStatus:
      seller.verificationStatus || null,

    identityLevel:
      seller.identityLevel || null,

    completedSales:
      Number(
        seller.completedSales || 0
      ),

    fraudReports:
      Number(
        seller.fraudReports || 0
      ),

    disputesOpened:
      Number(
        seller.disputesOpened || 0
      )

  };
}

function combineUnique(
  ...collections
) {

  return [
    ...new Set(
      collections
        .flat()
        .filter(Boolean)
        .map(
          (item) =>
            String(item).trim()
        )
        .filter(Boolean)
    )
  ];
}


/*
|--------------------------------------------------------------------------
| Motor determinístico QSM
|--------------------------------------------------------------------------
*/

async function analyzeProductRisk(
  product
) {

  let riskLevel =
    "LOW";

  let confidenceScore =
    80;

  const reasons =
    [];

  const evidenceRequired =
    [];


  const descriptionLength =
    String(
      product.description || ""
    ).length;


  const imageCount =
    Array.isArray(
      product.images
    )
      ? product.images.length
      : 0;


  if (
    Number(product.price) <=
      10000 &&
    [
      "Gaming",
      "Tecnologia",
      "Tecnología",
      "Celulares",
      "Computadoras"
    ].includes(
      product.category
    )
  ) {

    riskLevel =
      "HIGH";

    confidenceScore -=
      35;

    reasons.push(
      "Precio sospechosamente bajo para esta categoría en República Dominicana."
    );

    evidenceRequired.push(
      "Foto del equipo encendido",
      "Video corto funcionando",
      "Número de serie visible",
      "Explicación clara del precio bajo"
    );
  }


  if (
    descriptionLength < 40
  ) {

    if (
      riskLevel !== "HIGH"
    ) {
      riskLevel =
        "MEDIUM";
    }

    confidenceScore -=
      15;

    reasons.push(
      "La descripción es muy corta para validar el estado real del producto."
    );

    evidenceRequired.push(
      "Descripción más detallada del producto"
    );
  }


  if (
    imageCount < 2
  ) {

    if (
      riskLevel !== "HIGH"
    ) {
      riskLevel =
        "MEDIUM";
    }

    confidenceScore -=
      10;

    reasons.push(
      "El anuncio tiene pocas fotos."
    );

    evidenceRequired.push(
      "Más fotos desde diferentes ángulos"
    );
  }


  if (
    product.quality ===
      "UNKNOWN"
  ) {

    if (
      riskLevel !== "HIGH"
    ) {
      riskLevel =
        "MEDIUM";
    }

    confidenceScore -=
      10;

    reasons.push(
      "La calidad del equipo no fue especificada correctamente."
    );

    evidenceRequired.push(
      "Indicar la calidad real del equipo"
    );
  }


  if (
    product.specialPriceReason !==
      "NONE" &&
    String(
      product
        .specialPriceExplanation ||
      ""
    ).length < 30
  ) {

    if (
      riskLevel !== "HIGH"
    ) {
      riskLevel =
        "MEDIUM";
    }

    confidenceScore -=
      10;

    reasons.push(
      "El motivo del precio especial necesita una explicación más completa."
    );

    evidenceRequired.push(
      "Explicación más clara del motivo de venta rápida"
    );
  }


  const finalConfidence =
    clampScore(
      confidenceScore
    );


  return {

    riskLevel,

    riskScore:
      clampScore(
        100 -
        finalConfidence
      ),

    confidenceScore:
      finalConfidence,

    reason:
      reasons.length
        ? reasons.join(" ")
        : "Producto sin señales críticas de fraude.",

    reasons,

    evidenceRequired:
      [...new Set(
        evidenceRequired
      )]

  };
}


/*
|--------------------------------------------------------------------------
| Serialización de alertas
|--------------------------------------------------------------------------
*/

function serializeAlert(
  alert
) {

  return {

    ...alert,

    _id:
      String(
        alert.id
      ),

    riskLevel:
      alert.level,

    reason:
      alert.message,

    user:
      alert.product?.seller
        ? {
            ...sanitizeSellerForResponse(
              alert.product.seller
            ),

            _id:
              String(
                alert.product.seller.id
              )
          }
        : undefined,

    product:
      alert.product
        ? {
            ...alert.product,

            seller:
              alert.product.seller
                ? sanitizeSellerForResponse(
                    alert.product.seller
                  )
                : undefined,

            _id:
              String(
                alert.product.id
              )
          }
        : alert.productId,

    evidenceRequired:
      alert.product
        ?.evidenceRequired ||
      []

  };
}


/*
|--------------------------------------------------------------------------
| POST /api/fraud/analyze-product
|--------------------------------------------------------------------------
*/

async function createFraudAlertForProduct(
  req,
  res
) {

  try {

    const productId =
      parsePositiveInt(
        req.body?.productId
      );


    if (!productId) {

      return res
        .status(400)
        .json({
          message:
            "El productId es obligatorio"
        });
    }


    const product =
      await prisma
        .product
        .findUnique({

          where: {
            id:
              productId
          },

          include: {
            seller:
              true
          }

        });


    if (!product) {

      return res
        .status(404)
        .json({
          message:
            "Producto no encontrado"
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Riesgo previamente registrado
    |--------------------------------------------------------------------------
    */

    const previousRiskScore =
      clampScore(
        product.riskScore
      );

    const previousRiskLevel =
      String(
        product.riskLevel ||
        "LOW"
      ).toUpperCase();


    /*
    |--------------------------------------------------------------------------
    | 1. MOTOR QSM
    |--------------------------------------------------------------------------
    */

    const qsmAnalysis =
      await analyzeProductRisk(
        product
      );


    /*
    |--------------------------------------------------------------------------
    | 2. GEMINI - CAPA SEMÁNTICA
    |--------------------------------------------------------------------------
    |
    | Si Gemini falla:
    | FraudShield sigue funcionando
    | únicamente con el motor QSM.
    |--------------------------------------------------------------------------
    */

    const geminiAnalysis =
      await analyzeProductWithGemini({

        product,

        seller:
          product.seller || {},

        qsmAnalysis: {

          riskLevel:
            qsmAnalysis
              .riskLevel,

          riskScore:
            qsmAnalysis
              .riskScore,

          confidenceScore:
            qsmAnalysis
              .confidenceScore,

          reasons:
            qsmAnalysis
              .reasons,

          evidenceRequired:
            qsmAnalysis
              .evidenceRequired

        }

      });


    /*
    |--------------------------------------------------------------------------
    | 3. RESULTADO FRAUDSHIELD
    |--------------------------------------------------------------------------
    |
    | Gemini NUNCA reduce el riesgo
    | calculado por el motor QSM.
    |--------------------------------------------------------------------------
    */

    const semanticRiskScore =
      geminiAnalysis
        ?.success
        ? clampScore(
            geminiAnalysis
              .semanticRiskScore
          )
        : qsmAnalysis
            .riskScore;


    const calculatedComposite =
      geminiAnalysis
        ?.success
        ? clampScore(
            geminiAnalysis
              .compositeRiskScore
          )
        : qsmAnalysis
            .riskScore;


    /*
    |--------------------------------------------------------------------------
    | Política de seguridad conservadora
    |--------------------------------------------------------------------------
    |
    | FraudShield nunca reduce silenciosamente un HIGH/CRITICAL previo.
    | Si existe una caída fuerte de riesgo, se fuerza revisión humana.
    |--------------------------------------------------------------------------
    */

    const discrepancy =
      Math.abs(
        previousRiskScore -
        calculatedComposite
      );


    const historicalRiskProtected =
      [
        "HIGH",
        "CRITICAL"
      ].includes(
        previousRiskLevel
      );


    const strongDisagreement =
      discrepancy >= 30;


    const finalRiskScore =
      historicalRiskProtected
        ? Math.max(
            previousRiskScore,
            qsmAnalysis.riskScore,
            calculatedComposite
          )
        : Math.max(
            qsmAnalysis.riskScore,
            calculatedComposite
          );


    const scoreBasedLevel =
      getCompositeRiskLevel(
        finalRiskScore
      );


    const finalRiskLevel =
      highestRiskLevel(

        previousRiskLevel,

        highestRiskLevel(
          qsmAnalysis.riskLevel,
          scoreBasedLevel
        )

      );


    let finalDecision =
      getCompositeDecision(
        finalRiskScore
      );


    if (
      historicalRiskProtected &&
      strongDisagreement
    ) {

      finalDecision =
        "MANUAL_REVIEW";

    }


    const finalReasons =
      combineUnique(

        qsmAnalysis
          .reasons,

        geminiAnalysis
          ?.success
          ? geminiAnalysis
              .reasons
          : []

      );


    const finalEvidence =
      combineUnique(

        qsmAnalysis
          .evidenceRequired,

        geminiAnalysis
          ?.success
          ? geminiAnalysis
              .evidenceSuggested
          : []

      );


    const summary =
      geminiAnalysis
        ?.success &&
      geminiAnalysis
        ?.summary

        ? geminiAnalysis
            .summary

        : qsmAnalysis
            .reason;


    /*
    |--------------------------------------------------------------------------
    | 4. QSM AI CORE
    |--------------------------------------------------------------------------
    */

    const coreAnalysis =
      buildAnalysis({

        module:
          MODULES.FRAUD,

        riskScore:
          finalRiskScore,

        riskLevel:
          finalRiskLevel,

        confidenceScore:
          qsmAnalysis
            .confidenceScore,

        reasons:
          finalReasons,

        recommendations: [

          "Agregar evidencia real del producto.",

          "Mantener toda la operación dentro de QSM.",

          finalDecision ===
            "MANUAL_REVIEW"
            ? "Solicitar revisión humana antes de continuar."
            : "Mantener las validaciones normales de QSM."

        ],

        evidenceRequired:
          finalEvidence,

        humanReviewRequired:
          [
            "HIGH",
            "CRITICAL"
          ].includes(
            finalRiskLevel
          ),

        source:
          geminiAnalysis
            ?.success
            ? "QSM_FRAUDSHIELD_GEMINI_V1"
            : "QSM_FRAUD_CONTROLLER_V1",

        metadata: {

          productId,

          previousRiskScore,

          previousRiskLevel,

          discrepancy,

          strongDisagreement,

          qsmRiskScore:
            qsmAnalysis
              .riskScore,

          semanticRiskScore,

          compositeRiskScore:
            finalRiskScore,

          decision:
            finalDecision,

          geminiUsed:
            geminiAnalysis
              ?.success === true,

          geminiFallback:
            geminiAnalysis
              ?.fallback === true

        }

      });


    /*
    |--------------------------------------------------------------------------
    | 5. CONSERVAR AI ANALYSIS EXISTENTE
    |--------------------------------------------------------------------------
    */

    const currentAiAnalysis =
      asObject(
        product.aiAnalysis
      );


    const fraudShieldRecord = {

      engine:
        "FRAUDSHIELD_AI",

      provider:
        geminiAnalysis
          ?.success
          ? "GEMINI"
          : "QSM_INTERNAL",

      model:
        geminiAnalysis
          ?.model ||
        null,

      previousRiskScore,

      previousRiskLevel,

      qsmRiskScore:
        qsmAnalysis
          .riskScore,

      semanticRiskScore,

      compositeRiskScore:
        finalRiskScore,

      riskLevel:
        finalRiskLevel,

      decision:
        finalDecision,

      summary,

      reasons:
        finalReasons,

      evidenceSuggested:
        finalEvidence,

      confidenceScore:
        qsmAnalysis
          .confidenceScore,

      humanReviewRequired:
        (
          [
            "HIGH",
            "CRITICAL"
          ].includes(
            finalRiskLevel
          ) ||
          finalDecision ===
            "MANUAL_REVIEW"
        ),

      geminiAvailable:
        geminiAnalysis
          ?.success === true,

      fallback:
        geminiAnalysis
          ?.fallback === true,

      analyzedAt:
        new Date()
          .toISOString(),

      version:
        "QSM-FRAUDSHIELD-1.0"

    };


    /*
    |--------------------------------------------------------------------------
    | 6. GUARDAR TODO EN UNA TRANSACCIÓN
    |--------------------------------------------------------------------------
    */

    const [
      alert
    ] =
      await prisma
        .$transaction([

          prisma
            .fraudAlert
            .create({

              data: {

                productId,

                type:
                  "PRODUCT_RISK",

                level:
                  finalRiskLevel,

                message:
                  summary

              },

              include: {

                product: {

                  include: {
                    seller:
                      true
                  }

                }

              }

            }),


          prisma
            .fraudExplanation
            .upsert({

              where: {
                productId
              },

              update: {

                reason:
                  summary,

                comment:
                  JSON.stringify({

                    provider:
                      fraudShieldRecord
                        .provider,

                    qsmRiskScore:
                      fraudShieldRecord
                        .qsmRiskScore,

                    semanticRiskScore:
                      fraudShieldRecord
                        .semanticRiskScore,

                    compositeRiskScore:
                      fraudShieldRecord
                        .compositeRiskScore,

                    riskLevel:
                      fraudShieldRecord
                        .riskLevel,

                    decision:
                      fraudShieldRecord
                        .decision,

                    reasons:
                      fraudShieldRecord
                        .reasons,

                    evidenceSuggested:
                      fraudShieldRecord
                        .evidenceSuggested

                  })

              },

              create: {

                productId,

                reason:
                  summary,

                comment:
                  JSON.stringify({

                    provider:
                      fraudShieldRecord
                        .provider,

                    qsmRiskScore:
                      fraudShieldRecord
                        .qsmRiskScore,

                    semanticRiskScore:
                      fraudShieldRecord
                        .semanticRiskScore,

                    compositeRiskScore:
                      fraudShieldRecord
                        .compositeRiskScore,

                    riskLevel:
                      fraudShieldRecord
                        .riskLevel,

                    decision:
                      fraudShieldRecord
                        .decision,

                    reasons:
                      fraudShieldRecord
                        .reasons,

                    evidenceSuggested:
                      fraudShieldRecord
                        .evidenceSuggested

                  })

              }

            }),


          prisma
            .product
            .update({

              where: {
                id:
                  productId
              },

              data: {

                riskLevel:
                  finalRiskLevel,

                riskLabel:
                  riskLevelSpanish[
                    finalRiskLevel
                  ] ||
                  finalRiskLevel,

                riskScore:
                  finalRiskScore,

                confidenceScore:
                  qsmAnalysis
                    .confidenceScore,

                evidenceRequired:
                  finalEvidence,

                aiAnalysis: {

                  ...currentAiAnalysis,

                  riskScore:
                    finalRiskScore,

                  fraudShield:
                    fraudShieldRecord

                }

              }

            })

        ]);


    /*
    |--------------------------------------------------------------------------
    | 7. NOTIFICACIÓN
    |--------------------------------------------------------------------------
    */

    if (
      [
        "HIGH",
        "CRITICAL"
      ].includes(
        finalRiskLevel
      )
    ) {

      await createNotification(

        product.sellerId,

        "SECURITY_ALERT",

        "Alerta antifraude en tu publicación",

        "FraudShield AI detectó señales de riesgo en tu producto. Revisa las evidencias solicitadas para aumentar la confianza de la publicación."

      );
    }


    /*
    |--------------------------------------------------------------------------
    | 8. RESPUESTA
    |--------------------------------------------------------------------------
    */

    return res
      .status(201)
      .json({

        message:
          "Análisis FraudShield AI completado correctamente",

        resultado: {

          motor:
            "FraudShield AI",

          proveedorIA:
            geminiAnalysis
              ?.success
              ? "Gemini"
              : "Motor interno QSM",

          modelo:
            geminiAnalysis
              ?.model ||
            null,

          nivelDeRiesgo:
            riskLevelSpanish[
              finalRiskLevel
            ] ||
            finalRiskLevel,

          codigoInternoRiesgo:
            finalRiskLevel,

          riesgoQsm:
            qsmAnalysis
              .riskScore,

          riesgoSemantico:
            semanticRiskScore,

          riesgoFinal:
            finalRiskScore,

          puntajeDeConfianza:
            qsmAnalysis
              .confidenceScore,

          decision:
            finalDecision,

          motivo:
            summary,

          razones:
            finalReasons,

          evidenciasRequeridas:
            finalEvidence,

          requiereRevisionHumana:
            [
              "HIGH",
              "CRITICAL"
            ].includes(
              finalRiskLevel
            ),

          geminiActivo:
            geminiAnalysis
              ?.success === true,

          fallbackInterno:
            geminiAnalysis
              ?.fallback === true

        },

        alerta:
          serializeAlert(
            alert
          ),

        fraudShield:
          fraudShieldRecord,

        qsmAiCore:
          coreAnalysis

      });


  } catch (error) {

    console.error(
      "Error generando análisis FraudShield:",
      error
    );


    return res
      .status(500)
      .json({

        message:
          "Error generando análisis FraudShield",

        error:
          error.message

      });
  }
}


/*
|--------------------------------------------------------------------------
| GET /api/fraud/alerts
|--------------------------------------------------------------------------
*/

async function getFraudAlerts(
  _req,
  res
) {

  try {

    const alerts =
      await prisma
        .fraudAlert
        .findMany({

          include: {

            product: {

              include: {

                seller: {

                  select: {

                    id:
                      true,

                    firstName:
                      true,

                    lastName:
                      true,

                    email:
                      true,

                    trustScore:
                      true,

                    isVerified:
                      true

                  }

                }

              }

            }

          },

          orderBy: {
            createdAt:
              "desc"
          }

        });


    return res.json({

      message:
        "Alertas antifraude obtenidas correctamente",

      alerts:
        alerts.map(
          serializeAlert
        )

    });


  } catch (error) {

    return res
      .status(500)
      .json({

        message:
          "Error obteniendo alertas antifraude",

        error:
          error.message

      });
  }
}


module.exports = {

  createFraudAlertForProduct,

  getFraudAlerts

};



/*
|--------------------------------------------------------------------------
| QSM_BLOQUE9_4_FRAUDSHIELD_HISTORY
|--------------------------------------------------------------------------
*/

const getFraudShieldHistory = async (req, res) => {
  try {

    const prisma =
      require("../utils/prisma");

    const alerts =
      await prisma.fraudAlert.findMany({
        include: {
          product: {
            select: {
              id: true,
              title: true,
              qsmCode: true,
              status: true,
              riskLevel: true,
              riskScore: true,

              seller: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  trustScore: true,
                  status: true
                }
              }
            }
          }
        },

        orderBy: {
          createdAt: "desc"
        },

        take: 500
      });


    const normalized =
      alerts.map((alert) => {

        const message =
          String(
            alert.message || ""
          );

        const conversationMatch =
          message.match(
            /Conversación interna:\s*([^\.]+)\./i
          );

        const senderMatch =
          message.match(
            /Usuario emisor interno:\s*([^\.]+)\./i
          );

        const scoreMatch =
          message.match(
            /Puntuación máxima:\s*(\d+)\/100/i
          );

        return {
          id:
            alert.id,

          productId:
            alert.productId,

          type:
            alert.type,

          level:
            String(
              alert.level || "LOW"
            ).toUpperCase(),

          message,

          createdAt:
            alert.createdAt,

          conversationId:
            conversationMatch
              ? conversationMatch[1]
              : null,

          senderId:
            senderMatch
              ? senderMatch[1]
              : null,

          score:
            scoreMatch
              ? Number(scoreMatch[1])
              : null,

          escalated:
            alert.type ===
            "MESSAGE_SECURITY_ESCALATED",

          humanManagementStatus:
            alert.status || "NEW",

          assignedToId:
            alert.assignedToId || null,

          assignedToName:
            alert.assignedToName || "",

          reviewedById:
            alert.reviewedById || null,

          reviewedByName:
            alert.reviewedByName || "",

          reviewNotes:
            alert.reviewNotes || "",

          resolution:
            alert.resolution || null,

          resolutionNote:
            alert.resolutionNote || "",

          reviewHistory:
            Array.isArray(alert.reviewHistory)
              ? alert.reviewHistory
              : [],

          reviewedAt:
            alert.reviewedAt || null,

          resolvedAt:
            alert.resolvedAt || null,

          dismissedAt:
            alert.dismissedAt || null,

          lastAction:
            alert.lastAction || "DETECTED",

          product:
            alert.product
              ? {
                  ...alert.product,
                  name:
                    alert.product.title
                }
              : null,

          seller:
            alert.product?.seller || null
        };
      });


    const summary = {

      total:
        normalized.length,

      critical:
        normalized.filter(
          (x) =>
            x.level === "CRITICAL"
        ).length,

      high:
        normalized.filter(
          (x) =>
            x.level === "HIGH"
        ).length,

      medium:
        normalized.filter(
          (x) =>
            x.level === "MEDIUM"
        ).length,

      low:
        normalized.filter(
          (x) =>
            x.level === "LOW"
        ).length,

      escalated:
        normalized.filter(
          (x) =>
            x.escalated
        ).length,

      messageSecurity:
        normalized.filter(
          (x) =>
            String(x.type)
              .startsWith(
                "MESSAGE_"
              )
        ).length
    };


    return res.json({
      success: true,
      summary,
      alerts: normalized
    });

  } catch (error) {

    console.error(
      "FraudShield history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No fue posible cargar el historial de FraudShield."
    });
  }
};

module.exports.getFraudShieldHistory =
  getFraudShieldHistory;


/*
|--------------------------------------------------------------------------
| QSM_BLOQUE9_5_FRAUD_HUMAN_CONTROLLER
|--------------------------------------------------------------------------
*/

const FRAUD_MANAGEMENT_ACTIONS =
  new Set([
    "TAKE_OWNERSHIP",
    "START_REVIEW",
    "ADD_NOTE",
    "RESOLVE",
    "DISMISS",
    "REOPEN"
  ]);


const FRAUD_RESOLUTIONS =
  new Set([
    "TRUE_POSITIVE",
    "FALSE_POSITIVE",
    "MITIGATED",
    "USER_WARNED",
    "NO_ACTION_REQUIRED"
  ]);


const getFraudInternalActor =
  async (req) => {

    const prisma =
      require("../utils/prisma");

    const requestUser =
      req?.prismaUser ||
      req?.user ||
      {};

    let actor = null;

    const numericId =
      Number(
        requestUser.id ||
        requestUser.userId ||
        0
      );

    if (
      Number.isInteger(
        numericId
      ) &&
      numericId > 0
    ) {

      actor =
        await prisma.user.findUnique({
          where: {
            id: numericId
          },

          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            accountType: true,
            department: true,
            employeeCode: true,
            status: true
          }
        });
    }


    if (
      !actor &&
      requestUser.email
    ) {

      actor =
        await prisma.user.findUnique({
          where: {
            email:
              String(
                requestUser.email
              )
          },

          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            accountType: true,
            department: true,
            employeeCode: true,
            status: true
          }
        });
    }


    if (!actor) {
      return null;
    }


    const role =
      String(
        actor.role ||
        ""
      ).toUpperCase();

    const accountType =
      String(
        actor.accountType ||
        ""
      ).toUpperCase();

    const department =
      String(
        actor.department ||
        ""
      ).toUpperCase();

    const internal =
      accountType !== "CUSTOMER" ||
      role !== "USER" ||
      (
        department &&
        department !== "CUSTOMER"
      ) ||
      Boolean(
        String(
          actor.employeeCode ||
          ""
        ).trim()
      );


    if (!internal) {
      return null;
    }


    return {
      ...actor,

      displayName:
        [
          actor.firstName,
          actor.lastName
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        actor.email ||
        "Personal QSM"
    };
  };




/*
|--------------------------------------------------------------------------
| QSM_BLOQUE9_5_1_FRAUD_AUDIT_HELPER
|--------------------------------------------------------------------------
*/

const createFraudManagementAudit =
  async ({
    req,
    actor,
    alertId,
    action,
    before,
    after,
    note = "",
    resolution = ""
  }) => {

    try {

      const prisma =
        require("../utils/prisma");

      const severity =
        action === "RESOLVE"
          ? "MEDIUM"
          : action === "DISMISS"
            ? "MEDIUM"
            : action === "REOPEN"
              ? "HIGH"
              : "LOW";


      await prisma.auditLog.create({
        data: {

          actorId:
            actor?.id ||
            null,

          actorName:
            actor?.displayName ||
            actor?.name ||
            actor?.email ||
            "Personal QSM",

          actorRole:
            String(
              actor?.role ||
              ""
            ),

          module:
            "FRAUDSHIELD",

          action:
            "FRAUD_ALERT_" +
            String(action),

          description:
            "Gestión humana de alerta FraudShield FA-" +
            String(alertId) +
            ".",

          entityType:
            "FRAUD_ALERT",

          entityId:
            String(alertId),

          method:
            String(
              req?.method ||
              "PATCH"
            ),

          endpoint:
            String(
              req?.originalUrl ||
              req?.url ||
              ""
            ),

          ipAddress:
            String(
              req?.headers?.[
                "x-forwarded-for"
              ] ||
              req?.ip ||
              req?.socket?.remoteAddress ||
              ""
            )
              .split(",")[0]
              .trim(),

          deviceInfo:
            String(
              req?.headers?.[
                "user-agent"
              ] ||
              ""
            )
              .slice(
                0,
                1000
              ),

          requestId:
            String(
              req?.headers?.[
                "x-request-id"
              ] ||
              ""
            ),

          severity,

          status:
            "SUCCESS",

          before:
            before ||
            undefined,

          after:
            after ||
            undefined,

          metadata: {
            fraudAlertId:
              alertId,

            action:
              String(action),

            note:
              String(
                note ||
                ""
              ),

            resolution:
              String(
                resolution ||
                ""
              )
          },

          reviewStatus:
            "NOT_REQUIRED"
        }
      });


      return true;

    } catch (error) {

      console.error(
        "No se pudo registrar auditoría FraudShield:",
        error.message
      );

      return false;
    }
  };





/*
|--------------------------------------------------------------------------
| QSM_BLOQUE9_5_1_MANAGE_ALERT
|--------------------------------------------------------------------------
*/

const FRAUD_ACTIONS =
  new Set([
    "TAKE_OWNERSHIP",
    "START_REVIEW",
    "ADD_NOTE",
    "ESCALATE",
    "RESOLVE",
    "DISMISS",
    "REOPEN"
  ]);


const resolveFraudActor =
  async (req) => {

    const prisma =
      require("../utils/prisma");


    const requestUser =
      req?.prismaUser ||
      req?.user ||
      {};


    const candidateId =
      Number(
        requestUser.id ||
        requestUser.userId ||
        requestUser.sub ||
        0
      );


    let actor = null;


    if (
      Number.isInteger(
        candidateId
      ) &&
      candidateId > 0
    ) {

      actor =
        await prisma.user.findUnique({
          where: {
            id:
              candidateId
          },

          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            accountType: true,
            department: true,
            employeeCode: true
          }
        });
    }


    if (
      !actor &&
      requestUser.email
    ) {

      actor =
        await prisma.user.findUnique({
          where: {
            email:
              String(
                requestUser.email
              )
          },

          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            accountType: true,
            department: true,
            employeeCode: true
          }
        });
    }


    if (!actor) {
      return null;
    }


    const role =
      String(
        actor.role ||
        ""
      ).toUpperCase();


    const department =
      String(
        actor.department ||
        ""
      ).toUpperCase();


    const allowed =
      [
        "SUPER_ADMIN",
        "SENIOR_ADMIN",
        "ADMIN",
        "SECURITY_MANAGER",
        "SECURITY_ANALYST",
        "AUDITOR"
      ].includes(role) ||
      department ===
        "SECURITY";


    if (!allowed) {
      return null;
    }


    return {
      ...actor,

      displayName:
        [
          actor.firstName,
          actor.lastName
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        actor.email ||
        "Personal QSM"
    };
  };


const manageFraudAlert =
  async (
    req,
    res
  ) => {

    const prisma =
      require("../utils/prisma");


    try {

      const alertId =
        Number(
          req.params.alertId
        );


      if (
        !Number.isInteger(
          alertId
        ) ||
        alertId <= 0
      ) {

        return res
          .status(400)
          .json({
            success: false,
            message:
              "El identificador de la alerta no es válido."
          });
      }


      const actor =
        await resolveFraudActor(
          req
        );


      if (!actor) {

        return res
          .status(403)
          .json({
            success: false,
            message:
              "No tienes permisos para gestionar alertas FraudShield."
          });
      }


      const action =
        String(
          req.body?.action ||
          ""
        )
          .trim()
          .toUpperCase();


      const note =
        String(
          req.body?.note ||
          ""
        )
          .trim()
          .slice(
            0,
            2000
          );


      const resolution =
        String(
          req.body?.resolution ||
          ""
        )
          .trim()
          .toUpperCase();


      if (
        !FRAUD_ACTIONS.has(
          action
        )
      ) {

        return res
          .status(400)
          .json({
            success: false,
            message:
              "La acción seleccionada no es válida."
          });
      }


      if (
        [
          "ADD_NOTE",
          "ESCALATE",
          "RESOLVE",
          "DISMISS"
        ].includes(
          action
        ) &&
        note.length < 5
      ) {

        return res
          .status(400)
          .json({
            success: false,
            message:
              "Debes escribir una nota de al menos 5 caracteres."
          });
      }


      if (
        action ===
          "RESOLVE" &&
        !FRAUD_RESOLUTIONS.has(
          resolution
        )
      ) {

        return res
          .status(400)
          .json({
            success: false,
            message:
              "Debes seleccionar una resolución válida."
          });
      }


      const current =
        await prisma.fraudAlert.findUnique({
          where: {
            id:
              alertId
          }
        });


      if (!current) {

        return res
          .status(404)
          .json({
            success: false,
            message:
              "Alerta FraudShield no encontrada."
          });
      }


      const now =
        new Date();


      const oldHistory =
        Array.isArray(
          current.reviewHistory
        )
          ? current.reviewHistory
          : [];


      const event = {

        action,

        actorId:
          actor.id,

        actor:
          actor.displayName,

        actorRole:
          actor.role,

        note:
          note ||
          "",

        resolution:
          resolution ||
          null,

        previousStatus:
          current.status,

        timestamp:
          now.toISOString()
      };


      const data = {

        reviewedById:
          actor.id,

        reviewedByName:
          actor.displayName,

        reviewedAt:
          current.reviewedAt ||
          now,

        lastAction:
          action,

        reviewHistory: [
          ...oldHistory,
          event
        ]
      };


      if (
        action ===
        "TAKE_OWNERSHIP"
      ) {

        data.status =
          "IN_REVIEW";

        data.assignedToId =
          actor.id;

        data.assignedToName =
          actor.displayName;
      }


      if (
        action ===
        "START_REVIEW"
      ) {

        data.status =
          "IN_REVIEW";

        if (
          !current.assignedToId
        ) {

          data.assignedToId =
            actor.id;

          data.assignedToName =
            actor.displayName;
        }
      }


      if (
        action ===
        "ADD_NOTE"
      ) {

        data.status =
          current.status ===
            "NEW"
            ? "IN_REVIEW"
            : current.status;

        data.reviewNotes =
          [
            current.reviewNotes,
            note
          ]
            .filter(Boolean)
            .join(
              "\n"
            );
      }


      if (
        action ===
        "ESCALATE"
      ) {

        data.status =
          "ESCALATED";

        data.reviewNotes =
          [
            current.reviewNotes,
            note
          ]
            .filter(Boolean)
            .join(
              "\n"
            );
      }


      if (
        action ===
        "RESOLVE"
      ) {

        data.status =
          "RESOLVED";

        data.resolution =
          resolution;

        data.resolutionNote =
          note;

        data.resolvedAt =
          now;

        data.dismissedAt =
          null;
      }


      if (
        action ===
        "DISMISS"
      ) {

        data.status =
          "DISMISSED";

        data.resolution =
          "FALSE_POSITIVE";

        data.resolutionNote =
          note;

        data.dismissedAt =
          now;

        data.resolvedAt =
          null;
      }


      if (
        action ===
        "REOPEN"
      ) {

        data.status =
          "IN_REVIEW";

        data.resolution =
          null;

        data.resolutionNote =
          "";

        data.resolvedAt =
          null;

        data.dismissedAt =
          null;

        data.assignedToId =
          actor.id;

        data.assignedToName =
          actor.displayName;
      }


      const updated =
        await prisma.fraudAlert.update({
          where: {
            id:
              alertId
          },

          data,

          include: {
            product: {
              include: {
                seller: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    trustScore: true
                  }
                }
              }
            }
          }
        });


      await createFraudManagementAudit({
        req,
        actor,
        alertId,
        action,
        before:
          current,
        after:
          updated,
        note,
        resolution
      });

      /*
      |--------------------------------------------------------------------
      | QSM_BLOQUE9_6_HUMAN_ACTION_NOTIFY
      |--------------------------------------------------------------------
      */

      const notificationTarget =
        updated.assignedToId ||
        actor.id;

      await notifyFraudAssignee({
        userId:
          notificationTarget,

        alertId,

        action,

        actorName:
          actor.displayName
      });


      if (
        [
          "ESCALATE",
          "REOPEN"
        ].includes(
          action
        )
      ) {

        await notifySecurityTeam({
          alertId,

          riskLevel:
            updated.level ||
            "HIGH",

          productTitle:
            updated.product?.title ||
            "",

          message:
            note ||
            updated.message ||
            "",

          force:
            true
        });
      }


      return res.json({
        success: true,

        message:
          action === "TAKE_OWNERSHIP"
            ? "Caso asignado correctamente."
            : action === "START_REVIEW"
              ? "Revisión iniciada."
              : action === "ADD_NOTE"
                ? "Nota interna guardada."
                : action === "ESCALATE"
                  ? "Alerta escalada correctamente al equipo de Seguridad."
                  : action === "RESOLVE"
                    ? "Alerta resuelta correctamente."
                    : action === "DISMISS"
                      ? "Alerta descartada como falso positivo."
                      : action === "REOPEN"
                        ? "Alerta reabierta correctamente."
                        : "Alerta actualizada.",

        alert:
          updated
      });


    } catch (error) {

      console.error(
        "Error gestionando alerta FraudShield:",
        error
      );


      return res
        .status(500)
        .json({
          success: false,
          message:
            "No fue posible gestionar la alerta FraudShield."
        });
    }
  };


module.exports.manageFraudAlert =
  manageFraudAlert;

/* QSM_BLOQUE9_8_CONTROLLER_TEXT_POLISH */
