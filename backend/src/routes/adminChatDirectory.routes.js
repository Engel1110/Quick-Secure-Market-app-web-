"use strict";

const express = require("express");
const router = express.Router();

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  searchChatDirectory
} = require(
  "../controllers/adminChatDirectory.controller"
);

router.use(authMiddleware);

router.get(
  "/",
  searchChatDirectory
);

module.exports = router;
