/* Agrega después de conversationSchema:
conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ participants: 1, category: 1, priority: 1, updatedAt: -1 });
conversationSchema.index({ participants: 1, favoriteBy: 1, updatedAt: -1 });
conversationSchema.index({ participants: 1, archivedBy: 1, updatedAt: -1 });
conversationSchema.index({ participants: 1, "pinnedBy.user": 1, "pinnedBy.order": 1 });
conversationSchema.index({ participants: 1, "labels.label": 1, "labels.assignedBy": 1 });
*/
