/*
Agrega a message.routes.js:

const {
  messageMediaUpload
} = require("../middleware/messageMediaUpload.middleware");

const {
  uploadMessageMedia
} = require("../controllers/messages/media.controller");

router.post(
  "/media/upload",
  authMiddleware,
  messageMediaUpload.array("files", 8),
  uploadMessageMedia
);

Coloca esta ruta antes de /:messageId.
*/
