export default function ImageViewer({ source, onClose }) {
  if (!source) return null;
  return <div className="qsm-image-viewer" onClick={onClose}><button type="button" onClick={onClose}>×</button><img src={source} alt="Imagen ampliada" onClick={(e) => e.stopPropagation()} /></div>;
}
