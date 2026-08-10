import api from '../lib/axios';

export const messageService = {
  getMessages: (conversationId) =>
    api.get(`/messages/${conversationId}`).then((r) => r.data),
  sendMessage: (conversationId, payload) =>
    api.post(`/messages/${conversationId}`, payload).then((r) => r.data),
};
