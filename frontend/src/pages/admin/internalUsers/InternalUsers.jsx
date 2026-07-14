import {
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import "../dashboard/adminDashboard.css";
import "./internalUsers.css";

/*
|--------------------------------------------------------------------------
| Datos temporales
|--------------------------------------------------------------------------
| Más adelante estos usuarios vendrán del backend:
|
| GET  /api/admin/internal-users
| POST /api/admin/internal-users
|--------------------------------------------------------------------------
*/

const INITIAL_INTERNAL_USERS = [
  {
    id: "qsm-admin-0001",
    firstName: "Engel",
    lastName: "Feliz",
    fullName: "Engel Feliz",
    email: "superadmin.qsm@gmail.com",
    employeeCode: "QSM-SA-0001",
    department: "ADMINISTRATION",
    departmentLabel: "Administración",
    role: "SUPER_ADMIN",
    roleLabel: "Super Administrador",
    status: "ACTIVE",
    lastAccess: "Ahora",
    securityLevel: "ELEVATED",
    mustChangePassword: false
  },

  {
    id: "qsm-admin-0002",
    firstName: "Ana",
    lastName: "Cordero",
    fullName: "Ana Cordero",
    email: "ana.admin@qsm.com",
    employeeCode: "QSM-AD-0001",
    department: "ADMINISTRATION",
    departmentLabel: "Administración",
    role: "SENIOR_ADMIN",
    roleLabel: "Senior Administrator",
    status: "ACTIVE",
    lastAccess: "Hoy, 9:24 AM",
    securityLevel: "HIGH",
    mustChangePassword: false
  },

  {
    id: "qsm-warehouse-0012",
    firstName: "Juan",
    lastName: "Rivera",
    fullName: "Juan Rivera",
    email: "juan.rivera@qsm.com",
    employeeCode: "QSM-WH-0012",
    department: "WAREHOUSE",
    departmentLabel: "Almacén",
    role: "WAREHOUSE_MANAGER",
    roleLabel: "Gerente de Almacén",
    status: "ACTIVE",
    lastAccess: "Hoy, 8:15 AM",
    securityLevel: "STANDARD",
    mustChangePassword: false
  },

  {
    id: "qsm-delivery-0021",
    firstName: "Luis",
    lastName: "Martínez",
    fullName: "Luis Martínez",
    email: "luis.martinez@qsm.com",
    employeeCode: "QSM-DL-0021",
    department: "DELIVERY",
    departmentLabel: "Delivery",
    role: "DELIVERY_MANAGER",
    roleLabel: "Gerente de Delivery",
    status: "ACTIVE",
    lastAccess: "Ayer, 4:45 PM",
    securityLevel: "STANDARD",
    mustChangePassword: false
  },

  {
    id: "qsm-finance-0033",
    firstName: "Natalia",
    lastName: "Cruz",
    fullName: "Natalia Cruz",
    email: "natalia.cruz@qsm.com",
    employeeCode: "QSM-FN-0033",
    department: "FINANCE",
    departmentLabel: "Finanzas",
    role: "FINANCE_AGENT",
    roleLabel: "Agente Financiero",
    status: "ACTIVE",
    lastAccess: "Ayer, 11:20 AM",
    securityLevel: "HIGH",
    mustChangePassword: false
  },

  {
    id: "qsm-audit-0041",
    firstName: "Roberto",
    lastName: "Castillo",
    fullName: "Roberto Castillo",
    email: "roberto.castillo@qsm.com",
    employeeCode: "QSM-AU-0041",
    department: "AUDIT",
    departmentLabel: "Auditoría",
    role: "AUDITOR",
    roleLabel: "Auditor",
    status: "ACTIVE",
    lastAccess: "12/07/2026",
    securityLevel: "READ_ONLY",
    mustChangePassword: false
  },

  {
    id: "qsm-security-0055",
    firstName: "Yadira",
    lastName: "Méndez",
    fullName: "Yadira Méndez",
    email: "yadira.mendez@qsm.com",
    employeeCode: "QSM-SC-0055",
    department: "SECURITY",
    departmentLabel: "Seguridad",
    role: "SECURITY_ANALYST",
    roleLabel: "Analista de Seguridad",
    status: "ACTIVE",
    lastAccess: "12/07/2026",
    securityLevel: "HIGH",
    mustChangePassword: false
  },

  {
    id: "qsm-support-0062",
    firstName: "Daniel",
    lastName: "Pérez",
    fullName: "Daniel Pérez",
    email: "daniel.perez@qsm.com",
    employeeCode: "QSM-SP-0062",
    department: "SUPPORT",
    departmentLabel: "Soporte",
    role: "SUPPORT_AGENT",
    roleLabel: "Agente de Soporte",
    status: "SUSPENDED",
    lastAccess: "10/07/2026",
    securityLevel: "STANDARD",
    mustChangePassword: false
  },

  {
    id: "qsm-moderation-0071",
    firstName: "María",
    lastName: "Sánchez",
    fullName: "María Sánchez",
    email: "maria.sanchez@qsm.com",
    employeeCode: "QSM-MD-0071",
    department: "MODERATION",
    departmentLabel: "Moderación",
    role: "MODERATOR",
    roleLabel: "Moderador",
    status: "INACTIVE",
    lastAccess: "08/07/2026",
    securityLevel: "STANDARD",
    mustChangePassword: true
  }
];

const DEPARTMENTS = [
  {
    value: "ADMINISTRATION",
    label: "Administración"
  },
  {
    value: "WAREHOUSE",
    label: "Almacén"
  },
  {
    value: "DELIVERY",
    label: "Delivery"
  },
  {
    value: "FINANCE",
    label: "Finanzas"
  },
  {
    value: "DISPUTES",
    label: "Disputas"
  },
  {
    value: "AUDIT",
    label: "Auditoría"
  },
  {
    value: "SECURITY",
    label: "Seguridad"
  },
  {
    value: "SUPPORT",
    label: "Soporte"
  },
  {
    value: "MODERATION",
    label: "Moderación"
  }
];

const ROLES = [
  {
    value: "SENIOR_ADMIN",
    label: "Senior Administrator",
    department: "ADMINISTRATION"
  },
  {
    value: "ADMIN",
    label: "Administrador",
    department: "ADMINISTRATION"
  },
  {
    value: "SUPERVISOR",
    label: "Supervisor",
    department: "ADMINISTRATION"
  },

  {
    value: "WAREHOUSE_MANAGER",
    label: "Gerente de Almacén",
    department: "WAREHOUSE"
  },
  {
    value: "WAREHOUSE_SUPERVISOR",
    label: "Supervisor de Almacén",
    department: "WAREHOUSE"
  },
  {
    value: "WAREHOUSE_STAFF",
    label: "Empleado de Almacén",
    department: "WAREHOUSE"
  },

  {
    value: "DELIVERY_MANAGER",
    label: "Gerente de Delivery",
    department: "DELIVERY"
  },
  {
    value: "DELIVERY_SUPERVISOR",
    label: "Supervisor de Delivery",
    department: "DELIVERY"
  },
  {
    value: "DELIVERY_AGENT",
    label: "Agente de Delivery",
    department: "DELIVERY"
  },

  {
    value: "FINANCE_MANAGER",
    label: "Gerente Financiero",
    department: "FINANCE"
  },
  {
    value: "FINANCE_AGENT",
    label: "Agente Financiero",
    department: "FINANCE"
  },

  {
    value: "DISPUTE_MANAGER",
    label: "Gerente de Disputas",
    department: "DISPUTES"
  },
  {
    value: "DISPUTE_AGENT",
    label: "Agente de Disputas",
    department: "DISPUTES"
  },

  {
    value: "AUDITOR",
    label: "Auditor",
    department: "AUDIT"
  },

  {
    value: "SECURITY_MANAGER",
    label: "Gerente de Seguridad",
    department: "SECURITY"
  },
  {
    value: "SECURITY_ANALYST",
    label: "Analista de Seguridad",
    department: "SECURITY"
  },

  {
    value: "SUPPORT_MANAGER",
    label: "Gerente de Soporte",
    department: "SUPPORT"
  },
  {
    value: "SUPPORT_AGENT",
    label: "Agente de Soporte",
    department: "SUPPORT"
  },

  {
    value: "MODERATION_MANAGER",
    label: "Gerente de Moderación",
    department: "MODERATION"
  },
  {
    value: "MODERATOR",
    label: "Moderador",
    department: "MODERATION"
  }
];

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  department: "",
  role: "",
  employeeCode: "",
  temporaryPassword: "",
  status: "ACTIVE",
  mustChangePassword: true,
  sendCredentials: true
};

function InternalUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState(
    INITIAL_INTERNAL_USERS
  );

  const [searchTerm, setSearchTerm] =
    useState("");

  const [departmentFilter, setDepartmentFilter] =
    useState("ALL");

  const [roleFilter, setRoleFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [createModalOpen, setCreateModalOpen] =
    useState(false);

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [actionMenuUserId, setActionMenuUserId] =
    useState(null);

  const [form, setForm] =
    useState(INITIAL_FORM);

  const [formError, setFormError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const currentAdmin = useMemo(
    () => getCurrentAdminUser(),
    []
  );

  const statistics = useMemo(() => {
    const active = users.filter(
      (user) =>
        user.status === "ACTIVE"
    ).length;

    const suspended = users.filter(
      (user) =>
        user.status === "SUSPENDED"
    ).length;

    const inactive = users.filter(
      (user) =>
        user.status === "INACTIVE"
    ).length;

    return {
      total: users.length,
      active,
      suspended,
      inactive
    };
  }, [users]);

  const availableRoles = useMemo(() => {
    if (!form.department) {
      return [];
    }

    return ROLES.filter(
      (role) =>
        role.department ===
        form.department
    );
  }, [form.department]);

  const visibleUsers = useMemo(() => {
    const normalizedSearch =
      searchTerm
        .trim()
        .toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          user.fullName,
          user.email,
          user.employeeCode,
          user.departmentLabel,
          user.roleLabel
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesDepartment =
        departmentFilter === "ALL" ||
        user.department ===
          departmentFilter;

      const matchesRole =
        roleFilter === "ALL" ||
        user.role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        user.status === statusFilter;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    users,
    searchTerm,
    departmentFilter,
    roleFilter,
    statusFilter
  ]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setFormError("");
  };

  const openCreateModal = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    resetForm();
  };

  const handleFormChange = (
    field,
    value
  ) => {
    setFormError("");

    setForm((current) => {
      if (field === "department") {
        return {
          ...current,
          department: value,
          role: "",
          employeeCode:
            generateEmployeeCode(
              value,
              users.length + 1
            )
        };
      }

      return {
        ...current,
        [field]: value
      };
    });
  };

  const handleCreateUser = (
    event
  ) => {
    event.preventDefault();

    const firstName =
      form.firstName.trim();

    const lastName =
      form.lastName.trim();

    const email =
      form.email
        .trim()
        .toLowerCase();

    const employeeCode =
      form.employeeCode
        .trim()
        .toUpperCase();

    const temporaryPassword =
      form.temporaryPassword.trim();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !form.department ||
      !form.role ||
      !employeeCode ||
      !temporaryPassword
    ) {
      setFormError(
        "Completa todos los campos obligatorios."
      );

      return;
    }

    if (!isValidEmail(email)) {
      setFormError(
        "Introduce un correo electrónico válido."
      );

      return;
    }

    if (
      temporaryPassword.length < 12
    ) {
      setFormError(
        "La contraseña temporal debe tener al menos 12 caracteres."
      );

      return;
    }

    const emailAlreadyExists =
      users.some(
        (user) =>
          user.email.toLowerCase() ===
          email
      );

    if (emailAlreadyExists) {
      setFormError(
        "Ya existe un usuario interno con ese correo."
      );

      return;
    }

    const codeAlreadyExists =
      users.some(
        (user) =>
          user.employeeCode ===
          employeeCode
      );

    if (codeAlreadyExists) {
      setFormError(
        "El código de empleado ya está registrado."
      );

      return;
    }

    const department =
      DEPARTMENTS.find(
        (item) =>
          item.value ===
          form.department
      );

    const role =
      ROLES.find(
        (item) =>
          item.value ===
          form.role
      );

    const newUser = {
      id: `qsm-internal-${Date.now()}`,
      firstName,
      lastName,
      fullName:
        `${firstName} ${lastName}`,
      email,
      employeeCode,
      department:
        form.department,
      departmentLabel:
        department?.label ||
        form.department,
      role: form.role,
      roleLabel:
        role?.label ||
        form.role,
      status: form.status,
      lastAccess:
        "Nunca ha iniciado sesión",
      securityLevel:
        getSecurityLevel(
          form.role
        ),
      mustChangePassword:
        form.mustChangePassword,
      createdAt:
        new Date().toISOString(),
      createdBy:
        currentAdmin.email
    };

    /*
    |--------------------------------------------------------------------------
    | Próxima conexión real
    |--------------------------------------------------------------------------
    |
    | await api.post(
    |   "/admin/internal-users",
    |   {
    |     ...newUser,
    |     temporaryPassword,
    |     sendCredentials:
    |       form.sendCredentials
    |   }
    | );
    |
    |--------------------------------------------------------------------------
    */

    setUsers((current) => [
      newUser,
      ...current
    ]);

    setSuccessMessage(
      `${newUser.fullName} fue creado correctamente como ${newUser.roleLabel}.`
    );

    closeCreateModal();

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 5000);
  };

  const handleChangeStatus = (
    userId,
    newStatus
  ) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              status: newStatus
            }
          : user
      )
    );

    setActionMenuUserId(null);

    setSuccessMessage(
      `Estado actualizado a ${formatStatus(newStatus)}.`
    );

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
  };

  const handleResetPassword = (
    user
  ) => {
    setActionMenuUserId(null);

    setSuccessMessage(
      `Se generó una contraseña temporal para ${user.fullName}.`
    );

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 5000);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDepartmentFilter("ALL");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
  };

  return (
    <div className="qsm-admin-shell qsm-internal-users-page">
      <aside className="qsm-internal-sidebar">
        <button
          type="button"
          className="qsm-internal-sidebar__brand"
          onClick={() =>
            navigate("/admin/dashboard")
          }
        >
          <span>Q</span>

          <div>
            <strong>QSM</strong>
            <small>BackOffice</small>
          </div>
        </button>

        <div className="qsm-internal-sidebar__profile">
          <span>
            {currentAdmin.initials}
          </span>

          <div>
            <strong>
              {currentAdmin.name}
            </strong>

            <small>
              {currentAdmin.roleLabel}
            </small>
          </div>
        </div>

        <nav className="qsm-internal-sidebar__nav">
          <button
            type="button"
            onClick={() =>
              navigate("/admin/dashboard")
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            type="button"
            className="is-active"
          >
            <span>♙</span>
            Usuarios internos
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/select-area"
              )
            }
          >
            <span>◈</span>
            Seleccionar área
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/security"
              )
            }
          >
            <span>♢</span>
            Seguridad
          </button>
        </nav>

        <button
          type="button"
          className="qsm-internal-sidebar__back"
          onClick={() =>
            navigate("/admin/dashboard")
          }
        >
          ← Volver al Dashboard
        </button>
      </aside>

      <div className="qsm-internal-users-main">
        <header className="qsm-internal-header">
          <div>
            <span>
              GESTIÓN EMPRESARIAL
            </span>

            <strong>
              Administración de personal
            </strong>
          </div>

          <button
            type="button"
            className="qsm-admin-button qsm-admin-button--primary"
            onClick={openCreateModal}
          >
            + Crear usuario interno
          </button>
        </header>

        <main className="qsm-internal-content">
          <section className="qsm-internal-heading">
            <div>
              <span>
                USUARIOS Y ACCESOS
              </span>

              <h1>
                Usuarios internos
              </h1>

              <p>
                Crea y administra empleados,
                departamentos, roles y
                accesos al BackOffice de QSM.
              </p>
            </div>

            <button
              type="button"
              className="qsm-admin-button qsm-admin-button--primary"
              onClick={openCreateModal}
            >
              + Crear usuario interno
            </button>
          </section>

          {successMessage && (
            <div className="qsm-internal-success-message">
              <span>✓</span>

              <div>
                <strong>
                  Operación completada
                </strong>

                <p>
                  {successMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSuccessMessage("")
                }
              >
                ×
              </button>
            </div>
          )}

          <section className="qsm-internal-stats">
            <InternalStatCard
              title="Total de empleados"
              value={statistics.total}
              description="Usuarios internos registrados"
              icon="♙"
              type="purple"
            />

            <InternalStatCard
              title="Activos"
              value={statistics.active}
              description="Acceso habilitado"
              icon="✓"
              type="green"
            />

            <InternalStatCard
              title="Suspendidos"
              value={statistics.suspended}
              description="Acceso suspendido"
              icon="Ⅱ"
              type="orange"
            />

            <InternalStatCard
              title="Inactivos"
              value={statistics.inactive}
              description="Cuenta desactivada"
              icon="×"
              type="gray"
            />
          </section>

          <section className="qsm-internal-panel">
            <div className="qsm-internal-filters">
              <div className="qsm-internal-search">
                <span>⌕</span>

                <input
                  type="search"
                  value={searchTerm}
                  placeholder="Buscar por nombre, correo o código..."
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                />
              </div>

              <select
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  Todos los departamentos
                </option>

                {DEPARTMENTS.map(
                  (department) => (
                    <option
                      key={department.value}
                      value={
                        department.value
                      }
                    >
                      {
                        department.label
                      }
                    </option>
                  )
                )}
              </select>

              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  Todos los roles
                </option>

                {ROLES.map((role) => (
                  <option
                    key={role.value}
                    value={role.value}
                  >
                    {role.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  Todos los estados
                </option>

                <option value="ACTIVE">
                  Activos
                </option>

                <option value="SUSPENDED">
                  Suspendidos
                </option>

                <option value="INACTIVE">
                  Inactivos
                </option>
              </select>

              <button
                type="button"
                className="qsm-internal-filter-clear"
                onClick={clearFilters}
              >
                Limpiar
              </button>
            </div>

            <div className="qsm-internal-table-wrapper">
              <table className="qsm-internal-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Código</th>
                    <th>Departamento</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Último acceso</th>
                    <th>Seguridad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleUsers.map(
                    (user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="qsm-internal-user-cell">
                            <span>
                              {getInitials(
                                user
                              )}
                            </span>

                            <div>
                              <strong>
                                {
                                  user.fullName
                                }
                              </strong>

                              <small>
                                {user.email}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong className="qsm-internal-code">
                            {
                              user.employeeCode
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            user.departmentLabel
                          }
                        </td>

                        <td>
                          <span
                            className={`qsm-internal-role qsm-internal-role--${getRoleColor(
                              user.department
                            )}`}
                          >
                            {
                              user.roleLabel
                            }
                          </span>
                        </td>

                        <td>
                          <span
                            className={`qsm-internal-status qsm-internal-status--${user.status.toLowerCase()}`}
                          >
                            {formatStatus(
                              user.status
                            )}
                          </span>
                        </td>

                        <td>
                          {user.lastAccess}
                        </td>

                        <td>
                          <span className="qsm-internal-security">
                            {formatSecurityLevel(
                              user.securityLevel
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="qsm-internal-actions">
                            <button
                              type="button"
                              title="Ver usuario"
                              onClick={() =>
                                setSelectedUser(
                                  user
                                )
                              }
                            >
                              ◉
                            </button>

                            <button
                              type="button"
                              title="Editar usuario"
                              onClick={() =>
                                setSelectedUser(
                                  user
                                )
                              }
                            >
                              ✎
                            </button>

                            <div className="qsm-internal-action-menu">
                              <button
                                type="button"
                                title="Más acciones"
                                onClick={() =>
                                  setActionMenuUserId(
                                    (current) =>
                                      current ===
                                      user.id
                                        ? null
                                        : user.id
                                  )
                                }
                              >
                                ⋮
                              </button>

                              {actionMenuUserId ===
                                user.id && (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleResetPassword(
                                        user
                                      )
                                    }
                                  >
                                    🔑 Restablecer
                                    contraseña
                                  </button>

                                  {user.status !==
                                    "ACTIVE" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleChangeStatus(
                                          user.id,
                                          "ACTIVE"
                                        )
                                      }
                                    >
                                      ✓ Activar
                                      cuenta
                                    </button>
                                  )}

                                  {user.status ===
                                    "ACTIVE" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleChangeStatus(
                                          user.id,
                                          "SUSPENDED"
                                        )
                                      }
                                    >
                                      ⏸ Suspender
                                      cuenta
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleChangeStatus(
                                        user.id,
                                        "INACTIVE"
                                      )
                                    }
                                  >
                                    × Desactivar
                                    cuenta
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>

              {visibleUsers.length === 0 && (
                <div className="qsm-internal-empty">
                  <span>⌕</span>

                  <h3>
                    No encontramos usuarios
                  </h3>

                  <p>
                    Cambia los filtros o
                    crea un nuevo empleado.
                  </p>

                  <button
                    type="button"
                    className="qsm-admin-button qsm-admin-button--primary"
                    onClick={
                      openCreateModal
                    }
                  >
                    + Crear usuario
                  </button>
                </div>
              )}
            </div>

            <div className="qsm-internal-pagination">
              <span>
                Mostrando{" "}
                {visibleUsers.length} de{" "}
                {users.length} usuarios
              </span>

              <div>
                <button
                  type="button"
                  disabled
                >
                  ←
                </button>

                <button
                  type="button"
                  className="is-active"
                >
                  1
                </button>

                <button
                  type="button"
                  disabled
                >
                  →
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {createModalOpen && (
        <CreateInternalUserModal
          form={form}
          formError={formError}
          departments={DEPARTMENTS}
          availableRoles={
            availableRoles
          }
          onChange={
            handleFormChange
          }
          onClose={
            closeCreateModal
          }
          onSubmit={
            handleCreateUser
          }
        />
      )}

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() =>
            setSelectedUser(null)
          }
        />
      )}
    </div>
  );
}

function InternalStatCard({
  title,
  value,
  description,
  icon,
  type
}) {
  return (
    <article
      className={`qsm-internal-stat qsm-internal-stat--${type}`}
    >
      <span>
        {icon}
      </span>

      <div>
        <small>
          {title}
        </small>

        <strong>
          {value}
        </strong>

        <p>
          {description}
        </p>
      </div>
    </article>
  );
}

function CreateInternalUserModal({
  form,
  formError,
  departments,
  availableRoles,
  onChange,
  onClose,
  onSubmit
}) {
  return (
    <div
      className="qsm-admin-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <form
        className="qsm-admin-modal qsm-internal-create-modal"
        onSubmit={onSubmit}
      >
        <div className="qsm-admin-modal__header">
          <div>
            <span className="qsm-internal-modal-eyebrow">
              NUEVO EMPLEADO
            </span>

            <h3>
              Crear usuario interno
            </h3>

            <p>
              Registra un empleado y
              asigna su departamento y
              rol.
            </p>
          </div>

          <button
            type="button"
            className="qsm-admin-modal__close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="qsm-admin-modal__body">
          {formError && (
            <div className="qsm-internal-form-error">
              ⚠ {formError}
            </div>
          )}

          <div className="qsm-admin-form-grid">
            <div className="qsm-admin-field">
              <label>
                Nombre
                <span>*</span>
              </label>

              <input
                type="text"
                className="qsm-admin-input"
                value={form.firstName}
                placeholder="Nombre del empleado"
                onChange={(event) =>
                  onChange(
                    "firstName",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="qsm-admin-field">
              <label>
                Apellido
                <span>*</span>
              </label>

              <input
                type="text"
                className="qsm-admin-input"
                value={form.lastName}
                placeholder="Apellido del empleado"
                onChange={(event) =>
                  onChange(
                    "lastName",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="qsm-admin-field qsm-admin-field--full">
              <label>
                Correo administrativo
                <span>*</span>
              </label>

              <input
                type="email"
                className="qsm-admin-input"
                value={form.email}
                placeholder="empleado@qsm.com"
                onChange={(event) =>
                  onChange(
                    "email",
                    event.target.value
                  )
                }
              />

              <small>
                Este correo será utilizado
                para iniciar sesión en el
                BackOffice.
              </small>
            </div>

            <div className="qsm-admin-field">
              <label>
                Departamento
                <span>*</span>
              </label>

              <select
                className="qsm-admin-select"
                value={
                  form.department
                }
                onChange={(event) =>
                  onChange(
                    "department",
                    event.target.value
                  )
                }
              >
                <option value="">
                  Seleccionar
                  departamento
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={
                        department.value
                      }
                      value={
                        department.value
                      }
                    >
                      {
                        department.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="qsm-admin-field">
              <label>
                Rol
                <span>*</span>
              </label>

              <select
                className="qsm-admin-select"
                value={form.role}
                disabled={
                  !form.department
                }
                onChange={(event) =>
                  onChange(
                    "role",
                    event.target.value
                  )
                }
              >
                <option value="">
                  Seleccionar rol
                </option>

                {availableRoles.map(
                  (role) => (
                    <option
                      key={role.value}
                      value={role.value}
                    >
                      {role.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="qsm-admin-field">
              <label>
                Código de empleado
                <span>*</span>
              </label>

              <input
                type="text"
                className="qsm-admin-input"
                value={
                  form.employeeCode
                }
                placeholder="QSM-WH-0001"
                onChange={(event) =>
                  onChange(
                    "employeeCode",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="qsm-admin-field">
              <label>
                Contraseña temporal
                <span>*</span>
              </label>

              <div className="qsm-internal-password-row">
                <input
                  type="text"
                  className="qsm-admin-input"
                  value={
                    form.temporaryPassword
                  }
                  placeholder="Mínimo 12 caracteres"
                  onChange={(event) =>
                    onChange(
                      "temporaryPassword",
                      event.target.value
                    )
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      "temporaryPassword",
                      generateTemporaryPassword()
                    )
                  }
                >
                  Generar
                </button>
              </div>
            </div>

            <div className="qsm-admin-field">
              <label>
                Estado inicial
              </label>

              <select
                className="qsm-admin-select"
                value={form.status}
                onChange={(event) =>
                  onChange(
                    "status",
                    event.target.value
                  )
                }
              >
                <option value="ACTIVE">
                  Activo
                </option>

                <option value="INACTIVE">
                  Inactivo
                </option>
              </select>
            </div>

            <div className="qsm-admin-field qsm-admin-field--full">
              <div className="qsm-internal-options">
                <label className="qsm-admin-check">
                  <input
                    type="checkbox"
                    checked={
                      form.mustChangePassword
                    }
                    onChange={(event) =>
                      onChange(
                        "mustChangePassword",
                        event.target.checked
                      )
                    }
                  />

                  Forzar cambio de
                  contraseña en el primer
                  acceso
                </label>

                <label className="qsm-admin-check">
                  <input
                    type="checkbox"
                    checked={
                      form.sendCredentials
                    }
                    onChange={(event) =>
                      onChange(
                        "sendCredentials",
                        event.target.checked
                      )
                    }
                  />

                  Enviar credenciales por
                  correo
                </label>
              </div>
            </div>
          </div>

          <div className="qsm-internal-security-notice">
            <span>🛡</span>

            <div>
              <strong>
                Acceso administrativo
                controlado
              </strong>

              <p>
                El usuario solamente podrá
                acceder a las áreas y
                funciones asignadas a su
                rol.
              </p>
            </div>
          </div>
        </div>

        <div className="qsm-admin-modal__footer">
          <button
            type="button"
            className="qsm-admin-button qsm-admin-button--secondary"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="qsm-admin-button qsm-admin-button--primary"
          >
            Crear usuario interno
          </button>
        </div>
      </form>
    </div>
  );
}

function UserDetailsModal({
  user,
  onClose
}) {
  return (
    <div
      className="qsm-admin-modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="qsm-admin-modal qsm-admin-modal--small">
        <div className="qsm-admin-modal__header">
          <div>
            <h3>
              Perfil del empleado
            </h3>

            <p>
              Información administrativa
              de la cuenta.
            </p>
          </div>

          <button
            type="button"
            className="qsm-admin-modal__close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="qsm-admin-modal__body">
          <div className="qsm-internal-profile-card">
            <span>
              {getInitials(user)}
            </span>

            <h3>
              {user.fullName}
            </h3>

            <p>
              {user.email}
            </p>

            <div>
              <strong>
                Código
              </strong>

              <span>
                {user.employeeCode}
              </span>
            </div>

            <div>
              <strong>
                Departamento
              </strong>

              <span>
                {
                  user.departmentLabel
                }
              </span>
            </div>

            <div>
              <strong>
                Rol
              </strong>

              <span>
                {user.roleLabel}
              </span>
            </div>

            <div>
              <strong>
                Estado
              </strong>

              <span>
                {formatStatus(
                  user.status
                )}
              </span>
            </div>

            <div>
              <strong>
                Último acceso
              </strong>

              <span>
                {user.lastAccess}
              </span>
            </div>
          </div>
        </div>

        <div className="qsm-admin-modal__footer">
          <button
            type="button"
            className="qsm-admin-button qsm-admin-button--primary"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function getCurrentAdminUser() {
  const rawUser =
    localStorage.getItem(
      "qsm_admin_user"
    ) ||
    sessionStorage.getItem(
      "qsm_admin_user"
    );

  let user = {};

  try {
    user = rawUser
      ? JSON.parse(rawUser)
      : {};
  } catch {
    user = {};
  }

  const firstName =
    user.firstName ||
    "Engel";

  const lastName =
    user.lastName ||
    "Feliz";

  return {
    ...user,
    firstName,
    lastName,
    name:
      user.fullName ||
      `${firstName} ${lastName}`,
    initials:
      `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
    email:
      user.email ||
      "superadmin.qsm@gmail.com",
    roleLabel:
      user.roleLabel ||
      "Super Administrador"
  };
}

function getInitials(user) {
  return `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`
    .toUpperCase()
    .slice(0, 2);
}

function formatStatus(status) {
  const statuses = {
    ACTIVE: "Activo",
    SUSPENDED: "Suspendido",
    INACTIVE: "Inactivo"
  };

  return statuses[status] || status;
}

function formatSecurityLevel(level) {
  const levels = {
    ELEVATED: "Elevado",
    HIGH: "Alto",
    STANDARD: "Estándar",
    READ_ONLY: "Solo lectura"
  };

  return levels[level] || level;
}

function getRoleColor(department) {
  const colors = {
    ADMINISTRATION: "purple",
    WAREHOUSE: "blue",
    DELIVERY: "cyan",
    FINANCE: "orange",
    DISPUTES: "red",
    AUDIT: "purple",
    SECURITY: "yellow",
    SUPPORT: "pink",
    MODERATION: "pink"
  };

  return (
    colors[department] ||
    "purple"
  );
}

function getSecurityLevel(role) {
  if (
    role.includes("ADMIN") ||
    role.includes("SECURITY") ||
    role.includes("FINANCE")
  ) {
    return "HIGH";
  }

  if (role === "AUDITOR") {
    return "READ_ONLY";
  }

  return "STANDARD";
}

function generateEmployeeCode(
  department,
  number
) {
  const prefixes = {
    ADMINISTRATION: "AD",
    WAREHOUSE: "WH",
    DELIVERY: "DL",
    FINANCE: "FN",
    DISPUTES: "DS",
    AUDIT: "AU",
    SECURITY: "SC",
    SUPPORT: "SP",
    MODERATION: "MD"
  };

  const prefix =
    prefixes[department] ||
    "IN";

  return `QSM-${prefix}-${String(
    number
  ).padStart(4, "0")}`;
}

function generateTemporaryPassword() {
  const randomNumber =
    Math.floor(
      1000 +
        Math.random() * 9000
    );

  return `QsmTemp@${randomNumber}!`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

export default InternalUsers;