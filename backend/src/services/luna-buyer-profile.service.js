"use strict";

/* QSM_FASE5_1_1_BUYER_PROFILE */

const prisma = require("../utils/prisma");

const PROFILE_KEY = "lunaBuyerProfile";

function createDefaultBuyerProfile(userId) {
  return {
    userId: Number(userId),
    favoriteCategories: [],
    favoriteBrands: [],
    priceRange: {
      minimum: 0,
      maximum: 0,
      average: 0
    },
    viewedProducts: [],
    favoriteProducts: [],
    purchasedProducts: [],
    recentSearches: [],
    preferredLocations: [],
    experienceLevel: "NEW",
    totalSearches: 0,
    totalViews: 0,
    totalFavorites: 0,
    totalPurchases: 0,
    lastActivityAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function readUserSetting(userId) {
  const numericUserId = Number(userId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {
    throw new Error(
      "Se requiere un usuario válido."
    );
  }

  const setting =
    await prisma.userSetting.findUnique({
      where: {
        userId: numericUserId
      }
    });

  const data =
    setting?.data &&
    typeof setting.data === "object" &&
    !Array.isArray(setting.data)
      ? setting.data
      : {};

  return {
    numericUserId,
    data
  };
}

async function getBuyerProfile({
  userId
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : null;

  if (existing) {
    return existing;
  }

  const profile =
    createDefaultBuyerProfile(
      numericUserId
    );

  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    },
    create: {
      userId: numericUserId,
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    }
  });

  return profile;
}

async function resetBuyerProfile({
  userId
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const profile =
    createDefaultBuyerProfile(
      numericUserId
    );

  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    },
    create: {
      userId: numericUserId,
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    }
  });

  return profile;
}

/* QSM_FASE5_1_2_SEARCH_TRACKING */

function normalizeSearch(search = {}) {
  return {
    query: String(search.query || "")
      .trim()
      .slice(0, 180),
    category: String(search.category || "")
      .trim()
      .slice(0, 100),
    brand: String(search.brand || "")
      .trim()
      .slice(0, 100),
    minimumPrice: Math.max(
      0,
      Number(search.minimumPrice || 0)
    ),
    maximumPrice: Math.max(
      0,
      Number(search.maximumPrice || 0)
    ),
    location: String(search.location || "")
      .trim()
      .slice(0, 120),
    resultsCount: Math.max(
      0,
      Number(search.resultsCount || 0)
    ),
    searchedAt: new Date().toISOString()
  };
}

async function recordBuyerSearch({
  userId,
  search
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : createDefaultBuyerProfile(
          numericUserId
        );

  const normalized =
    normalizeSearch(search);

  if (
    !normalized.query &&
    !normalized.category &&
    !normalized.brand
  ) {
    throw new Error(
      "La búsqueda no contiene información válida."
    );
  }

  const profile = {
    ...existing,
    recentSearches: [
      normalized,
      ...(Array.isArray(
        existing.recentSearches
      )
        ? existing.recentSearches
        : [])
    ].slice(0, 30),
    totalSearches:
      Number(existing.totalSearches || 0) + 1,
    lastActivityAt:
      normalized.searchedAt,
    updatedAt:
      normalized.searchedAt
  };

  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    },
    create: {
      userId: numericUserId,
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    }
  });

  return {
    search: normalized,
    profile
  };
}

/* QSM_FASE5_1_3_PRODUCT_VIEWS */

function normalizeViewedProduct(product = {}) {
  const productId = Number(
    product.id ||
    product.productId ||
    0
  );

  return {
    productId:
      Number.isInteger(productId) &&
      productId > 0
        ? productId
        : null,
    title: String(product.title || "")
      .trim()
      .slice(0, 180),
    category: String(product.category || "")
      .trim()
      .slice(0, 100),
    brand: String(product.brand || "")
      .trim()
      .slice(0, 100),
    price: Math.max(
      0,
      Number(product.price || 0)
    ),
    sellerId:
      Number(product.sellerId || 0) || null,
    viewedAt: new Date().toISOString()
  };
}

async function recordViewedProduct({
  userId,
  product
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : createDefaultBuyerProfile(
          numericUserId
        );

  const normalized =
    normalizeViewedProduct(product);

  if (
    !normalized.productId &&
    !normalized.title
  ) {
    throw new Error(
      "El producto no contiene información válida."
    );
  }

  const previousViews =
    Array.isArray(existing.viewedProducts)
      ? existing.viewedProducts
      : [];

  const withoutDuplicate =
    previousViews.filter((item) => {
      if (
        normalized.productId &&
        Number(item.productId) ===
          normalized.productId
      ) {
        return false;
      }

      return String(item.title || "")
        .trim()
        .toLowerCase() !==
        normalized.title.toLowerCase();
    });

  const profile = {
    ...existing,
    viewedProducts: [
      normalized,
      ...withoutDuplicate
    ].slice(0, 50),
    totalViews:
      Number(existing.totalViews || 0) + 1,
    lastActivityAt:
      normalized.viewedAt,
    updatedAt:
      normalized.viewedAt
  };

  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    },
    create: {
      userId: numericUserId,
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    }
  });

  return {
    product: normalized,
    profile
  };
}

/* QSM_FASE5_1_4_FAVORITES */

function normalizeFavoriteProduct(product = {}) {
  const productId = Number(
    product.id ||
    product.productId ||
    0
  );

  return {
    productId:
      Number.isInteger(productId) && productId > 0
        ? productId
        : null,
    title: String(product.title || "").trim().slice(0, 180),
    category: String(product.category || "").trim().slice(0, 100),
    brand: String(product.brand || "").trim().slice(0, 100),
    price: Math.max(0, Number(product.price || 0)),
    sellerId: Number(product.sellerId || 0) || null,
    favoritedAt: new Date().toISOString()
  };
}

async function setFavoriteProduct({
  userId,
  product,
  favorite = true
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : createDefaultBuyerProfile(numericUserId);

  const normalized =
    normalizeFavoriteProduct(product);

  if (!normalized.productId) {
    throw new Error("Se requiere un producto válido.");
  }

  const currentFavorites =
    Array.isArray(existing.favoriteProducts)
      ? existing.favoriteProducts
      : [];

  const withoutProduct =
    currentFavorites.filter(
      (item) =>
        Number(item.productId) !== normalized.productId
    );

  const favoriteProducts =
    favorite
      ? [normalized, ...withoutProduct].slice(0, 100)
      : withoutProduct;

  const now = new Date().toISOString();

  const profile = {
    ...existing,
    favoriteProducts,
    totalFavorites: favoriteProducts.length,
    lastActivityAt: now,
    updatedAt: now
  };

  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    },
    create: {
      userId: numericUserId,
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    }
  });

  return {
    favorite: Boolean(favorite),
    product: normalized,
    profile
  };
}

/* QSM_FASE5_1_5_PURCHASES */

function normalizePurchasedProduct(purchase = {}) {
  const product =
    purchase.product &&
    typeof purchase.product === "object"
      ? purchase.product
      : purchase;

  const productId = Number(
    product.id ||
    product.productId ||
    purchase.productId ||
    0
  );

  const orderId = Number(
    purchase.orderId ||
    purchase.id ||
    0
  );

  return {
    orderId:
      Number.isInteger(orderId) && orderId > 0
        ? orderId
        : null,
    productId:
      Number.isInteger(productId) && productId > 0
        ? productId
        : null,
    title: String(product.title || "").trim().slice(0, 180),
    category: String(product.category || "").trim().slice(0, 100),
    brand: String(product.brand || "").trim().slice(0, 100),
    price: Math.max(
      0,
      Number(
        purchase.total ||
        purchase.amount ||
        product.price ||
        0
      )
    ),
    quantity: Math.max(
      1,
      Number(purchase.quantity || 1)
    ),
    sellerId:
      Number(
        purchase.sellerId ||
        product.sellerId ||
        0
      ) || null,
    status: String(
      purchase.status || "COMPLETED"
    )
      .trim()
      .toUpperCase()
      .slice(0, 60),
    purchasedAt:
      purchase.purchasedAt ||
      purchase.completedAt ||
      new Date().toISOString()
  };
}

async function recordPurchasedProduct({
  userId,
  purchase
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : createDefaultBuyerProfile(numericUserId);

  const normalized =
    normalizePurchasedProduct(purchase);

  if (
    !normalized.productId &&
    !normalized.orderId &&
    !normalized.title
  ) {
    throw new Error(
      "La compra no contiene información válida."
    );
  }

  const currentPurchases =
    Array.isArray(existing.purchasedProducts)
      ? existing.purchasedProducts
      : [];

  const withoutDuplicate =
    currentPurchases.filter((item) => {
      if (
        normalized.orderId &&
        Number(item.orderId) === normalized.orderId
      ) {
        return false;
      }

      return true;
    });

  const purchasedProducts = [
    normalized,
    ...withoutDuplicate
  ].slice(0, 100);

  const now = new Date().toISOString();

  const profile = {
    ...existing,
    purchasedProducts,
    totalPurchases: purchasedProducts.length,
    lastActivityAt: now,
    updatedAt: now
  };

  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    },
    create: {
      userId: numericUserId,
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    }
  });

  return {
    purchase: normalized,
    profile
  };
}

/* QSM_FASE5_1_6_PREFERENCE_CALCULATION */

function countValues(values = []) {
  const counts = new Map();

  values
    .map((value) =>
      String(value || "").trim()
    )
    .filter(Boolean)
    .forEach((value) => {
      const key = value.toUpperCase();

      counts.set(
        key,
        Number(counts.get(key) || 0) + 1
      );
    });

  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count
    }))
    .sort((a, b) => b.count - a.count);
}

function calculatePercentages(items = []) {
  const total =
    items.reduce(
      (sum, item) => sum + item.count,
      0
    );

  if (!total) {
    return [];
  }

  return items
    .slice(0, 10)
    .map((item) => ({
      name: item.name,
      count: item.count,
      percentage: Math.round(
        (item.count / total) * 100
      )
    }));
}

function collectProfileProducts(profile = {}) {
  return [
    ...(Array.isArray(profile.viewedProducts)
      ? profile.viewedProducts
      : []),
    ...(Array.isArray(profile.favoriteProducts)
      ? profile.favoriteProducts
      : []),
    ...(Array.isArray(profile.purchasedProducts)
      ? profile.purchasedProducts
      : [])
  ];
}

async function calculateBuyerPreferences({
  userId
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : createDefaultBuyerProfile(
          numericUserId
        );

  const searches =
    Array.isArray(existing.recentSearches)
      ? existing.recentSearches
      : [];

  const products =
    collectProfileProducts(existing);

  const categories = [
    ...searches.map((item) => item.category),
    ...products.map((item) => item.category)
  ];

  const brands = [
    ...searches.map((item) => item.brand),
    ...products.map((item) => item.brand)
  ];

  const locations =
    searches
      .map((item) => item.location)
      .filter(Boolean);

  const prices = [
    ...products.map((item) =>
      Number(item.price || 0)
    ),
    ...searches.map((item) =>
      Number(item.maximumPrice || 0)
    )
  ].filter(
    (price) =>
      Number.isFinite(price) &&
      price > 0
  );

  const totalActivity =
    Number(existing.totalSearches || 0) +
    Number(existing.totalViews || 0) +
    Number(existing.totalFavorites || 0) +
    Number(existing.totalPurchases || 0);

  let experienceLevel = "NEW";

  if (totalActivity >= 50) {
    experienceLevel = "EXPERT";
  } else if (totalActivity >= 15) {
    experienceLevel = "FREQUENT";
  }

  const now = new Date().toISOString();

  const profile = {
    ...existing,
    favoriteCategories:
      calculatePercentages(
        countValues(categories)
      ),
    favoriteBrands:
      calculatePercentages(
        countValues(brands)
      ),
    preferredLocations:
      calculatePercentages(
        countValues(locations)
      ),
    priceRange: {
      minimum:
        prices.length > 0
          ? Math.min(...prices)
          : 0,
      maximum:
        prices.length > 0
          ? Math.max(...prices)
          : 0,
      average:
        prices.length > 0
          ? Math.round(
              prices.reduce(
                (sum, price) => sum + price,
                0
              ) / prices.length
            )
          : 0
    },
    experienceLevel,
    updatedAt: now
  };

  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    },
    create: {
      userId: numericUserId,
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    }
  });

  return profile;
}

/* QSM_FASE5_1_7_BUYER_INSIGHTS */

function getTopPreference(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const item = items[0];

  return {
    name: item.name || "",
    percentage: Number(item.percentage || 0)
  };
}

async function getBuyerInsights({
  userId
}) {
  const profile =
    await calculateBuyerPreferences({
      userId
    });

  const topCategory =
    getTopPreference(
      profile.favoriteCategories
    );

  const topBrand =
    getTopPreference(
      profile.favoriteBrands
    );

  const topLocation =
    getTopPreference(
      profile.preferredLocations
    );

  const recommendations = [];

  if (topCategory?.name) {
    recommendations.push(
      `Priorizar productos de ${topCategory.name}.`
    );
  }

  if (topBrand?.name) {
    recommendations.push(
      `Mostrar primero opciones de la marca ${topBrand.name}.`
    );
  }

  if (profile.priceRange?.average > 0) {
    recommendations.push(
      `Buscar productos cercanos a RD${profile.priceRange.average}.`
    );
  }

  if (
    Number(profile.totalPurchases || 0) === 0
  ) {
    recommendations.push(
      "Ofrecer orientación adicional antes de la primera compra."
    );
  }

  return {
    userId: profile.userId,
    experienceLevel:
      profile.experienceLevel || "NEW",
    topCategory,
    topBrand,
    topLocation,
    priceRange:
      profile.priceRange || {
        minimum: 0,
        maximum: 0,
        average: 0
      },
    activity: {
      searches:
        Number(profile.totalSearches || 0),
      views:
        Number(profile.totalViews || 0),
      favorites:
        Number(profile.totalFavorites || 0),
      purchases:
        Number(profile.totalPurchases || 0)
    },
    recommendations,
    message:
      recommendations.length > 0
        ? "LUNA ya puede personalizar recomendaciones para este comprador."
        : "LUNA necesita más actividad para conocer mejor al comprador.",
    updatedAt:
      profile.updatedAt || null
  };
}

module.exports = {
  getBuyerProfile,
  resetBuyerProfile,
  recordBuyerSearch,
  recordViewedProduct,
  setFavoriteProduct,
  recordPurchasedProduct,
  calculateBuyerPreferences,
  getBuyerInsights
};
