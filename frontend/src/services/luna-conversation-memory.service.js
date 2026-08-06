"use strict";

/* QSM_FASE13_BLOCK3_CONVERSATION_MEMORY */

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getText(message = {}) {
  return String(message?.text || "").trim();
}

function getRecentMessages(history = [], limit = 8) {
  return history
    .filter((message) =>
      message &&
      ["user", "assistant"].includes(message.role) &&
      getText(message)
    )
    .slice(-limit)
    .map((message) => ({
      role: message.role,
      text: getText(message).slice(0, 500)
    }));
}

function detectTopic(text = "") {
  const value = normalize(text);

  const topics = [
    ["DISPUTE", ["disputa", "reclamo", "reembolso", "devolucion"]],
    ["PAYMENT", ["pago", "cobro", "tarjeta", "transferencia", "efectivo"]],
    ["ORDER", ["pedido", "orden", "compra", "entrega", "llega"]],
    ["PRODUCT", ["producto", "publicacion", "imei", "serial", "precio"]],
    ["SELLER", ["vendedor", "reputacion", "trust score"]],
    ["MESSAGES", ["mensaje", "chat", "conversacion"]],
    ["ACCOUNT", ["cuenta", "perfil", "contraseña", "correo", "login"]],
    ["SECURITY", ["fraude", "riesgo", "seguridad", "sospechoso"]],
    ["SALES", ["venta", "cliente", "comprador"]]
  ];

  return topics.find(([, terms]) =>
    terms.some((term) => value.includes(term))
  )?.[0] || "";
}

function getLastTopic(history = []) {
  const recent = getRecentMessages(history, 12);

  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const topic = detectTopic(recent[index].text);

    if (topic) {
      return topic;
    }
  }

  return "";
}

function getLastUserMessage(history = []) {
  return [...history]
    .reverse()
    .find((message) =>
      message?.role === "user" &&
      getText(message)
    );
}

function isFollowUp(question = "") {
  const text = normalize(question);

  return (
    text.length <= 90 &&
    (
      /^(y |pero |entonces |aja |ok |si |no )/.test(text) ||
      /\b(eso|ese|esa|ellos|ellas|ahi|ahora|despues)\b/.test(text) ||
      text.includes("explicamelo") ||
      text.includes("que hago") ||
      text.includes("cuando llega") ||
      text.includes("y el vendedor")
    )
  );
}

export function resolveContextualQuestion({
  question,
  history = []
}) {
  const cleanQuestion = String(question || "").trim();

  if (!cleanQuestion || !isFollowUp(cleanQuestion)) {
    return cleanQuestion;
  }

  const previous = getLastUserMessage(history);
  const topic = getLastTopic(history);

  if (!previous && !topic) {
    return cleanQuestion;
  }

  const contextParts = [];

  if (topic) {
    contextParts.push("Tema previo: " + topic);
  }

  if (previous?.text) {
    contextParts.push(
      "Consulta anterior: " +
      getText(previous).slice(0, 300)
    );
  }

  return cleanQuestion +
    "\n\nContexto conversacional: " +
    contextParts.join(". ");
}

export function buildConversationMemory({
  history = [],
  currentPath = ""
}) {
  const recentMessages =
    getRecentMessages(history, 10);

  return {
    currentTopic: getLastTopic(history) || null,
    currentPath: String(currentPath || ""),
    recentMessages,
    messageCount: recentMessages.length,
    temporary: true
  };
}

/* QSM_FASE13_BLOCK4_REAL_CONTEXT_MEMORY */

function getRecentUserTexts(history = [], limit = 8) {
  return history
    .filter((message) =>
      message?.role === "user" &&
      String(message?.text || "").trim()
    )
    .slice(-limit)
    .map((message) =>
      String(message.text).trim()
    );
}

function detectEntity(history = []) {
  const joined = normalize(
    getRecentUserTexts(history, 10).join(" ")
  );

  const entities = [
    ["iPhone", ["iphone"]],
    ["celular", ["celular", "telefono", "movil"]],
    ["vehículo", ["vehiculo", "carro", "auto", "motor"]],
    ["computadora", ["computadora", "laptop", "pc"]],
    ["producto", ["producto", "publicacion"]],
    ["pedido", ["pedido", "orden", "compra"]]
  ];

  return entities.find(([, terms]) =>
    terms.some((term) => joined.includes(term))
  )?.[0] || "";
}

function detectConversationSubject(history = []) {
  const texts = getRecentUserTexts(history, 10);

  for (let index = texts.length - 1; index >= 0; index -= 1) {
    const value = normalize(texts[index]);

    if (value.includes("iphone")) return "iPhone";
    if (value.includes("celular")) return "celular";
    if (value.includes("producto")) return "producto";
    if (value.includes("pedido")) return "pedido";
    if (value.includes("compra")) return "compra";
    if (value.includes("vendedor")) return "vendedor";
    if (value.includes("pago")) return "pago";
    if (value.includes("disputa")) return "disputa";
  }

  return detectEntity(history);
}

export function getMemoryAwareResponse({
  question,
  history = [],
  user = {}
}) {
  const original = String(question || "").trim();
  const text = normalize(original);
  const topic = getLastTopic(history);
  const subject = detectConversationSubject(history);
  const firstName = String(user?.firstName || "").trim();
  const name = firstName ? ", " + firstName : "";

  if (!text || history.length === 0) {
    return null;
  }

  if (
    text.includes("cuando llega") ||
    text.includes("cuando me llega") ||
    text.includes("fecha de entrega")
  ) {
    const item = subject || "pedido";

    return "Si te refieres al " + item +
      ", revisa su estado en Mis compras. " +
      "La fecha depende de que Finanzas valide el pago y de que Almacén procese la entrega. " +
      "Si todavía no aparece una fecha, verifica primero el estado del pago.";
  }

  if (
    text.includes("y el vendedor") ||
    text.includes("el vendedor no responde") ||
    text.includes("que hago si el vendedor no responde")
  ) {
    return "Si el vendedor no responde, mantén toda la comunicación dentro de QSM. " +
      "Revisa el chat de la operación, evita pagos externos y, si el tiempo de respuesta es excesivo, " +
      "puedes reportar la conversación o abrir una disputa vinculada a la compra.";
  }

  if (
    text.includes("que hago ahora") ||
    text.includes("cual es el siguiente paso") ||
    text.includes("y ahora que hago")
  ) {
    if (topic === "ORDER" || topic === "PAYMENT") {
      return "El siguiente paso es revisar la operación en Mis compras. " +
        "Confirma si el pago está pendiente de Finanzas, validado o enviado a Almacén. " +
        "Ese estado determinará qué debes hacer después.";
    }

    if (topic === "DISPUTE") {
      return "El siguiente paso es abrir o revisar el caso en Disputas. " +
        "Adjunta evidencia, describe lo ocurrido y conserva todos los mensajes dentro de QSM.";
    }

    if (topic === "PRODUCT") {
      return "El siguiente paso es revisar la publicación. " +
        "Confirma título, descripción, precio, fotografías e identificadores antes de publicarla.";
    }

    return "Vamos paso a paso" + name + ". Dime si quieres continuar con la compra, " +
      "el pago, la entrega, el vendedor, una disputa o tu cuenta.";
  }

  if (
    text.includes("explicamelo mejor") ||
    text.includes("no entendi eso") ||
    text.includes("que significa eso")
  ) {
    if (topic === "ORDER") {
      return "Claro. Una orden pasa por varios estados: primero se registra la compra, " +
        "luego Finanzas valida el pago y después Almacén procesa la entrega. " +
        "Hasta que esos pasos no se completen, la fecha puede permanecer pendiente.";
    }

    if (topic === "PAYMENT") {
      return "Claro. El pago se registra primero y luego Finanzas lo revisa. " +
        "Cuando queda validado, la operación continúa hacia Almacén para preparar la entrega.";
    }

    return null;
  }

  if (
    /^(si|aja|ok|oki|dale|entiendo|perfecto)[!. ]*$/.test(text)
  ) {
    return "Perfecto" + name + ". Continuemos desde ahí. " +
      "¿Quieres revisar el estado, el vendedor, el pago o la entrega?";
  }

  return null;
}
