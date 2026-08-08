"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA CONVERSATION STATE MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE A
|
| MEMORIA ACUMULATIVA REAL
|
| Regla principal:
|
| producto + presupuesto + uso + RAM + almacenamiento
|
| se ACUMULAN.
|
| Un mensaje nuevo no destruye información anterior
| salvo cambio explícito de búsqueda.
|--------------------------------------------------------------------------
*/

const {
  normalizeConversationalInput
} = require(
  "../services/luna-language-normalizer.service"
);

const {
  getConversationState,
  updateConversationState,
  resetConversationTopic
} = require(
  "../services/luna-conversation-state.service"
);


/* ========================================================================
   IDENTIDAD
======================================================================== */

function getUserId(req) {

  const values = [
    req?.prismaUser?.id,
    req?.user?.id,
    req?.user?.userId,
    req?.auth?.userId
  ];

  for (
    const value of values
  ) {

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {

      return String(
        value
      );
    }
  }

  return null;
}


function getSessionId(req) {

  return String(
    req?.body?.sessionId ||
    req?.body?.context
      ?.memory
      ?.sessionId ||
    ""
  ).trim() || null;
}


/* ========================================================================
   NORMALIZAR TEXTO
======================================================================== */

function normalizeText(value) {

  return String(
    value || ""
  )
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
   NÚMEROS / DINERO
======================================================================== */

function parseCompactNumber(raw) {

  const text =
    normalizeText(raw)
      .replace(
        /,/g,
        ""
      );

  const match =
    text.match(
      /(\d+(?:\.\d+)?)\s*(mil|k)?/
    );

  if (!match) {
    return null;
  }

  let amount =
    Number(
      match[1]
    );

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return null;
  }

  if (
    match[2] === "mil" ||
    match[2] === "k"
  ) {

    amount *=
      1000;
  }

  return Math.round(
    amount
  );
}


/* ========================================================================
   PRESUPUESTO
======================================================================== */

function extractBudget({
  message,
  state
}) {

  const text =
    normalizeText(
      message
    );

  /*
    Casos explícitos.
  */

  const patterns = [

    /(?:presupuesto|puedo gastar|puedo pagar|hasta|maximo|tope|tengo)\s*(?:de|es|son)?\s*(?:rd\$|\$)?\s*(\d+(?:[.,]\d+)?)\s*(mil|k)?/i,

    /(?:rd\$|\$)\s*(\d+(?:[.,]\d+)?)\s*(mil|k)?/i,

    /(?:menos de|hasta)\s*(\d+(?:[.,]\d+)?)\s*(mil|k)?/i

  ];

  for (
    const pattern of patterns
  ) {

    const match =
      text.match(
        pattern
      );

    if (match) {

      return parseCompactNumber(
        `${match[1]} ${
          match[2] || ""
        }`
      );
    }
  }

  /*
    CASO CLAVE:

    LUNA preguntó presupuesto
    y usuario responde solamente:

    30 mil
    35000
    25k
  */

  if (
    state?.waitingFor ===
      "budget" ||
    state?.topic ===
      "MARKETPLACE"
  ) {

    if (
      /^(\d+(?:[.,]\d+)?)\s*(mil|k|pesos?)?$/.test(
        text
      )
    ) {

      const candidate =
        parseCompactNumber(
          text
        );

      /*
        Evitar interpretar:

        16

        como RD$16 cuando posiblemente
        sea RAM.
      */

      if (
        Number.isFinite(
          candidate
        ) &&
        candidate >=
          1000
      ) {

        return candidate;
      }
    }
  }

  return null;
}


/* ========================================================================
   RAM
======================================================================== */

function extractRam({
  message,
  state
}) {

  const text =
    normalizeText(
      message
    );

  let match =
    text.match(
      /(\d+)\s*(?:gb|g)?\s*(?:de\s*)?ram\b/i
    );

  if (!match) {

    match =
      text.match(
        /\bram\s*(?:de\s*)?(\d+)\s*(?:gb|g)?/i
      );
  }

  /*
    Si LUNA está esperando RAM,
    aceptar simplemente:

    16
    16 gb
    32
  */

  if (
    !match &&
    state?.waitingFor ===
      "ram"
  ) {

    match =
      text.match(
        /^(\d+)\s*(?:gb|g)?$/
      );
  }

  if (!match) {
    return null;
  }

  const value =
    Number(
      match[1]
    );

  if (
    ![
      2,
      4,
      6,
      8,
      12,
      16,
      24,
      32,
      48,
      64,
      96,
      128
    ].includes(
      value
    )
  ) {

    return null;
  }

  return value;
}


/* ========================================================================
   STORAGE
======================================================================== */

function extractStorage({
  message,
  state
}) {

  const text =
    normalizeText(
      message
    );

  /*
    Si contiene RAM, NO convertirlo
    en almacenamiento.
  */

  if (
    /\bram\b/i.test(
      text
    )
  ) {

    return null;
  }

  let match =
    text.match(
      /(\d+)\s*tb\b/i
    );

  if (match) {

    return Number(
      match[1]
    ) * 1024;
  }

  match =
    text.match(
      /(\d+)\s*(?:gb|g)\b/i
    );

  if (
    !match &&
    state?.waitingFor ===
      "storage"
  ) {

    match =
      text.match(
        /^(\d+)\s*(?:gb|g)?$/
      );
  }

  if (!match) {
    return null;
  }

  const value =
    Number(
      match[1]
    );

  /*
    Valores típicos de almacenamiento.
  */

  if (
    value < 32
  ) {

    return null;
  }

  return value;
}


/* ========================================================================
   CASO DE USO
======================================================================== */

function extractUseCase(
  message
) {

  const text =
    normalizeText(
      message
    );

  const groups = [

    {
      value:
        "PROGRAMMING",

      words: [
        "programar",
        "programacion",
        "programando",
        "desarrollo",
        "desarrollar",
        "coding",
        "developer",
        "software"
      ]
    },

    {
      value:
        "GAMING",

      words: [
        "juego",
        "juegos",
        "jugar",
        "gaming",
        "gamer"
      ]
    },

    {
      value:
        "STUDY",

      words: [
        "estudiar",
        "estudio",
        "universidad",
        "colegio",
        "clases"
      ]
    },

    {
      value:
        "OFFICE",

      words: [
        "oficina",
        "office",
        "excel",
        "word",
        "trabajo administrativo"
      ]
    },

    {
      value:
        "DESIGN",

      words: [
        "diseno",
        "diseñar",
        "editar",
        "edicion",
        "photoshop",
        "adobe",
        "video"
      ]
    },

    {
      value:
        "PHOTOGRAPHY",

      words: [
        "fotografia",
        "fotos",
        "camara",
        "grabar"
      ]
    }

  ];

  for (
    const group
    of groups
  ) {

    if (
      group.words.some(
        word =>
          text.includes(
            word
          )
      )
    ) {

      return group.value;
    }
  }

  return null;
}


/* ========================================================================
   CONDICIÓN
======================================================================== */

function extractCondition(
  message
) {

  const text =
    normalizeText(
      message
    );

  if (
    /\b(nuevo|nueva|sellado|sellada)\b/.test(
      text
    )
  ) {

    return "NEW";
  }

  if (
    /\b(usado|usada|segunda mano)\b/.test(
      text
    )
  ) {

    return "USED";
  }

  if (
    text.includes(
      "como nuevo"
    )
  ) {

    return "LIKE_NEW";
  }

  return null;
}


/* ========================================================================
   PRODUCTO
======================================================================== */

function extractProductQuery({
  interpretedMessage,
  semanticIntent,
  previousState
}) {

  /*
    Solo capturar un nuevo producto cuando
    realmente hay búsqueda Marketplace.
  */

  if (
    semanticIntent !==
      "MARKETPLACE_SEARCH"
  ) {

    return null;
  }

  let text =
    normalizeText(
      interpretedMessage
    );

  /*
    Expresiones que NO son nombres de producto.
  */

  const invalid = [
    "buscar otra cosa",
    "otra cosa",
    "quiero otra cosa",
    "cambiar de tema"
  ];

  if (
    invalid.some(
      phrase =>
        text.includes(
          phrase
        )
    )
  ) {

    return null;
  }

  const prefixes = [
    /^luna\s+/,
    /^quiero comprar\s+/,
    /^quiero\s+/,
    /^busco\s+/,
    /^necesito\s+/,
    /^estoy buscando\s+/,
    /^tienen\s+/,
    /^hay\s+/,
    /^buscame\s+/,
    /^muestrame\s+/
  ];

  for (
    const prefix
    of prefixes
  ) {

    text =
      text.replace(
        prefix,
        ""
      );
  }

  text =
    text
      .replace(
        /^(un|una|unos|unas)\s+/,
        ""
      )
      .trim();

  /*
    Evitar sustituir producto válido
    con texto vacío/genérico.
  */

  if (
    !text ||
    text.length < 2
  ) {

    return null;
  }

  return text;
}


/* ========================================================================
   CAMBIO EXPLÍCITO DE BÚSQUEDA
======================================================================== */

function detectResetSearch(
  message
) {

  const text =
    normalizeText(
      message
    );

  const phrases = [
    "quiero buscar otra cosa",
    "buscar otra cosa",
    "quiero otra cosa",
    "cambiando de tema",
    "cambiar de tema",
    "olvida esa busqueda",
    "olvida eso",
    "dejemos eso"
  ];

  return phrases.some(
    phrase =>
      text.includes(
        phrase
      )
  );
}


/* ========================================================================
   COMBINAR PREFERENCIAS SIN BORRAR
======================================================================== */

function mergePreferences(
  current,
  incoming
) {

  const next = {
    ...(
      current || {}
    )
  };

  Object
    .entries(
      incoming || {}
    )
    .forEach(
      ([
        key,
        value
      ]) => {

        /*
          Null/undefined NO reemplaza
          memoria anterior.
        */

        if (
          value !== null &&
          value !== undefined &&
          value !== ""
        ) {

          next[key] =
            value;
        }
      }
    );

  return next;
}


/* ========================================================================
   WAITING FOR
======================================================================== */

function determineWaitingFor(
  state
) {

  if (
    state?.topic !==
      "MARKETPLACE"
  ) {

    return null;
  }

  if (
    !state
      ?.product
      ?.query
  ) {

    return "product";
  }

  if (
    !Number.isFinite(
      Number(
        state
          ?.preferences
          ?.budgetMax
      )
    ) ||
    Number(
      state
        ?.preferences
        ?.budgetMax
    ) <= 0
  ) {

    return "budget";
  }

  const query =
    normalizeText(
      state
        ?.product
        ?.query
    );

  const computer =
    [
      "laptop",
      "computadora",
      "pc",
      "notebook",
      "portatil"
    ].some(
      item =>
        query.includes(
          item
        )
    );

  /*
    Para computadora necesitamos
    contexto de uso.
  */

  if (
    computer &&
    !state
      ?.preferences
      ?.useCase
  ) {

    return "useCase";
  }

  return null;
}


/* ========================================================================
   MIDDLEWARE
======================================================================== */

function lunaConversationState(
  req,
  _res,
  next
) {

  try {

    const message =
      String(
        req?.body?.message ||
        ""
      ).trim();

    if (!message) {
      return next();
    }

    const userId =
      getUserId(
        req
      );

    const sessionId =
      getSessionId(
        req
      );

    let current =
      getConversationState({
        userId,
        sessionId
      });

    /*
      Cambio explícito de búsqueda.
    */

    if (
      detectResetSearch(
        message
      )
    ) {

      resetConversationTopic({
        userId,
        sessionId
      });

      current =
        getConversationState({
          userId,
          sessionId
        });

      const resetState =
        updateConversationState({
          userId,
          sessionId,

          patch: {
            topic:
              null,

            waitingFor:
              "product",

            lastUserMessage:
              message,

            previousIntent:
              current
                ?.lastIntent ||
              null,

            lastIntent:
              "MARKETPLACE_RESET"
          }
        });

      req.lunaConversationState =
        resetState;

      req.lunaConversationReset =
        true;

      if (
        req.body &&
        typeof req.body ===
          "object"
      ) {

        req.body
          .lunaConversationState = {
            topic:
              resetState
                ?.topic ||
              null,

            product:
              resetState
                ?.product ||
              {},

            preferences:
              resetState
                ?.preferences ||
              {},

            lastIntent:
              resetState
                ?.lastIntent ||
              null,

            waitingFor:
              resetState
                ?.waitingFor ||
              null,

            reset:
              true
          };
      }

      return next();
    }

    const language =
      normalizeConversationalInput(
        message
      );

    const interpretedMessage =
      language
        .canonicalText ||
      message;

    const semanticIntent =
      req?.lunaSemantic
        ?.intent
        ?.code ||
      req?.body
        ?.lunaSemantic
        ?.intent ||
      null;

    /*
      BASE DEL NUEVO ESTADO.
    */

    const currentPreferences = {
      ...(
        current
          ?.preferences ||
        {}
      )
    };

    const incomingPreferences =
      {};

    /*
      Presupuesto
    */

    const budget =
      extractBudget({
        message:
          interpretedMessage,

        state:
          current
      });

    if (
      Number.isFinite(
        budget
      ) &&
      budget > 0
    ) {

      incomingPreferences
        .budgetMax =
        budget;
    }

    /*
      RAM
    */

    const ram =
      extractRam({
        message:
          interpretedMessage,

        state:
          current
      });

    if (
      Number.isFinite(
        ram
      )
    ) {

      incomingPreferences
        .ramGb =
        ram;
    }

    /*
      Storage
    */

    const storage =
      extractStorage({
        message:
          interpretedMessage,

        state:
          current
      });

    if (
      Number.isFinite(
        storage
      )
    ) {

      incomingPreferences
        .storageGb =
        storage;
    }

    /*
      Uso
    */

    const useCase =
      extractUseCase(
        interpretedMessage
      );

    if (useCase) {

      incomingPreferences
        .useCase =
        useCase;
    }

    /*
      Condición
    */

    const condition =
      extractCondition(
        interpretedMessage
      );

    if (condition) {

      incomingPreferences
        .condition =
        condition;
    }

    const mergedPreferences =
      mergePreferences(
        currentPreferences,
        incomingPreferences
      );

    /*
      Producto
    */

    const newProductQuery =
      extractProductQuery({
        interpretedMessage,
        semanticIntent,
        previousState:
          current
      });

    const mergedProduct = {
      ...(
        current
          ?.product ||
        {}
      )
    };

    if (newProductQuery) {

      mergedProduct.query =
        newProductQuery;
    }

    /*
      Tema
    */

    let topic =
      current?.topic ||
      null;

    if (
      newProductQuery ||
      semanticIntent
        ?.startsWith(
          "MARKETPLACE"
        )
    ) {

      topic =
        "MARKETPLACE";
    }
    else if (
      [
        "PURCHASES",
        "SALES"
      ].includes(
        semanticIntent
      )
    ) {

      topic =
        "COMMERCE";
    }
    else if (
      semanticIntent ===
        "DISPUTES"
    ) {

      topic =
        "DISPUTES";
    }
    else if (
      [
        "TRUST",
        "VERIFICATION",
        "ACCOUNT_PRIORITY"
      ].includes(
        semanticIntent
      )
    ) {

      topic =
        "ACCOUNT";
    }

    /*
      IMPORTANTE:

      Un mensaje de continuación como:

      30 mil
      juegos
      16 gb ram

      NO cambia el topic anterior.
    */

    if (
      current?.topic ===
        "MARKETPLACE" &&
      !newProductQuery
    ) {

      topic =
        "MARKETPLACE";
    }

    /*
      Estado preliminar para calcular
      waitingFor.
    */

    const preliminary = {
      topic,

      product:
        mergedProduct,

      preferences:
        mergedPreferences
    };

    const waitingFor =
      determineWaitingFor(
        preliminary
      );

    const updated =
      updateConversationState({
        userId,
        sessionId,

        patch: {
          topic,

          product:
            mergedProduct,

          preferences:
            mergedPreferences,

          previousIntent:
            current
              ?.lastIntent ||
            null,

          lastIntent:
            semanticIntent,

          lastUserMessage:
            message,

          waitingFor,

          turnCount:
            Number(
              current
                ?.turnCount ||
              0
            ) + 1
        }
      });

    req.lunaConversationState =
      updated;

    if (
      req.body &&
      typeof req.body ===
        "object"
    ) {

      req.body
        .lunaConversationState = {

          topic:
            updated
              ?.topic ||
            null,

          product:
            updated
              ?.product ||
            {},

          preferences:
            updated
              ?.preferences ||
            {},

          lastIntent:
            updated
              ?.lastIntent ||
            null,

          previousIntent:
            updated
              ?.previousIntent ||
            null,

          waitingFor:
            updated
              ?.waitingFor ||
            null,

          turnCount:
            updated
              ?.turnCount ||
            0
        };
    }

    if (
      process.env
        .NODE_ENV !==
      "production"
    ) {

      console.log(
        "[LUNA ACCUMULATIVE MEMORY]",
        {
          user:
            userId,

          topic:
            updated
              ?.topic,

          product:
            updated
              ?.product
              ?.query,

          budget:
            updated
              ?.preferences
              ?.budgetMax,

          useCase:
            updated
              ?.preferences
              ?.useCase,

          ram:
            updated
              ?.preferences
              ?.ramGb,

          storage:
            updated
              ?.preferences
              ?.storageGb,

          condition:
            updated
              ?.preferences
              ?.condition,

          waitingFor:
            updated
              ?.waitingFor
        }
      );
    }

    return next();
  }
  catch (error) {

    console.error(
      "[LUNA ACCUMULATIVE MEMORY][ERROR]",
      error?.message ||
      error
    );

    return next();
  }
}


module.exports = {
  lunaConversationState,

  parseCompactNumber,

  extractBudget,
  extractRam,
  extractStorage,
  extractUseCase,
  extractCondition,

  extractProductQuery,

  detectResetSearch,

  mergePreferences,
  determineWaitingFor
};
