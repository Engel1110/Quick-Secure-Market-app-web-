"use strict";

/* QSM_FASE5_5_BLOCK3_LISTING_ASSISTANT_TEST */

const {
  analyzeListingDraft,
  improveListingDraft
} = require(
  "../src/services/luna-listing-assistant.service"
);

async function main() {
  const incompleteDraft = {
    title: "iphone",
    description:
      "vendo iphone por whatsapp transferencia directa",
    price: 0,
    images: [],
    category: "",
    condition: ""
  };

  const incompleteAnalysis =
    analyzeListingDraft(
      incompleteDraft
    );

  if (
    incompleteAnalysis.canPublish !== false
  ) {
    throw new Error(
      "La publicación incompleta no fue bloqueada."
    );
  }

  if (
    !Array.isArray(
      incompleteAnalysis.blockers
    ) ||
    incompleteAnalysis.blockers.length === 0
  ) {
    throw new Error(
      "No se detectaron los campos bloqueantes."
    );
  }

  const completeDraft = {
    title:
      "iPhone 15 Pro Original Seminuevo",
    description:
      "Equipo en excelente estado, con poco uso, batería saludable, cargador incluido, garantía disponible y entrega coordinada dentro de QSM.",
    price: 55000,
    category:
      "Tecnología",
    condition:
      "Seminuevo",
    brand:
      "Apple",
    model:
      "iPhone 15 Pro",
    year:
      "2024",
    warranty:
      "30 días",
    included:
      "Cargador y caja",
    delivery:
      "Entrega coordinada",
    images: [
      "image-1.jpg",
      "image-2.jpg",
      "image-3.jpg",
      "image-4.jpg"
    ]
  };

  const completeAnalysis =
    analyzeListingDraft(
      completeDraft
    );

  if (
    completeAnalysis.canPublish !== true
  ) {
    throw new Error(
      "La publicación completa fue bloqueada."
    );
  }

  if (
    completeAnalysis.score < 55
  ) {
    throw new Error(
      "El puntaje de la publicación completa es demasiado bajo."
    );
  }

  const poorDraft = {
    title:
      "iphone usado",
    description:
      "telefono bueno whatsapp",
    price:
      50000,
    category:
      "Tecnología",
    condition:
      "Usado",
    brand:
      "Apple",
    model:
      "iPhone 14",
    images: [
      "image-1.jpg"
    ]
  };

  const improvement =
    improveListingDraft(
      poorDraft
    );

  if (
    !improvement.improved ||
    !improvement.improved.product
  ) {
    throw new Error(
      "LUNA no devolvió una publicación mejorada."
    );
  }

  if (
    improvement.improved.score <
    improvement.original.score
  ) {
    throw new Error(
      "La publicación perdió puntuación después de mejorarla."
    );
  }

  if (
    !Array.isArray(
      improvement.changes
    ) ||
    improvement.changes.length === 0
  ) {
    throw new Error(
      "LUNA no registró los cambios sugeridos."
    );
  }

  const improvedText =
    String(
      improvement.improved.product.description ||
      ""
    ).toLowerCase();

  if (
    improvedText.includes("whatsapp") ||
    improvedText.includes(
      "transferencia directa"
    )
  ) {
    throw new Error(
      "El contenido externo no fue eliminado."
    );
  }

  console.log("");
  console.log(
    "ASISTENTE DE PUBLICACIONES VALIDADO CORRECTAMENTE"
  );

  console.log({
    borradorIncompleto: {
      score:
        incompleteAnalysis.score,
      puedePublicar:
        incompleteAnalysis.canPublish,
      bloqueos:
        incompleteAnalysis.blockers
    },
    borradorCompleto: {
      score:
        completeAnalysis.score,
      puedePublicar:
        completeAnalysis.canPublish,
      nivel:
        completeAnalysis.level.label
    },
    mejoraAutomatica: {
      antes:
        improvement.original.score,
      despues:
        improvement.improved.score,
      mejora:
        improvement.improvement,
      cambios:
        improvement.changes.length
    }
  });

  console.log("");
  console.log(
    "FASE 5.5 COMPLETADA CORRECTAMENTE"
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "ERROR EN LA PRUEBA:",
      error.message
    );

    process.exitCode = 1;
  });
