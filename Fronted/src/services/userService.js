import api from '../lib/axios';
import { withAvatarUrlList } from '../utils/normalize';

export const userService = {
  search: (query) =>
    api.get('/users/search', { params: { q: query } }).then((r) => ({
      ...r.data,
      users: withAvatarUrlList(r.data.users),
    })),
  getById: (userId) =>
    api.get(`/users/${userId}`).then((r) => ({
      ...r.data,
      user: r.data.user ? { ...r.data.user, avatarUrl: r.data.user.avatar || '' } : null,
    })),
  updateProfile: (payload) => api.patch('/users/me', payload).then((r) => r.data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api
      .post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  changePassword: (currentPassword, newPassword) =>
    api.patch('/users/me/password', { currentPassword, newPassword }).then((r) => r.data),
  changeEmail: (newEmail, currentPassword) =>
    api.patch('/users/me/email', { newEmail, currentPassword }).then((r) => r.data),
  updatePrivacy: (payload) => api.patch('/users/me/privacy', payload).then((r) => r.data),
};
