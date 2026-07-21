const RISK_LABELS = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  CRITICAL: "Crítico"
};

export default function ConversationSecurityPanel({
  security,
  loading,
  onRefresh
}) {
  if (loading && !security) {
    return (
      <section className="qsm-conversation-security">
        <p>
          Analizando seguridad...
        </p>
      </section>
    );
  }

  const risk =
    security?.riskLevel ||
    "LOW";

  return (
    <section
      className={`qsm-conversation-security is-${risk.toLowerCase()}`}
    >
      <div className="qsm-conversation-security__header">
        <div>
          <span>
            QSM SECURITY
          </span>

          <h4>
            Riesgo{" "}
            {RISK_LABELS[risk] ||
              risk}
          </h4>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          title="Actualizar análisis"
        >
          ↻
        </button>
      </div>

      <div className="qsm-security-score-row">
        <strong>
          {Number(
            security?.score ||
            0
          )}
        </strong>

        <div>
          <span>
            Puntaje de riesgo
          </span>

          <div>
            <i
              style={{
                width:
                  `${Math.min(
                    100,
                    Number(
                      security?.score ||
                      0
                    )
                  )}%`
              }}
            />
          </div>
        </div>
      </div>

      <div className="qsm-security-summary-grid">
        <div>
          <span>
            Alertas
          </span>

          <strong>
            {Number(
              security
                ?.flaggedMessages ||
              0
            )}
          </strong>
        </div>

        <div>
          <span>
            Altas
          </span>

          <strong>
            {Number(
              security
                ?.highCount ||
              0
            )}
          </strong>
        </div>

        <div>
          <span>
            Críticas
          </span>

          <strong>
            {Number(
              security
                ?.criticalCount ||
              0
            )}
          </strong>
        </div>
      </div>

      <p>
        QSM analiza solicitudes de pago externo,
        teléfonos, credenciales, enlaces y lenguaje
        sospechoso.
      </p>
    </section>
  );
}
