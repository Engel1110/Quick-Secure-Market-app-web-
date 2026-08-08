"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA NATURAL CONTINUATION
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE F
|
| Permite continuar hablando de resultados previamente mostrados:
|
| - por qué ese
| - vale la pena
| - dime más
| - cuánto cuesta
| - está verificado
| - es nuevo/usado
| - el siguiente
| - el anterior
|
|--------------------------------------------------------------------------
*/

const VERSION =
  "LUNA-NATURAL-CONTINUATION-17.5-F";


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
      /[^a-z0-9ñ\s?$./-]/gi,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function money(value) {

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return null;
  }

  return `RD$${number.toLocaleString(
    "en-US"
  )}`;
}


/* ========================================================================
   DETECTAR CONTINUACION
======================================================================== */

function detectContinuationIntent(
  message
) {

  const text =
    normalizeText(
      message
    );

  if (!text) {
    return null;
  }


  /*
  |--------------------------------------------------------------------------
  | POR QUÉ
  |--------------------------------------------------------------------------
  */

  if (
    [
      "por que ese",
      "por que esa",
      "porque ese",
      "porque esa",
      "y por que",
      "por que lo dices",
      "por que esa opcion",
      "por que ese producto"
    ].some(
      phrase =>
        text.includes(
          phrase
        )
    )
  ) {

    return "WHY";
  }


  /*
  |--------------------------------------------------------------------------
  | VALE LA PENA
  |--------------------------------------------------------------------------
  */

  if (
    [
      "vale la pena",
      "valdria la pena",
      "me conviene",
      "lo recomiendas",
      "la recomiendas",
      "es buena opcion",
      "es buena compra"
    ].some(
      phrase =>
        text.includes(
          phrase
        )
    )
  ) {

    return "WORTH_IT";
  }


  /*
  |--------------------------------------------------------------------------
  | DETALLES
  |--------------------------------------------------------------------------
  */

  if (
    [
      "dime mas",
      "hablame de ese",
      "hablame de esa",
      "que tiene",
      "que trae",
      "dame detalles",
      "mas informacion",
      "y ese que tiene",
      "y esa que tiene"
    ].some(
      phrase =>
        text.includes(
          phrase
        )
    )
  ) {

    return "DETAILS";
  }


  /*
  |--------------------------------------------------------------------------
  | PRECIO
  |--------------------------------------------------------------------------
  */

  if (
    [
      "cuanto cuesta",
      "que precio tiene",
      "cual es el precio",
      "y el precio",
      "precio de ese",
      "precio de esa"
    ].some(
      phrase =>
        text.includes(
          phrase
        )
    )
  ) {

    return "PRICE";
  }


  /*
  |--------------------------------------------------------------------------
  | VERIFICACION / SEGURIDAD
  |--------------------------------------------------------------------------
  */

  if (
    [
      "esta verificado",
      "esta verificada",
      "ese vendedor esta verificado",
      "esa vendedora esta verificada",
      "es verificado",
      "es seguro",
      "es confiable",
      "que tan confiable"
    ].some(
      phrase =>
        text.includes(
          phrase
        )
    )
  ) {

    return "VERIFICATION";
  }


  /*
  |--------------------------------------------------------------------------
  | CONDICION
  |--------------------------------------------------------------------------
  */

  if (
    [
      "es nuevo",
      "es nueva",
      "es usado",
      "es usada",
      "que condicion tiene",
      "cual es la condicion",
      "esta nuevo",
      "esta usado"
    ].some(
      phrase =>
        text.includes(
          phrase
        )
    )
  ) {

    return "CONDITION";
  }


  /*
  |--------------------------------------------------------------------------
  | SIGUIENTE / ANTERIOR
  |--------------------------------------------------------------------------
  */

  if (
    [
      "el siguiente",
      "la siguiente",
      "otro",
      "otra",
      "otra opcion",
      "siguiente opcion"
    ].includes(
      text
    )
  ) {

    return "NEXT";
  }


  if (
    [
      "el anterior",
      "la anterior",
      "volver al anterior",
      "opcion anterior"
    ].includes(
      text
    )
  ) {

    return "PREVIOUS";
  }


  return null;
}


/* ========================================================================
   SELECCION
======================================================================== */

function normalizeIndex(
  index,
  length
) {

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= length
  ) {

    return 0;
  }

  return index;
}


function selectCurrentOption({
  results,
  selectedIndex = 0
}) {

  const list =
    Array.isArray(results)
      ? results
      : [];

  if (!list.length) {
    return null;
  }

  const index =
    normalizeIndex(
      Number(selectedIndex),
      list.length
    );

  return {
    index,
    option:
      list[index]
  };
}


/* ========================================================================
   RAZONES
======================================================================== */

function buildReasons({
  option,
  state
}) {

  const reasons = [];

  const preferences =
    state?.preferences ||
    {};


  const budget =
    Number(
      preferences.budgetMax
    );

  const price =
    Number(
      option?.price
    );


  if (
    Number.isFinite(budget) &&
    Number.isFinite(price) &&
    price <= budget
  ) {

    reasons.push(
      `entra en tu presupuesto de ${money(
        budget
      )}`
    );
  }


  if (
    Number.isFinite(
      Number(
        preferences.ramGb
      )
    )
  ) {

    reasons.push(
      `la estamos evaluando con tu preferencia de ${preferences.ramGb} GB de RAM`
    );
  }


  if (
    Number.isFinite(
      Number(
        preferences.storageGb
      )
    )
  ) {

    reasons.push(
      `también estamos considerando ${preferences.storageGb} GB de almacenamiento`
    );
  }


  if (
    preferences.useCase
  ) {

    const labels = {

      GAMING:
        "juegos",

      PROGRAMMING:
        "programación",

      STUDY:
        "estudio",

      OFFICE:
        "oficina",

      DESIGN:
        "diseño y edición",

      PHOTOGRAPHY:
        "fotografía y video"
    };

    reasons.push(
      `se está comparando pensando en ${
        labels[
          preferences.useCase
        ] ||
        "el uso que indicaste"
      }`
    );
  }


  if (
    option?.condition
  ) {

    reasons.push(
      `su condición publicada es ${option.condition}`
    );
  }


  return reasons;
}


/* ========================================================================
   RESPUESTAS
======================================================================== */

function buildWhyAnswer({
  option,
  state
}) {

  const reasons =
    buildReasons({
      option,
      state
    });

  if (!reasons.length) {

    return (
      `Te mostré "${option.title}" porque está entre las opciones que mejor coinciden con la búsqueda actual.`
    );
  }

  return (
    `Te mostré "${option.title}" porque ${reasons.join(
      ", "
    )}.`
  );
}


function buildWorthAnswer({
  option,
  state
}) {

  const reasons =
    buildReasons({
      option,
      state
    });

  let answer =
    `"${option.title}" parece una opción razonable dentro de los criterios que me diste`;

  if (
    reasons.length
  ) {

    answer +=
      ` porque ${reasons.join(
        ", "
      )}`;
  }

  answer +=
    ". Aun así, prefiero mostrarte las alternativas para que la decisión final sea tuya.";

  return answer;
}


function buildDetailsAnswer(
  option
) {

  const details = [];

  if (option?.brand) {

    details.push(
      `marca ${option.brand}`
    );
  }

  if (option?.model) {

    details.push(
      `modelo ${option.model}`
    );
  }

  if (
    Number.isFinite(
      Number(
        option?.price
      )
    )
  ) {

    details.push(
      `precio ${money(
        option.price
      )}`
    );
  }

  if (
    option?.storageCapacity
  ) {

    details.push(
      `almacenamiento ${option.storageCapacity}`
    );
  }

  if (
    option?.condition
  ) {

    details.push(
      `condición ${option.condition}`
    );
  }


  if (!details.length) {

    return (
      `La publicación es "${option.title}". No tengo más especificaciones estructuradas disponibles en esta publicación.`
    );
  }

  return (
    `"${option.title}": ${details.join(
      ", "
    )}.`
  );
}


function buildPriceAnswer(
  option
) {

  const price =
    money(
      option?.price
    );

  if (!price) {

    return (
      `La publicación "${option.title}" no tiene un precio estructurado disponible para mostrártelo ahora mismo.`
    );
  }

  return (
    `"${option.title}" está publicado en ${price}.`
  );
}


function buildVerificationAnswer(
  option
) {

  const security =
    option?.security ||
    {};

  const sellerVerified =
    Boolean(
      security.sellerVerified
    );

  const productVerified =
    Boolean(
      security.productVerified
    );

  const trust =
    Number(
      security.sellerTrustScore
    );


  const parts = [];


  parts.push(
    sellerVerified
      ? "el vendedor aparece verificado"
      : "el vendedor no aparece como verificado"
  );


  if (productVerified) {

    parts.push(
      "la publicación también tiene indicador de verificación"
    );
  }


  if (
    Number.isFinite(trust)
  ) {

    parts.push(
      `su confianza QSM registrada es ${trust}/100`
    );
  }


  return (
    `Sobre "${option.title}", ${parts.join(
      ", "
    )}. Estos datos son indicadores de seguridad; no hacen que LUNA favorezca automáticamente a ese vendedor.`
  );
}


function buildConditionAnswer(
  option
) {

  if (!option?.condition) {

    return (
      `No tengo la condición estructurada de "${option.title}" en los datos actuales.`
    );
  }

  return (
    `"${option.title}" figura con condición ${option.condition}.`
  );
}


/* ========================================================================
   RESOLVER CONTINUACION
======================================================================== */

function resolveNaturalContinuation({
  intent,
  results,
  selectedIndex = 0,
  state
}) {

  const list =
    Array.isArray(results)
      ? results
      : [];

  if (!list.length) {

    return {
      ok:
        false,

      reason:
        "NO_RESULTS"
    };
  }


  let index =
    normalizeIndex(
      Number(selectedIndex),
      list.length
    );


  if (
    intent === "NEXT"
  ) {

    index =
      Math.min(
        index + 1,
        list.length - 1
      );
  }


  if (
    intent === "PREVIOUS"
  ) {

    index =
      Math.max(
        index - 1,
        0
      );
  }


  const option =
    list[index];


  if (!option) {

    return {
      ok:
        false,

      reason:
        "NO_SELECTED_OPTION"
    };
  }


  let answer = null;


  switch (intent) {

    case "WHY":

      answer =
        buildWhyAnswer({
          option,
          state
        });

      break;


    case "WORTH_IT":

      answer =
        buildWorthAnswer({
          option,
          state
        });

      break;


    case "DETAILS":

      answer =
        buildDetailsAnswer(
          option
        );

      break;


    case "PRICE":

      answer =
        buildPriceAnswer(
          option
        );

      break;


    case "VERIFICATION":

      answer =
        buildVerificationAnswer(
          option
        );

      break;


    case "CONDITION":

      answer =
        buildConditionAnswer(
          option
        );

      break;


    case "NEXT":

      answer =
        `La siguiente opción es "${option.title}"${
          money(option.price)
            ? ` por ${money(
                option.price
              )}`
            : ""
        }.`;

      break;


    case "PREVIOUS":

      answer =
        `Volvemos a "${option.title}"${
          money(option.price)
            ? ` por ${money(
                option.price
              )}`
            : ""
        }.`;

      break;


    default:

      return {
        ok:
          false,

        reason:
          "UNKNOWN_CONTINUATION"
      };
  }


  return {
    ok:
      true,

    intent,

    selectedIndex:
      index,

    option,

    answer
  };
}


module.exports = {

  VERSION,

  detectContinuationIntent,

  selectCurrentOption,

  buildReasons,

  resolveNaturalContinuation
};
