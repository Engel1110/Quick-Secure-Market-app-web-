const prisma = require("../utils/prisma");

const createWarehouseRecord = async (req, res) => {
  try {
    const { productId, notes } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        productId: Number(productId),
        received: true,
        notes
      },
      include: { product: true }
    });

    return res.status(201).json({
      message: "Producto recibido en almacén QSM",
      warehouse
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error creando registro de almacén" });
  }
};

const updateWarehouseStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { received, inspected, certified, stored, shipped, notes } = req.body;

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        received,
        inspected,
        certified,
        stored,
        shipped,
        notes
      },
      include: { product: true }
    });

    if (certified === true) {
      await prisma.product.update({
        where: { id: warehouse.productId },
        data: {
          certified: true,
          status: "CERTIFIED"
        }
      });
    }

    if (shipped === true) {
      await prisma.product.update({
        where: { id: warehouse.productId },
        data: {
          status: "SHIPPED"
        }
      });
    }

    return res.json({
      message: "Estado de almacén actualizado",
      warehouse
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error actualizando almacén" });
  }
};

const getWarehouseRecords = async (req, res) => {
  try {
    const records = await prisma.warehouse.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: true }
    });

    return res.json({
      count: records.length,
      records
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error obteniendo almacén" });
  }
};

module.exports = {
  createWarehouseRecord,
  updateWarehouseStatus,
  getWarehouseRecords
};