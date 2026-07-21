const express=require("express");
const router=express.Router();
const auth=require("../middleware/auth.middleware");
const c=require("../controllers/messages/organization.controller");
router.use(auth);
router.get("/labels",c.listLabels);router.post("/labels",c.createLabel);router.patch("/labels/:labelId",c.updateLabel);router.delete("/labels/:labelId",c.deleteLabel);
router.get("/summary",c.getSummary);router.patch("/pinned/reorder",c.reorderPinned);
router.patch("/:conversationId/favorite",c.toggleFavorite);router.patch("/:conversationId/pin",c.pinConversation);router.patch("/:conversationId/unpin",c.unpinConversation);router.patch("/:conversationId/archive",c.archiveConversation);router.patch("/:conversationId/restore",c.restoreConversation);router.post("/:conversationId/labels",c.assignLabel);router.delete("/:conversationId/labels/:labelId",c.removeLabel);router.patch("/:conversationId/category",c.updateCategory);
module.exports=router;
