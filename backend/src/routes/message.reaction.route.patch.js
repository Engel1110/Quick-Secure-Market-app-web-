/* Agrega al archivo backend/src/routes/message.routes.js */

const {
  reactToMessage
} = require("../controllers/messages/reaction.controller");

router.patch(
  "/:messageId/reaction",
  authMiddleware,
  reactToMessage
);
