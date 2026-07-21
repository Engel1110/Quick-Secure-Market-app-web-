import { useRef } from "react";

export default function MediaDropzone({
  dragging,
  onDraggingChange,
  onFiles
}) {
  const inputRef = useRef(null);

  return (
    <div
      className={`qsm-media-dropzone ${dragging ? "is-dragging" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(event) => {
        event.preventDefault();
        onDraggingChange(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => onDraggingChange(false)}
      onDrop={(event) => {
        event.preventDefault();
        onDraggingChange(false);
        onFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept="image/*,video/mp4,video/webm,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <span>⇧</span>

      <div>
        <strong>
          {dragging ? "Suelta los archivos aquí" : "Arrastra o selecciona archivos"}
        </strong>
        <p>Hasta 8 archivos y 80 MB en total.</p>
      </div>
    </div>
  );
}
