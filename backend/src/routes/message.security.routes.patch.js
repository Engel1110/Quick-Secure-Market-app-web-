/*
En backend/src/routes/message.routes.js agrega:

const {
  analyzeText,
  analyzeConversation,
  reportMessage
} = require("../controllers/messages/security.controller");

router.post(
  "/security/analyze",
  authMiddleware,
  analyzeText
);

router.get(
  "/conversations/:conversationId/security",
  authMiddleware,
  analyzeConversation
);

router.post(
  "/:messageId/report",
  authMiddleware,
  reportMessage
);

Coloca /security/analyze antes de las rutas dinámicas /:messageId.
*/
