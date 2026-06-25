const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
getMyNotifications,
markAsRead
} = require("../controllers/notification.controller");


router.get(
"/",
authMiddleware,
getMyNotifications
);

router.put(
"/:id/read",
authMiddleware,
markAsRead
);

module.exports = router;