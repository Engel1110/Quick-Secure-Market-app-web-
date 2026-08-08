"use strict";

const VERSION = "LUNA-NATURAL-RESPONSE-17.5-H";

function hashText(value) {
  const text = String(value || "");
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function chooseVariant({ seed, variants }) {
  if (!Array.isArray(variants) || !variants.length) {
    return "";
  }

  return variants[
    hashText(seed) % variants.length
  ];
}

const ACKS = {
  BUDGET: [
    "Perfecto.",
    "Entendido.",
    "Bien, lo tengo.",
    "Claro, lo tomo como límite."
  ],
  USE_CASE: [
    "Entendido.",
    "Perfecto.",
    "Bien, eso ayuda bastante.",
    "Claro, ya sé qué uso priorizar."
  ],
  RAM: [
    "Perfecto.",
    "Entendido.",
    "Bien, lo agrego.",
    "Claro, tomo esa RAM como referencia."
  ],
  STORAGE: [
    "Perfecto.",
    "Entendido.",
    "Bien, ya tengo el almacenamiento.",
    "Claro, lo tomo en cuenta."
  ],
  CONDITION: [
    "Perfecto.",
    "Entendido.",
    "Claro.",
    "Bien, tomo en cuenta la condición."
  ],
  PRODUCT: [
    "Perfecto.",
    "Claro.",
    "Entendido.",
    "Bien, vamos con eso."
  ]
};

function buildAcknowledgement({ type, value, seed = "" }) {
  const base = chooseVariant({
    seed: `${seed}:${type}:${value}`,
    variants: ACKS[type] || ["Entendido.", "Perfecto.", "Claro."]
  });

  if (type === "BUDGET") {
    return `${base} Buscaré dentro de RD$${Number(value).toLocaleString("en-US")}.`;
  }

  if (type === "RAM") {
    return `${base} ${value} GB de RAM.`;
  }

  if (type === "STORAGE") {
    return `${base} ${value} GB de almacenamiento.`;
  }

  return base;
}

function buildTransition({ step, product, seed = "" }) {
  const productName = product || "el producto";

  const variants = {
    budget: [
      `¿Cuál es tu presupuesto máximo para ${productName}?`,
      `¿Hasta cuánto quieres gastar en ${productName}?`,
      `¿Qué presupuesto tienes pensado para ${productName}?`
    ],
    useCase: [
      "¿Para qué la necesitas principalmente: estudiar, oficina, programar, diseño o juegos?",
      "¿Cuál será el uso principal: estudio, trabajo, programación, diseño o juegos?",
      "¿Qué uso le vas a dar principalmente?"
    ],
    ram: [
      "¿Cuánta RAM prefieres? Por ejemplo: 8, 16 o 32 GB.",
      "¿Qué cantidad de RAM estás buscando?",
      "¿Tienes alguna preferencia de RAM?"
    ],
    storage: [
      "¿Qué almacenamiento buscas? Por ejemplo: 256 GB, 512 GB o 1 TB.",
      "¿Cuánto almacenamiento prefieres?",
      "¿Qué capacidad de almacenamiento necesitas?"
    ],
    condition: [
      "¿La prefieres nueva, usada o te da igual la condición?",
      "¿Quieres que sea nueva, usada o cualquiera de las dos?",
      "¿La condición es importante para ti?"
    ],
    product: [
      "¿Qué producto deseas buscar ahora?",
      "¿Qué te gustaría buscar?",
      "Dime qué producto quieres revisar."
    ]
  };

  return chooseVariant({
    seed: `${seed}:${step}:${productName}`,
    variants: variants[step] || []
  });
}

function buildResetAnswer(message) {
  return chooseVariant({
    seed: message,
    variants: [
      "Perfecto. Dejamos esa búsqueda atrás. ¿Qué producto deseas buscar ahora?",
      "Claro. Empezamos una búsqueda nueva. ¿Qué quieres buscar?",
      "Entendido. Reinicié la búsqueda anterior. ¿Qué producto revisamos ahora?",
      "Bien. Dejamos esos criterios atrás. Dime qué quieres buscar ahora."
    ]
  });
}

function buildUnknown({ message, topic = null, product = null }) {
  if (topic === "MARKETPLACE" && product) {
    return chooseVariant({
      seed: message,
      variants: [
        `Creo que seguimos hablando de ${product}. ¿Qué quieres cambiar o revisar?`,
        `Todavía tengo presente ${product}. Dime qué aspecto quieres ajustar.`,
        `Si seguimos con ${product}, puedo ayudarte a cambiar presupuesto, características o filtros.`,
        `Entiendo que esto puede seguir relacionado con ${product}. ¿Qué quieres saber exactamente?`
      ]
    });
  }

  return chooseVariant({
    seed: message,
    variants: [
      "No quiero asumir algo incorrecto. Dame un poco más de contexto y continúo contigo.",
      "No estoy completamente segura de lo que quisiste decir. Explícamelo con un poco más de detalle.",
      "Creo que me falta una parte para entenderte bien. ¿Puedes decirme un poco más?",
      "No tengo suficiente contexto todavía. Dime qué quieres revisar y sigo desde ahí."
    ]
  });
}

module.exports = {
  VERSION,
  chooseVariant,
  buildAcknowledgement,
  buildTransition,
  buildResetAnswer,
  buildUnknown
};
