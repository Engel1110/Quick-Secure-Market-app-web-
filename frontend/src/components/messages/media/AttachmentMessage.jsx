import {
  formatFileSize,
  getFileDescriptor,
  resolveMediaUrl
} from "../../../utils/message.utils";

export default function AttachmentMessage({
  attachment,
  onOpenImage
}) {
  const normalizedAttachment =
    typeof attachment === "string"
      ? {
          url: attachment,
          name:
            attachment.split("/").pop() ||
            "Archivo adjunto"
        }
      : attachment || {};

  const url = resolveMediaUrl(
    normalizedAttachment?.url ||
      normalizedAttachment?.path ||
      normalizedAttachment?.fileUrl
  );

  const mime = String(
    normalizedAttachment?.mimeType ||
      normalizedAttachment?.mimetype ||
      ""
  ).toLowerCase();

  const type = String(
    normalizedAttachment?.type || ""
  ).toUpperCase();

  const name =
    normalizedAttachment?.name ||
    normalizedAttachment?.originalName ||
    "Archivo adjunto";

  if (!url) {
    return (
      <div className="qsm-message-file is-unavailable">
        <span>FILE</span>

        <div>
          <strong>{name}</strong>
          <small>Archivo no disponible</small>
        </div>
      </div>
    );
  }

  if (
    mime.startsWith("image/") ||
    type === "IMAGE"
  ) {
    return (
      <div className="qsm-message-image-card">
        <button
          type="button"
          className="qsm-message-image"
          onClick={() =>
            onOpenImage?.(url)
          }
          aria-label={`Abrir ${name}`}
        >
          <img
            src={url}
            alt={name}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src =
                fallbackImage();
            }}
          />
        </button>

        <div className="qsm-message-attachment-actions">
          <span>{name}</span>

          <div>
            <button
              type="button"
              onClick={() =>
                onOpenImage?.(url)
              }
            >
              Ver
            </button>

            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              download={name}
            >
              Abrir
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (
    mime.startsWith("video/") ||
    type === "VIDEO"
  ) {
    return (
      <div className="qsm-message-video-card">
        <video
          className="qsm-message-video"
          src={url}
          controls
          preload="metadata"
        />

        <div className="qsm-message-attachment-actions">
          <span>{name}</span>

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            Abrir
          </a>
        </div>
      </div>
    );
  }

  const descriptor =
    getFileDescriptor(
      normalizedAttachment
    );

  return (
    <a
      className={`qsm-message-file is-${descriptor.tone}`}
      href={url}
      target="_blank"
      rel="noreferrer"
      download={name}
    >
      <span>{descriptor.icon}</span>

      <div>
        <strong>{name}</strong>

        <small>
          {descriptor.label} ·{" "}
          {formatFileSize(
            normalizedAttachment?.size
          )}
        </small>
      </div>

      <i>↗</i>
    </a>
  );
}

function fallbackImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#312e81"/>
        </linearGradient>
      </defs>

      <rect width="800" height="500" fill="url(#g)"/>

      <text
        x="400"
        y="220"
        text-anchor="middle"
        font-size="86"
      >
        🖼️
      </text>

      <text
        x="400"
        y="325"
        text-anchor="middle"
        fill="#cbd5e1"
        font-family="Arial"
        font-size="28"
      >
        Imagen no disponible
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    svg
  )}`;
}