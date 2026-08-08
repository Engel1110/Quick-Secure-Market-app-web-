"use strict";

/*
| QSM_FASE17_5_BLOCK_H_FINAL_RESET
*/

const {
  buildResetAnswer
} = require(
  "./luna-natural-response.service"
);

/*
|--------------------------------------------------------------------------
| QSM - LUNA SEARCH RESET
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE C - RESTORE FIX
|--------------------------------------------------------------------------
*/

const VERSION =
  "LUNA-SEARCH-RESET-17.5-C";

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

const RESET_PHRASES =
  Object.freeze([
    "quiero buscar otra cosa",
    "buscar otra cosa",
    "quiero otra cosa",
    "busquemos otra cosa",
    "quiero cambiar de producto",
    "cambiar de producto",
    "cambiemos de producto",
    "quiero ver otra cosa",
    "veamos otra cosa",
    "olvida esa busqueda",
    "olvida la busqueda",
    "dejemos esa busqueda",
    "dejemos eso",
    "cambiando de tema",
    "cambiar de tema"
  ]);

function detectSearchReset(
  message
) {
  const text =
    normalizeText(
      message
    );

  if (!text) {
    return false;
  }

  return RESET_PHRASES.some(
    phrase =>
      text.includes(
        phrase
      )
  );
}

function buildResetResponse(
  message
) {

  return buildResetAnswer(
    message
  );
}

module.exports = {
  VERSION,
  RESET_PHRASES,
  detectSearchReset,
  buildResetResponse
};
