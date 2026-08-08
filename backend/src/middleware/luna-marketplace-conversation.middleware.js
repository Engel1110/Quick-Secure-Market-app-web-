"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA MARKETPLACE CONVERSATION ENGINE
|--------------------------------------------------------------------------
| Fase 17 Bloque 8 FIX
|--------------------------------------------------------------------------
*/

const prisma =
  require("../utils/prisma");

const VERSION =
  "LUNA-MARKETPLACE-CONVERSATION-17.8-FIX";

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
      /[¿?¡!,.;:()[\]{}]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function formatMoney(value) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(amount)
  ) {
    return null;
  }

  return new Intl.NumberFormat(
    "es-DO",
    {
      style: "currency",
      currency: "DOP",
      maximumFractionDigits: 0
    }
  ).format(amount);
}

function getConversationCollections(req) {
  return [
    req?.body?.conversation,
    req?.body?.history,
    req?.body?.context?.conversation,
    req?.body?.context?.recentMessages
  ].filter(Array.isArray);
}

function extractConversationItems(req) {
  const result = [];

  getConversationCollections(req)
    .forEach((collection) => {
      collection.forEach((item) => {
        const role =
          String(
            item?.role ||
            item?.sender ||
            ""
          ).toLowerCase();

        const content =
          String(
            item?.content ||
            item?.text ||
            item?.message ||
            ""
          ).trim();

        if (content) {
          result.push({
            role,
            content
          });
        }
      });
    });

  return result;
}

/* =========================================================
   PRIORIDAD CORREGIDA
========================================================= */

function detectConversationIntent(message) {
  const text =
    normalizeText(message);

  if (!text) {
    return null;
  }

  /*
    1. Verificación de vendedor ANTES de "ese/esa".
  */
  if (
    [
      "esta verificado",
      "está verificado",
      "vendedor verificado",
      "ese vendedor esta verificado",
      "ese vendedor está verificado",
      "esa vendedora esta verificada",
      "esa vendedora está verificada"
    ].some((value) =>
      text.includes(
        normalizeText(value)
      )
    )
  ) {
    return "SELLER_VERIFICATION";
  }

  /*
    2. Explicación de recomendación.
  */
  if (
    [
      "por que ese",
      "porque ese",
      "por que me recomiendas ese",
      "porque me recomiendas ese",
      "por que ese producto",
      "porque ese producto"
    ].some((value) =>
      text.includes(
        normalizeText(value)
      )
    )
  ) {
    return "WHY";
  }

  /*
    3. Posiciones.
  */
  if (
    [
      "el primero",
      "la primera",
      "primer producto",
      "opcion 1",
      "opción 1"
    ].some((value) =>
      text.includes(
        normalizeText(value)
      )
    )
  ) {
    return "FIRST";
  }

  if (
    [
      "el segundo",
      "la segunda",
      "segundo producto",
      "opcion 2",
      "opción 2"
    ].some((value) =>
      text.includes(
        normalizeText(value)
      )
    )
  ) {
    return "SECOND";
  }

  if (
    [
      "el tercero",
      "la tercera",
      "tercer producto",
      "opcion 3",
      "opción 3"
    ].some((value) =>
      text.includes(
        normalizeText(value)
      )
    )
  ) {
    return "THIRD";
  }

  /*
    4. Alternativa económica.
  */
  if (
    [
      "mas barato",
      "más barato",
      "uno mas barato",
      "uno más barato",
      "quiero gastar menos",
      "algo mas barato",
      "algo más barato",
      "menor precio"
    ].some((value) =>
      text.includes(
        normalizeText(value)
      )
    )
  ) {
    return "CHEAPER";
  }

  /*
    5. Alternativa más confiable.
  */
  if (
    [
      "mas confiable",
      "más confiable",
      "uno mas seguro",
      "uno más seguro",
      "mejor vendedor",
      "mas confianza",
      "más confianza"
    ].some((value) =>
      text.includes(
        normalizeText(value)
      )
    )
  ) {
    return "MORE_TRUSTED";
  }

  /*
    6. Referencia genérica SIEMPRE al final.
  */
  if (
    [
      "ese",
      "esa",
      "ese producto",
      "esa opcion",
      "esa opción",
      "el recomendado",
      "la recomendada"
    ].some((value) =>
      text === normalizeText(value) ||
      text.includes(
        normalizeText(value)
      )
    )
  ) {
    return "CURRENT";
  }

  return null;
}

function extractProductsFromBody(req) {
  const candidates = [
    req?.body?.context?.marketplace?.products,
    req?.body?.context?.recommendation?.products,
    req?.body?.marketplace?.products,
    req?.body?.recommendation?.products
  ];

  for (
    const collection
    of candidates
  ) {
    if (
      Array.isArray(collection) &&
      collection.length
    ) {
      return collection;
    }
  }

  return [];
}

function findProductIdsInConversation(req) {
  const messages =
    extractConversationItems(req);

  const ids =
    new Set();

  messages.forEach((item) => {
    const matches =
      item.content.match(
        /(?:producto|id|#)\s*(\d+)/gi
      );

    if (!matches) {
      return;
    }

    matches.forEach((match) => {
      const number =
        Number(
          match.replace(
            /\D/g,
            ""
          )
        );

      if (
        Number.isSafeInteger(number) &&
        number > 0
      ) {
        ids.add(number);
      }
    });
  });

  return Array
    .from(ids)
    .slice(-5);
}

async function loadProductsByIds(ids) {
  if (!ids.length) {
    return [];
  }

  return prisma.product.findMany({
    where: {
      id: {
        in: ids
      },

      status:
        "ACTIVE",

      deletedAt:
        null
    },

    select: {
      id: true,
      qsmCode: true,
      title: true,
      price: true,
      brand: true,
      model: true,
      condition: true,
      isQsmVerified: true,
      confidenceScore: true,
      riskLevel: true,

      seller: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          trustScore: true,
          isVerified: true,
          verificationStatus: true
        }
      }
    }
  });
}

function sellerTrust(product) {
  const score =
    Number(
      product?.seller?.trustScore
    );

  return Number.isFinite(score)
    ? score
    : 0;
}

function sellerVerified(product) {
  return Boolean(
    product?.seller?.isVerified
  ) ||
  String(
    product?.seller?.verificationStatus ||
    ""
  ).toUpperCase() ===
    "APPROVED";
}

function productVerified(product) {
  return Boolean(
    product?.isQsmVerified
  );
}

function describeProduct(product) {
  if (!product) {
    return null;
  }

  let text =
    `"${product.title}"`;

  const price =
    formatMoney(
      product.price
    );

  if (price) {
    text +=
      ` por ${price}`;
  }

  const trust =
    sellerTrust(product);

  if (trust > 0) {
    text +=
      `, vendedor con ${trust}/100 de confianza`;
  }

  if (
    sellerVerified(product)
  ) {
    text +=
      ", vendedor verificado";
  }

  if (
    productVerified(product)
  ) {
    text +=
      ", producto verificado por QSM";
  }

  return text;
}

function rankCheaper(products) {
  return [...products]
    .filter((item) =>
      Number.isFinite(
        Number(item?.price)
      )
    )
    .sort(
      (a, b) =>
        Number(a.price) -
        Number(b.price)
    );
}

function rankTrusted(products) {
  return [...products]
    .sort((a, b) => {
      if (
        sellerVerified(a) !==
        sellerVerified(b)
      ) {
        return (
          Number(
            sellerVerified(b)
          ) -
          Number(
            sellerVerified(a)
          )
        );
      }

      return (
        sellerTrust(b) -
        sellerTrust(a)
      );
    });
}

function buildResponse({
  intent,
  products
}) {
  if (!products.length) {
    return null;
  }

  const current =
    products[0];

  switch (intent) {

    case "FIRST":
      return (
        `La primera opción es ${describeProduct(
          products[0]
        )}.`
      );

    case "SECOND":
      if (!products[1]) {
        return (
          "Solo tengo una opción disponible en el contexto actual."
        );
      }

      return (
        `La segunda opción es ${describeProduct(
          products[1]
        )}.`
      );

    case "THIRD":
      if (!products[2]) {
        return (
          "No tengo una tercera opción en el contexto actual."
        );
      }

      return (
        `La tercera opción es ${describeProduct(
          products[2]
        )}.`
      );

    case "CURRENT":
      return (
        `Sí, te refieres a ${describeProduct(
          current
        )}. ¿Quieres que lo compare con otra opción?`
      );

    case "WHY": {
      const reasons = [];

      if (
        productVerified(current)
      ) {
        reasons.push(
          "está verificado por QSM"
        );
      }

      if (
        sellerVerified(current)
      ) {
        reasons.push(
          "el vendedor está verificado"
        );
      }

      const trust =
        sellerTrust(current);

      if (trust >= 80) {
        reasons.push(
          `el vendedor tiene ${trust}/100 de confianza`
        );
      }

      const confidence =
        Number(
          current?.confidenceScore
        );

      if (
        Number.isFinite(confidence) &&
        confidence > 0
      ) {
        reasons.push(
          `el producto tiene ${confidence}/100 de confianza interna`
        );
      }

      if (!reasons.length) {
        return (
          "Te lo recomendé porque era una de las mejores opciones disponibles dentro de los datos actuales de QSM."
        );
      }

      return (
        `Te recomiendo ${current.title} principalmente porque ${reasons.join(
          ", "
        )}.`
      );
    }

    case "CHEAPER": {
      const ranked =
        rankCheaper(products);

      const best =
        ranked[0];

      return (
        `Si quieres gastar menos, la opción más económica del grupo es ${describeProduct(
          best
        )}.`
      );
    }

    case "MORE_TRUSTED": {
      const ranked =
        rankTrusted(products);

      const best =
        ranked[0];

      return (
        `Si priorizamos confianza, escogería ${describeProduct(
          best
        )}.`
      );
    }

    case "SELLER_VERIFICATION":
      if (
        sellerVerified(current)
      ) {
        return (
          `Sí. El vendedor de ${current.title} está verificado en QSM y tiene ${sellerTrust(
            current
          )}/100 de confianza.`
        );
      }

      return (
        `El vendedor de ${current.title} no aparece como verificado actualmente. Su confianza es ${sellerTrust(
          current
        )}/100.`
      );

    default:
      return null;
  }
}

function sendAnswer({
  req,
  res,
  intent,
  answer,
  products
}) {
  return res
    .status(200)
    .json({
      success: true,

      assistant:
        "LUNA",

      provider:
        "QSM_MARKETPLACE_CONVERSATION",

      model:
        VERSION,

      answer,

      response:
        answer,

      contextual:
        true,

      result: {
        assistant:
          "LUNA",

        intent: {
          code:
            `MARKETPLACE_CONTEXT_${intent}`,

          confidence:
            100
        },

        message:
          answer,

        referencedProducts:
          products
            .slice(0, 3)
            .map((item) => ({
              id:
                item.id,

              title:
                item.title,

              price:
                item.price,

              sellerTrustScore:
                sellerTrust(item),

              sellerVerified:
                sellerVerified(item),

              qsmVerified:
                productVerified(item)
            })),

        contextLoaded:
          true,

        memoryEnabled:
          true,

        generatedAt:
          new Date()
            .toISOString(),

        version:
          VERSION
      }
    });
}

async function lunaMarketplaceConversation(
  req,
  res,
  next
) {
  const message =
    String(
      req?.body?.message ||
      ""
    ).trim();

  const intent =
    detectConversationIntent(
      message
    );

  if (!intent) {
    return next();
  }

  try {
    let products =
      extractProductsFromBody(req);

    if (!products.length) {
      const ids =
        findProductIdsInConversation(req);

      products =
        await loadProductsByIds(ids);
    }

    if (!products.length) {
      console.log(
        `[LUNA MARKETPLACE CONTEXT] ${intent} sin productos en memoria.`
      );

      return next();
    }

    const answer =
      buildResponse({
        intent,
        products
      });

    if (!answer) {
      return next();
    }

    console.log(
      `[LUNA MARKETPLACE CONTEXT] RESPONDIDO ${intent}`
    );

    return sendAnswer({
      req,
      res,
      intent,
      answer,
      products
    });
  } catch (error) {
    console.error(
      "[LUNA MARKETPLACE CONTEXT][ERROR]",
      {
        name:
          error?.name,

        message:
          error?.message,

        code:
          error?.code
      }
    );

    return next();
  }
}

module.exports = {
  lunaMarketplaceConversation,
  detectConversationIntent,
  buildResponse
};
