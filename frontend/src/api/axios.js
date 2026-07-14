import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

/*
|--------------------------------------------------------------------------
| Obtener token según el tipo de solicitud
|--------------------------------------------------------------------------
*/

const getAdminToken = () =>
  localStorage.getItem(
    "qsm_admin_token"
  ) ||
  sessionStorage.getItem(
    "qsm_admin_token"
  );

const getNormalToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token") ||
  localStorage.getItem("qsm_token") ||
  sessionStorage.getItem("qsm_token");

const isAdminRequest = (config) => {
  const requestUrl = String(
    config?.url || ""
  ).toLowerCase();

  return (
    requestUrl.startsWith("/admin") ||
    requestUrl.includes("/admin/")
  );
};

/*
|--------------------------------------------------------------------------
| Agregar token a cada solicitud
|--------------------------------------------------------------------------
*/

api.interceptors.request.use(
  (config) => {
    const adminRequest =
      isAdminRequest(config);

    const token = adminRequest
      ? getAdminToken()
      : getNormalToken();

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

/*
|--------------------------------------------------------------------------
| Limpiar sesión administrativa
|--------------------------------------------------------------------------
*/

const clearAdminSession = () => {
  [
    "qsm_admin_token",
    "qsm_admin_user",
    "qsm_admin_remember"
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

/*
|--------------------------------------------------------------------------
| Limpiar sesión normal
|--------------------------------------------------------------------------
*/

const clearNormalSession = () => {
  [
    "token",
    "user",
    "qsm_token",
    "qsm_user"
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

/*
|--------------------------------------------------------------------------
| Manejo global de respuestas
|--------------------------------------------------------------------------
*/

api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (!error.response) {
      console.error(
        "No se pudo conectar con el servidor."
      );

      return Promise.reject(error);
    }

    const status =
      error.response.status;

    const adminRequest =
      isAdminRequest(
        error.config
      );

    if (status === 401) {
      if (adminRequest) {
        clearAdminSession();

        if (
          window.location.pathname !==
          "/admin/login"
        ) {
          window.location.href =
            "/admin/login";
        }
      } else {
        clearNormalSession();

        if (
          window.location.pathname !==
          "/login"
        ) {
          window.location.href =
            "/login";
        }
      }
    }

    if (status === 403) {
      console.warn(
        error.response?.data?.message ||
          "No tienes permisos para realizar esta acción."
      );
    }

    return Promise.reject(error);
  }
);

export default api;