const prisma = require("../utils/prisma");

const {
  generateQsmCode,
  generatePhotoHash
} = require("../utils/qsmCodeGenerator");

const { analyzeProductRisk } = require("../utils/fraudEngine");

const createProduct = async (req, res) => {
  try {
    const { title, description, price, category, condition, imageUrl } = req.body;

    if (!title || !description || !price || !category || !condition) {
      return res.status(400).json({
        message: "Título, descripción, precio, categoría y condición son obligatorios"
      });
    }

    const photoHash = imageUrl ? generatePhotoHash(imageUrl) : null;

    if (photoHash) {
      const existingImage = await prisma.product.findUnique({
        where: { photoHash }
      });

      if (existingImage) {
        await prisma.fraudAlert.create({
          data: {
            productId: existingImage.id,
            type: "REUSED_IMAGE",
            level: "HIGH",
            message: "Intento de reutilizar una imagen ya registrada en QSM."
          }
        });

        return res.status(400).json({
          message: "Esta imagen ya fue utilizada en otro producto. Debes tomar una foto real nueva desde la app."
        });
      }
    }

    const seller = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const riskAlerts = analyzeProductRisk({
      title,
      category,
      price,
      condition,
      seller
    });

    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: Number(price),
        category,
        condition,
        imageUrl,
        qsmCode: generateQsmCode(category, title),
        photoHash,
        verificationStatus: "PENDING",
        cameraRequired: true,
        resaleAllowed: false,
        certified: false,
        status: "PENDING",
        sellerId: req.user.id
      },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isVerified: true,
            trustScore: true,
            status: true
          }
        },
        fraudAlerts: true
      }
    });

    if (riskAlerts.length > 0) {
      await prisma.fraudAlert.createMany({
        data: riskAlerts.map((alert) => ({
          productId: product.id,
          type: alert.type,
          level: alert.level,
          message: alert.message
        }))
      });
    }

    const productWithAlerts = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isVerified: true,
            trustScore: true,
            status: true
          }
        },
        fraudAlerts: true
      }
    });

    return res.status(201).json({
      message: "Producto creado correctamente y enviado a verificación QSM",
      product: productWithAlerts
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error creando producto"
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isVerified: true,
            trustScore: true,
            status: true
          }
        },
        fraudAlerts: true
      }
    });

    return res.json({
      count: products.length,
      products
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error obteniendo productos"
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isVerified: true,
            trustScore: true,
            status: true,
            createdAt: true
          }
        },
        warehouse: true,
        fraudAlerts: true
      }
    });

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    return res.json({
      product
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error obteniendo producto"
    });
  }
};

const getMyProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        sellerId: req.user.id
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        fraudAlerts: true,
        warehouse: true
      }
    });

    return res.json({
      count: products.length,
      products
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error obteniendo mis productos"
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    if (product.sellerId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "No tienes permiso para editar este producto"
      });
    }

    const {
      title,
      description,
      price,
      category,
      condition,
      imageUrl,
      status,
      certified,
      verificationStatus,
      resaleAllowed,
      previousQsmCode
    } = req.body;

    let photoHash = product.photoHash;

    if (imageUrl && imageUrl !== product.imageUrl) {
      photoHash = generatePhotoHash(imageUrl);

      const existingImage = await prisma.product.findFirst({
        where: {
          photoHash,
          id: {
            not: productId
          }
        }
      });

      if (existingImage) {
        await prisma.fraudAlert.create({
          data: {
            productId: existingImage.id,
            type: "REUSED_IMAGE",
            level: "HIGH",
            message: "Intento de actualizar producto usando una imagen ya registrada en QSM."
          }
        });

        return res.status(400).json({
          message: "Esta imagen ya fue utilizada en otro producto. Debes usar una imagen nueva."
        });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        title: title ?? product.title,
        description: description ?? product.description,
        price: price ? Number(price) : product.price,
        category: category ?? product.category,
        condition: condition ?? product.condition,
        imageUrl: imageUrl ?? product.imageUrl,
        photoHash,
        status: status ?? product.status,
        certified: certified ?? product.certified,
        verificationStatus: verificationStatus ?? product.verificationStatus,
        resaleAllowed: resaleAllowed ?? product.resaleAllowed,
        previousQsmCode: previousQsmCode ?? product.previousQsmCode
      }
    });

    return res.json({
      message: "Producto actualizado correctamente",
      product: updatedProduct
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error actualizando producto"
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    if (product.sellerId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "No tienes permiso para eliminar este producto"
      });
    }

    await prisma.product.delete({
      where: { id: productId }
    });

    return res.json({
      message: "Producto eliminado correctamente"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error eliminando producto"
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getMyProducts,
  updateProduct,
  deleteProduct
};