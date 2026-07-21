import api from "../api/axios";

/*
|--------------------------------------------------------------------------
| Usuarios internos — servicio administrativo
|--------------------------------------------------------------------------
| Todas las rutas parten de:
|
| /api/admin/internal-users
|--------------------------------------------------------------------------
*/

const BASE_URL = "/admin/internal-users";

const normalizeQueryValue = (value) => {
  const normalized = String(value || "").trim();

  if (
    !normalized ||
    normalized.toUpperCase() === "ALL"
  ) {
    return "";
  }

  return normalized;
};

const buildQueryParams = ({
  page = 1,
  limit = 20,
  search = "",
  department = "",
  role = "",
  status = "",
  sortBy = "createdAt",
  sortOrder = "desc"
} = {}) => {
  const params = {
    page,
    limit,
    sortBy,
    sortOrder
  };

  const normalizedSearch =
    normalizeQueryValue(search);

  const normalizedDepartment =
    normalizeQueryValue(department);

  const normalizedRole =
    normalizeQueryValue(role);

  const normalizedStatus =
    normalizeQueryValue(status);

  if (normalizedSearch) {
    params.search = normalizedSearch;
  }

  if (normalizedDepartment) {
    params.department =
      normalizedDepartment;
  }

  if (normalizedRole) {
    params.role = normalizedRole;
  }

  if (normalizedStatus) {
    params.status = normalizedStatus;
  }

  return params;
};

/*
|--------------------------------------------------------------------------
| Listar usuarios internos
|--------------------------------------------------------------------------
*/

export const getInternalUsers = async (
  filters = {}
) => {
  const response = await api.get(
    BASE_URL,
    {
      params:
        buildQueryParams(filters)
    }
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Obtener usuario por ID
|--------------------------------------------------------------------------
*/

export const getInternalUserById = async (
  userId
) => {
  if (!userId) {
    throw new Error(
      "El ID del usuario es obligatorio."
    );
  }

  const response = await api.get(
    `${BASE_URL}/${userId}`
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Crear usuario interno
|--------------------------------------------------------------------------
*/

export const createInternalUser = async (
  userData
) => {
  const response = await api.post(
    BASE_URL,
    userData
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Editar usuario
|--------------------------------------------------------------------------
*/

export const updateInternalUser = async (
  userId,
  userData
) => {
  if (!userId) {
    throw new Error(
      "El ID del usuario es obligatorio."
    );
  }

  const response = await api.patch(
    `${BASE_URL}/${userId}`,
    userData
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Suspender
|--------------------------------------------------------------------------
*/

export const suspendInternalUser = async (
  userId,
  reason = ""
) => {
  const response = await api.patch(
    `${BASE_URL}/${userId}/suspend`,
    {
      reason
    }
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Activar
|--------------------------------------------------------------------------
*/

export const activateInternalUser = async (
  userId
) => {
  const response = await api.patch(
    `${BASE_URL}/${userId}/activate`
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Desactivar
|--------------------------------------------------------------------------
*/

export const deactivateInternalUser = async (
  userId,
  reason = ""
) => {
  const response = await api.patch(
    `${BASE_URL}/${userId}/deactivate`,
    {
      reason
    }
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Cambiar rol y departamento
|--------------------------------------------------------------------------
*/

export const changeInternalUserRole = async (
  userId,
  {
    role,
    department
  }
) => {
  const response = await api.patch(
    `${BASE_URL}/${userId}/role`,
    {
      role,
      department
    }
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Asignar permisos
|--------------------------------------------------------------------------
*/

export const assignInternalUserPermissions =
  async (
    userId,
    permissions
  ) => {
    const response = await api.patch(
      `${BASE_URL}/${userId}/permissions`,
      {
        permissions
      }
    );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Restablecer contraseña
|--------------------------------------------------------------------------
*/

export const resetInternalUserPassword =
  async (
    userId,
    options = {}
  ) => {
    const response = await api.post(
      `${BASE_URL}/${userId}/reset-password`,
      {
        temporaryPassword:
          options.temporaryPassword ||
          "",

        mustChangePassword:
          options.mustChangePassword !==
          false
      }
    );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Consultar actividad
|--------------------------------------------------------------------------
*/

export const getInternalUserActivity =
  async (
    userId,
    {
      page = 1,
      limit = 20
    } = {}
  ) => {
    const response = await api.get(
      `${BASE_URL}/${userId}/activity`,
      {
        params: {
          page,
          limit
        }
      }
    );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Obtener mensaje de error
|--------------------------------------------------------------------------
*/

export const getAdminApiErrorMessage = (
  error,
  fallbackMessage =
    "No se pudo completar la operación."
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};