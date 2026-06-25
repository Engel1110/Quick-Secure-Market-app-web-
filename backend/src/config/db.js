const mongoose = require("mongoose");
const dns = require("dns");

// Forzar Node.js a usar DNS públicos para resolver MongoDB Atlas SRV
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB conectado correctamente");
  } catch (error) {
    console.error("❌ Error conectando MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;