import {
  useEffect,
  useMemo,
  useState
} from "react";

import chatService from "../../../services/chat.service";

const DEPARTMENTS = [
  ["", "Todos los departamentos"],
  ["ADMINISTRATION", "Administración"],
  ["FINANCE", "Finanzas"],
  ["WAREHOUSE", "Almacén"],
  ["DELIVERY", "Delivery"],
  ["DISPUTES", "Disputas"],
  ["VERIFICATION", "Verificación"],
  ["SUPPORT", "Soporte"],
  ["SECURITY", "Seguridad"],
  ["MODERATION", "Moderación"],
  ["AUDIT", "Auditoría"]
];

const getName = (user) =>
  user?.name ||
  [
    user?.firstName,
    user?.lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim() ||
  user?.email ||
  "Usuario QSM";

export default function NewConversationModal({
  open,
  onClose,
  onCreate
}) {
  const [type, setType] =
    useState("CUSTOMER");

  const [query, setQuery] =
    useState("");

  const [department, setDepartment] =
    useState("");

  const [results, setResults] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        async () => {
          try {
            setLoading(true);
            setError("");

            const users =
              await chatService
                .searchDirectory(
                  {
                    type,
                    q: query,
                    department:
                      type === "INTERNAL"
                        ? department
                        : ""
                  },
                  {
                    adminMode: true
                  }
                );

            setResults(
              Array.isArray(users)
                ? users
                : []
            );
          } catch (
            requestError
          ) {
            setResults([]);

            setError(
              requestError?.response
                ?.data?.message ||
              "No se pudo consultar el directorio."
            );
          } finally {
            setLoading(false);
          }
        },
        300
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    open,
    type,
    query,
    department
  ]);

  useEffect(() => {
    setSelected(null);
    setResults([]);
    setError("");
  }, [type]);

  const internal =
    type === "INTERNAL";

  const canCreate =
    useMemo(
      () =>
        Boolean(selected) &&
        !creating,
      [selected, creating]
    );

  if (!open) {
    return null;
  }

  const handleCreate =
    async () => {
      if (!selected) {
        return;
      }

      try {
        setCreating(true);
        setError("");

        const created =
          await onCreate?.(
            selected
          );

        if (created) {
          onClose?.();
        }
      } catch (requestError) {
        setError(
          requestError?.message ||
          "No se pudo abrir la conversación."
        );
      } finally {
        setCreating(false);
      }
    };

  return (
    <div
      className="qsm-new-chat-overlay"
      onClick={onClose}
    >
      <section
        className="qsm-new-chat-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <header className="qsm-new-chat-header">
          <div>
            <span>
              NUEVO CANAL QSM
            </span>

            <h3>
              Nueva conversación
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="qsm-new-chat-types">
          <button
            type="button"
            className={
              !internal
                ? "is-active"
                : ""
            }
            onClick={() =>
              setType("CUSTOMER")
            }
          >
            <strong>
              Usuario de QSM
            </strong>

            <small>
              Comunicación oficial con cliente
            </small>
          </button>

          <button
            type="button"
            className={
              internal
                ? "is-active"
                : ""
            }
            onClick={() =>
              setType("INTERNAL")
            }
          >
            <strong>
              Personal interno
            </strong>

            <small>
              Chat privado entre oficinas
            </small>
          </button>
        </div>

        <div
          className={
            internal
              ? "qsm-channel-warning is-internal"
              : "qsm-channel-warning is-external"
          }
        >
          <strong>
            {internal
              ? "INTERNO"
              : "EXTERNO"}
          </strong>

          <span>
            {internal
              ? "Solo será visible para personal autorizado de QSM."
              : "La conversación será visible para el cliente seleccionado."}
          </span>
        </div>

        <label className="qsm-new-chat-search">
          <span>Buscar</span>

          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value
              )
            }
            placeholder={
              internal
                ? "Nombre, correo o código de empleado..."
                : "Nombre o correo del usuario..."
            }
            autoFocus
          />
        </label>

        {internal && (
          <label className="qsm-new-chat-department">
            <span>
              Departamento
            </span>

            <select
              value={department}
              onChange={(event) =>
                setDepartment(
                  event.target.value
                )
              }
            >
              {DEPARTMENTS.map(
                ([value, label]) => (
                  <option
                    key={
                      value ||
                      "ALL"
                    }
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>
          </label>
        )}

        <div className="qsm-directory-results">
          {loading && (
            <div className="qsm-directory-state">
              Buscando destinatarios...
            </div>
          )}

          {!loading &&
            results.length === 0 && (
              <div className="qsm-directory-state">
                No se encontraron destinatarios.
              </div>
            )}

          {!loading &&
            results.map(
              (user) => {
                const active =
                  String(
                    selected?.id ||
                    ""
                  ) ===
                  String(user.id);

                return (
                  <button
                    type="button"
                    key={user.id}
                    className={
                      active
                        ? "qsm-directory-user is-selected"
                        : "qsm-directory-user"
                    }
                    onClick={() =>
                      setSelected(
                        user
                      )
                    }
                  >
                    <span className="qsm-directory-avatar">
                      {getName(user)
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>

                    <span className="qsm-directory-user-main">
                      <strong>
                        {getName(user)}
                      </strong>

                      <small>
                        {user.email}
                      </small>
                    </span>

                    <span className="qsm-directory-user-meta">
                      <b>
                        {internal
                          ? user.department ||
                            user.role
                          : user.isVerified
                            ? "Verificado"
                            : "Cliente"}
                      </b>

                      {user.employeeCode && (
                        <small>
                          {user.employeeCode}
                        </small>
                      )}
                    </span>
                  </button>
                );
              }
            )}
        </div>

        {error && (
          <div className="qsm-new-chat-error">
            {error}
          </div>
        )}

        <footer className="qsm-new-chat-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="is-primary"
            onClick={
              handleCreate
            }
            disabled={!canCreate}
          >
            {creating
              ? "Abriendo..."
              : selected
                ? `Abrir chat con ${getName(selected)}`
                : "Selecciona un destinatario"}
          </button>
        </footer>
      </section>
    </div>
  );
}
