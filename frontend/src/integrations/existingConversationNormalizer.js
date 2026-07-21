export function normalizeConversationForPhase712(conversation) {
  return {
    ...conversation,
    favoriteBy: conversation.favoriteBy || [],
    pinnedBy: conversation.pinnedBy || [],
    archivedBy: conversation.archivedBy || [],
    labels: conversation.labels || [],
    category: conversation.category || "GENERAL",
    priority: conversation.priority || "NORMAL"
  };
}

export function normalizeConversationListForPhase712(list) {
  return (list || []).map(
    normalizeConversationForPhase712
  );
}
