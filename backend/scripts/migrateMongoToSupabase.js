require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const mongoose = require("mongoose");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const userMap = new Map();
const productMap = new Map();
const orderMap = new Map();

async function main() {
  console.log("Conectando a MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log("Conectado a MongoDB");
  console.log("Conectado a Supabase con Prisma");

  console.log("Migrando usuarios...");
  const users = await db.collection("users").find({}).toArray();

  for (const u of users) {
    const created = await prisma.user.create({
      data: {
        firstName: u.firstName || u.name || "Usuario",
        lastName: u.lastName || "",
        email: u.email,
        password: u.password || "NO_PASSWORD",
        phone: u.phone || null,
        documentId: u.documentId || u.cedula || null,
        role: u.role || "USER",
        buyerEnabled: u.buyerEnabled ?? true,
        sellerEnabled: u.sellerEnabled ?? true,
        isVerified: u.isVerified ?? false,
        trustScore: u.trustScore ?? 50,
        status: u.status || "PENDING",
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      },
    });

    userMap.set(String(u._id), created.id);
  }

  console.log(`Usuarios migrados: ${users.length}`);

  console.log("Migrando productos...");
  const products = await db.collection("products").find({}).toArray();

  for (const p of products) {
    const sellerId = userMap.get(String(p.seller || p.sellerId || p.userId));

    if (!sellerId) continue;

    const created = await prisma.product.create({
      data: {
        title: p.title || p.name || "Producto sin título",
        description: p.description || "Sin descripción",
        price: Number(p.price || 0),
        category: p.category || "General",
        condition: p.condition || "Usado",
        imageUrl: p.imageUrl || p.image || null,
        qsmCode: p.qsmCode || `QSM-${String(p._id)}`,
        photoHash: p.photoHash || null,
        verificationStatus: p.verificationStatus || "PENDING",
        cameraRequired: p.cameraRequired ?? false,
        resaleAllowed: p.resaleAllowed ?? false,
        previousQsmCode: p.previousQsmCode || null,
        certified: p.certified ?? false,
        status: p.status || "PENDING",
        sellerId,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      },
    });

    productMap.set(String(p._id), created.id);
  }

  console.log(`Productos encontrados: ${products.length}`);
  console.log(`Productos migrados: ${productMap.size}`);

  console.log("Migrando órdenes...");
  const orders = await db.collection("orders").find({}).toArray();

  for (const o of orders) {
    const productId = productMap.get(String(o.product || o.productId));
    const buyerId = userMap.get(String(o.buyer || o.buyerId));
    const sellerId = userMap.get(String(o.seller || o.sellerId));

    if (!productId || !buyerId || !sellerId) continue;

    const created = await prisma.order.create({
      data: {
        productId,
        buyerId,
        sellerId,
        status: o.status || "PENDING",
        totalAmount: Number(o.totalAmount || o.amount || 0),
        reserveFee: Number(o.reserveFee || 0),
        deliveryPin: o.deliveryPin || "0000",
        paymentStatus: o.paymentStatus || "HELD",
        createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
      },
    });

    orderMap.set(String(o._id), created.id);
  }

  console.log(`Órdenes encontradas: ${orders.length}`);
  console.log(`Órdenes migradas: ${orderMap.size}`);

  console.log("Migración completada.");
}

main()
  .catch((error) => {
    console.error("Error en migración:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await mongoose.disconnect();
  });