const FILTERS = [
  ["ALL", "Todas"],
  ["PINNED", "Fijadas"],
  ["FAVORITES", "Favoritas"],
  ["UNREAD", "Sin leer"],
  ["BUY", "Compras"],
  ["SELL", "Ventas"],
  ["SUPPORT", "Soporte"],
  ["DISPUTE", "Disputas"],
  ["HIGH_RISK", "Riesgo alto"],
  ["ARCHIVED", "Archivadas"]
];

function getCount(summary, filter) {
  if (!summary) return null;

  const map = {
    ALL: summary.total,
    PINNED: summary.pinned,
    FAVORITES: summary.favorites,
    UNREAD: summary.unread,
    BUY: summary.categories?.BUY,
    SELL: summary.categories?.SELL,
    SUPPORT: summary.categories?.SUPPORT,
    DISPUTE: summary.categories?.DISPUTE,
    HIGH_RISK: summary.highRisk,
    ARCHIVED: summary.archived
  };

  return map[filter] ?? 0;
}

export default function ConversationFilterBar({
  activeFilter,
  onChange,
  summary
}) {
  return (
    <div className="qsm-filter-bar">
      {FILTERS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={
            activeFilter === value
              ? "qsm-filter-chip is-active"
              : "qsm-filter-chip"
          }
          onClick={() => onChange(value)}
        >
          <span>{label}</span>
          <strong>{getCount(summary, value)}</strong>
        </button>
      ))}
    </div>
  );
}
