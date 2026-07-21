import {
  useState
} from "react";

export default function ReportMessageModal({
  message,
  onClose,
  onConfirm
}) {
  const [reason, setReason] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  if (!message) {
    return null;
  }

  const submit =
    async () => {
      if (
        reason.trim().length < 5
      ) {
        setError(
          "Escribe un motivo de al menos 5 caracteres."
        );

        return;
      }

      try {
        setLoading(true);
        setError("");

        await onConfirm(
          message,
          reason.trim()
        );

        onClose();
      } catch (
        requestError
      ) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "No se pudo reportar el mensaje."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div
      className="qsm-report-overlay"
      onClick={onClose}
    >
      <section
        className="qsm-report-modal"
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        <div className="qsm-report-modal__header">
          <div>
            <span>
              SEGURIDAD QSM
            </span>

            <h3>
              Reportar mensaje
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <p>
          Reporta solicitudes de pago externo,
          fraude, amenazas, documentos personales
          o comportamiento sospechoso.
        </p>

        <textarea
          value={reason}
          onChange={(
            event
          ) => {
            setReason(
              event.target.value
            );

            setError("");
          }}
          maxLength={500}
          placeholder="Describe el motivo del reporte..."
          disabled={loading}
        />

        <span className="qsm-report-counter">
          {reason.length}/500
        </span>

        {error && (
          <div className="qsm-report-error">
            {error}
          </div>
        )}

        <div className="qsm-report-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="is-danger"
            onClick={submit}
            disabled={loading}
          >
            {loading
              ? "Reportando..."
              : "Enviar reporte"}
          </button>
        </div>
      </section>
    </div>
  );
}
