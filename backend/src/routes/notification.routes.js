const express = require("express");

const router = express.Router();

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  getMyNotifications,
  markAsRead,
  markAllAsRead
} = require(
  "../controllers/notification.controller"
);

router.get(
  "/",
  authMiddleware,
  getMyNotifications
);

router.patch(
  "/read-all",
  authMiddleware,
  markAllAsRead
);

router.patch(
  "/:id/read",
  authMiddleware,
  markAsRead
);

/*
|--------------------------------------------------------------------------
| Compatibilidad temporal con llamadas antiguas
|--------------------------------------------------------------------------
*/

router.put(
  "/:id/read",
  authMiddleware,
  markAsRead
);

module.exports = router;
