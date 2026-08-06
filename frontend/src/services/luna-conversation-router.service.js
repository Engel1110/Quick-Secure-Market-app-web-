"use strict";

/* QSM_FASE13_BLOCK2_SMART_REDIRECTION */

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getName(user = {}) {
  return String(
    user?.firstName ||
    user?.name ||
    ""
  ).trim();
}

function withName(user = {}) {
  const name = getName(user);
  return name ? ", " + name : "";
}

function containsAny(text, terms = []) {
  return terms.some((term) => text.includes(term));
}

function getLastUserMessage(history = []) {
  return [...history]
    .reverse()
    .find((message) =>
      message?.role === "user" &&
      message?.text
    )?.text || "";
}

function getCurrentArea(path = "") {
  const value = normalize(path);

  if (value.includes("marketplace")) return "Marketplace";
  if (value.includes("product")) return "Productos";
  if (value.includes("sale")) return "Ventas";
  if (value.includes("order")) return "Compras y órdenes";
  if (value.includes("message")) return "Mensajes";
  if (value.includes("dispute")) return "Disputas";
  if (value.includes("settings")) return "Configuración";
  if (value.includes("dashboard")) return "Dashboard";

  return "QSM";
}

function isQsmTopic(text) {
  return containsAny(text, [
    "qsm", "marketplace", "producto", "publicacion",
    "compr", "venta", "vendedor", "cliente", "pedido",
    "orden", "pago", "transferencia", "tarjeta",
    "efectivo", "entrega", "almacen", "finanza",
    "disputa", "fraude", "riesgo", "seguridad",
    "cuenta", "perfil", "verificacion", "mensaje",
    "reputacion", "trust score", "precio", "imei",
    "vin", "serial", "favorito", "notificacion",
    "dashboard"
  ]);
}

function looksOffTopic(text) {
  return containsAny(text, [
    "futbol", "champions", "mundial", "nba",
    "pelicula", "serie", "anime", "cancion",
    "cantante", "presidente", "elecciones", "clima",
    "receta", "superman", "goku", "mario", "yoshi",
    "playstation", "xbox", "fortnite"
  ]);
}

function identifyProblemArea(text) {
  if (containsAny(text, [
    "pago", "cobro", "dinero", "factura",
    "transferencia", "tarjeta"
  ])) {
    return "Parece estar relacionado con un pago o cobro. " +
      "Dime si ocurrió antes de pagar, durante la validación de Finanzas " +
      "o después de completar la compra.";
  }

  if (containsAny(text, [
    "producto", "publicacion", "foto", "descripcion",
    "precio", "imei", "serial"
  ])) {
    return "Parece estar relacionado con una publicación o producto. " +
      "Dime si necesitas crearlo, editarlo, encontrarlo, revisar su precio " +
      "o analizar alguna señal de riesgo.";
  }

  if (containsAny(text, [
    "mensaje", "chat", "vendedor no responde",
    "comprador no responde"
  ])) {
    return "Parece ser un problema de mensajes. " +
      "Dime si no puedes abrir la conversación, enviar mensajes " +
      "o necesitas revisar una conversación sospechosa.";
  }

  if (containsAny(text, [
    "disputa", "reclamo", "devolucion", "reembolso"
  ])) {
    return "Esto parece relacionado con una disputa o reclamación. " +
      "Cuéntame qué ocurrió, qué producto está involucrado " +
      "y si ya existe un caso abierto.";
  }

  if (containsAny(text, [
    "cuenta", "perfil", "contraseña", "correo",
    "verificacion", "login", "iniciar sesion"
  ])) {
    return "Parece estar relacionado con tu cuenta. " +
      "Dime si el problema es iniciar sesión, recuperar la contraseña, " +
      "completar el perfil o verificar tu identidad.";
  }

  return "";
}

export function getSmartConversationResponse({
  question,
  user = {},
  history = [],
  currentPath = ""
}) {
  const original = String(question || "").trim();
  const text = normalize(original);
  const name = withName(user);
  const area = getCurrentArea(currentPath);
  const previous = normalize(getLastUserMessage(history));

  if (!text) return null;

  if (containsAny(text, [
    "quien eres", "que eres", "como te llamas", "eres una ia"
  ])) {
    return "Soy LUNA, la asistente inteligente oficial de QSM" +
      name + ". 😊 Fui creada para orientarte con productos, compras, " +
      "ventas, pagos, disputas, mensajes, seguridad y funcionamiento de la plataforma.";
  }

  if (containsAny(text, [
    "que puedes hacer", "en que me ayudas",
    "para que sirves", "cuales son tus funciones"
  ])) {
    return "Puedo ayudarte a revisar productos y vendedores, orientar compras " +
      "y ventas, detectar señales de riesgo, explicar pagos y entregas, " +
      "guiar disputas, revisar mensajes y llevarte al área correcta de QSM.";
  }

  if (/^(como estas|como te sientes|todo bien)[?.! ]*$/.test(text)) {
    return "¡Todo funcionando correctamente" + name + "! 😊 " +
      "Estoy lista para ayudarte. Ahora mismo te encuentras en " +
      area + ". ¿Qué deseas revisar?";
  }

  if (/^(que haces|que estas haciendo)[?.! ]*$/.test(text)) {
    return "Estoy pendiente de ayudarte dentro de " + area + ". 😊 " +
      "Puedo revisar una compra, venta, publicación, disputa, mensaje " +
      "o situación de seguridad.";
  }

  if (containsAny(text, [
    "no entiendo", "explicamelo mejor",
    "puedes explicarlo", "no comprendi"
  ])) {
    return "Claro. 😊 Te lo explicaré de una forma más sencilla y paso a paso. " +
      "Dime exactamente qué parte te resultó confusa.";
  }

  if (containsAny(text, [
    "eso no funciona", "sigue sin funcionar",
    "todavia no funciona", "me da error"
  ])) {
    const detected = identifyProblemArea(previous + " " + text);

    return detected ||
      "Entiendo. Vamos a localizarlo sin dar vueltas. " +
      "Dime qué botón presionaste, en qué sección estabas " +
      "y qué mensaje apareció en pantalla.";
  }

  if (/^(si|aja|ok|oki|dale|esta bien|correcto)[!. ]*$/.test(text) && previous) {
    return "Perfecto. Continuemos desde ahí. 😊 " +
      "Dime qué ocurrió después o cuál es el siguiente paso que deseas realizar.";
  }

  if (containsAny(text, [
    "estoy perdido", "no se por donde empezar", "por donde comienzo"
  ])) {
    return "No te preocupes" + name + "; te guiaré paso a paso. " +
      "Primero dime qué deseas lograr: comprar, vender, publicar un producto, " +
      "revisar un pedido, abrir una disputa o resolver un problema de cuenta.";
  }

  const problemArea = identifyProblemArea(text);

  if (problemArea && containsAny(text, [
    "problema", "error", "ayuda", "no funciona", "no puedo"
  ])) {
    return problemArea;
  }

  if (containsAny(text, [
    "eres tonta", "eres estupida", "no sirves", "que bruta"
  ])) {
    return "Entiendo que algo no salió como esperabas. " +
      "Vamos a concentrarnos en resolverlo. " +
      "Dime qué intentabas hacer y qué resultado obtuviste.";
  }

  if (looksOffTopic(text) && !isQsmTopic(text)) {
    return "😄 Ese tema se sale de mi área de trabajo. " +
      "Estoy especializada en QSM: productos, compras, ventas, pagos, " +
      "disputas, mensajes y seguridad. Dime qué necesitas hacer " +
      "dentro de la plataforma y te llevaré al punto correcto.";
  }

  if (text.length <= 3 && !isQsmTopic(text)) {
    return "Te escucho. 😊 Escríbeme un poco más para entender " +
      "qué necesitas revisar dentro de QSM.";
  }

  return null;
}
