/*
|--------------------------------------------------------------------------
| Utilidades de mensajería QSM
|--------------------------------------------------------------------------
*/

export const safeJson = (
  value,
  fallback = null
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const normalizeSearch = (
  value
) => {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
};

export const normalizeId = (
  value
) => {
  return String(
    value?._id ||
      value?.id ||
      value?.userId ||
      value ||
      ""
  );
};

export const formatUser = (
  user,
  fallback = "Usuario QSM"
) => {
  if (
    !user ||
    typeof user !== "object"
  ) {
    return fallback;
  }

  const fullName = [
    user.firstName,
    user.lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user.name ||
    user.username ||
    user.email ||
    fallback
  );
};

export const getOtherParticipant = (
  conversation,
  currentUserId
) => {
  const participants =
    conversation?.participants ||
    conversation?.users ||
    [];

  const otherParticipant =
    participants.find(
      (participant) =>
        normalizeId(participant) !==
        String(currentUserId || "")
    );

  return (
    otherParticipant ||
    conversation?.receiver ||
    conversation?.sender ||
    {}
  );
};

export const getUnreadCount = (
  conversation,
  currentUserId
) => {
  const directUnreadCount =
    Number(
      conversation?.unreadCount
    );

  if (
    Number.isFinite(
      directUnreadCount
    )
  ) {
    return Math.max(
      0,
      directUnreadCount
    );
  }

  const unread =
    conversation?.unread;

  if (!unread) {
    return 0;
  }

  const userKey =
    String(currentUserId || "");

  /*
  |--------------------------------------------------------------------------
  | Soporte para Map de Mongoose
  |--------------------------------------------------------------------------
  */

  if (
    typeof unread.get ===
    "function"
  ) {
    const mapValue = Number(
      unread.get(userKey) || 0
    );

    return Number.isFinite(mapValue)
      ? Math.max(0, mapValue)
      : 0;
  }

  /*
  |--------------------------------------------------------------------------
  | Soporte para objeto JSON recibido por API
  |--------------------------------------------------------------------------
  */

  const objectValue = Number(
    unread?.[userKey] || 0
  );

  return Number.isFinite(
    objectValue
  )
    ? Math.max(0, objectValue)
    : 0;
};

export const formatTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    "es-DO",
    {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short"
    }
  );
};

export const formatMessageTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    "es-DO",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
};

export const resolveMediaUrl = (
  value
) => {
  if (!value) {
    return "";
  }

  const source =
    typeof value === "string"
      ? value
      : value.url ||
        value.path ||
        value.fileUrl ||
        value.src ||
        "";

  const normalizedSource =
    String(source).trim();

  if (!normalizedSource) {
    return "";
  }

  if (
    /^(https?:|data:|blob:)/i.test(
      normalizedSource
    )
  ) {
    return normalizedSource;
  }

  const apiUrl = String(
    import.meta.env.VITE_API_URL ||
      "http://localhost:5000/api"
  )
    .trim()
    .replace(/\/+$/, "");

  const backendOrigin =
    apiUrl.replace(
      /\/api$/i,
      ""
    );

  const cleanPath =
    normalizedSource.startsWith("/")
      ? normalizedSource
      : `/${normalizedSource}`;

  return `${backendOrigin}${cleanPath}`;
};

export const getAvatar = (
  user
) => {
  return resolveMediaUrl(
    user?.profilePhoto ||
      user?.avatar ||
      user?.photo ||
      user?.image ||
      ""
  );
};

export const getInitials = (
  name
) => {
  const words = String(
    name || "U"
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  const initials = words
    .map(
      (word) =>
        word
          .charAt(0)
          .toUpperCase()
    )
    .join("");

  return initials || "U";
};

export const getMessageText = (
  message
) => {
  if (!message) {
    return "";
  }

  if (
    message.deletedForEveryone
  ) {
    return "Mensaje eliminado";
  }

  return (
    message.text ||
    message.content ||
    message.body ||
    message.attachments?.[0]
      ?.name ||
    ""
  );
};

export const getLastMessageText = (
  conversation
) => {
  return (
    conversation
      ?.lastMessage?.text ||
    conversation
      ?.lastMessage?.content ||
    conversation
      ?.lastMessage?.body ||
    "Sin mensajes todavía"
  );
};

export function isSameMessageDay(
  first,
  second
) {
  if (!first || !second) {
    return false;
  }

  const firstDate =
    new Date(first);

  const secondDate =
    new Date(second);

  if (
    Number.isNaN(
      firstDate.getTime()
    ) ||
    Number.isNaN(
      secondDate.getTime()
    )
  ) {
    return false;
  }

  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
}

export function formatDateLabel(
  value
) {
  if (!value) {
    return "Fecha desconocida";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Fecha desconocida";
  }

  const today = new Date();

  const yesterday =
    new Date(today);

  yesterday.setDate(
    today.getDate() - 1
  );

  if (
    isSameMessageDay(
      date,
      today
    )
  ) {
    return "Hoy";
  }

  if (
    isSameMessageDay(
      date,
      yesterday
    )
  ) {
    return "Ayer";
  }

  return date.toLocaleDateString(
    "es-DO",
    {
      day: "2-digit",
      month: "long",

      year:
        date.getFullYear() ===
        today.getFullYear()
          ? undefined
          : "numeric"
    }
  );
}

export function formatFileSize(
  bytes
) {
  const value = Number(
    bytes || 0
  );

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "Tamaño no disponible";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB"
  ];

  let size = value;
  let unitIndex = 0;

  while (
    size >= 1024 &&
    unitIndex <
      units.length - 1
  ) {
    size /= 1024;
    unitIndex += 1;
  }

  const decimals =
    size >= 10 ||
    unitIndex === 0
      ? 0
      : 1;

  return `${size.toFixed(
    decimals
  )} ${units[unitIndex]}`;
}

export function getFileDescriptor(
  attachment = {}
) {
  const mime = String(
    attachment?.mimeType ||
      attachment?.mimetype ||
      ""
  ).toLowerCase();

  const name = String(
    attachment?.name ||
      attachment?.filename ||
      ""
  ).toLowerCase();

  const type = String(
    attachment?.type || ""
  ).toUpperCase();

  if (
    type === "IMAGE" ||
    mime.startsWith("image/")
  ) {
    return {
      icon: "IMG",
      label: "Imagen",
      tone: "image"
    };
  }

  if (
    type === "VIDEO" ||
    mime.startsWith("video/")
  ) {
    return {
      icon: "VID",
      label: "Video",
      tone: "video"
    };
  }

  if (
    type === "AUDIO" ||
    mime.startsWith("audio/")
  ) {
    return {
      icon: "AUD",
      label: "Audio",
      tone: "audio"
    };
  }

  if (
    type === "PDF" ||
    mime ===
      "application/pdf" ||
    name.endsWith(".pdf")
  ) {
    return {
      icon: "PDF",
      label: "Documento PDF",
      tone: "pdf"
    };
  }

  if (
    mime.includes("word") ||
    mime.includes(
      "officedocument.wordprocessingml"
    ) ||
    name.endsWith(".doc") ||
    name.endsWith(".docx")
  ) {
    return {
      icon: "DOC",
      label: "Documento Word",
      tone: "word"
    };
  }

  if (
    mime.includes("excel") ||
    mime.includes(
      "spreadsheet"
    ) ||
    mime.includes(
      "officedocument.spreadsheetml"
    ) ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".csv")
  ) {
    return {
      icon: "XLS",
      label:
        "Hoja de cálculo",
      tone: "excel"
    };
  }

  if (
    mime.includes(
      "presentation"
    ) ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx")
  ) {
    return {
      icon: "PPT",
      label:
        "Presentación",
      tone:
        "presentation"
    };
  }

  if (
    mime.includes("zip") ||
    mime.includes(
      "compressed"
    ) ||
    name.endsWith(".zip") ||
    name.endsWith(".rar") ||
    name.endsWith(".7z")
  ) {
    return {
      icon: "ZIP",
      label:
        "Archivo comprimido",
      tone: "zip"
    };
  }

  if (
    mime.startsWith("text/") ||
    name.endsWith(".txt")
  ) {
    return {
      icon: "TXT",
      label:
        "Documento de texto",
      tone: "text"
    };
  }

  return {
    icon: "FILE",
    label: "Archivo adjunto",
    tone: "generic"
  };
}