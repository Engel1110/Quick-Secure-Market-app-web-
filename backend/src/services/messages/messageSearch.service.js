const mongoose = require("mongoose");
const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pagination(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || DEFAULT_LIMIT), 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

function dateRange(from, to) {
  if (!from && !to) return null;
  const range = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) range.$gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      range.$lte = d;
    }
  }
  return Object.keys(range).length ? range : null;
}

async function accessibleConversationIds(userId, query) {
  const filter = { participants: userId };
  if (query.category) filter.category = query.category;
  if (query.priority) filter.priority = query.priority;
  if (query.archived === "true") filter.archivedBy = userId;
  if (query.archived === "false") filter.archivedBy = { $ne: userId };
  if (query.favorite === "true") filter.favoriteBy = userId;
  if (query.pinned === "true") filter["pinnedBy.user"] = userId;
  if (query.labelId && mongoose.Types.ObjectId.isValid(query.labelId)) {
    filter.labels = { $elemMatch: { label: query.labelId, assignedBy: userId } };
  }
  if (query.conversationId) {
    if (!mongoose.Types.ObjectId.isValid(query.conversationId)) return [];
    filter._id = query.conversationId;
  }
  const rows = await Conversation.find(filter).select("_id").lean();
  return rows.map((row) => row._id);
}

function applyAttachmentFilter(filter, fileType) {
  if (!fileType) return;
  if (fileType === "FILE") filter["attachments.0"] = { $exists: true };
  if (fileType === "IMAGE") filter["attachments.mimeType"] = /^image\//i;
  if (fileType === "VIDEO") filter["attachments.mimeType"] = /^video\//i;
  if (fileType === "AUDIO") filter["attachments.mimeType"] = /^audio\//i;
  if (fileType === "PDF") filter["attachments.mimeType"] = "application/pdf";
}

async function searchMessages({ userId, query = {} }) {
  const { page, limit, skip } = pagination(query);
  const ids = await accessibleConversationIds(userId, query);
  if (!ids.length) return { items: [], pagination: { page, limit, total: 0, pages: 0 } };

  const filter = { conversation: { $in: ids } };
  const q = String(query.q || "").trim();
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ content: regex }, { text: regex }, { "attachments.name": regex }];
  }

  const range = dateRange(query.from, query.to);
  if (range) filter.createdAt = range;
  if (query.senderId && mongoose.Types.ObjectId.isValid(query.senderId)) filter.sender = query.senderId;
  if (query.orderId && mongoose.Types.ObjectId.isValid(query.orderId)) filter.order = query.orderId;
  if (query.productId && mongoose.Types.ObjectId.isValid(query.productId)) filter.product = query.productId;
  if (query.hasAttachments === "true") filter["attachments.0"] = { $exists: true };
  applyAttachmentFilter(filter, query.fileType);
  if (query.hasAiAlert === "true") filter["security.riskLevel"] = { $in: ["HIGH", "CRITICAL"] };
  if (query.reported === "true") filter.reported = true;

  const sort = query.sort === "OLDEST" ? { createdAt: 1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    Message.find(filter)
      .populate("sender", "name email avatar")
      .populate("conversation")
      .populate("order")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments(filter)
  ]);

  return {
    items: items.map((message) => ({
      ...message,
      searchMeta: {
        matchedText: q || null,
        preview: String(message.content || message.text || "").slice(0, 220)
      }
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
}

async function searchConversations({ userId, query = {} }) {
  const { page, limit, skip } = pagination(query);
  const filter = { participants: userId };
  if (query.category) filter.category = query.category;
  if (query.priority) filter.priority = query.priority;
  if (query.archived === "true") filter.archivedBy = userId;
  if (query.archived === "false") filter.archivedBy = { $ne: userId };
  if (query.favorite === "true") filter.favoriteBy = userId;
  if (query.pinned === "true") filter["pinnedBy.user"] = userId;
  if (query.labelId && mongoose.Types.ObjectId.isValid(query.labelId)) {
    filter.labels = { $elemMatch: { label: query.labelId, assignedBy: userId } };
  }

  const q = String(query.q || "").trim();
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { title: regex },
      { subject: regex },
      { "lastMessage.content": regex },
      { "product.name": regex },
      { "order.orderNumber": regex }
    ];
  }

  const range = dateRange(query.from, query.to);
  if (range) filter.updatedAt = range;

  const [items, total] = await Promise.all([
    Conversation.find(filter)
      .populate("participants", "name email avatar")
      .populate("labels.label")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments(filter)
  ]);

  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

module.exports = { searchMessages, searchConversations };
