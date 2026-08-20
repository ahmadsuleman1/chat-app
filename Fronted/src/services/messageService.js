import api from '../lib/axios';

export const messageService = {
  getMessages: (conversationId, params = {}) =>
    api.get(`/messages/${conversationId}`, { params }).then((r) => r.data),
  sendMessage: (conversationId, payload, options = {}) => {
    const config =
      payload instanceof FormData
        ? { ...options, headers: { ...options?.headers, 'Content-Type': 'multipart/form-data' } }
        : options;
    return api.post(`/messages/${conversationId}`, payload, config).then((r) => r.data);
  },
  deleteMessage: (messageId, mode = 'me') =>
    api.delete(`/messages/single/${messageId}`, { params: { mode } }).then((r) => r.data),
};
