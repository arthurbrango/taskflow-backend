const BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000';

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const auth = {
  me: () => api('/api/auth/me'),
  logout: () => api('/api/auth/logout', { method: 'POST' }),
  loginUrl: () => `${BASE}/api/auth/login`,
};

export const projects = {
  list: () => api('/api/projects'),
  create: (name, color) => api('/api/projects', { method: 'POST', body: JSON.stringify({ name, color }) }),
  remove: (id) => api(`/api/projects/${id}`, { method: 'DELETE' }),
};

export const tasks = {
  list: (projectId, assigneeId) => {
    const params = new URLSearchParams();
    if (projectId) params.set('project_id', projectId);
    if (assigneeId) params.set('assignee_id', assigneeId);
    return api(`/api/tasks?${params}`);
  },
  create: (data) => api('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => api(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  move: (id, status, position) => api(`/api/tasks/${id}/move`, { method: 'PUT', body: JSON.stringify({ status, position }) }),
  remove: (id) => api(`/api/tasks/${id}`, { method: 'DELETE' }),
};

export const team = {
  list: () => api('/api/team'),
  create: (name, email, color) => api('/api/team', { method: 'POST', body: JSON.stringify({ name, email, color }) }),
  remove: (id) => api(`/api/team/${id}`, { method: 'DELETE' }),
};

export const gmail = {
  threads: (max, q) => {
    const params = new URLSearchParams();
    if (max) params.set('max', max);
    if (q) params.set('q', q);
    return api(`/api/gmail/threads?${params}`);
  },
  thread: (id) => api(`/api/gmail/threads/${id}`),
  send: (data) => api('/api/gmail/send', { method: 'POST', body: JSON.stringify(data) }),
};

export const notes = {
  list: (taskId) => api(`/api/notes?task_id=${taskId}`),
  create: (taskId, content) => api('/api/notes', { method: 'POST', body: JSON.stringify({ task_id: taskId, content }) }),
  remove: (id) => api(`/api/notes/${id}`, { method: 'DELETE' }),
};

export const notifications = {
  list: () => api('/api/notifications'),
  unreadCount: () => api('/api/notifications/unread-count'),
  markRead: () => api('/api/notifications/mark-read', { method: 'POST' }),
  markOneRead: (id) => api(`/api/notifications/${id}/read`, { method: 'POST' }),
};
