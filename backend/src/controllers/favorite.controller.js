import User from "../models/User.js";
import Product from "../models/Product.js";

export const getFavorites = async (req, res) => {
  const userId = req.user.id || req.user._id;

  const user = await User.findById(userId).populate({
    path: "favorites",
    populate: {
      path: "seller",
      select: "firstName lastName email trustScore"
    }
  });

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado." });
  }

  res.json({ favorites: user.favorites || [] });
};

export const addFavorite = async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { productId } = req.params;

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({ message: "Producto no encontrado." });
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { favorites: productId } },
    { new: true }
  ).populate({
    path: "favorites",
    populate: {
      path: "seller",
      select: "firstName lastName email trustScore"
    }
  });

  res.status(201).json({
    message: "Producto agregado a favoritos.",
    favorites: user.favorites || []
  });
};

export const removeFavorite = async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { productId } = req.params;

  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { favorites: productId } },
    { new: true }
  ).populate({
    path: "favorites",
    populate: {
      path: "seller",
      select: "firstName lastName email trustScore"
    }
  });

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado." });
  }

  res.json({
    message: "Producto eliminado de favoritos.",
    favorites: user.favorites || []
  });
};

export const checkFavorite = async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { productId } = req.params;

  const user = await User.findById(userId).select("favorites");

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado." });
  }

  const isFavorite = (user.favorites || []).some(
    (id) => String(id) === String(productId)
  );

  res.json({ isFavorite });
};
