const LEVELS = {
  LOW: {
    label: "Riesgo bajo",
    icon: "🛡",
    className: "is-low"
  },
  MEDIUM: {
    label: "Precaución",
    icon: "⚠",
    className: "is-medium"
  },
  HIGH: {
    label: "Riesgo alto",
    icon: "🚨",
    className: "is-high"
  },
  CRITICAL: {
    label: "Riesgo crítico",
    icon: "⛔",
    className: "is-critical"
  }
};

export default function SecurityAnalysisBanner({
  analysis
}) {
  if (
    !analysis?.flagged
  ) {
    return null;
  }

  const level =
    LEVELS[
      analysis?.riskLevel
    ] ||
    LEVELS.MEDIUM;

  return (
    <div
      className={`qsm-security-analysis ${level.className}`}
    >
      <div className="qsm-security-analysis__icon">
        {level.icon}
      </div>

      <div>
        <strong>
          {level.label}
        </strong>

        <p>
          {analysis?.recommendation ||
            "Revisa el contenido antes de enviarlo."}
        </p>

        {analysis?.reasons?.length > 0 && (
          <div className="qsm-security-analysis__reasons">
            {analysis.reasons.map(
              (
                reason
              ) => (
                <span
                  key={
                    reason.code
                  }
                >
                  {reason.title}
                </span>
              )
            )}
          </div>
        )}
      </div>

      <span className="qsm-security-score">
        {Number(
          analysis?.score ||
          0
        )}
      </span>
    </div>
  );
}
