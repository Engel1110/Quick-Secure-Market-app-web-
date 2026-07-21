export default function MediaUploadQueue({
  items,
  uploading,
  progress,
  error,
  onRemove,
  onMove,
  onCancel
}) {
  if (!items.length && !error) return null;

  return (
    <section className="qsm-media-queue">
      {items.map((item, index) => (
        <article key={item.id}>
          <div className="qsm-media-preview">
            {item.preview && item.file.type.startsWith("image/") && (
              <img src={item.preview} alt={item.file.name} />
            )}

            {item.preview && item.file.type.startsWith("video/") && (
              <video src={item.preview} muted />
            )}

            {!item.preview && <span>FILE</span>}
          </div>

          <div>
            <strong>{item.file.name}</strong>
            <small>{(item.file.size / 1024 / 1024).toFixed(1)} MB</small>
          </div>

          <div className="qsm-media-actions">
            <button
              type="button"
              disabled={index === 0 || uploading}
              onClick={() => onMove(index, index - 1)}
            >
              ↑
            </button>

            <button
              type="button"
              disabled={index === items.length - 1 || uploading}
              onClick={() => onMove(index, index + 1)}
            >
              ↓
            </button>

            <button
              type="button"
              disabled={uploading}
              onClick={() => onRemove(item.id)}
            >
              ×
            </button>
          </div>
        </article>
      ))}

      {uploading && (
        <div className="qsm-upload-progress">
          <div><i style={{ width: `${progress}%` }} /></div>
          <span>{progress}%</span>
          <button type="button" onClick={onCancel}>Cancelar</button>
        </div>
      )}

      {error && <div className="qsm-media-error">{error}</div>}
    </section>
  );
}
