const express = require("express");
const router = express.Router();

const {
  auditMutations
} = require(
  "../middleware/audit-action.middleware"
);

router.use(
  auditMutations("DELIVERY")
);

const authMiddleware = require("../middleware/auth.middleware");

const {
  createShipping,
  updateShippingStatus,
  getMyShippings
} = require("../controllers/shipping.controller");

router.post("/", authMiddleware, createShipping);
router.put("/:shippingId/status", authMiddleware, updateShippingStatus);
router.get("/my-shippings", authMiddleware, getMyShippings);

module.exports = router;