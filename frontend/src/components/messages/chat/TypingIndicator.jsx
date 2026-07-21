export default function TypingIndicator({ name = "La otra persona", visible }) {
  if (!visible) return null;

  return (
    <div className="qsm-typing-indicator">
      <span className="qsm-typing-dots">
        <i />
        <i />
        <i />
      </span>

      <p>
        <strong>{name}</strong> está escribiendo...
      </p>
    </div>
  );
}
