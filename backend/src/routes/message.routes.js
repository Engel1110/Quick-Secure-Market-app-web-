const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  sendMessage,
  getOrderMessages
} = require("../controllers/message.controller");

router.post("/", authMiddleware, sendMessage);
router.get("/order/:orderId", authMiddleware, getOrderMessages);

module.exports = router;