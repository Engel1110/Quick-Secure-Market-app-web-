const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "😊",
  "😍",
  "😮",
  "😢",
  "😡",
  "👍",
  "👎",
  "❤️",
  "🔥",
  "👏",
  "🎉",
  "✅",
  "🙏"
];

export default function EmojiPicker({ open, onSelect, onClose }) {
  if (!open) return null;

  return (
    <div className="qsm-emoji-picker">
      <div className="qsm-emoji-picker__header">
        <strong>Emojis</strong>

        <button type="button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="qsm-emoji-picker__grid">
        {EMOJIS.map((emoji) => (
          <button
            type="button"
            key={emoji}
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
