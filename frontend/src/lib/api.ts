import axios from 'axios'
import { getToken, logout } from './auth'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  error => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      if (url.includes('/auth/me')) logout()
    }
    return Promise.reject(error)
  }
)

export const competitorApi = {
  list: () => api.get('/competitors/').then(r => r.data),
  add: (username: string, threads_user_id = '', genre = '') => api.post('/competitors/', { username, threads_user_id, genre }).then(r => r.data),
  remove: (id: number) => api.delete(`/competitors/${id}`).then(r => r.data),
  getPosts: (id: number, buzzOnly = false) =>
    api.get(`/competitors/${id}/posts`, { params: { buzz_only: buzzOnly } }).then(r => r.data),
  getAllBuzz: () => api.get('/competitors/buzz/all').then(r => r.data),
  lookup: (threads_user_id: string) => api.get('/competitors/lookup', { params: { threads_user_id } }).then(r => r.data),
  refresh: (id: number) => api.post(`/competitors/${id}/refresh`).then(r => r.data),
  getHistory: (id: number) => api.get(`/competitors/${id}/history`).then(r => r.data),
  updateFollowers: (id: number, followers_count: number) => api.patch(`/competitors/${id}/followers`, { followers_count }).then(r => r.data),
  updateGenre: (id: number, genre: string) => api.patch(`/competitors/${id}/genre`, { genre }).then(r => r.data),
  getTrending: () => api.get('/competitors/trending').then(r => r.data),
}

export const knowledgeApi = {
  list: () => api.get('/knowledge/').then(r => r.data),
  create: (data: { title: string; content: string; tone: string; topics: string }) =>
    api.post('/knowledge/', data).then(r => r.data),
  update: (id: number, data: Partial<{ title: string; content: string; tone: string; topics: string }>) =>
    api.put(`/knowledge/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/knowledge/${id}`).then(r => r.data),
  importObsidian: () => api.post('/knowledge/import-obsidian').then(r => r.data),
}

export const postApi = {
  list: (status?: string) => api.get('/posts/', { params: status ? { status } : {} }).then(r => r.data),
  create: (content: string, tags = '') => api.post('/posts/', { content, tags }).then(r => r.data),
  delete: (id: number) => api.delete(`/posts/${id}`).then(r => r.data),
  generate: (params: {
    knowledge_id: number
    custom_prompt?: string
    style?: string
    tone_override?: string
    use_buzz_posts?: boolean
    count?: number
  }) => api.post('/posts/generate', params).then(r => r.data),
  similar: (post_id: number, knowledge_id: number) =>
    api.post(`/posts/${post_id}/similar`, { post_id, knowledge_id }).then(r => r.data),
  analyzeCompetitor: (text: string) =>
    api.post('/posts/analyze-competitor', { text }).then(r => r.data),
}

export const schedulerApi = {
  schedule: (post_id: number, scheduled_at: string) =>
    api.post('/scheduler/schedule', { post_id, scheduled_at }).then(r => r.data),
  listScheduled: () => api.get('/scheduler/scheduled').then(r => r.data),
  cancel: (post_id: number) => api.delete(`/scheduler/schedule/${post_id}`).then(r => r.data),
}

export const analyticsApi = {
  get: () => api.get('/posts/analytics').then(r => r.data),
}

export const authApi = {
  register: (email: string, password: string, name: string, invite_code = '') =>
    api.post('/auth/register', { email, password, name, invite_code }).then(r => r.data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  inviteOnlyStatus: () => api.get('/auth/invite-only').then(r => r.data),
  changePassword: (current_password: string, new_password: string) =>
    api.patch('/auth/password', { current_password, new_password }).then(r => r.data),
  updateProfile: (name: string) =>
    api.patch('/auth/profile', { name }).then(r => r.data),
}

export const adminApi = {
  listUsers: () => api.get('/admin/users').then(r => r.data),
  getStats: () => api.get('/admin/stats').then(r => r.data),
  toggleAdmin: (id: number) => api.patch(`/admin/users/${id}/toggle-admin`).then(r => r.data),
  toggleActive: (id: number) => api.patch(`/admin/users/${id}/toggle-active`).then(r => r.data),
  resetPassword: (id: number, password: string) => api.patch(`/admin/users/${id}/reset-password`, { password }).then(r => r.data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`).then(r => r.data),
  listInvites: () => api.get('/admin/invites').then(r => r.data),
  createInvite: () => api.post('/admin/invites').then(r => r.data),
  deleteInvite: (id: number) => api.delete(`/admin/invites/${id}`).then(r => r.data),
}

export const userSettingsApi = {
  get: () => api.get('/settings/').then(r => r.data),
  update: (data: Partial<{
    discord_webhook_url: string
    buzz_likes_threshold: number
    buzz_multiplier: number
    monitor_interval_minutes: number
    notifications_enabled: boolean
    email_notifications_enabled: boolean
    notification_email: string
    weekly_report_enabled: boolean
  }>) => api.put('/settings/', data).then(r => r.data),
  testDiscord: () => api.post('/settings/test-discord').then(r => r.data),
  testEmail: () => api.post('/settings/test-email').then(r => r.data),
}
