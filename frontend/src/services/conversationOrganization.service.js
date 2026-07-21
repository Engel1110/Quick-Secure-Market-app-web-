const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `${API_URL}/messages/conversations/organization${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "No se pudo completar la operación."
    );
  }

  return data;
}

export const conversationOrganizationService = {
  getSummary() {
    return request("/summary");
  },

  getLabels() {
    return request("/labels");
  },

  createLabel(payload) {
    return request("/labels", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  updateLabel(labelId, payload) {
    return request(`/labels/${labelId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },

  deleteLabel(labelId) {
    return request(`/labels/${labelId}`, {
      method: "DELETE"
    });
  },

  toggleFavorite(conversationId, enabled) {
    return request(`/${conversationId}/favorite`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    });
  },

  pinConversation(conversationId) {
    return request(`/${conversationId}/pin`, {
      method: "PATCH"
    });
  },

  unpinConversation(conversationId) {
    return request(`/${conversationId}/unpin`, {
      method: "PATCH"
    });
  },

  reorderPinned(conversationIds) {
    return request("/pinned/reorder", {
      method: "PATCH",
      body: JSON.stringify({ conversationIds })
    });
  },

  archiveConversation(conversationId) {
    return request(`/${conversationId}/archive`, {
      method: "PATCH"
    });
  },

  restoreConversation(conversationId) {
    return request(`/${conversationId}/restore`, {
      method: "PATCH"
    });
  },

  assignLabel(conversationId, labelId) {
    return request(`/${conversationId}/labels`, {
      method: "POST",
      body: JSON.stringify({ labelId })
    });
  },

  removeLabel(conversationId, labelId) {
    return request(`/${conversationId}/labels/${labelId}`, {
      method: "DELETE"
    });
  },

  updateCategory(conversationId, payload) {
    return request(`/${conversationId}/category`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }
};
