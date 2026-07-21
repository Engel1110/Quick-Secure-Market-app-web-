export default function SearchResultHighlight({ text, query }) {
  const source = String(text || "");
  const term = String(query || "").trim();
  if (!term) return source;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return <>{source.split(new RegExp(`(${escaped})`, "ig")).map((part, i) => part.toLowerCase() === term.toLowerCase() ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>)}</>;
}
