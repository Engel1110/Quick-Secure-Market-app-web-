const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Creando datos iniciales QSM...");

  await prisma.fraudAlert.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "QSM",
      email: "admin@qsm.com",
      password: adminPassword,
      phone: "8090000000",
      documentId: "00000000000",
      role: "ADMIN",
      buyerEnabled: true,
      sellerEnabled: true,
      isVerified: true,
      trustScore: 100,
      status: "VERIFIED"
    }
  });

  const comprador = await prisma.user.create({
    data: {
      firstName: "Juan",
      lastName: "Pérez",
      email: "comprador@qsm.com",
      password: userPassword,
      phone: "8291234567",
      documentId: "00112345678",
      role: "USER",
      buyerEnabled: true,
      sellerEnabled: false,
      isVerified: true,
      trustScore: 92,
      status: "VERIFIED"
    }
  });

  const vendedor = await prisma.user.create({
    data: {
      firstName: "Carlos",
      lastName: "Gómez",
      email: "vendedor@qsm.com",
      password: userPassword,
      phone: "8499876543",
      documentId: "00298765432",
      role: "USER",
      buyerEnabled: false,
      sellerEnabled: true,
      isVerified: true,
      trustScore: 88,
      status: "VERIFIED"
    }
  });

  const producto1 = await prisma.product.create({
    data: {
      title: "iPhone 13 Pro 256GB",
      description: "iPhone en buen estado, batería 90%, color Sierra Blue.",
      price: 45000,
      category: "Tecnología",
      condition: "Usado en buen estado",
      imageUrl: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab",
      qsmCode: "QSM-IP13-001",
      certified: true,
      status: "CERTIFIED",
      sellerId: vendedor.id
    }
  });

  const producto2 = await prisma.product.create({
    data: {
      title: "PlayStation 5 Standard",
      description: "Consola PS5 con control original y cables.",
      price: 32000,
      category: "Gaming",
      condition: "Usado en buen estado",
      imageUrl: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db",
      qsmCode: "QSM-PS5-002",
      certified: true,
      status: "CERTIFIED",
      sellerId: vendedor.id
    }
  });

  const producto3 = await prisma.product.create({
    data: {
      title: "Laptop Dell Latitude 5420",
      description: "Laptop empresarial Core i5, 16GB RAM, SSD 256GB.",
      price: 28000,
      category: "Tecnología",
      condition: "Usado en buen estado",
      imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853",
      qsmCode: "QSM-DELL-003",
      certified: false,
      status: "PENDING",
      sellerId: vendedor.id
    }
  });

  await prisma.review.create({
    data: {
      rating: 5,
      comment: "Vendedor responsable, producto entregado en buen estado.",
      reviewerId: comprador.id,
      reviewedId: vendedor.id
    }
  });

  await prisma.review.create({
    data: {
      rating: 5,
      comment: "Comprador serio, completó el proceso correctamente.",
      reviewerId: vendedor.id,
      reviewedId: comprador.id
    }
  });

  await prisma.fraudAlert.create({
    data: {
      productId: producto3.id,
      type: "NEW_ACCOUNT",
      level: "MEDIUM",
      message: "Producto pendiente de certificación en almacén QSM."
    }
  });

  console.log("Seed completado correctamente.");
  console.log("Admin: admin@qsm.com / admin123");
  console.log("Comprador: comprador@qsm.com / 123456");
  console.log("Vendedor: vendedor@qsm.com / 123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });