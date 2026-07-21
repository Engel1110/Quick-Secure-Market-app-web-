/*
|--------------------------------------------------------------------------
| Quick Secure Market - Servidor principal
|--------------------------------------------------------------------------
| Ruta esperada:
| backend/src/server.js
|--------------------------------------------------------------------------
*/

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const path = require("path");
const http = require("http");
const mongoose = require("mongoose");

const connectDB = require("./config/db");

const {
  initializeSocket,
  getAllowedOrigins
} = require("./socket");

/*
|--------------------------------------------------------------------------
| Rutas principales
|--------------------------------------------------------------------------
*/

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const settingsRoutes = require("./routes/settings.routes");

const adminRoutes = require("./routes/admin.routes");
const adminSystemSettingRoutes = require(
  "./routes/adminSystemSetting.routes"
);

const productRoutes = require("./routes/product.routes");
const favoriteRoutes = require("./routes/favorite.routes");
const orderRoutes = require("./routes/order.routes");
const reviewRoutes = require("./routes/review.routes");

const warehouseRoutes = require("./routes/warehouse.routes");
const fraudRoutes = require("./routes/fraud.routes");
const disputeRoutes = require("./routes/dispute.routes");
const kycRoutes = require("./routes/kyc.routes");
const verificationRoutes = require("./routes/verification.routes");
const securityRoutes = require("./routes/security.routes");
const vehicleRoutes = require("./routes/vehicle.routes");

const messageRoutes = require("./routes/message.routes");

const messageSearchRoutes = require(
  "./routes/message.search.routes"
);

const conversationOrganizationRoutes = require(
  "./routes/conversation.organization.routes"
);

const notificationRoutes = require(
  "./routes/notification.routes"
);

const shippingRoutes = require("./routes/shipping.routes");
const paymentRoutes = require("./routes/payment.routes");
const uploadRoutes = require("./routes/upload.routes");

/*
|--------------------------------------------------------------------------
| Aplicación HTTP
|--------------------------------------------------------------------------
*/

const app = express();
const server = http.createServer(app);

/*
|--------------------------------------------------------------------------
| Orígenes permitidos
|--------------------------------------------------------------------------
| La lista proviene del mismo módulo que utiliza Socket.IO.
| Esto evita mantener dos configuraciones CORS diferentes.
|--------------------------------------------------------------------------
*/

const allowedOrigins = getAllowedOrigins();

const isOriginAllowed = (origin) => {
  /*
  |--------------------------------------------------------------------------
  | Solicitudes sin Origin
  |--------------------------------------------------------------------------
  | Postman, aplicaciones móviles, llamadas internas y herramientas backend
  | pueden enviar solicitudes sin encabezado Origin.
  |--------------------------------------------------------------------------
  */

  if (!origin) {
    return true;
  }

  const normalizedOrigin = String(origin)
    .trim()
    .replace(/\/$/, "");

  return allowedOrigins.includes(normalizedOrigin);
};

/*
|--------------------------------------------------------------------------
| Proxy
|--------------------------------------------------------------------------
| Necesario cuando la aplicación está detrás de Render, Railway, Nginx,
| Vercel Proxy u otro proxy inverso.
|--------------------------------------------------------------------------
*/

app.set("trust proxy", 1);

/*
|--------------------------------------------------------------------------
| CORS HTTP
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }

      const error = new Error(
        "Origen no permitido por CORS"
      );

      error.statusCode = 403;

      return callback(error);
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
| Seguridad HTTP
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    },

    crossOriginEmbedderPolicy: false
  })
);

/*
|--------------------------------------------------------------------------
| Archivos estáticos
|--------------------------------------------------------------------------
| server.js está ubicado en backend/src/server.js
| uploads está ubicado en backend/uploads
|--------------------------------------------------------------------------
*/

const uploadsPath = path.join(
  __dirname,
  "..",
  "uploads"
);

app.use(
  "/uploads",
  express.static(uploadsPath, {
    maxAge:
      process.env.NODE_ENV === "production"
        ? "1d"
        : 0,

    etag: true,
    fallthrough: true,

    setHeaders(response) {
      response.setHeader(
        "Cross-Origin-Resource-Policy",
        "cross-origin"
      );
    }
  })
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

/*
|--------------------------------------------------------------------------
| Protección contra HTTP Parameter Pollution
|--------------------------------------------------------------------------
*/

app.use(hpp());

/*
|--------------------------------------------------------------------------
| Rate limit global
|--------------------------------------------------------------------------
*/

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max:
    process.env.NODE_ENV === "production"
      ? 500
      : 2000,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Demasiadas solicitudes. Intenta nuevamente más tarde."
  },

  skip(req) {
    return (
      req.path === "/" ||
      req.path === "/api/health" ||
      req.path.startsWith("/uploads/")
    );
  }
});

/*
|--------------------------------------------------------------------------
| Rate limit de autenticación
|--------------------------------------------------------------------------
*/

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max:
    process.env.NODE_ENV === "production"
      ? 25
      : 200,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Demasiados intentos de autenticación. Intenta nuevamente más tarde."
  }
});

app.use(globalLimiter);

/*
|--------------------------------------------------------------------------
| Ruta principal
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Quick Secure Market API funcionando correctamente",
    version: "1.0.0",
    environment:
      process.env.NODE_ENV || "development",
    socket: "active",
    timestamp: new Date().toISOString()
  });
});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  const databaseStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  const databaseStatus =
    databaseStates[
      mongoose.connection.readyState
    ] || "unknown";

  const databaseConnected =
    mongoose.connection.readyState === 1;

  const io = app.get("io");

  return res
    .status(databaseConnected ? 200 : 503)
    .json({
      success: databaseConnected,

      status: databaseConnected
        ? "healthy"
        : "degraded",

      database: databaseStatus,

      socket: io
        ? "active"
        : "inactive",

      environment:
        process.env.NODE_ENV ||
        "development",

      timestamp:
        new Date().toISOString()
    });
});

/*
|--------------------------------------------------------------------------
| Autenticación y usuarios
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
  "/api/settings",
  settingsRoutes
);

/*
|--------------------------------------------------------------------------
| Administración
|--------------------------------------------------------------------------
*/

app.use(
  "/api/admin/system-settings",
  adminSystemSettingRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

/*
|--------------------------------------------------------------------------
| Marketplace
|--------------------------------------------------------------------------
*/

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/favorite",
  favoriteRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/reviews",
  reviewRoutes
);

/*
|--------------------------------------------------------------------------
| Seguridad, almacén y operaciones
|--------------------------------------------------------------------------
*/

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
  "/api/verifications",
  verificationRoutes
);

app.use(
  "/api/security",
  securityRoutes
);

app.use(
  "/api/vehicles",
  vehicleRoutes
);

/*
|--------------------------------------------------------------------------
| Mensajería
|--------------------------------------------------------------------------
| Las rutas específicas deben registrarse ANTES de /api/messages.
| Así evitamos que una ruta dinámica como /:messageId capture "search".
|--------------------------------------------------------------------------
*/

app.use(
  "/api/messages/search",
  messageSearchRoutes
);

app.use(
  "/api/messages/conversations/organization",
  conversationOrganizationRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

/*
|--------------------------------------------------------------------------
| Notificaciones, envíos, pagos y uploads
|--------------------------------------------------------------------------
*/

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
  "/api/upload",
  uploadRoutes
);

/*
|--------------------------------------------------------------------------
| Ruta no encontrada
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
    method: req.method,
    path: req.originalUrl
  });
});

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
    /*
    |--------------------------------------------------------------------------
    | Evitar advertencia por parámetro no utilizado
    |--------------------------------------------------------------------------
    */

    void next;

    console.error("Error global:", {
      message:
        error?.message ||
        "Error desconocido",

      stack:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error?.stack,

      method: req.method,
      path: req.originalUrl
    });

    /*
    |--------------------------------------------------------------------------
    | Error CORS
    |--------------------------------------------------------------------------
    */

    if (
      error?.message ===
        "Origen no permitido por CORS" ||
      error?.message ===
        "Origen no permitido por Socket.IO"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "El origen de la solicitud no está permitido."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Body demasiado grande
    |--------------------------------------------------------------------------
    */

    if (
      error?.type ===
      "entity.too.large"
    ) {
      return res.status(413).json({
        success: false,
        message:
          "La solicitud supera el tamaño permitido."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Errores Multer
    |--------------------------------------------------------------------------
    */

    if (
      error?.name ===
      "MulterError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "No se pudo procesar el archivo."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Error de validación Mongoose
    |--------------------------------------------------------------------------
    */

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Los datos enviados no son válidos.",
        errors:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.errors
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ObjectId inválido
    |--------------------------------------------------------------------------
    */

    if (
      error?.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador enviado no es válido."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Clave duplicada MongoDB
    |--------------------------------------------------------------------------
    */

    if (
      Number(error?.code) === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Ya existe un registro con esos datos."
      });
    }

    const parsedStatusCode = Number(
      error?.statusCode ||
      error?.status ||
      500
    );

    const statusCode =
      Number.isInteger(parsedStatusCode) &&
      parsedStatusCode >= 400 &&
      parsedStatusCode <= 599
        ? parsedStatusCode
        : 500;

    return res.status(statusCode).json({
      success: false,

      message:
        process.env.NODE_ENV ===
          "production" &&
        statusCode >= 500
          ? "Error interno del servidor"
          : error?.message ||
            "Error interno del servidor",

      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error?.stack
    });
  }
);

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
| initializeSocket:
| - crea una única instancia
| - autentica el JWT
| - registra la sala personal
| - registra message.socket.js
| - guarda io mediante app.set("io", io)
|--------------------------------------------------------------------------
*/

const io = initializeSocket(
  server,
  app
);

/*
|--------------------------------------------------------------------------
| Inicio del servidor
|--------------------------------------------------------------------------
*/

const PORT =
  Number(process.env.PORT) ||
  5000;

const startServer = async () => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Variables obligatorias
    |--------------------------------------------------------------------------
    */

    if (
      !process.env.MONGODB_URI &&
      !process.env.MONGO_URI
    ) {
      throw new Error(
        "No se encontró MONGODB_URI ni MONGO_URI en backend/.env."
      );
    }

    if (
      !process.env.JWT_SECRET &&
      !process.env.JWT_ACCESS_SECRET
    ) {
      throw new Error(
        "No se encontró JWT_SECRET ni JWT_ACCESS_SECRET en backend/.env."
      );
    }

    console.log(
      "Conectando con MongoDB..."
    );

    await connectDB();

    if (
      mongoose.connection.readyState !== 1
    ) {
      throw new Error(
        "connectDB terminó, pero Mongoose no quedó conectado."
      );
    }

    server.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Servidor ejecutándose en puerto ${PORT}`
        );

        console.log(
          "MongoDB conectado"
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
          `Orígenes permitidos: ${
            allowedOrigins.join(", ")
          }`
        );
      }
    );
  } catch (error) {
    console.error(
      "No se pudo iniciar el servidor:"
    );

    console.error(
      error?.message ||
      error
    );

    process.exit(1);
  }
};

/*
|--------------------------------------------------------------------------
| Iniciar
|--------------------------------------------------------------------------
*/

startServer();

/*
|--------------------------------------------------------------------------
| Cierre seguro
|--------------------------------------------------------------------------
*/

let isShuttingDown = false;

const scheduleForcedExit = (
  exitCode
) => {
  setTimeout(() => {
    console.error(
      "Cierre forzado después de 10 segundos."
    );

    process.exit(exitCode);
  }, 10000).unref();
};

const closeSocketServer = async () => {
  if (!io) {
    return;
  }

  await new Promise((resolve) => {
    io.close(() => {
      resolve();
    });
  });
};

const closeDatabase = async () => {
  if (
    mongoose.connection.readyState !== 0
  ) {
    await mongoose.connection.close();
  }
};

const shutdown = async (
  signal,
  error = null
) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  const exitCode =
    error ? 1 : 0;

  console.log(
    `${signal}: cerrando servidor de forma segura.`
  );

  if (error) {
    console.error(error);
  }

  scheduleForcedExit(exitCode);

  const finishShutdown =
    async () => {
      try {
        await closeSocketServer();

        console.log(
          "Socket.IO cerrado."
        );
      } catch (socketError) {
        console.error(
          "Error cerrando Socket.IO:",
          socketError.message
        );
      }

      try {
        await closeDatabase();

        console.log(
          "MongoDB desconectado."
        );
      } catch (databaseError) {
        console.error(
          "Error cerrando MongoDB:",
          databaseError.message
        );
      }

      process.exit(exitCode);
    };

  if (!server.listening) {
    await finishShutdown();
    return;
  }

  server.close(
    async (closeError) => {
      if (closeError) {
        console.error(
          "Error cerrando el servidor HTTP:",
          closeError.message
        );
      }

      await finishShutdown();
    }
  );
};

/*
|--------------------------------------------------------------------------
| Errores no controlados
|--------------------------------------------------------------------------
*/

process.on(
  "unhandledRejection",
  (error) => {
    shutdown(
      "Promesa no manejada",
      error
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {
    shutdown(
      "Excepción no controlada",
      error
    );
  }
);

process.on(
  "SIGTERM",
  () => {
    shutdown("SIGTERM");
  }
);

process.on(
  "SIGINT",
  () => {
    shutdown("SIGINT");
  }
);

module.exports = app;