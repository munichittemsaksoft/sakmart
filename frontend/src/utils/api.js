import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
})

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  changePassword: (data) => api.post('/auth/change-password', data),
}

// ── Templates ────────────────────────────────────────────────
export const templateApi = {
  list: (params) => api.get('/templates', { params }).then(r => r.data),
  get: (slug) => api.get(`/templates/${slug}`).then(r => r.data),
  create: (data) => api.post('/templates', data).then(r => r.data),
  update: (slug, data) => api.patch(`/templates/${slug}`, data).then(r => r.data),
  delete: (slug) => api.delete(`/templates/${slug}`),
  fork: (slug, config = {}) => api.post(`/templates/${slug}/fork`, { custom_config: config }).then(r => r.data),
  star: (slug) => api.post(`/templates/${slug}/star`).then(r => r.data),
  reviews: (slug) => api.get(`/templates/${slug}/reviews`).then(r => r.data),
  addReview: (slug, data) => api.post(`/templates/${slug}/reviews`, data).then(r => r.data),
  uploadAsset: (slug, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/templates/${slug}/assets`, form).then(r => r.data)
  },
  uploadZip: (slug, file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/templates/${slug}/zip`, form, {
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    }).then(r => r.data)
  },
  downloadUrl: (slug) => `${BASE_URL}/templates/${slug}/download`,
}

// ── Users ────────────────────────────────────────────────────
export const userApi = {
  get: (username) => api.get(`/users/${username}`).then(r => r.data),
  updateMe: (data) => api.patch('/users/me', data).then(r => r.data),
  templates: (username) => api.get(`/users/${username}/templates`).then(r => r.data),
}

// ── AI Analyze ───────────────────────────────────────────────
export const analyzeApi = {
  template: (zipFile) => {
    const form = new FormData()
    form.append('file', zipFile)
    return api.post('/analyze', form).then(r => r.data)
  },
}
