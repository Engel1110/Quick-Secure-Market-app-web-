export default function SearchPagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  return <div className="qsm-search-pagination"><button type="button" disabled={pagination.page <= 1} onClick={()=>onPageChange(pagination.page-1)}>Anterior</button><span>Página {pagination.page} de {pagination.pages}</span><button type="button" disabled={pagination.page >= pagination.pages} onClick={()=>onPageChange(pagination.page+1)}>Siguiente</button></div>;
}
