import api from "../api/axios";

const unwrap = (response, keys = []) => {
  const source = response?.data ?? response;
  for (const key of keys) {
    if (source?.[key] !== undefined) return source[key];
  }
  return source;
};

const chatService = {
  getConversations: async () => unwrap(await api.get("/messages/conversations"), ["conversations", "data"]) || [],
  createConversation: async (payload) => unwrap(await api.post("/messages/conversations", payload), ["conversation", "data"]),
  getMessages: async (id) => unwrap(await api.get(`/messages/conversations/${id}`), ["messages", "data"]) || [],
  markRead: (id) => api.patch(`/messages/conversations/${id}/read`),
  sendMessage: async (payload) => unwrap(await api.post("/messages", payload), ["message", "data"]),
  editMessage: async (id, text) => unwrap(await api.patch(`/messages/${id}`, { text }), ["message", "data"]),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  pinMessage: (id) => api.patch(`/messages/${id}/pin`),
  favorite: (id) => api.patch(`/messages/conversations/${id}/favorite`),
  archive: (id) => api.patch(`/messages/conversations/${id}/archive`),
  mute: (id) => api.patch(`/messages/conversations/${id}/mute`),
  block: (id) => api.patch(`/messages/conversations/${id}/block`),
  addLabel: (id, label) => api.post(`/messages/conversations/${id}/labels`, label),
  upload: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap(await api.post("/upload/chat", formData), ["file", "data"]);
  }
};

export default chatService;
