"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA DYNAMIC CONTEXT
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE G
|
| Interpreta cambios naturales sobre una búsqueda existente.
|--------------------------------------------------------------------------
*/

const VERSION =
  "LUNA-DYNAMIC-CONTEXT-17.5-G";


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
      /[^a-z0-9ñ\s$./-]/gi,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function parseCompactNumber(value) {

  const text =
    normalizeText(value)
      .replace(/,/g, "");

  const match =
    text.match(
      /(\d+(?:\.\d+)?)\s*(mil|k)?/
    );

  if (!match) {
    return null;
  }

  let number =
    Number(match[1]);

  if (
    !Number.isFinite(number)
  ) {
    return null;
  }

  if (
    match[2] === "mil" ||
    match[2] === "k"
  ) {
    number *= 1000;
  }

  return Math.round(number);
}


/* ========================================================================
   INTENCIONES DINÁMICAS
======================================================================== */

function detectDynamicContext(
  message
) {

  const text =
    normalizeText(message);

  if (!text) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | PRESUPUESTO DIRECTO
  |--------------------------------------------------------------------------
  */

  const budgetMatch =
    text.match(
      /(?:hasta|maximo|tope|presupuesto(?: de)?|puedo gastar|puedo pagar)\s*(?:rd\$|\$)?\s*(\d+(?:[.,]\d+)?)\s*(mil|k)?/
    );

  if (budgetMatch) {

    const value =
      parseCompactNumber(
        `${budgetMatch[1]} ${
          budgetMatch[2] || ""
        }`
      );

    if (
      Number.isFinite(value) &&
      value >= 1000
    ) {

      return {
        code:
          "BUDGET_SET",

        value
      };
    }
  }


  /*
  |--------------------------------------------------------------------------
  | GASTAR MENOS
  |--------------------------------------------------------------------------
  */

  if (
    [
      "no quiero gastar tanto",
      "quiero gastar menos",
      "bajemos el presupuesto",
      "algo mas barato",
      "algo mas economico",
      "menos caro",
      "quiero pagar menos"
    ].some(
      phrase =>
        text.includes(phrase)
    )
  ) {

    return {
      code:
        "PRICE_DOWN"
    };
  }


  /*
  |--------------------------------------------------------------------------
  | SUBIR CALIDAD
  |--------------------------------------------------------------------------
  */

  if (
    [
      "quiero algo mejor",
      "algo mejor",
      "sube la calidad",
      "quiero uno mejor",
      "quiero una mejor",
      "algo mas potente",
      "algo de mejor calidad",
      "quiero mejor rendimiento"
    ].some(
      phrase =>
        text.includes(phrase)
    )
  ) {

    return {
      code:
        "QUALITY_UP"
    };
  }


  /*
  |--------------------------------------------------------------------------
  | RAM DIRECTA
  |--------------------------------------------------------------------------
  */

  let ramMatch =
    text.match(
      /(?:quiero|necesito|prefiero)?\s*(\d+)\s*(?:gb|g)?\s*(?:de\s*)?ram\b/
    );

  if (
    !ramMatch
  ) {

    ramMatch =
      text.match(
        /\bram\s*(?:de\s*)?(\d+)\s*(?:gb|g)?/
      );
  }

  if (ramMatch) {

    const value =
      Number(
        ramMatch[1]
      );

    if (
      [
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
      ].includes(value)
    ) {

      return {
        code:
          "RAM_SET",

        value
      };
    }
  }


  /*
  |--------------------------------------------------------------------------
  | MÁS RAM
  |--------------------------------------------------------------------------
  */

  if (
    [
      "mas ram",
      "quiero mas ram",
      "necesito mas ram",
      "sube la ram",
      "con mas memoria ram"
    ].some(
      phrase =>
        text.includes(phrase)
    )
  ) {

    return {
      code:
        "RAM_UP"
    };
  }


  /*
  |--------------------------------------------------------------------------
  | ALMACENAMIENTO DIRECTO
  |--------------------------------------------------------------------------
  */

  const storageMatch =
    text.match(
      /(?:quiero|necesito|prefiero)?\s*(\d+)\s*(tb|gb|g)\s*(?:de\s*)?(?:almacenamiento|storage|memoria)?/
    );

  if (
    storageMatch &&
    !text.includes("ram")
  ) {

    let value =
      Number(
        storageMatch[1]
      );

    if (
      storageMatch[2] === "tb"
    ) {
      value *= 1024;
    }

    if (
      Number.isFinite(value) &&
      value >= 32
    ) {

      return {
        code:
          "STORAGE_SET",

        value
      };
    }
  }


  /*
  |--------------------------------------------------------------------------
  | MÁS ALMACENAMIENTO
  |--------------------------------------------------------------------------
  */

  if (
    [
      "mas almacenamiento",
      "quiero mas espacio",
      "necesito mas espacio",
      "mas memoria interna",
      "mas storage"
    ].some(
      phrase =>
        text.includes(phrase)
    )
  ) {

    return {
      code:
        "STORAGE_UP"
    };
  }


  /*
  |--------------------------------------------------------------------------
  | CONDICIÓN
  |--------------------------------------------------------------------------
  */

  if (
    [
      "solo nuevo",
      "solo nueva",
      "quiero nuevo",
      "quiero nueva",
      "prefiero nuevo",
      "prefiero nueva"
    ].some(
      phrase =>
        text.includes(phrase)
    )
  ) {

    return {
      code:
        "CONDITION_SET",

      value:
        "NEW"
    };
  }


  if (
    [
      "puede ser usado",
      "puede ser usada",
      "no importa usado",
      "no importa usada",
      "acepto usado",
      "acepto usada",
      "usado esta bien",
      "usada esta bien"
    ].some(
      phrase =>
        text.includes(phrase)
    )
  ) {

    return {
      code:
        "CONDITION_FLEXIBLE",

      value:
        null
    };
  }


  /*
  |--------------------------------------------------------------------------
  | CAMBIO DE USO
  |--------------------------------------------------------------------------
  */

  if (
    [
      "ahora para jugar",
      "mejor para jugar",
      "quiero jugar",
      "para gaming"
    ].some(
      phrase =>
        text.includes(phrase)
    )
  ) {

    return {
      code:
        "USE_CASE_SET",

      value:
        "GAMING"
    };
  }


  if (
    [
      "ahora para programar",
      "mejor para programar",
      "quiero programar",
      "para programacion"
    ].some(
      phrase =>
        text.includes(phrase)
    )
  ) {

    return {
      code:
        "USE_CASE_SET",

      value:
        "PROGRAMMING"
    };
  }


  return null;
}


/* ========================================================================
   MODIFICADORES
======================================================================== */

function nextRamValue(
  current
) {

  const values = [
    4,
    8,
    12,
    16,
    24,
    32,
    48,
    64,
    96,
    128
  ];

  const number =
    Number(current);

  if (
    !Number.isFinite(number)
  ) {
    return 16;
  }

  const next =
    values.find(
      value =>
        value > number
    );

  return (
    next ||
    values[
      values.length - 1
    ]
  );
}


function nextStorageValue(
  current
) {

  const values = [
    128,
    256,
    512,
    1024,
    2048,
    4096
  ];

  const number =
    Number(current);

  if (
    !Number.isFinite(number)
  ) {
    return 512;
  }

  return (
    values.find(
      value =>
        value > number
    ) ||
    values[
      values.length - 1
    ]
  );
}


function lowerBudget(
  current
) {

  const number =
    Number(current);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return null;
  }

  /*
    Reducción moderada del 15%.
  */

  const reduced =
    Math.floor(
      number * 0.85
    );

  /*
    Redondeo a RD$500.
  */

  return Math.max(
    1000,
    Math.floor(
      reduced / 500
    ) * 500
  );
}


/* ========================================================================
   APLICAR AL ESTADO
======================================================================== */

function applyDynamicContext({
  command,
  state
}) {

  if (
    !command ||
    !state
  ) {

    return {
      applied:
        false
    };
  }


  const preferences = {
    ...(
      state.preferences ||
      {}
    )
  };


  let explanation =
    null;


  switch (
    command.code
  ) {

    case "BUDGET_SET":

      preferences.budgetMax =
        command.value;

      explanation =
        `Perfecto. Ajusté tu presupuesto máximo a RD$${Number(
          command.value
        ).toLocaleString("en-US")}.`;

      break;


    case "PRICE_DOWN": {

      const newBudget =
        lowerBudget(
          preferences
            .budgetMax
        );

      if (
        !Number.isFinite(
          newBudget
        )
      ) {

        return {
          applied:
            false,

          reason:
            "NO_CURRENT_BUDGET"
        };
      }

      preferences.budgetMax =
        newBudget;

      explanation =
        `Entendido. Bajé el presupuesto de referencia a RD$${newBudget.toLocaleString(
          "en-US"
        )} para buscar opciones más económicas.`;

      break;
    }


    case "RAM_SET":

      preferences.ramGb =
        command.value;

      explanation =
        `Perfecto. Ahora buscaré opciones con ${command.value} GB de RAM cuando esa especificación esté disponible.`;

      break;


    case "RAM_UP": {

      const value =
        nextRamValue(
          preferences.ramGb
        );

      preferences.ramGb =
        value;

      explanation =
        `Entendido. Subí la preferencia de RAM a ${value} GB.`;

      break;
    }


    case "STORAGE_SET":

      preferences.storageGb =
        command.value;

      explanation =
        `Perfecto. Actualicé el almacenamiento a ${command.value} GB.`;

      break;


    case "STORAGE_UP": {

      const value =
        nextStorageValue(
          preferences.storageGb
        );

      preferences.storageGb =
        value;

      explanation =
        `Entendido. Subí el almacenamiento de referencia a ${value} GB.`;

      break;
    }


    case "CONDITION_SET":

      preferences.condition =
        command.value;

      explanation =
        "Perfecto. Buscaré opciones nuevas.";

      break;


    case "CONDITION_FLEXIBLE":

      /*
        null intencional:
        significa no restringir condición.
      */

      preferences.condition =
        null;

      explanation =
        "Entendido. La condición ya no será un requisito; pueden entrar opciones nuevas o usadas.";

      break;


    case "USE_CASE_SET":

      preferences.useCase =
        command.value;

      explanation =
        command.value ===
        "GAMING"
          ? "Perfecto. Ahora priorizaremos opciones adecuadas para juegos."
          : "Perfecto. Ahora priorizaremos opciones adecuadas para programación.";

      break;


    case "QUALITY_UP":

      preferences.qualityPreference =
        "HIGHER";

      explanation =
        "Entendido. Voy a priorizar mejor ajuste de características y calidad dentro de tu búsqueda actual.";

      break;


    default:

      return {
        applied:
          false,

        reason:
          "UNSUPPORTED_COMMAND"
      };
  }


  return {

    applied:
      true,

    command:
      command.code,

    preferences,

    explanation
  };
}


module.exports = {

  VERSION,

  detectDynamicContext,

  nextRamValue,
  nextStorageValue,
  lowerBudget,

  applyDynamicContext
};
