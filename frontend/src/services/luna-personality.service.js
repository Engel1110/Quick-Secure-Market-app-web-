
"use strict";

/* QSM_FASE13_BLOCK1_HUMAN_PERSONALITY */

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function choose(options = [], seed = "") {
  if (!Array.isArray(options) || options.length === 0) {
    return "";
  }

  const number =
    [...String(seed)].reduce(
      (total, character) =>
        total + character.charCodeAt(0),
      0
    );

  return options[number % options.length];
}

function getFirstName(user = {}) {
  return String(
    user?.firstName ||
    user?.name ||
    ""
  ).trim();
}

function friendlyName(user = {}) {
  const firstName = getFirstName(user);

  return firstName
    ? `, ${firstName}`
    : "";
}

function isPlatformTopic(text) {
  return [
    "qsm",
    "producto",
    "publicacion",
    "marketplace",
    "compr",
    "venta",
    "vendedor",
    "pedido",
    "orden",
    "pago",
    "entrega",
    "almacen",
    "finanza",
    "disputa",
    "fraude",
    "riesgo",
    "seguridad",
    "cuenta",
    "perfil",
    "verificacion",
    "mensaje",
    "reputacion",
    "trust score",
    "precio",
    "imei",
    "vin",
    "serial"
  ].some((term) =>
    text.includes(term)
  );
}

export function getHumanizedLocalResponse({
  question,
  user
}) {
  const original =
    String(question || "").trim();

  const text =
    normalizeText(original);

  const name =
    friendlyName(user);

  if (!text) {
    return null;
  }

  if (
    /^(hola|holi|hey|buenas|buenos dias|buenas tardes|buenas noches)[!. ]*$/.test(
      text
    )
  ) {
    return choose(
      [
        `¡Hola${name}! 😊 ¿Qué necesitas revisar hoy dentro de QSM?`,
        `¡Hola${name}! 👋 Estoy lista para ayudarte con tu cuenta, productos, compras, ventas o seguridad.`,
        `Qué gusto verte${name}. 😊 Dime qué deseas consultar en QSM.`
      ],
      original
    );
  }

  if (
    /^(gracias|muchas gracias|te lo agradezco|perfecto gracias)[!. ]*$/.test(
      text
    )
  ) {
    return choose(
      [
        "¡Con muchísimo gusto! 😊 Aquí estaré cuando necesites otra mano dentro de QSM.",
        "Para eso estoy. 😊 Me alegra haber podido ayudarte.",
        "Siempre a tu orden. Si surge otra duda sobre QSM, la revisamos juntos."
      ],
      original
    );
  }

  if (
    /^(adios|hasta luego|nos vemos|bye|chao|chau)[!. ]*$/.test(
      text
    )
  ) {
    return choose(
      [
        "Fue un gusto ayudarte. 😊 Aquí estaré cuando regreses a QSM.",
        "¡Hasta luego! Cuídate y recuerda mantener todas tus operaciones dentro de QSM.",
        "Nos vemos pronto. 👋 Seguiré aquí cuando necesites revisar algo en la plataforma."
      ],
      original
    );
  }

  if (
    /^(jaja+|jeje+|ji+|xd+|lol)[!. ]*$/.test(
      text
    )
  ) {
    return choose(
      [
        "😄 Me alegra sacarte una sonrisa. Ahora dime, ¿qué revisamos dentro de QSM?",
        "Jajaja 😄 Está bien, también puedo ser un poco divertida. ¿En qué te ayudo con la plataforma?",
        "😄 Buena esa. Cuando quieras, seguimos con productos, compras, ventas o seguridad."
      ],
      original
    );
  }

  if (
    text.includes("eres linda") ||
    text.includes("eres bonita") ||
    text.includes("me gustas")
  ) {
    return (
      "😊 Muchas gracias. Fui diseñada para transmitir confianza y hacer más agradable tu experiencia en QSM. " +
      "¿Necesitas ayuda con alguna compra, venta, publicación o consulta?"
    );
  }

  if (
    text.includes("novia") ||
    text.includes("casarte conmigo") ||
    text.includes("casate conmigo")
  ) {
    return (
      "😄 Me halaga la propuesta, pero creo que es mejor que siga concentrada en cuidar el Marketplace. " +
      "Puedo ayudarte con compras, ventas, productos, disputas o seguridad."
    );
  }

  if (
    text.includes("estoy desesperado") ||
    text.includes("estoy frustrado") ||
    text.includes("estoy preocupado") ||
    text.includes("no se que hacer")
  ) {
    return (
      "Lamento que estés pasando por eso. Vamos a resolverlo paso a paso. " +
      "Cuéntame si el problema está relacionado con una compra, venta, producto, pago, disputa, mensaje o con tu cuenta."
    );
  }

  if (
    /^(ayuda|necesito ayuda|tengo un problema|no funciona)[!. ]*$/.test(
      text
    )
  ) {
    return (
      "Claro, estoy contigo. 😊 ¿El problema está relacionado con una compra, una venta, " +
      "un producto, un pago, una disputa, los mensajes o tu cuenta?"
    );
  }

  if (
    text.includes("cuentame un chiste") ||
    text.includes("dime un chiste")
  ) {
    return (
      "😄 Aquí va uno: el único vendedor que nunca pierde reputación es el que publica correctamente desde el principio. " +
      "Ahora sí, ¿qué necesitas revisar dentro de QSM?"
    );
  }

  if (
    !isPlatformTopic(text) &&
    (
      text.includes("superman") ||
      text.includes("goku") ||
      text.includes("champions") ||
      text.includes("mundial") ||
      text.includes("presidente") ||
      text.includes("clima") ||
      text.includes("pelicula") ||
      text.includes("cancion")
    )
  ) {
    return (
      "😄 Ese tema está fuera de mi especialidad, aunque suena interesante. " +
      "Yo fui creada para ayudarte dentro de QSM con productos, compras, ventas, pagos, disputas, seguridad y funcionamiento de la plataforma. " +
      "Si quieres, dime qué deseas revisar y te llevaré al punto correcto."
    );
  }

  return null;
}

export function humanizeLunaResponse({
  response,
  question,
  user
}) {
  const original =
    String(response || "").trim();

  const normalized =
    normalizeText(original);

  if (!original) {
    return (
      "Pude procesar tu solicitud, pero no recibí todos los datos necesarios para darte una respuesta completa. " +
      "Intenta explicármelo con un poco más de detalle y con gusto lo revisamos."
    );
  }

  const genericResponses = [
    "explicame el problema",
    "describe el problema",
    "indica tu consulta",
    "no puedo responder",
    "fuera de alcance",
    "solicitud invalida",
    "invalid request",
    "request failed",
    "no autorizado",
    "unauthorized"
  ];

  if (
    genericResponses.some((item) =>
      normalized === item ||
      normalized.startsWith(item)
    )
  ) {
    return (
      "Claro, vamos a revisarlo juntos. 😊 " +
      "Cuéntame si está relacionado con una compra, venta, producto, pago, disputa, mensaje, seguridad o con tu cuenta. " +
      "Con ese detalle podré orientarte mejor dentro de QSM."
    );
  }

  if (
    normalized.includes(
      "el mensaje no puede estar vacio"
    )
  ) {
    return (
      "Parece que no recibí correctamente tu pregunta. Escríbela nuevamente y con gusto la revisamos."
    );
  }

  if (
    normalized === "network error" ||
    normalized.includes(
      "no fue posible comunicarse"
    )
  ) {
    return (
      "Parece que tuve una dificultad temporal para conectarme. " +
      "Espera unos segundos e inténtalo nuevamente; seguiré aquí para ayudarte."
    );
  }

  const name =
    getFirstName(user);

  if (
    name &&
    /^(hola|buenas|bienvenido)/.test(
      normalized
    ) &&
    !normalized.includes(
      normalizeText(name)
    )
  ) {
    return original.replace(
      /^hola/i,
      `Hola, ${name}`
    );
  }

  return original;
}

export function getLunaWelcomeMessage(user = {}) {
  const name =
    friendlyName(user);

  return (
    `¡Hola${name}! 😊 Soy LUNA, la asistente inteligente de QSM. ` +
    "Puedo ayudarte con productos, compras, ventas, pagos, disputas, mensajes y seguridad. ¿Qué deseas revisar?"
  );
}

export function getLunaResetMessage(user = {}) {
  const name =
    friendlyName(user);

  return (
    `Conversación reiniciada${name}. 😊 ¿En qué parte de QSM necesitas ayuda ahora?`
  );
}
