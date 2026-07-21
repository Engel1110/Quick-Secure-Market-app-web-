import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

/*
|--------------------------------------------------------------------------
| Instancia principal de Axios
|--------------------------------------------------------------------------
*/

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: {
    Accept: "application/json"
  }
});

/*
|--------------------------------------------------------------------------
| Tokens
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
  localStorage.getItem(
    "qsm_token"
  ) ||
  sessionStorage.getItem(
    "qsm_token"
  ) ||
  localStorage.getItem(
    "token"
  ) ||
  sessionStorage.getItem(
    "token"
  );

/*
|--------------------------------------------------------------------------
| Normalizar URL de solicitud
|--------------------------------------------------------------------------
*/

const getRequestPath = (config) => {
  const requestUrl = String(
    config?.url || ""
  )
    .trim()
    .toLowerCase();

  try {
    /*
     * Permite reconocer tanto:
     *
     * /admin/internal-users
     * /auth/admin/login
     * http://localhost:5000/api/admin/internal-users
     */
    const parsedUrl = new URL(
      requestUrl,
      API_URL
    );

    return parsedUrl.pathname
      .replace(/^\/api(?=\/|$)/, "");
  } catch {
    return requestUrl
      .split("?")[0]
      .replace(/^\/api(?=\/|$)/, "");
  }
};

/*
|--------------------------------------------------------------------------
| Identificar solicitudes administrativas
|--------------------------------------------------------------------------
*/

const isAdminRequest = (config) => {
  const requestPath =
    getRequestPath(config);

  return (
    requestPath === "/admin" ||
    requestPath.startsWith(
      "/admin/"
    ) ||
    requestPath ===
      "/auth/admin/login" ||
    requestPath.startsWith(
      "/auth/admin/"
    )
  );
};

/*
|--------------------------------------------------------------------------
| Detectar FormData
|--------------------------------------------------------------------------
*/

const isFormDataRequest = (
  data
) =>
  typeof FormData !== "undefined" &&
  data instanceof FormData;

/*
|--------------------------------------------------------------------------
| Manejo compatible de encabezados
|--------------------------------------------------------------------------
*/

const removeHeader = (
  headers,
  headerName
) => {
  if (!headers) {
    return;
  }

  if (
    typeof headers.delete ===
    "function"
  ) {
    headers.delete(headerName);
    headers.delete(
      headerName.toLowerCase()
    );

    return;
  }

  delete headers[headerName];
  delete headers[
    headerName.toLowerCase()
  ];
};

const setHeader = (
  headers,
  headerName,
  value
) => {
  if (!headers) {
    return;
  }

  if (
    typeof headers.set ===
    "function"
  ) {
    headers.set(
      headerName,
      value
    );

    return;
  }

  headers[headerName] =
    value;
};

/*
|--------------------------------------------------------------------------
| Interceptor de solicitudes
|--------------------------------------------------------------------------
*/

api.interceptors.request.use(
  (config) => {
    const adminRequest =
      isAdminRequest(config);

    const token = adminRequest
      ? getAdminToken()
      : getNormalToken();

    config.headers =
      config.headers || {};

    /*
    |--------------------------------------------------------------------------
    | Token correspondiente
    |--------------------------------------------------------------------------
    */

    if (token) {
      setHeader(
        config.headers,
        "Authorization",
        `Bearer ${token}`
      );
    } else {
      removeHeader(
        config.headers,
        "Authorization"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Tipo de contenido
    |--------------------------------------------------------------------------
    */

    const method = String(
      config.method || "get"
    ).toLowerCase();

    const hasRequestBody =
      ![
        "get",
        "head"
      ].includes(method);

    if (
      isFormDataRequest(
        config.data
      )
    ) {
      /*
       * No establecer multipart/form-data manualmente.
       * El navegador agregará el boundary.
       */
      removeHeader(
        config.headers,
        "Content-Type"
      );
    } else if (
      hasRequestBody
    ) {
      setHeader(
        config.headers,
        "Content-Type",
        "application/json"
      );
    } else {
      removeHeader(
        config.headers,
        "Content-Type"
      );
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
    localStorage.removeItem(
      key
    );

    sessionStorage.removeItem(
      key
    );
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
    localStorage.removeItem(
      key
    );

    sessionStorage.removeItem(
      key
    );
  });
};

/*
|--------------------------------------------------------------------------
| Evitar redirecciones repetidas
|--------------------------------------------------------------------------
*/

let redirectingToLogin =
  false;

const redirectToLogin = (
  path
) => {
  if (
    redirectingToLogin ||
    window.location.pathname ===
      path
  ) {
    return;
  }

  redirectingToLogin =
    true;

  window.location.assign(
    path
  );
};

/*
|--------------------------------------------------------------------------
| Interceptor de respuestas
|--------------------------------------------------------------------------
*/

api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (!error.response) {
      console.error(
        "No se pudo conectar con el servidor."
      );

      return Promise.reject(
        error
      );
    }

    const status =
      error.response.status;

    const adminRequest =
      isAdminRequest(
        error.config
      );

    /*
    |--------------------------------------------------------------------------
    | Sesión inválida o expirada
    |--------------------------------------------------------------------------
    */

    if (status === 401) {
      if (adminRequest) {
        clearAdminSession();

        redirectToLogin(
          "/admin/login"
        );
      } else {
        clearNormalSession();

        redirectToLogin(
          "/login"
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Permisos insuficientes
    |--------------------------------------------------------------------------
    */

    if (status === 403) {
      console.warn(
        error.response?.data
          ?.message ||
          "No tienes permisos para realizar esta acción."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Errores durante desarrollo
    |--------------------------------------------------------------------------
    */

    if (
      import.meta.env.DEV &&
      status >= 400
    ) {
      console.error(
        "Error de API:",
        {
          url:
            error.config?.url,

          method:
            error.config
              ?.method,

          status,

          message:
            error.response?.data
              ?.message,

          code:
            error.response?.data
              ?.code,

          data:
            error.response?.data
        }
      );
    }

    return Promise.reject(
      error
    );
  }
);

export {
  clearAdminSession,
  clearNormalSession,
  getAdminToken,
  getNormalToken,
  isAdminRequest
};

export default api;