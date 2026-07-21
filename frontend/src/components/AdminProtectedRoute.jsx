import {
  Navigate,
  useLocation
} from "react-router-dom";

const INTERNAL_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SUPERVISOR",

  "WAREHOUSE_MANAGER",
  "WAREHOUSE_SUPERVISOR",
  "WAREHOUSE_STAFF",

  "DELIVERY_MANAGER",
  "DELIVERY_SUPERVISOR",
  "DELIVERY_AGENT",

  "FINANCE_MANAGER",
  "FINANCE_AGENT",

  "AUDITOR",

  "DISPUTE_MANAGER",
  "DISPUTE_AGENT",

  "VERIFICATION_MANAGER",
  "VERIFICATION_AGENT",

  "SECURITY_ADMIN",
  "SECURITY_MANAGER",
  "SECURITY_ANALYST",

  "SUPPORT_MANAGER",
  "SUPPORT_AGENT",

  "MODERATION_MANAGER",
  "MODERATOR"
];

const GLOBAL_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN"
];

function AdminProtectedRoute({
  children,
  allowedRoles = [],
  allowedDepartments = [],
  requiredPermissions = []
}) {
  const location = useLocation();

  const session = getAdministrativeSession();

  if (!session.token || !session.user) {
    clearAdminSession();

    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from: location.pathname
        }}
      />
    );
  }

  const { user } = session;

  const roles = normalizeRoles(user);

  const accountType = normalizeValue(
    user.accountType ||
      user.userType ||
      user.type
  );

  const status = normalizeValue(
    user.status || "ACTIVE"
  );

  const permissions = normalizePermissions(
    user.permissions
  );

  const departments = normalizeDepartments(
    user
  );

  /*
   * SUPER_ADMIN y SENIOR_ADMIN tienen acceso completo.
   * También recibe acceso total quien tenga permiso "*".
   */
  const hasGlobalAccess =
    roles.some((role) =>
      GLOBAL_ADMIN_ROLES.includes(role)
    ) ||
    permissions.includes("*");

  const isInternal =
    accountType === "INTERNAL" ||
    accountType === "ADMIN" ||
    accountType === "STAFF" ||
    roles.some((role) =>
      INTERNAL_ROLES.includes(role)
    );

  const isAccountActive =
    status === "ACTIVE";

  if (!isInternal || !isAccountActive) {
    clearAdminSession();

    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  /*
   * SUPER_ADMIN y SENIOR_ADMIN no necesitan
   * validaciones adicionales de área, rol o permiso.
   */
  if (hasGlobalAccess) {
    return children;
  }

  const normalizedAllowedRoles =
    allowedRoles
      .map(normalizeValue)
      .filter(Boolean);

  if (
    normalizedAllowedRoles.length > 0 &&
    !normalizedAllowedRoles.some((role) =>
      roles.includes(role)
    )
  ) {
    return (
      <Navigate
        to="/admin/select-area"
        replace
      />
    );
  }

  const normalizedAllowedDepartments =
    allowedDepartments
      .map(normalizeValue)
      .filter(Boolean);

  if (
    normalizedAllowedDepartments.length > 0
  ) {
    const hasDepartmentAccess =
      normalizedAllowedDepartments.some(
        (department) =>
          departments.includes(department)
      );

    if (!hasDepartmentAccess) {
      return (
        <Navigate
          to="/admin/select-area"
          replace
        />
      );
    }
  }

  const normalizedRequiredPermissions =
    requiredPermissions
      .map(normalizeValue)
      .filter(Boolean);

  if (
    normalizedRequiredPermissions.length > 0
  ) {
    const hasRequiredPermission =
      normalizedRequiredPermissions.some(
        (permission) =>
          permissions.includes(permission)
      );

    if (!hasRequiredPermission) {
      return (
        <Navigate
          to="/admin/select-area"
          replace
        />
      );
    }
  }

  return children;
}

function getAdministrativeSession() {
  const localToken =
    localStorage.getItem(
      "qsm_admin_token"
    );

  const localUser =
    localStorage.getItem(
      "qsm_admin_user"
    );

  const sessionToken =
    sessionStorage.getItem(
      "qsm_admin_token"
    );

  const sessionUser =
    sessionStorage.getItem(
      "qsm_admin_user"
    );

  const token =
    localToken || sessionToken;

  const rawUser =
    localUser || sessionUser;

  if (!token || !rawUser) {
    return {
      token: null,
      user: null
    };
  }

  try {
    return {
      token,
      user: JSON.parse(rawUser)
    };
  } catch {
    clearAdminSession();

    return {
      token: null,
      user: null
    };
  }
}

function normalizeRoles(user) {
  const roleValues = [];

  if (typeof user?.role === "string") {
    roleValues.push(user.role);
  }

  if (
    typeof user?.role?.name === "string"
  ) {
    roleValues.push(
      user.role.name
    );
  }

  if (
    typeof user?.role?.code === "string"
  ) {
    roleValues.push(
      user.role.code
    );
  }

  if (Array.isArray(user?.roles)) {
    user.roles.forEach((role) => {
      if (typeof role === "string") {
        roleValues.push(role);
      }

      if (
        typeof role?.name === "string"
      ) {
        roleValues.push(role.name);
      }

      if (
        typeof role?.code === "string"
      ) {
        roleValues.push(role.code);
      }
    });
  }

  return [
    ...new Set(
      roleValues
        .map(normalizeValue)
        .filter(Boolean)
    )
  ];
}

function normalizePermissions(
  permissions
) {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return [
    ...new Set(
      permissions
        .map((permission) => {
          if (
            typeof permission === "string"
          ) {
            return normalizeValue(
              permission
            );
          }

          return normalizeValue(
            permission?.code ||
              permission?.name
          );
        })
        .filter(Boolean)
    )
  ];
}

function normalizeDepartments(user) {
  const values = [];

  if (
    typeof user?.department === "string"
  ) {
    values.push(user.department);
  }

  if (
    typeof user?.department?.name ===
    "string"
  ) {
    values.push(
      user.department.name
    );
  }

  if (
    typeof user?.department?.code ===
    "string"
  ) {
    values.push(
      user.department.code
    );
  }

  const departmentCollections = [
    user?.departments,
    user?.areas,
    user?.allowedDepartments
  ];

  departmentCollections.forEach(
    (collection) => {
      if (!Array.isArray(collection)) {
        return;
      }

      collection.forEach(
        (department) => {
          if (
            typeof department ===
            "string"
          ) {
            values.push(department);
          }

          if (
            typeof department?.name ===
            "string"
          ) {
            values.push(
              department.name
            );
          }

          if (
            typeof department?.code ===
            "string"
          ) {
            values.push(
              department.code
            );
          }
        }
      );
    }
  );

  return [
    ...new Set(
      values
        .map(normalizeValue)
        .filter(Boolean)
    )
  ];
}

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function clearAdminSession() {
  [
    "qsm_admin_token",
    "qsm_admin_user",
    "qsm_admin_remember"
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export default AdminProtectedRoute;