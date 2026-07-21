function normalizeLabel(item) {
  return item?.label || item;
}

export default function ConversationLabels({
  conversation,
  userId,
  compact = false
}) {
  const labels = (conversation.labels || [])
    .filter(
      (item) =>
        String(item.assignedBy?._id || item.assignedBy) ===
        String(userId)
    )
    .map(normalizeLabel)
    .filter(Boolean);

  if (!labels.length) return null;

  return (
    <div className="qsm-label-list">
      {labels.slice(0, compact ? 2 : labels.length).map((label) => (
        <span
          className="qsm-label"
          key={label._id || label.id || label.slug}
          style={{ "--label-color": label.color || "#8b5cf6" }}
        >
          {label.name}
        </span>
      ))}

      {compact && labels.length > 2 && (
        <span className="qsm-label qsm-label-more">
          +{labels.length - 2}
        </span>
      )}
    </div>
  );
}
