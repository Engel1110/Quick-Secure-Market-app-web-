export default function ConversationOrganizationActions({
  conversation,
  userId,
  onFavorite,
  onPin,
  onArchive,
  onRestore
}) {
  const favorite = (conversation.favoriteBy || []).some(
    (item) => String(item?._id || item) === String(userId)
  );

  const pinned = (conversation.pinnedBy || []).some(
    (item) =>
      String(item.user?._id || item.user) === String(userId)
  );

  const archived = (conversation.archivedBy || []).some(
    (item) => String(item?._id || item) === String(userId)
  );

  return (
    <div className="qsm-conversation-actions">
      <button
        type="button"
        title={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        onClick={(event) => {
          event.stopPropagation();
          onFavorite(conversation);
        }}
      >
        {favorite ? "★" : "☆"}
      </button>

      <button
        type="button"
        title={pinned ? "Desfijar" : "Fijar"}
        onClick={(event) => {
          event.stopPropagation();
          onPin(conversation);
        }}
      >
        {pinned ? "📌" : "📍"}
      </button>

      <button
        type="button"
        title={archived ? "Restaurar" : "Archivar"}
        onClick={(event) => {
          event.stopPropagation();

          if (archived) {
            onRestore(conversation._id);
          } else {
            onArchive(conversation._id);
          }
        }}
      >
        {archived ? "↩" : "🗃"}
      </button>
    </div>
  );
}
