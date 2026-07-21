export default function ProfessionalSearchBar({ value, onChange, onSearch, loading, recentSearches = [], onRecentSearch }) {
  return <div className="qsm-professional-search-bar">
    <div className="qsm-search-input-wrap">
      <span>⌕</span>
      <input type="search" value={value} placeholder="Buscar mensajes, usuarios, productos, órdenes..." onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSearch()} />
      <button type="button" onClick={onSearch} disabled={loading}>{loading ? "Buscando..." : "Buscar"}</button>
    </div>
    {!!recentSearches.length && <div className="qsm-recent-searches"><small>Recientes:</small>{recentSearches.map((item) => <button type="button" key={item.id} onClick={() => onRecentSearch(item.q)}>{item.q}</button>)}</div>}
  </div>;
}
