import { useEffect, useMemo, useState } from "react";

export default function MediaGallery({
  items,
  initialIndex = 0,
  onClose
}) {
  const media = useMemo(
    () =>
      (items || []).filter((item) => {
        const mime = String(item?.mimeType || "");
        return mime.startsWith("image/") || mime.startsWith("video/");
      }),
    [items]
  );

  const [index, setIndex] = useState(initialIndex);
  const current = media[index];

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setIndex((value) => (value + 1) % media.length);
      }
      if (event.key === "ArrowLeft") {
        setIndex((value) => (value - 1 + media.length) % media.length);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [media.length, onClose]);

  if (!current) return null;

  const url = current.url || current.fileUrl || current.path;
  const isVideo = String(current.mimeType || "").startsWith("video/");

  return (
    <div className="qsm-media-gallery-overlay" onClick={onClose}>
      <section
        className="qsm-media-gallery"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <strong>{current.name || "Archivo multimedia"}</strong>
            <span>{index + 1} de {media.length}</span>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <div className="qsm-media-stage">
          {isVideo ? (
            <video src={url} controls autoPlay />
          ) : (
            <img src={url} alt={current.name || "Imagen"} />
          )}

          {media.length > 1 && (
            <>
              <button
                type="button"
                className="is-prev"
                onClick={() =>
                  setIndex((value) => (value - 1 + media.length) % media.length)
                }
              >
                ‹
              </button>

              <button
                type="button"
                className="is-next"
                onClick={() =>
                  setIndex((value) => (value + 1) % media.length)
                }
              >
                ›
              </button>
            </>
          )}
        </div>

        <footer>
          <a href={url} target="_blank" rel="noreferrer">Abrir original</a>
          <a href={url} download>Descargar</a>
        </footer>
      </section>
    </div>
  );
}
