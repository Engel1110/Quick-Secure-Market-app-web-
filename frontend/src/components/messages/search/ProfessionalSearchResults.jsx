import SearchResultHighlight from "./SearchResultHighlight";
export default function ProfessionalSearchResults({ mode, items, query, loading, error, onOpenMessage, onOpenConversation }) {
  if (loading) return <div className="qsm-search-state">Buscando resultados...</div>;
  if (error) return <div className="qsm-search-state is-error">{error}</div>;
  if (!items.length) return <div className="qsm-search-state">No hay resultados para mostrar.</div>;
  return <div className="qsm-search-results">{items.map((item) => <button type="button" className="qsm-search-result-card" key={item._id} onClick={() => mode === "MESSAGES" ? onOpenMessage?.(item) : onOpenConversation?.(item)}>
    <div><small>{mode === "MESSAGES" ? (item.sender?.name || item.sender?.email || "Usuario") : "Conversación"}</small>
    {mode === "CONVERSATIONS" && <h4>{item.title || item.subject || item.product?.name || "Conversación"}</h4>}
    <p><SearchResultHighlight text={mode === "MESSAGES" ? (item.searchMeta?.preview || item.content || item.text || "Archivo adjunto") : (item.lastMessage?.content || "Sin vista previa")} query={query} /></p>
    {!!item.attachments?.length && <div className="qsm-search-attachment-list">{item.attachments.slice(0,3).map((f,i)=><span key={i}>{f.name || f.type || "Archivo"}</span>)}</div>}</div>
    <span className="qsm-open-result">{mode === "MESSAGES" ? "Ir al mensaje" : "Abrir"}</span>
  </button>)}</div>;
}
