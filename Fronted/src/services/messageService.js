import api from '../lib/axios';

export const messageService = {
  getMessages: (conversationId, params = {}) =>
    api.get(`/messages/${conversationId}`, { params }).then((r) => r.data),
  sendMessage: (conversationId, payload) => {
    if (payload instanceof FormData) {
      return api
        .post(`/messages/${conversationId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    }
    return api.post(`/messages/${conversationId}`, payload).then((r) => r.data);
  },
  deleteMessage: (messageId, mode = 'me') =>
    api.delete(`/messages/single/${messageId}`, { params: { mode } }).then((r) => r.data),
};
