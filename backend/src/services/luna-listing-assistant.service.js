"use strict";

/* QSM_FASE5_5_BLOCK1_LISTING_ASSISTANT */

function asArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeText(value) {
  return String(value || "").trim();
}

function clampScore(value) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(Number(value || 0))
    )
  );
}

function getImages(product = {}) {
  return [
    ...asArray(product.images),
    ...asArray(product.photos)
  ].filter(Boolean);
}

function analyzeTitle(title) {
  const value = normalizeText(title);
  const suggestions = [];
  let score = 0;

  if (!value) {
    suggestions.push(
      "Agrega un título claro para la publicación."
    );

    return {
      score,
      valid: false,
      suggestions
    };
  }

  if (value.length >= 12) {
    score += 12;
  } else {
    suggestions.push(
      "El título debe incluir más detalles."
    );
  }

  if (value.length <= 100) {
    score += 5;
  } else {
    suggestions.push(
      "Reduce el título a menos de 100 caracteres."
    );
  }

  if (
    /\b(nuevo|usado|seminuevo|excelente|original)\b/i
      .test(value)
  ) {
    score += 4;
  } else {
    suggestions.push(
      "Incluye el estado del producto en el título."
    );
  }

  if (
    /\b(gratis|urgente|aprovecha|ofertón|whatsapp)\b/i
      .test(value)
  ) {
    score -= 5;

    suggestions.push(
      "Evita palabras promocionales o contacto externo en el título."
    );
  }

  return {
    score: Math.max(0, score),
    valid: score >= 12,
    suggestions
  };
}

function analyzeDescription(description) {
  const value = normalizeText(description);
  const suggestions = [];
  let score = 0;

  if (!value) {
    suggestions.push(
      "Agrega una descripción detallada."
    );

    return {
      score,
      valid: false,
      suggestions
    };
  }

  if (value.length >= 120) {
    score += 18;
  } else if (value.length >= 50) {
    score += 10;

    suggestions.push(
      "Amplía la descripción con más detalles."
    );
  } else {
    suggestions.push(
      "La descripción es demasiado corta."
    );
  }

  if (
    /\b(estado|condición|uso|garantía|incluye|entrega)\b/i
      .test(value)
  ) {
    score += 5;
  } else {
    suggestions.push(
      "Explica el estado, uso, garantía o lo que incluye."
    );
  }

  if (
    /\b(whatsapp|transferencia directa|fuera de la plataforma)\b/i
      .test(value)
  ) {
    score -= 10;

    suggestions.push(
      "Elimina datos para negociar o pagar fuera de QSM."
    );
  }

  return {
    score: Math.max(0, score),
    valid: score >= 15,
    suggestions
  };
}

function analyzeImages(images) {
  const suggestions = [];
  let score = 0;

  if (images.length >= 5) {
    score = 18;
  } else if (images.length >= 3) {
    score = 13;
  } else if (images.length >= 1) {
    score = 6;

    suggestions.push(
      "Agrega al menos tres imágenes desde diferentes ángulos."
    );
  } else {
    suggestions.push(
      "Debes agregar imágenes reales del producto."
    );
  }

  return {
    score,
    valid: images.length >= 1,
    suggestions
  };
}

function analyzePrice(price) {
  const numericPrice = Number(price || 0);
  const suggestions = [];
  let score = 0;

  if (
    Number.isFinite(numericPrice) &&
    numericPrice > 0
  ) {
    score = 12;
  } else {
    suggestions.push(
      "Agrega un precio válido mayor que cero."
    );
  }

  return {
    score,
    valid: score > 0,
    suggestions
  };
}

function analyzeRequiredFields(product = {}) {
  const missingFields = [];

  if (!normalizeText(product.title)) {
    missingFields.push("title");
  }

  if (!normalizeText(product.description)) {
    missingFields.push("description");
  }

  if (!Number(product.price || 0)) {
    missingFields.push("price");
  }

  if (
    !product.category &&
    !product.categoryId &&
    !product.categoryName
  ) {
    missingFields.push("category");
  }

  if (
    !product.condition &&
    !product.productCondition
  ) {
    missingFields.push("condition");
  }

  if (getImages(product).length === 0) {
    missingFields.push("images");
  }

  return missingFields;
}

function getPublicationLevel(score) {
  if (score >= 90) {
    return {
      code: "EXCELLENT",
      label: "Lista para destacar"
    };
  }

  if (score >= 75) {
    return {
      code: "GOOD",
      label: "Lista para publicar"
    };
  }

  if (score >= 55) {
    return {
      code: "IMPROVABLE",
      label: "Puede mejorar"
    };
  }

  return {
    code: "INCOMPLETE",
    label: "Incompleta"
  };
}

function analyzeListingDraft(product = {}) {
  const images = getImages(product);

  const titleAnalysis =
    analyzeTitle(product.title);

  const descriptionAnalysis =
    analyzeDescription(
      product.description
    );

  const imageAnalysis =
    analyzeImages(images);

  const priceAnalysis =
    analyzePrice(product.price);

  const missingFields =
    analyzeRequiredFields(product);

  let score =
    titleAnalysis.score +
    descriptionAnalysis.score +
    imageAnalysis.score +
    priceAnalysis.score;

  if (missingFields.length === 0) {
    score += 10;
  }

  const category =
    product.category ||
    product.categoryName ||
    product.categoryId;

  if (category) {
    score += 5;
  }

  const condition =
    product.condition ||
    product.productCondition;

  if (condition) {
    score += 5;
  }

  const finalScore =
    clampScore(score);

  const suggestions = [
    ...titleAnalysis.suggestions,
    ...descriptionAnalysis.suggestions,
    ...imageAnalysis.suggestions,
    ...priceAnalysis.suggestions
  ];

  if (missingFields.includes("category")) {
    suggestions.push(
      "Selecciona una categoría."
    );
  }

  if (missingFields.includes("condition")) {
    suggestions.push(
      "Indica la condición del producto."
    );
  }

  const level =
    getPublicationLevel(finalScore);

  const blockers = [];

  if (!titleAnalysis.valid) {
    blockers.push("TITLE");
  }

  if (!descriptionAnalysis.valid) {
    blockers.push("DESCRIPTION");
  }

  if (!imageAnalysis.valid) {
    blockers.push("IMAGES");
  }

  if (!priceAnalysis.valid) {
    blockers.push("PRICE");
  }

  if (missingFields.includes("category")) {
    blockers.push("CATEGORY");
  }

  if (missingFields.includes("condition")) {
    blockers.push("CONDITION");
  }

  return {
    score: finalScore,
    level,
    canPublish:
      blockers.length === 0,
    blockers:
      [...new Set(blockers)],
    missingFields,
    suggestions:
      [...new Set(suggestions)].slice(0, 12),
    analysis: {
      title: titleAnalysis,
      description:
        descriptionAnalysis,
      images: imageAnalysis,
      price: priceAnalysis
    },
    summary:
      blockers.length === 0
        ? "La publicación contiene los datos mínimos necesarios."
        : "La publicación necesita correcciones antes de continuar.",
    analyzedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-LISTING-ASSISTANT-1.0"
  };
}

/* QSM_FASE5_5_BLOCK2_LISTING_IMPROVEMENT */

function cleanListingText(value) {
  return normalizeText(value)
    .replace(
      /\b(whatsapp|transferencia directa|fuera de la plataforma)\b/gi,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function capitalizeWords(value) {
  return String(value || "")
    .toLowerCase()
    .replace(
      /(^|\s)\S/g,
      (character) =>
        character.toUpperCase()
    );
}

function buildImprovedTitle(product = {}) {
  const currentTitle =
    cleanListingText(product.title);

  const brand =
    cleanListingText(
      product.brand ||
      product.details?.brand ||
      product.specifications?.brand
    );

  const model =
    cleanListingText(
      product.model ||
      product.details?.model ||
      product.specifications?.model
    );

  const condition =
    cleanListingText(
      product.condition ||
      product.productCondition
    );

  const year =
    cleanListingText(
      product.year ||
      product.details?.year
    );

  const parts = [
    brand,
    model,
    year,
    condition
  ].filter(Boolean);

  let suggestedTitle =
    parts.length > 0
      ? parts.join(" ")
      : currentTitle;

  if (!suggestedTitle) {
    suggestedTitle =
      "Producto en buen estado";
  }

  suggestedTitle =
    capitalizeWords(
      suggestedTitle
    )
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 100);

  return suggestedTitle;
}

function buildImprovedDescription(product = {}) {
  const currentDescription =
    cleanListingText(
      product.description
    );

  const condition =
    cleanListingText(
      product.condition ||
      product.productCondition ||
      "No especificada"
    );

  const brand =
    cleanListingText(
      product.brand ||
      product.details?.brand ||
      ""
    );

  const model =
    cleanListingText(
      product.model ||
      product.details?.model ||
      ""
    );

  const warranty =
    cleanListingText(
      product.warranty ||
      product.details?.warranty ||
      ""
    );

  const delivery =
    cleanListingText(
      product.delivery ||
      product.deliveryMethod ||
      ""
    );

  const included =
    cleanListingText(
      product.included ||
      product.includes ||
      ""
    );

  const sections = [];

  if (currentDescription) {
    sections.push(
      currentDescription
    );
  }

  sections.push(
    `Estado del producto: ${condition}.`
  );

  if (brand || model) {
    sections.push(
      `Marca y modelo: ${
        [brand, model]
          .filter(Boolean)
          .join(" ")
      }.`
    );
  }

  if (included) {
    sections.push(
      `Incluye: ${included}.`
    );
  }

  if (warranty) {
    sections.push(
      `Garantía: ${warranty}.`
    );
  }

  if (delivery) {
    sections.push(
      `Entrega: ${delivery}.`
    );
  }

  sections.push(
    "La compra y la comunicación deben realizarse dentro de QSM para mayor seguridad."
  );

  return sections
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 1500);
}

function improveListingDraft(product = {}) {
  const before =
    analyzeListingDraft(product);

  const improvedProduct = {
    ...product,
    title:
      buildImprovedTitle(product),
    description:
      buildImprovedDescription(product)
  };

  const after =
    analyzeListingDraft(
      improvedProduct
    );

  const changes = [];

  if (
    normalizeText(product.title) !==
    improvedProduct.title
  ) {
    changes.push({
      field: "title",
      previous:
        normalizeText(product.title),
      suggested:
        improvedProduct.title
    });
  }

  if (
    normalizeText(product.description) !==
    improvedProduct.description
  ) {
    changes.push({
      field: "description",
      previous:
        normalizeText(
          product.description
        ),
      suggested:
        improvedProduct.description
    });
  }

  const improvement =
    after.score - before.score;

  return {
    original: {
      score:
        before.score,
      canPublish:
        before.canPublish,
      level:
        before.level
    },
    improved: {
      product:
        improvedProduct,
      score:
        after.score,
      canPublish:
        after.canPublish,
      level:
        after.level,
      blockers:
        after.blockers,
      suggestions:
        after.suggestions
    },
    improvement,
    changes,
    message:
      improvement > 0
        ? `LUNA mejoró la publicación en ${improvement} punto(s).`
        : "La publicación ya tenía una estructura adecuada.",
    generatedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-LISTING-IMPROVEMENT-1.0"
  };
}

module.exports = {
  analyzeListingDraft,
  improveListingDraft
};
