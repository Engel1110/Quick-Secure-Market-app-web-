const trimTrailingSlash = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const localApiUrl = () =>
  ["http:", "", "localhost:5000", "api"]
    .join("/");

const configuredApiUrl =
  import.meta.env.VITE_API_URL;

const defaultApiUrl =
  import.meta.env.DEV
    ? localApiUrl()
    : "/api";

export const API_BASE_URL =
  trimTrailingSlash(
    configuredApiUrl ||
    defaultApiUrl
  );

const browserOrigin =
  typeof window !== "undefined"
    ? window.location.origin
    : "";

export const API_ORIGIN =
  API_BASE_URL.startsWith("http://") ||
  API_BASE_URL.startsWith("https://")
    ? API_BASE_URL.replace(/\/api\/?$/, "")
    : browserOrigin;

export const SOCKET_BASE_URL =
  trimTrailingSlash(
    import.meta.env.VITE_SOCKET_URL ||
    API_ORIGIN
  );

export const resolveApiUrl = (pathname = "") => {
  const cleanPath =
    String(pathname || "")
      .trim();

  if (!cleanPath) {
    return API_BASE_URL;
  }

  if (
    cleanPath.startsWith("http://") ||
    cleanPath.startsWith("https://") ||
    cleanPath.startsWith("data:") ||
    cleanPath.startsWith("blob:")
  ) {
    return cleanPath;
  }

  const normalizedPath =
    cleanPath.startsWith("/")
      ? cleanPath
      : `/${cleanPath}`;

  return `${API_ORIGIN}${normalizedPath}`;
};
