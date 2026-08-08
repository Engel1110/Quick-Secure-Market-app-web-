"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA CONTEXTUAL COMPARISON
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE E
|
| Comparaciones sobre resultados ya existentes.
|--------------------------------------------------------------------------
*/

const VERSION =
  "LUNA-CONTEXTUAL-COMPARISON-17.5-E";

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

function detectContextualComparison(
  message
) {
  const text =
    normalizeText(message);

  if (!text) {
    return null;
  }

  if (
    [
      "mas barato",
      "mas economico",
      "menos caro",
      "quiero gastar menos",
      "el mas barato"
    ].some(
      x =>
        text.includes(x)
    )
  ) {
    return "CHEAPER";
  }

  if (
    [
      "mas potente",
      "mejor rendimiento",
      "mejor procesador",
      "mas rapido"
    ].some(
      x =>
        text.includes(x)
    )
  ) {
    return "PERFORMANCE";
  }

  if (
    [
      "mas confiable",
      "mas seguro",
      "mejor reputacion"
    ].some(
      x =>
        text.includes(x)
    )
  ) {
    return "TRUST";
  }

  if (
    [
      "mas nuevo",
      "mas reciente"
    ].some(
      x =>
        text.includes(x)
    )
  ) {
    return "NEWEST";
  }

  if (
    [
      "cual conviene",
      "cual me conviene",
      "cual vale mas la pena",
      "mejor calidad precio"
    ].some(
      x =>
        text.includes(x)
    )
  ) {
    return "VALUE";
  }

  if (
    /\b(el|la)?\s*primero\b/.test(text)
  ) {
    return "FIRST";
  }

  if (
    /\b(el|la)?\s*segundo\b/.test(text)
  ) {
    return "SECOND";
  }

  if (
    /\b(el|la)?\s*tercero\b/.test(text)
  ) {
    return "THIRD";
  }

  if (
    [
      "ese",
      "esa",
      "ese mismo",
      "esa misma",
      "y ese",
      "y esa"
    ].includes(text)
  ) {
    return "CURRENT";
  }

  return null;
}

function resolveIndex(
  type
) {
  switch (type) {

    case "FIRST":
      return 0;

    case "SECOND":
      return 1;

    case "THIRD":
      return 2;

    default:
      return null;
  }
}

function sortByPrice(
  options
) {
  return [...options]
    .filter(
      item =>
        Number.isFinite(
          Number(
            item?.price
          )
        )
    )
    .sort(
      (a, b) =>
        Number(a.price) -
        Number(b.price)
    );
}

function sortByTrust(
  options
) {
  return [...options]
    .sort(
      (a, b) =>
        Number(
          b?.security
            ?.sellerTrustScore ||
          0
        ) -
        Number(
          a?.security
            ?.sellerTrustScore ||
          0
        )
    );
}

function sortByValue(
  options
) {
  return [...options]
    .sort(
      (a, b) =>
        Number(
          b?.valueScore ??
          b?.fitScore ??
          0
        ) -
        Number(
          a?.valueScore ??
          a?.fitScore ??
          0
        )
    );
}

function buildSelectionAnswer(
  option,
  position
) {
  if (!option) {
    return null;
  }

  const price =
    Number.isFinite(
      Number(
        option.price
      )
    )
      ? ` por RD$${Number(
          option.price
        ).toLocaleString("en-US")}`
      : "";

  return (
    `La opción ${position} es "${option.title}"${price}.`
  );
}

function compareCurrentOptions({
  type,
  options,
  currentIndex = 0
}) {
  const list =
    Array.isArray(options)
      ? options
      : [];

  if (!list.length) {
    return {
      ok:
        false,

      reason:
        "NO_OPTIONS"
    };
  }

  const index =
    resolveIndex(type);

  if (
    Number.isInteger(index)
  ) {
    return {
      ok:
        Boolean(
          list[index]
        ),

      selected:
        list[index] ||
        null,

      selectedIndex:
        index,

      answer:
        buildSelectionAnswer(
          list[index],
          index + 1
        )
    };
  }

  if (
    type === "CURRENT"
  ) {
    const selected =
      list[
        Number.isInteger(
          currentIndex
        )
          ? currentIndex
          : 0
      ] ||
      list[0];

    return {
      ok:
        true,

      selected,

      selectedIndex:
        currentIndex || 0,

      answer:
        buildSelectionAnswer(
          selected,
          (currentIndex || 0) + 1
        )
    };
  }

  if (
    type === "CHEAPER"
  ) {
    const ranked =
      sortByPrice(
        list
      );

    const selected =
      ranked[0];

    return {
      ok:
        Boolean(selected),

      selected,

      answer:
        selected
          ? `La opción más económica entre las que estamos viendo es "${selected.title}" por RD$${Number(
              selected.price
            ).toLocaleString("en-US")}.`
          : null
    };
  }

  if (
    type === "TRUST"
  ) {
    const ranked =
      sortByTrust(
        list
      );

    const selected =
      ranked[0];

    return {
      ok:
        Boolean(selected),

      selected,

      answer:
        selected
          ? `La opción con mayor indicador de confianza entre las mostradas es "${selected.title}". Esto es solo información de seguridad; no significa que LUNA favorezca a ese vendedor.`
          : null
    };
  }

  if (
    type === "VALUE"
  ) {
    const ranked =
      sortByValue(
        list
      );

    const selected =
      ranked[0];

    return {
      ok:
        Boolean(selected),

      selected,

      answer:
        selected
          ? `Por ajuste a tus criterios y relación calidad/precio, "${selected.title}" es una de las opciones que mejor encaja entre las que estamos comparando.`
          : null
    };
  }

  if (
    type === "NEWEST"
  ) {
    const ranked =
      [...list]
        .sort(
          (a, b) =>
            new Date(
              b?.createdAt || 0
            ) -
            new Date(
              a?.createdAt || 0
            )
        );

    const selected =
      ranked[0];

    return {
      ok:
        Boolean(selected),

      selected,

      answer:
        selected
          ? `La publicación más reciente entre las opciones actuales es "${selected.title}".`
          : null
    };
  }

  if (
    type === "PERFORMANCE"
  ) {
    const ranked =
      sortByValue(
        list
      );

    const selected =
      ranked[0];

    return {
      ok:
        Boolean(selected),

      selected,

      answer:
        selected
          ? `Entre las opciones actuales, "${selected.title}" es la que mejor encaja con los criterios de rendimiento que tenemos disponibles.`
          : null
    };
  }

  return {
    ok:
      false,

    reason:
      "UNKNOWN_COMPARISON"
  };
}

module.exports = {
  VERSION,

  detectContextualComparison,
  compareCurrentOptions,

  sortByPrice,
  sortByTrust,
  sortByValue
};
