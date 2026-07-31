const express = require("express");

const router =
  express.Router();

const auth = require(
  "../middleware/auth.middleware"
);

const {
  auditMutations
} = require(
  "../middleware/audit-action.middleware"
);

const controller = require(
  "../controllers/messages/organization.controller"
);

router.use(auth);

router.use(
  auditMutations("MESSENGER")
);

router.get(
  "/labels",
  controller.listLabels
);

router.post(
  "/labels",
  controller.createLabel
);

router.patch(
  "/labels/:labelId",
  controller.updateLabel
);

router.delete(
  "/labels/:labelId",
  controller.deleteLabel
);

router.get(
  "/summary",
  controller.getSummary
);

router.patch(
  "/pinned/reorder",
  controller.reorderPinned
);

router.patch(
  "/:conversationId/favorite",
  controller.toggleFavorite
);

router.patch(
  "/:conversationId/pin",
  controller.pinConversation
);

router.patch(
  "/:conversationId/unpin",
  controller.unpinConversation
);

router.patch(
  "/:conversationId/archive",
  controller.archiveConversation
);

router.patch(
  "/:conversationId/restore",
  controller.restoreConversation
);

router.post(
  "/:conversationId/labels",
  controller.assignLabel
);

router.delete(
  "/:conversationId/labels/:labelId",
  controller.removeLabel
);

router.patch(
  "/:conversationId/category",
  controller.updateCategory
);

module.exports = router;