/*
En tu server.js realiza estos cambios:

1) Imports:
const http = require("http");
const { initializeSocket } = require("./socket");

2) Después de const app = express();
const httpServer = http.createServer(app);

3) Después de configurar middleware, CORS y rutas:
initializeSocket(httpServer, app);

4) Reemplaza app.listen(PORT, callback) por:
httpServer.listen(PORT, callback);
*/

const http = require("http");
const { initializeSocket } = require("./socket");

function startServerWithSocket(app, port, callback) {
  const httpServer = http.createServer(app);
  initializeSocket(httpServer, app);
  return httpServer.listen(port, callback);
}

module.exports = { startServerWithSocket };
