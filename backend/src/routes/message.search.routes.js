const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const controller = require("../controllers/messages/messageSearch.controller");
router.use(authMiddleware);
router.get("/messages", controller.searchMessages);
router.get("/conversations", controller.searchConversations);
module.exports = router;
