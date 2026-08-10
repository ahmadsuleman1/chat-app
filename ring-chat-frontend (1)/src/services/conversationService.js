import api from '../lib/axios';

export const conversationService = {
  list: () => api.get('/conversations').then((r) => r.data),
  createOrGet: (userId) => api.post('/conversations', { userId }).then((r) => r.data),
};
