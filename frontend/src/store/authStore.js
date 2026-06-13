import { create } from 'zustand'
import { authApi } from '@/utils/api'

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  init: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) { set({ initialized: true }); return }
    try {
      const user = await authApi.me()
      set({ user, initialized: true })
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ initialized: true })
    }
  },

  login: async ({ email, password }) => {
    set({ loading: true })
    try {
      const tokens = await authApi.login({ email, password })
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)
      const user = await authApi.me()
      set({ user, loading: false })
      return { success: true }
    } catch (err) {
      set({ loading: false })
      return { success: false, error: err.response?.data?.detail || 'Login failed' }
    }
  },

  register: async (data) => {
    set({ loading: true })
    try {
      await authApi.register(data)
      set({ loading: false })
      return { success: true }
    } catch (err) {
      set({ loading: false })
      return { success: false, error: err.response?.data?.detail || 'Registration failed' }
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null })
  },

  isLoggedIn: () => !!get().user,
}))
