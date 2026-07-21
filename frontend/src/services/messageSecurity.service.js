import api from "../api/axios";

export const messageSecurityService = {
  async analyzeText(text) {
    const response = await api.post(
      "/messages/security/analyze",
      {
        text
      }
    );

    return (
      response?.data?.analysis ||
      response?.data?.data ||
      response?.data
    );
  },

  async getConversationSecurity(
    conversationId
  ) {
    const response = await api.get(
      `/messages/conversations/${conversationId}/security`
    );

    return (
      response?.data?.security ||
      response?.data?.data ||
      response?.data
    );
  },

  async reportMessage(
    messageId,
    reason
  ) {
    const response = await api.post(
      `/messages/${messageId}/report`,
      {
        reason
      }
    );

    return response?.data;
  }
};

export default messageSecurityService;
