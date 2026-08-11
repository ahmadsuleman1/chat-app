import api from '../lib/axios';

export const groupService = {
  list: () => api.get('/groups').then((r) => r.data),
  create: (payload) => api.post('/groups', payload).then((r) => r.data),
  getById: (id) => api.get(`/groups/${id}`).then((r) => r.data),
  update: (id, payload) => api.patch(`/groups/${id}`, payload).then((r) => r.data),
  delete: (id) => api.delete(`/groups/${id}`).then((r) => r.data),
  addMember: (id, userId) => api.post(`/groups/${id}/members`, { userId }).then((r) => r.data),
  removeMember: (id, userId) => api.delete(`/groups/${id}/members/${userId}`).then((r) => r.data),
  leave: (id) => api.post(`/groups/${id}/leave`).then((r) => r.data),
  promoteAdmin: (id, userId) => api.patch(`/groups/${id}/admins/${userId}`).then((r) => r.data),
  demoteAdmin: (id, userId) => api.delete(`/groups/${id}/admins/${userId}`).then((r) => r.data),
  getMessages: (id) => api.get(`/groups/${id}/messages`).then((r) => r.data),
  sendMessage: (id, payload) => {
    if (payload instanceof FormData) {
      return api
        .post(`/groups/${id}/messages`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    }
    return api.post(`/groups/${id}/messages`, payload).then((r) => r.data);
  },
};
