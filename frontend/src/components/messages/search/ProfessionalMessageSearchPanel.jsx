import AdvancedSearchFilters from "./AdvancedSearchFilters";
import ProfessionalSearchBar from "./ProfessionalSearchBar";
import ProfessionalSearchResults from "./ProfessionalSearchResults";
import SearchPagination from "./SearchPagination";
import useProfessionalMessageSearch from "../../../hooks/useProfessionalMessageSearch";

export default function ProfessionalMessageSearchPanel({ labels = [], onOpenMessage, onOpenConversation }) {
  const search = useProfessionalMessageSearch();
  return <section className="qsm-professional-search-panel">
    <header className="qsm-professional-search-header"><div><small>QSM Messages</small><h2>Búsqueda profesional</h2></div><div className="qsm-search-mode-switch"><button type="button" className={search.mode === "MESSAGES" ? "is-active" : ""} onClick={()=>search.setMode("MESSAGES")}>Mensajes</button><button type="button" className={search.mode === "CONVERSATIONS" ? "is-active" : ""} onClick={()=>search.setMode("CONVERSATIONS")}>Conversaciones</button></div></header>
    <ProfessionalSearchBar value={search.filters.q} onChange={(v)=>search.updateFilter("q",v)} onSearch={()=>search.search()} loading={search.loading} recentSearches={search.recentSearches} onRecentSearch={(v)=>{ search.updateFilter("q",v); search.search({q:v}); }} />
    <div className="qsm-professional-search-layout"><AdvancedSearchFilters filters={search.filters} labels={labels} onChange={search.updateFilter} onClear={search.clearFilters} activeFiltersCount={search.activeFiltersCount} />
      <main className="qsm-search-main"><div className="qsm-search-summary"><span>{search.pagination.total || 0} resultados</span><button type="button" onClick={()=>search.search()} disabled={search.loading}>Aplicar filtros</button></div>
      <ProfessionalSearchResults mode={search.mode} items={search.items} query={search.filters.q} loading={search.loading} error={search.error} onOpenMessage={onOpenMessage} onOpenConversation={onOpenConversation} />
      <SearchPagination pagination={search.pagination} onPageChange={search.goToPage} /></main></div>
  </section>;
}
