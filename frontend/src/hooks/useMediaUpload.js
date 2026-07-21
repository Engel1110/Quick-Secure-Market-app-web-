import { useCallback, useRef, useState } from "react";
import { uploadMessageMedia } from "../services/mediaUpload.service";

const MAX_FILES = 8;
const MAX_TOTAL = 80 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "application/pdf", "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip", "application/x-rar-compressed"
]);

export default function useMediaUpload() {
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList || []);

    setItems((current) => {
      const selected = incoming.slice(0, Math.max(0, MAX_FILES - current.length));

      const invalid = selected.find((file) => !ALLOWED_TYPES.has(file.type));
      if (invalid) {
        setError(`Tipo no permitido: ${invalid.name}`);
        return current;
      }

      const next = [
        ...current,
        ...selected.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          preview:
            file.type.startsWith("image/") || file.type.startsWith("video/")
              ? URL.createObjectURL(file)
              : ""
        }))
      ];

      const total = next.reduce((sum, item) => sum + item.file.size, 0);
      if (total > MAX_TOTAL) {
        setError("El total no puede superar 80 MB.");
        return current;
      }

      setError("");
      return next;
    });
  }, []);

  const removeFile = useCallback((id) => {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const reorderFiles = useCallback((from, to) => {
    setItems((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const clearFiles = useCallback(() => {
    setItems((current) => {
      current.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
      return [];
    });
    setProgress(0);
    setError("");
  }, []);

  const upload = useCallback(async (conversationId) => {
    if (!items.length) return [];

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setUploading(true);
      setError("");

      const uploaded = await uploadMessageMedia({
        conversationId,
        files: items.map((item) => item.file),
        onProgress: setProgress,
        signal: controller.signal
      });

      clearFiles();
      return uploaded;
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
        requestError?.message ||
        "No se pudieron subir los archivos."
      );
      throw requestError;
    } finally {
      setUploading(false);
      abortRef.current = null;
    }
  }, [items, clearFiles]);

  return {
    items,
    dragging,
    setDragging,
    uploading,
    progress,
    error,
    addFiles,
    removeFile,
    reorderFiles,
    clearFiles,
    cancelUpload: () => abortRef.current?.abort(),
    upload
  };
}
