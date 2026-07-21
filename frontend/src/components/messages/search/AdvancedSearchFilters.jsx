export default function AdvancedSearchFilters({ filters, labels = [], onChange, onClear, activeFiltersCount }) {
  const toggles = [["hasAttachments","Solo con archivos"],["hasAiAlert","Alertas de IA"],["reported","Reportados"],["favorite","Favoritas"],["pinned","Fijadas"],["archived","Archivadas"]];
  return <aside className="qsm-advanced-search-filters">
    <div className="qsm-search-filter-title"><div><small>Filtros</small><h3>Búsqueda avanzada</h3></div><span>{activeFiltersCount}</span></div>
    <div className="qsm-search-filter-grid">
      <label>Desde<input type="date" value={filters.from} onChange={(e)=>onChange("from",e.target.value)} /></label>
      <label>Hasta<input type="date" value={filters.to} onChange={(e)=>onChange("to",e.target.value)} /></label>
      <label>Categoría<select value={filters.category} onChange={(e)=>onChange("category",e.target.value)}><option value="">Todas</option><option value="GENERAL">General</option><option value="BUY">Compra</option><option value="SELL">Venta</option><option value="SUPPORT">Soporte</option><option value="DISPUTE">Disputa</option></select></label>
      <label>Prioridad<select value={filters.priority} onChange={(e)=>onChange("priority",e.target.value)}><option value="">Todas</option><option value="LOW">Baja</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></label>
      <label>Tipo de archivo<select value={filters.fileType} onChange={(e)=>onChange("fileType",e.target.value)}><option value="">Cualquiera</option><option value="FILE">Con archivos</option><option value="IMAGE">Imágenes</option><option value="VIDEO">Videos</option><option value="AUDIO">Audio</option><option value="PDF">PDF</option></select></label>
      <label>Etiqueta<select value={filters.labelId} onChange={(e)=>onChange("labelId",e.target.value)}><option value="">Todas</option>{labels.map((l)=><option key={l._id} value={l._id}>{l.name}</option>)}</select></label>
      <label>ID conversación<input value={filters.conversationId} onChange={(e)=>onChange("conversationId",e.target.value)} /></label>
      <label>ID remitente<input value={filters.senderId} onChange={(e)=>onChange("senderId",e.target.value)} /></label>
      <label>ID orden<input value={filters.orderId} onChange={(e)=>onChange("orderId",e.target.value)} /></label>
      <label>ID producto<input value={filters.productId} onChange={(e)=>onChange("productId",e.target.value)} /></label>
      <label>Orden<select value={filters.sort} onChange={(e)=>onChange("sort",e.target.value)}><option value="NEWEST">Más recientes</option><option value="OLDEST">Más antiguos</option><option value="RELEVANCE">Relevancia</option></select></label>
    </div>
    <div className="qsm-search-toggles">{toggles.map(([name,label])=><label key={name}><input type="checkbox" checked={filters[name] === "true"} onChange={(e)=>onChange(name,e.target.checked ? "true" : "")} />{label}</label>)}</div>
    <button type="button" className="qsm-clear-search-filters" onClick={onClear}>Limpiar filtros</button>
  </aside>;
}
