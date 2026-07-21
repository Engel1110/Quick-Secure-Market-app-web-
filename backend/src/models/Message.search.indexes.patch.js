/* Agrega después de messageSchema:
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ order: 1, createdAt: -1 });
messageSchema.index({ product: 1, createdAt: -1 });
messageSchema.index({ "attachments.mimeType": 1, createdAt: -1 });
messageSchema.index({ "security.riskLevel": 1, createdAt: -1 });
*/
