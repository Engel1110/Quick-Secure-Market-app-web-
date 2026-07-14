const mongoose = require("mongoose");
const dns = require("node:dns");

/*
|--------------------------------------------------------------------------
| Servidores DNS
|--------------------------------------------------------------------------
| Ayuda en Windows cuando Node.js falla consultando registros SRV de Atlas,
| aunque nslookup sí funcione.
|--------------------------------------------------------------------------
*/

dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

const connectDB = async () => {
  const mongoUri =
    process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI no está definida en backend/.env"
    );
  }

  if (
    !mongoUri.startsWith(
      "mongodb://"
    ) &&
    !mongoUri.startsWith(
      "mongodb+srv://"
    )
  ) {
    throw new Error(
      "MONGODB_URI no contiene una dirección MongoDB válida."
    );
  }

  try {
    mongoose.set(
      "strictQuery",
      true
    );

    const connection =
      await mongoose.connect(
        mongoUri,
        {
          serverSelectionTimeoutMS:
            20000,

          connectTimeoutMS:
            20000,

          socketTimeoutMS:
            45000,

          maxPoolSize:
            10,

          minPoolSize:
            0,

          retryWrites:
            true
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
      "❌ Error activo de MongoDB:",
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