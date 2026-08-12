"use strict";

/*
|--------------------------------------------------------------------------
| QSM - FRAUDSHIELD AI / GEMINI SERVICE
|--------------------------------------------------------------------------
|
| FraudShield AI pertenece a QSM.
|
| Gemini funciona como capa semántica externa.
|
| IMPORTANTE:
| - Gemini no bloquea usuarios.
| - Gemini no cancela operaciones.
| - Gemini no sustituye las reglas determinísticas QSM.
| - Gemini genera interpretación y explicación adicional.
|--------------------------------------------------------------------------
*/

const {
  getLunaProviderConfig
} = require(
  "../config/luna-provider.config"
);


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


function normalizeRiskLevel(
  value
) {

  const normalized =
    String(
      value || ""
    )
      .trim()
      .toUpperCase();


  if (
    [
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL"
    ].includes(
      normalized
    )
  ) {
    return normalized;
  }


  return "MEDIUM";
}


function normalizeAction(
  value
) {

  const normalized =
    String(
      value || ""
    )
      .trim()
      .toUpperCase();


  if (
    [
      "ALLOW",
      "WARN",
      "MANUAL_REVIEW"
    ].includes(
      normalized
    )
  ) {
    return normalized;
  }


  return "MANUAL_REVIEW";
}


function asArray(value) {

  return Array.isArray(value)
    ? value
    : [];
}


async function getGeminiClient() {

  const {
    GoogleGenAI
  } =
    await import(
      "@google/genai"
    );


  const apiKey =
    String(
      process.env
        .GEMINI_API_KEY ||
      ""
    ).trim();


  if (!apiKey) {

    throw new Error(
      "GEMINI_API_KEY_MISSING"
    );
  }


  return new GoogleGenAI({
    apiKey
  });
}


function buildFraudShieldSchema() {

  return {

    type:
      "object",

    properties: {

      riskLevel: {

        type:
          "string",

        enum: [
          "LOW",
          "MEDIUM",
          "HIGH",
          "CRITICAL"
        ]

      },

      semanticRiskScore: {

        type:
          "integer",

        minimum:
          0,

        maximum:
          100

      },

      summary: {

        type:
          "string"

      },

      reasons: {

        type:
          "array",

        items: {
          type:
            "string"
        }

      },

      recommendedAction: {

        type:
          "string",

        enum: [
          "ALLOW",
          "WARN",
          "MANUAL_REVIEW"
        ]

      },

      evidenceSuggested: {

        type:
          "array",

        items: {
          type:
            "string"
        }

      }

    },

    required: [
      "riskLevel",
      "semanticRiskScore",
      "summary",
      "reasons",
      "recommendedAction",
      "evidenceSuggested"
    ],

    additionalProperties:
      false

  };
}


function sanitizeProductContext({
  product = {},
  seller = {},
  qsmAnalysis = {}
} = {}) {

  return {

    product: {

      title:
        String(
          product.title || ""
        ).slice(0, 160),

      category:
        String(
          product.category || ""
        ).slice(0, 100),

      condition:
        String(
          product.condition || ""
        ).slice(0, 80),

      quality:
        String(
          product.quality || ""
        ).slice(0, 80),

      price:
        Number(
          product.price || 0
        ),

      description:
        String(
          product.description || ""
        ).slice(0, 3000),

      imageCount:
        Array.isArray(
          product.images
        )
          ? product.images.length
          : 0,

      evidenceCount:
        Array.isArray(
          product.evidenceRequired
        )
          ? product
              .evidenceRequired
              .length
          : 0

    },


    seller: {

      verified:
        seller.isVerified === true,

      trustScore:
        clampScore(
          seller.trustScore ?? 50
        ),

      completedSales:
        Number(
          seller.completedSales || 0
        ),

      disputesOpened:
        Number(
          seller.disputesOpened || 0
        ),

      fraudReports:
        Number(
          seller.fraudReports || 0
        )

    },


    qsmAnalysis: {

      riskLevel:
        normalizeRiskLevel(
          qsmAnalysis.riskLevel
        ),

      riskScore:
        clampScore(
          qsmAnalysis.riskScore
        ),

      confidenceScore:
        clampScore(
          qsmAnalysis
            .confidenceScore
        ),

      reasons:
        asArray(
          qsmAnalysis.reasons
        )
        .slice(0, 15),

      evidenceRequired:
        asArray(
          qsmAnalysis
            .evidenceRequired
        )
        .slice(0, 15)

    }

  };
}


function calculateCompositeRisk({
  qsmRiskScore,
  semanticRiskScore
}) {

  /*
  |--------------------------------------------------------------------------
  | QSM mantiene mayor peso
  |--------------------------------------------------------------------------
  |
  | 70% reglas determinísticas
  | 30% análisis semántico Gemini
  |
  |--------------------------------------------------------------------------
  */

  return clampScore(

    clampScore(
      qsmRiskScore
    ) * 0.70 +

    clampScore(
      semanticRiskScore
    ) * 0.30

  );
}


function getCompositeRiskLevel(
  score
) {

  const value =
    clampScore(score);


  if (value >= 80) {
    return "CRITICAL";
  }

  if (value >= 60) {
    return "HIGH";
  }

  if (value >= 35) {
    return "MEDIUM";
  }

  return "LOW";
}


function getCompositeDecision(
  score
) {

  const value =
    clampScore(score);


  if (value >= 60) {
    return "MANUAL_REVIEW";
  }

  if (value >= 35) {
    return "WARN";
  }

  return "ALLOW";
}


async function analyzeProductWithGemini({
  product,
  seller,
  qsmAnalysis
} = {}) {

  const config =
    getLunaProviderConfig();


  if (
    !config
      .gemini
      ?.enabled
  ) {

    return {

      success:
        false,

      provider:
        "INTERNAL",

      fallback:
        true,

      reason:
        "GEMINI_DISABLED"

    };
  }


  if (
    !config
      .gemini
      ?.hasApiKey
  ) {

    return {

      success:
        false,

      provider:
        "INTERNAL",

      fallback:
        true,

      reason:
        "GEMINI_API_KEY_MISSING"

    };
  }


  const ai =
    await getGeminiClient();


  const safeContext =
    sanitizeProductContext({
      product,
      seller,
      qsmAnalysis
    });


  const schema =
    buildFraudShieldSchema();


  const prompt =
`
Eres la capa semántica de FraudShield AI,
el sistema preventivo antifraude de
Quick Secure Market (QSM).

QSM ya ejecutó un análisis determinístico.

Tu tarea NO es sustituirlo.

Debes interpretar las señales disponibles
y producir una explicación complementaria.

REGLAS:

- No declares que una persona cometió fraude.
- No llames "estafador" al vendedor.
- No asegures que ocurrirá una estafa.
- Habla de señales, riesgo y necesidad de revisión.
- No bloquees cuentas.
- No canceles productos.
- No canceles operaciones.
- No inventes precios de mercado.
- No inventes identidad ni historial.
- Usa exclusivamente los datos suministrados.
- Si faltan datos, dilo mediante razones prudentes.
- Las decisiones finales pertenecen a QSM.

CONTEXTO:

${JSON.stringify(
  safeContext,
  null,
  2
)}
`.trim();


  try {

    const response =
      await ai
        .models
        .generateContent({

          model:
            config
              .gemini
              .model ||
            "gemini-3.5-flash-lite",

          contents:
            prompt,

          config: {

            responseMimeType:
              "application/json",

            responseJsonSchema:
              schema,

            temperature:
              0.2

          }

        });


    const parsed =
      JSON.parse(
        String(
          response?.text ||
          "{}"
        )
      );


    const semanticRiskScore =
      clampScore(
        parsed
          .semanticRiskScore
      );


    const qsmRiskScore =
      clampScore(
        qsmAnalysis
          ?.riskScore
      );


    const compositeRiskScore =
      calculateCompositeRisk({

        qsmRiskScore,

        semanticRiskScore

      });


    const compositeRiskLevel =
      getCompositeRiskLevel(
        compositeRiskScore
      );


    const compositeDecision =
      getCompositeDecision(
        compositeRiskScore
      );


    return {

      success:
        true,

      provider:
        "GEMINI",

      model:
        config
          .gemini
          .model,

      qsmRiskScore,

      semanticRiskScore,

      compositeRiskScore,

      riskLevel:
        normalizeRiskLevel(
          parsed.riskLevel
        ),

      compositeRiskLevel,

      summary:
        String(
          parsed.summary || ""
        ).trim(),

      reasons:
        asArray(
          parsed.reasons
        )
        .map(String)
        .slice(0, 10),

      recommendedAction:
        normalizeAction(
          parsed
            .recommendedAction
        ),

      compositeDecision,

      evidenceSuggested:
        asArray(
          parsed
            .evidenceSuggested
        )
        .map(String)
        .slice(0, 10),

      analyzedAt:
        new Date()
          .toISOString(),

      version:
        "QSM-FRAUDSHIELD-GEMINI-1.0"

    };


  } catch (error) {

    return {

      success:
        false,

      provider:
        "INTERNAL",

      fallback:
        true,

      reason:
        "GEMINI_ANALYSIS_FAILED",

      error:
        String(
          error?.message ||
          error
        ).slice(0, 500)

    };
  }
}


module.exports = {

  analyzeProductWithGemini,

  calculateCompositeRisk,

  getCompositeRiskLevel,

  getCompositeDecision,

  sanitizeProductContext

};
