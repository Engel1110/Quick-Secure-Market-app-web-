const mongoose = require("mongoose");
const dns = require("node:dns");

/*
|--------------------------------------------------------------------------
| DNS
|--------------------------------------------------------------------------
| Fuerza a Node a utilizar los mismos DNS configurados en Windows.
|--------------------------------------------------------------------------
*/

try {
  const servers = dns.getServers();

  if (
    servers.length === 1 &&
    servers[0] === "127.0.0.1"
  ) {
    dns.setServers([
      "192.168.130.1",
      "8.8.8.8",
      "1.1.1.1"
    ]);
  }
} catch (err) {
  console.warn(
    "No fue posible configurar DNS:",
    err.message
  );
}

const connectDB = async () => {
  const mongoUri =
    process.env.MONGODB_URI?.trim() ||
    process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI o MONGO_URI no está definida."
    );
  }

  if (
    !mongoUri.startsWith("mongodb://") &&
    !mongoUri.startsWith("mongodb+srv://")
  ) {
    throw new Error(
      "URI de MongoDB inválida."
    );
  }

  try {
    mongoose.set("strictQuery", true);

    const connection =
      await mongoose.connect(
        mongoUri,
        {
          serverSelectionTimeoutMS: 30000,
          connectTimeoutMS: 30000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          minPoolSize: 0,
          retryWrites: true
        }
      );

    console.log(
      "✅ MongoDB conectado correctamente"
    );

    console.log(
      `📦 Base de datos: ${connection.connection.name}`
    );

    console.log(
      `🌐 Servidor: ${connection.connection.host}`
    );

    return connection;
  } catch (error) {
    console.error(
      "❌ Error conectando MongoDB:",
      error.message
    );

    throw error;
  }
};

mongoose.connection.on(
  "error",
  (error) => {
    console.error(
      "❌ Error activo MongoDB:",
      error.message
    );
  }
);

mongoose.connection.on(
  "disconnected",
  () => {
    console.warn(
      "⚠️ MongoDB desconectado"
    );
  }
);

mongoose.connection.on(
  "reconnected",
  () => {
    console.log(
      "✅ MongoDB reconectado"
    );
  }
);

module.exports = connectDB;