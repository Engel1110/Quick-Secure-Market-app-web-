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
  pinMessage: async (id) => unwrap(await api.patch(`/messages/${id}/pin`), ["conversation", "data"]),
  favorite: async (id) => unwrap(await api.patch(`/messages/conversations/${id}/favorite`), ["conversation", "data"]),
  archive: async (id) => unwrap(await api.patch(`/messages/conversations/${id}/archive`), ["conversation", "data"]),
  mute: async (id) => unwrap(await api.patch(`/messages/conversations/${id}/mute`), ["conversation", "data"]),
  block: async (id) => unwrap(await api.patch(`/messages/conversations/${id}/block`), ["conversation", "data"]),
  addLabel: (id, label) => api.post(`/messages/conversations/${id}/labels`, label),
  upload: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap(await api.post("/upload/chat", formData), ["file", "data"]);
  }
};

export default chatService;
