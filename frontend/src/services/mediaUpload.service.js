import api from "../api/axios";

export async function uploadMessageMedia({
  conversationId,
  files,
  onProgress,
  signal
}) {
  const formData = new FormData();
  formData.append("conversationId", conversationId);

  files.forEach((file) => formData.append("files", file));

  const response = await api.post("/messages/media/upload", formData, {
    signal,
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress(event) {
      if (!event.total) return;
      onProgress?.(Math.round((event.loaded * 100) / event.total));
    }
  });

  return response?.data?.files || [];
}
