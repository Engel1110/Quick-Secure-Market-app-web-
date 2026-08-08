"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA SMART FALLBACK
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE I
|
| Última capa contextual antes del motor general.
|
| Prioridades:
|
| 1. Dato que LUNA estaba esperando.
| 2. Resultado actualmente seleccionado.
| 3. Búsqueda Marketplace actual.
| 4. Tema de cuenta/compras/ventas/disputas.
| 5. Intención semántica aproximada.
| 6. Aclaración natural corta.
|
|--------------------------------------------------------------------------
*/

const {
  buildUnknown
} = require(
  "./luna-natural-response.service"
);

const VERSION =
  "LUNA-SMART-FALLBACK-17.5-I";


function normalizeText(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
}


/* ========================================================================
   WAITING FOR
======================================================================== */

function buildWaitingAnswer({
  waitingFor,
  product
}) {

  switch (waitingFor) {

    case "product":

      return (
        "Dime qué producto quieres buscar y seguimos desde ahí."
      );


    case "budget":

      return product
        ? `Seguimos buscando ${product}. Solo me falta saber aproximadamente cuánto quieres gastar.`
        : "Solo me falta saber aproximadamente cuánto quieres gastar.";


    case "useCase":

      return product
        ? `Seguimos con ${product}. ¿La necesitas para estudiar, oficina, programar, diseño o juegos?`
        : "¿Para qué la necesitas principalmente?";


    case "ram":

      return (
        "Solo me falta la RAM que prefieres. Puedes decirme, por ejemplo, 8, 16 o 32 GB."
      );


    case "storage":

      return (
        "Solo me falta el almacenamiento. Por ejemplo: 256 GB, 512 GB o 1 TB."
      );


    case "condition":

      return (
        "Solo me falta saber la condición: nueva, usada o si te da igual."
      );


    default:

      return null;
  }
}


/* ========================================================================
   RESULTADO SELECCIONADO
======================================================================== */

function getCurrentResult(
  state
) {

  const results =
    Array.isArray(
      state?.results
    )
      ? state.results
      : [];

  if (!results.length) {
    return null;
  }

  let index =
    Number(
      state
        ?.selectedResultIndex ||
      0
    );

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= results.length
  ) {
    index = 0;
  }

  return {
    result:
      results[index],

    index,

    total:
      results.length
  };
}


function buildResultContext(
  state
) {

  const current =
    getCurrentResult(
      state
    );

  if (
    !current?.result
  ) {
    return null;
  }

  const option =
    current.result;

  return (
    `Seguimos hablando de "${option.title}". ` +
    "Puedo decirte su precio, condición, verificación, por qué apareció o compararla con las demás opciones."
  );
}


/* ========================================================================
   MARKETPLACE
======================================================================== */

function buildMarketplaceContext(
  state
) {

  const product =
    state
      ?.product
      ?.query ||
    null;

  const preferences =
    state
      ?.preferences ||
    {};

  if (!product) {

    return (
      "Seguimos en el Marketplace. Dime qué producto quieres buscar."
    );
  }


  const details = [];

  if (
    Number.isFinite(
      Number(
        preferences.budgetMax
      )
    ) &&
    Number(
      preferences.budgetMax
    ) > 0
  ) {

    details.push(
      `presupuesto de RD$${Number(
        preferences.budgetMax
      ).toLocaleString(
        "en-US"
      )}`
    );
  }


  if (
    preferences.useCase
  ) {

    const uses = {

      GAMING:
        "juegos",

      PROGRAMMING:
        "programación",

      STUDY:
        "estudio",

      OFFICE:
        "oficina",

      DESIGN:
        "diseño",

      PHOTOGRAPHY:
        "fotografía/video"

    };

    details.push(
      `uso para ${
        uses[
          preferences.useCase
        ] ||
        preferences.useCase
      }`
    );
  }


  if (
    Number.isFinite(
      Number(
        preferences.ramGb
      )
    )
  ) {

    details.push(
      `${preferences.ramGb} GB de RAM`
    );
  }


  if (
    Number.isFinite(
      Number(
        preferences.storageGb
      )
    )
  ) {

    details.push(
      `${preferences.storageGb} GB de almacenamiento`
    );
  }


  if (
    preferences.condition
  ) {

    details.push(
      `condición ${preferences.condition}`
    );
  }


  if (!details.length) {

    return (
      `Seguimos buscando ${product}. Puedes decirme qué quieres cambiar, comparar o revisar.`
    );
  }


  return (
    `Sigo teniendo presente tu búsqueda de ${product} con ${details.join(
      ", "
    )}. ¿Qué quieres cambiar o revisar?`
  );
}


/* ========================================================================
   OTROS TOPICS
======================================================================== */

function buildTopicContext(
  state
) {

  switch (
    state?.topic
  ) {

    case "COMMERCE":

      return (
        "Seguimos hablando de tu actividad en QSM. ¿Quieres revisar tus compras o tus ventas?"
      );


    case "DISPUTES":

      return (
        "Seguimos hablando de tus disputas. Puedo revisar si tienes casos abiertos o una orden relacionada."
      );


    case "ACCOUNT":

      return (
        "Seguimos hablando de tu cuenta. Puedo revisar confianza, verificación o seguridad."
      );


    default:

      return null;
  }
}


/* ========================================================================
   SEMANTIC INTENT
======================================================================== */

const SEMANTIC_LABELS =
  Object.freeze({

    PURCHASES:
      "tus compras",

    SALES:
      "tus ventas",

    DISPUTES:
      "tus disputas",

    TRUST:
      "tu confianza QSM",

    VERIFICATION:
      "tu verificación",

    SECURITY:
      "seguridad",

    MESSAGES:
      "tus mensajes",

    MARKETPLACE_SEARCH:
      "una búsqueda en el Marketplace"

  });


function buildSemanticContext(
  semantic
) {

  const code =
    semantic
      ?.intent
      ?.code ||
    null;

  const confidence =
    Number(
      semantic
        ?.confidence ||
      semantic
        ?.intent
        ?.confidence ||
      0
    );

  const label =
    SEMANTIC_LABELS[
      code
    ] ||
    null;


  if (
    !label ||
    confidence < 0.30
  ) {
    return null;
  }


  if (
    confidence >= 0.70
  ) {

    return (
      `Entendí que estás hablando de ${label}. ¿Qué quieres revisar exactamente?`
    );
  }


  return (
    `Creo que esto puede estar relacionado con ${label}. Si es así, dime qué quieres revisar y seguimos por ahí.`
  );
}


/* ========================================================================
   PRINCIPAL
======================================================================== */

function buildSmartFallback({
  message,
  semantic,
  state
} = {}) {

  /*
  |--------------------------------------------------------------------------
  | 1. WAITING FOR
  |--------------------------------------------------------------------------
  */

  const waiting =
    buildWaitingAnswer({

      waitingFor:
        state
          ?.waitingFor ||
        null,

      product:
        state
          ?.product
          ?.query ||
        null

    });


  if (waiting) {

    return {

      handled:
        true,

      code:
        "WAITING_CONTEXT",

      answer:
        waiting
    };
  }


  /*
  |--------------------------------------------------------------------------
  | 2. RESULTADO SELECCIONADO
  |--------------------------------------------------------------------------
  */

  if (
    state?.topic ===
      "MARKETPLACE"
  ) {

    const resultContext =
      buildResultContext(
        state
      );


    if (resultContext) {

      return {

        handled:
          true,

        code:
          "RESULT_CONTEXT",

        answer:
          resultContext
      };
    }
  }


  /*
  |--------------------------------------------------------------------------
  | 3. MARKETPLACE ACTUAL
  |--------------------------------------------------------------------------
  */

  if (
    state?.topic ===
      "MARKETPLACE"
  ) {

    return {

      handled:
        true,

      code:
        "MARKETPLACE_CONTEXT",

      answer:
        buildMarketplaceContext(
          state
        )
    };
  }


  /*
  |--------------------------------------------------------------------------
  | 4. OTROS TOPICS
  |--------------------------------------------------------------------------
  */

  const topicContext =
    buildTopicContext(
      state
    );


  if (topicContext) {

    return {

      handled:
        true,

      code:
        "TOPIC_CONTEXT",

      answer:
        topicContext
    };
  }


  /*
  |--------------------------------------------------------------------------
  | 5. SEMANTIC CORE
  |--------------------------------------------------------------------------
  */

  const semanticContext =
    buildSemanticContext(
      semantic
    );


  if (semanticContext) {

    return {

      handled:
        true,

      code:
        "SEMANTIC_CONTEXT",

      answer:
        semanticContext
    };
  }


  /*
  |--------------------------------------------------------------------------
  | 6. FALLBACK FINAL NATURAL
  |--------------------------------------------------------------------------
  */

  return {

    handled:
      true,

    code:
      "CLARIFICATION",

    answer:
      buildUnknown({

        message:
          normalizeText(
            message
          ),

        topic:
          state
            ?.topic ||
          null,

        product:
          state
            ?.product
            ?.query ||
          null

      })
  };
}


module.exports = {

  VERSION,

  buildWaitingAnswer,

  getCurrentResult,
  buildResultContext,

  buildMarketplaceContext,
  buildTopicContext,
  buildSemanticContext,

  buildSmartFallback
};
