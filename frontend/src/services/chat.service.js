import api from "../api/axios";

function requestConfig(options = {}) {
  if (!options.adminMode) return {};
  const token = localStorage.getItem("qsm_admin_token") || sessionStorage.getItem("qsm_admin_token") || "";
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

const unwrap = (response, keys = []) => {
  const source = response?.data ?? response;
  for (const key of keys) {
    if (source?.[key] !== undefined) return source[key];
  }
  return source;
};

const chatService = {
  getConversations: async (options = {}) => unwrap(await api.get("/messages/conversations", requestConfig(options)), ["conversations", "data"]) || [],
  createConversation: async (payload, options = {}) => unwrap(await api.post("/messages/conversations", payload, requestConfig(options)), ["conversation", "data"]),
  getMessages: async (id, options = {}) => unwrap(await api.get(`/messages/conversations/${id}`, requestConfig(options)), ["messages", "data"]) || [],
  markRead: (id, options = {}) => api.patch(`/messages/conversations/${id}/read`, {}, requestConfig(options)),
  sendMessage: async (payload, options = {}) => unwrap(await api.post("/messages", payload, requestConfig(options)), ["message", "data"]),
  editMessage: async (id, text, options = {}) => unwrap(await api.patch(`/messages/${id}`, { text }, requestConfig(options)), ["message", "data"]),
  deleteMessage: (id, options = {}) => api.delete(`/messages/${id}`, requestConfig(options)),
  pinMessage: async (id, options = {}) => unwrap(await api.patch(`/messages/${id}/pin`, {}, requestConfig(options)), ["conversation", "data"]),
  favorite: async (id, options = {}) => unwrap(await api.patch(`/messages/conversations/${id}/favorite`, {}, requestConfig(options)), ["conversation", "data"]),
  archive: async (id, options = {}) => unwrap(await api.patch(`/messages/conversations/${id}/archive`, {}, requestConfig(options)), ["conversation", "data"]),
  mute: async (id, options = {}) => unwrap(await api.patch(`/messages/conversations/${id}/mute`, {}, requestConfig(options)), ["conversation", "data"]),
  block: async (id, options = {}) => unwrap(await api.patch(`/messages/conversations/${id}/block`, {}, requestConfig(options)), ["conversation", "data"]),
  addLabel: (id, label) => api.post(`/messages/conversations/${id}/labels`, label),
  upload: async (file, options = {}) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap(await api.post("/upload/chat", formData, requestConfig(options)), ["file", "data"]);
  }
};

export default chatService;
