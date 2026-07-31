const prisma = require("../utils/prisma");

const SELLER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  trustScore: true,
  isVerified: true,
  role: true,
  sellerEnabled: true,
  status: true
};

const parsePositiveInt = (value) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const resolvePrismaUser = async (req) => {
  const possibleIds = [
    req.user?.id,
    req.user?.userId,
    req.user?._id
  ];

  for (const possibleId of possibleIds) {
    const numericId = parsePositiveInt(possibleId);

    if (numericId) {
      const userById = await prisma.user.findUnique({
        where: { id: numericId }
      });

      if (userById) {
        return userById;
      }
    }
  }

  const email = String(req.user?.email || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return null;
  }

  return prisma.user.findUnique({
    where: { email }
  });
};

const serializeSeller = (seller) => {
  if (!seller) {
    return null;
  }

  return {
    ...seller,
    _id: String(seller.id),
    profilePhoto: null,
    avatar: null,
    verificationStatus: seller.isVerified
      ? "APPROVED"
      : "PENDING"
  };
};

const serializeProduct = (product) => {
  if (!product) {
    return null;
  }

  return {
    ...product,
    _id: String(product.id),
    seller: serializeSeller(product.seller)
  };
};

const getFavoriteProducts = async (userId) => {
  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
      product: {
        is: {
          status: {
            not: "DISABLED"
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      product: {
        include: {
          seller: {
            select: SELLER_SELECT
          }
        }
      }
    }
  });

  return favorites.map((favorite) =>
    serializeProduct(favorite.product)
  );
};

const sendError = (res, error, message) => {
  console.error(message, error);

  if (error?.code === "P2003") {
    return res.status(409).json({
      success: false,
      message: "La operación viola una relación existente."
    });
  }

  return res.status(500).json({
    success: false,
    message,
    error:
      process.env.NODE_ENV === "production"
        ? undefined
        : error.message
  });
};

const getFavorites = async (req, res) => {
  try {
    const user = await resolvePrismaUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "El usuario autenticado todavía no existe en Supabase."
      });
    }

    const favorites = await getFavoriteProducts(user.id);

    return res.json({
      success: true,
      count: favorites.length,
      favorites
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Error obteniendo favoritos."
    );
  }
};

const addFavorite = async (req, res) => {
  try {
    const user = await resolvePrismaUser(req);
    const productId = parsePositiveInt(req.params.productId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "El usuario autenticado todavía no existe en Supabase."
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId no es válido."
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        status: true
      }
    });

    if (!product || product.status === "DISABLED") {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado."
      });
    }

    await prisma.favorite.upsert({
      where: {
        userId_productId: {
          userId: user.id,
          productId
        }
      },
      update: {},
      create: {
        userId: user.id,
        productId
      }
    });

    const favorites = await getFavoriteProducts(user.id);

    return res.status(201).json({
      success: true,
      message: "Producto agregado a favoritos.",
      favorites
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Error agregando el producto a favoritos."
    );
  }
};

const removeFavorite = async (req, res) => {
  try {
    const user = await resolvePrismaUser(req);
    const productId = parsePositiveInt(req.params.productId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "El usuario autenticado todavía no existe en Supabase."
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId no es válido."
      });
    }

    await prisma.favorite.deleteMany({
      where: {
        userId: user.id,
        productId
      }
    });

    const favorites = await getFavoriteProducts(user.id);

    return res.json({
      success: true,
      message: "Producto eliminado de favoritos.",
      favorites
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Error eliminando el producto de favoritos."
    );
  }
};

const checkFavorite = async (req, res) => {
  try {
    const user = await resolvePrismaUser(req);
    const productId = parsePositiveInt(req.params.productId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "El usuario autenticado todavía no existe en Supabase."
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId no es válido."
      });
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId
        }
      },
      select: {
        id: true
      }
    });

    return res.json({
      success: true,
      isFavorite: Boolean(favorite)
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Error comprobando el favorito."
    );
  }
};

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite
};
