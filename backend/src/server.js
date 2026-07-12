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
const userRoutes = require("./routes/user.routes");

const app = express();
const server = http.createServer(app);

/*
|--------------------------------------------------------------------------
| Orígenes permitidos
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://quick-secure-market-app-web.vercel.app",
  process.env.FRONTEND_URL
]
  .filter(Boolean)
  .map((origin) =>
    String(origin)
      .trim()
      .replace(/\/$/, "")
  );

/*
|--------------------------------------------------------------------------
| Función de validación CORS
|--------------------------------------------------------------------------
*/

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin =
    String(origin)
      .trim()
      .replace(/\/$/, "");

  return allowedOrigins.includes(
    normalizedOrigin
  );
};

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
*/

const io = new Server(server, {
  cors: {
    origin: (
      origin,
      callback
    ) => {
      if (
        isOriginAllowed(origin)
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          "Origen no permitido por Socket.IO"
        )
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  },

  transports: [
    "websocket",
    "polling"
  ]
});

app.set("io", io);

io.on(
  "connection",
  (socket) => {
    console.log(
      "Socket conectado:",
      socket.id
    );

    socket.on(
      "joinConversation",
      (conversationId) => {
        if (!conversationId) {
          return;
        }

        const roomName =
          `conversation:${conversationId}`;

        socket.join(
          roomName
        );

        console.log(
          `Socket ${socket.id} unido a ${roomName}`
        );
      }
    );

    socket.on(
      "leaveConversation",
      (conversationId) => {
        if (!conversationId) {
          return;
        }

        socket.leave(
          `conversation:${conversationId}`
        );
      }
    );

    socket.on(
      "joinUserRoom",
      (userId) => {
        if (!userId) {
          return;
        }

        socket.join(
          `user:${userId}`
        );
      }
    );

    socket.on(
      "leaveUserRoom",
      (userId) => {
        if (!userId) {
          return;
        }

        socket.leave(
          `user:${userId}`
        );
      }
    );

    socket.on(
      "typing",
      ({
        conversationId,
        userId
      } = {}) => {
        if (
          !conversationId
        ) {
          return;
        }

        socket
          .to(
            `conversation:${conversationId}`
          )
          .emit(
            "typing",
            {
              conversationId,
              userId
            }
          );
      }
    );

    socket.on(
      "stopTyping",
      ({
        conversationId,
        userId
      } = {}) => {
        if (
          !conversationId
        ) {
          return;
        }

        socket
          .to(
            `conversation:${conversationId}`
          )
          .emit(
            "stopTyping",
            {
              conversationId,
              userId
            }
          );
      }
    );

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "Socket desconectado:",
          socket.id,
          reason
        );
      }
    );

    socket.on(
      "error",
      (error) => {
        console.error(
          "Error de Socket.IO:",
          error.message
        );
      }
    );
  }
);

/*
|--------------------------------------------------------------------------
| Base de datos
|--------------------------------------------------------------------------
*/

connectDB();

/*
|--------------------------------------------------------------------------
| Configuración de confianza proxy
|--------------------------------------------------------------------------
| Necesario en Render, Vercel proxy, Nginx o servicios similares para que
| express-rate-limit pueda identificar correctamente la IP del cliente.
|--------------------------------------------------------------------------
*/

app.set(
  "trust proxy",
  1
);

/*
|--------------------------------------------------------------------------
| CORS HTTP
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {
      if (
        isOriginAllowed(origin)
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          "Origen no permitido por CORS"
        )
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ],

    exposedHeaders: [
      "Content-Length"
    ],

    maxAge: 86400
  })
);

/*
|--------------------------------------------------------------------------
| Seguridad
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    },

    crossOriginEmbedderPolicy:
      false
  })
);

/*
|--------------------------------------------------------------------------
| Archivos estáticos
|--------------------------------------------------------------------------
| server.js está en backend/src/server.js
| La carpeta real es backend/uploads
|--------------------------------------------------------------------------
*/

const uploadsPath =
  path.join(
    __dirname,
    "..",
    "uploads"
  );

app.use(
  "/uploads",
  express.static(
    uploadsPath,
    {
      maxAge:
        process.env.NODE_ENV ===
        "production"
          ? "1d"
          : 0,

      etag: true,

      fallthrough: true,

      setHeaders: (
        response
      ) => {
        response.setHeader(
          "Cross-Origin-Resource-Policy",
          "cross-origin"
        );
      }
    }
  )
);

/*
|--------------------------------------------------------------------------
| Parsers
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb"
  })
);

app.use(hpp());

/*
|--------------------------------------------------------------------------
| Rate limit global
|--------------------------------------------------------------------------
*/

const globalLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max:
      process.env.NODE_ENV ===
      "production"
        ? 500
        : 2000,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      success: false,
      message:
        "Demasiadas solicitudes. Intenta nuevamente más tarde."
    },

    skip: (req) => {
      return (
        req.path === "/" ||
        req.path.startsWith(
          "/uploads/"
        )
      );
    }
  });

/*
|--------------------------------------------------------------------------
| Rate limit autenticación
|--------------------------------------------------------------------------
*/

const authLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max:
      process.env.NODE_ENV ===
      "production"
        ? 25
        : 200,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      success: false,
      message:
        "Demasiados intentos de autenticación. Intenta nuevamente más tarde."
    }
  });

app.use(
  globalLimiter
);

/*
|--------------------------------------------------------------------------
| Ruta principal y salud
|--------------------------------------------------------------------------
*/

app.get(
  "/",
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        "Quick Secure Market API funcionando correctamente",
      version:
        "1.0.0",
      environment:
        process.env.NODE_ENV ||
        "development",
      socket:
        "active",
      timestamp:
        new Date().toISOString()
    });
  }
);

app.get(
  "/api/health",
  (req, res) => {
    res.status(200).json({
      success: true,
      status:
        "healthy",
      database:
        "configured",
      socket:
        "active",
      timestamp:
        new Date().toISOString()
    });
  }
);

/*
|--------------------------------------------------------------------------
| Rutas
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authLimiter,
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/reviews",
  reviewRoutes
);

app.use(
  "/api/warehouse",
  warehouseRoutes
);

app.use(
  "/api/fraud",
  fraudRoutes
);

app.use(
  "/api/disputes",
  disputeRoutes
);

app.use(
  "/api/kyc",
  kycRoutes
);

app.use(
  "/api/security",
  securityRoutes
);

app.use(
  "/api/vehicles",
  vehicleRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/shipping",
  shippingRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/upload",
  uploadRoutes
);

app.use(
  "/api/favorite",
  favoriteRoutes
);

/*
|--------------------------------------------------------------------------
| Ruta de prueba temporal
|--------------------------------------------------------------------------
*/

app.get(
  "/api/favorite-test",
  (req, res) => {
    res.status(200).json({
      success: true,
      ok: true,
      message:
        "Favorite test funcionando"
    });
  }
);

/*
|--------------------------------------------------------------------------
| Ruta no encontrada
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    return res
      .status(404)
      .json({
        success: false,
        message:
          "Ruta no encontrada",
        method:
          req.method,
        path:
          req.originalUrl
      });
  }
);

/*
|--------------------------------------------------------------------------
| Manejador global de errores
|--------------------------------------------------------------------------
*/

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Error global:",
      {
        message:
          error.message,

        stack:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.stack,

        method:
          req.method,

        path:
          req.originalUrl
      }
    );

    if (
      error.message ===
      "Origen no permitido por CORS"
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "El origen de la solicitud no está permitido."
        });
    }

    if (
      error.type ===
      "entity.too.large"
    ) {
      return res
        .status(413)
        .json({
          success: false,
          message:
            "La solicitud supera el tamaño permitido."
        });
    }

    if (
      error.name ===
      "MulterError"
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            error.message ||
            "No se pudo procesar el archivo."
        });
    }

    const statusCode =
      Number(
        error.status ||
        error.statusCode ||
        500
      );

    return res
      .status(
        statusCode
      )
      .json({
        success: false,

        message:
          process.env.NODE_ENV ===
          "production" &&
          statusCode >= 500
            ? "Error interno del servidor"
            : error.message ||
              "Error interno del servidor",

        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.stack
      });
  }
);

/*
|--------------------------------------------------------------------------
| Inicio del servidor
|--------------------------------------------------------------------------
*/

const PORT =
  Number(
    process.env.PORT
  ) || 5000;

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Servidor ejecutándose en puerto ${PORT}`
    );

    console.log(
      "Socket.IO activo"
    );

    console.log(
      `Entorno: ${
        process.env.NODE_ENV ||
        "development"
      }`
    );

    console.log(
      `Uploads disponibles en: ${uploadsPath}`
    );

    console.log(
      `Orígenes permitidos: ${allowedOrigins.join(
        ", "
      )}`
    );
  }
);

/*
|--------------------------------------------------------------------------
| Errores no controlados
|--------------------------------------------------------------------------
*/

process.on(
  "unhandledRejection",
  (error) => {
    console.error(
      "Promesa no manejada:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "Excepción no controlada:",
      error
    );
  }
);

module.exports = app;