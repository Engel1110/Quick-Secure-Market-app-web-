const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const reviewRoutes = require("./routes/review.routes");
const warehouseRoutes = require("./routes/warehouse.routes");
const fraudRoutes = require("./routes/fraud.routes");
const disputeRoutes = require("./routes/dispute.routes");
const kycRoutes = require("./routes/kyc.routes");
const securityRoutes = require("./routes/security.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const messageRoutes = require("./routes/message.routes");
const notificationRoutes = require("./routes/notification.routes");
const shippingRoutes = require("./routes/shipping.routes");
const paymentRoutes = require("./routes/payment.routes");
const adminRoutes = require("./routes/admin.routes");
const uploadRoutes = require("./routes/upload.routes");
const favoriteRoutes = require("./routes/favorite.routes");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://quick-secure-market-app-web.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket conectado:", socket.id);

  socket.on("joinConversation", (conversationId) => {
    if (conversationId) {
      socket.join(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} unido a conversation:${conversationId}`);
    }
  });

  socket.on("leaveConversation", (conversationId) => {
    if (conversationId) {
      socket.leave(`conversation:${conversationId}`);
    }
  });

  socket.on("typing", ({ conversationId, userId }) => {
    socket.to(`conversation:${conversationId}`).emit("typing", {
      conversationId,
      userId
    });
  });

  socket.on("stopTyping", ({ conversationId, userId }) => {
    socket.to(`conversation:${conversationId}`).emit("stopTyping", {
      conversationId,
      userId
    });
  });

  socket.on("disconnect", () => {
    console.log("Socket desconectado:", socket.id);
  });
});

connectDB();

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(hpp());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiadas solicitudes. Intenta nuevamente más tarde."
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiados intentos de autenticación. Intenta nuevamente más tarde."
  }
});

app.use(globalLimiter);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Quick Secure Market API funcionando correctamente",
    version: "1.0.0"
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/fraud", fraudRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/favorite", favoriteRoutes);

app.get("/api/favorite-test", (req, res) => {
  res.json({ ok: true, message: "Favorite test funcionando" });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada"
  });
});

app.use((error, req, res, next) => {
  console.error("Error global:", error.message);

  res.status(error.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Error interno del servidor"
        : error.message
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log("Socket.IO activo");
});

module.exports = app;