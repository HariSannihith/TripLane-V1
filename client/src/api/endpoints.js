import api from './client';

/**
 * Thin, typed-by-convention wrapper over the REST API. Components call these
 * instead of building URLs, so route changes stay in one file.
 */

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const groupApi = {
  list: () => api.get('/groups').then((r) => r.data.groups),
  create: (payload) => api.post('/groups', payload).then((r) => r.data.group),
  join: (inviteCode) => api.post('/groups/join', { inviteCode }).then((r) => r.data.group),
  detail: (groupId) => api.get(`/groups/${groupId}`).then((r) => r.data),
  update: (groupId, payload) => api.patch(`/groups/${groupId}`, payload).then((r) => r.data.group),
  remove: (groupId) => api.delete(`/groups/${groupId}`).then((r) => r.data),
  leave: (groupId) => api.post(`/groups/${groupId}/leave`).then((r) => r.data),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`).then((r) => r.data.group),
  finalize: (groupId, suggestionId) =>
    api.post(`/groups/${groupId}/finalize`, suggestionId ? { suggestionId } : {}).then((r) => r.data),
  reopen: (groupId) => api.post(`/groups/${groupId}/reopen`).then((r) => r.data.group),
  activity: (groupId, limit = 30) =>
    api.get(`/groups/${groupId}/activity`, { params: { limit } }).then((r) => r.data.activity),
};

export const suggestionApi = {
  create: (groupId, payload) => api.post(`/groups/${groupId}/suggestions`, payload).then((r) => r.data.suggestion),
  remove: (groupId, suggestionId) => api.delete(`/groups/${groupId}/suggestions/${suggestionId}`).then((r) => r.data),
  addActivity: (groupId, suggestionId, payload) =>
    api.post(`/groups/${groupId}/suggestions/${suggestionId}/activities`, payload).then((r) => r.data.suggestion),
  removeActivity: (groupId, suggestionId, activityId) =>
    api.delete(`/groups/${groupId}/suggestions/${suggestionId}/activities/${activityId}`).then((r) => r.data.suggestion),
  vote: (groupId, suggestionId) =>
    api.post(`/groups/${groupId}/suggestions/${suggestionId}/vote`).then((r) => r.data),
  unvote: (groupId, suggestionId) =>
    api.delete(`/groups/${groupId}/suggestions/${suggestionId}/vote`).then((r) => r.data),
};

export const placesApi = {
  search: (query, config = {}) => api.get('/places/search', { params: { query }, ...config }).then((r) => r.data),
  /** URL for the server-side photo proxy — safe to drop straight into <img src>. */
  photoUrl: (photoRef, maxWidth = 800) =>
    photoRef ? `/api/places/photo?ref=${encodeURIComponent(photoRef)}&maxWidth=${maxWidth}` : null,
};
