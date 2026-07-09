const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getConversations,
  createConversation,
  getConversationMessages,
  markConversationAsRead,
  sendMessage,
  editMessage,
  deleteMessage,

  muteConversation,
  archiveConversation,
  blockConversation,
  favoriteConversation,
  addConversationLabel,
  pinMessage,
  searchMessages,
  exportConversation
} = require("../controllers/messages/message.controller");


// ===========================
// Conversaciones
// ===========================

router.get("/conversations", authMiddleware, getConversations);

router.post("/conversations", authMiddleware, createConversation);

router.get(
  "/conversations/:conversationId",
  authMiddleware,
  getConversationMessages
);

router.patch(
  "/conversations/:conversationId/read",
  authMiddleware,
  markConversationAsRead
);

router.patch(
  "/conversations/:conversationId/mute",
  authMiddleware,
  muteConversation
);

router.patch(
  "/conversations/:conversationId/archive",
  authMiddleware,
  archiveConversation
);

router.patch(
  "/conversations/:conversationId/block",
  authMiddleware,
  blockConversation
);

router.patch(
  "/conversations/:conversationId/favorite",
  authMiddleware,
  favoriteConversation
);

router.post(
  "/conversations/:conversationId/labels",
  authMiddleware,
  addConversationLabel
);

// ===========================
// Buscar mensajes
// ===========================

router.get(
  "/search",
  authMiddleware,
  searchMessages
);

router.get(
  "/conversations/:conversationId/export",
  authMiddleware,
  exportConversation
);


// ===========================
// Mensajes
// ===========================

router.post(
  "/",
  authMiddleware,
  sendMessage
);

router.patch(
  "/:messageId",
  authMiddleware,
  editMessage
);

router.delete(
  "/:messageId",
  authMiddleware,
  deleteMessage
);

router.patch(
  "/:messageId/pin",
  authMiddleware,
  pinMessage
);

module.exports = router;