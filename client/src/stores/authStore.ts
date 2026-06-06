import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

interface User {
  id: number
  username: string
  nickname: string
  avatar: string | null
  theme: string
  created_at: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('beatsmith_token'))
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  async function login(username: string, password: string) {
    loading.value = true
    try {
      const res = await api.post('/api/auth/login', { username, password })
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('beatsmith_token', res.data.token)
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || '登录失败' }
    } finally {
      loading.value = false
    }
  }

  async function register(username: string, password: string, nickname: string) {
    loading.value = true
    try {
      const res = await api.post('/api/auth/register', { username, password, nickname })
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('beatsmith_token', res.data.token)
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || '注册失败' }
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const res = await api.get('/api/auth/me')
      user.value = res.data.user
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('beatsmith_token')
  }

  async function updateProfile(nickname: string) {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({ nickname })
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message)
    }

    const data = await res.json()
    user.value = { ...user.value!, ...data.user }
  }

  async function updatePassword(oldPassword: string, newPassword: string) {
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({ oldPassword, newPassword })
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message)
    }
  }

  async function updateAvatar(avatarUrl: string) {
    const res = await fetch('/api/auth/avatar', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({ avatarUrl })
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message)
    }

    user.value = { ...user.value!, avatar: avatarUrl }
  }

  async function updateTheme(theme: string) {
    const res = await fetch('/api/auth/theme', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({ theme })
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message)
    }

    user.value = { ...user.value!, theme }
    applyTheme(theme)
  }

  function applyTheme(theme: string) {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }

  function loadTheme() {
    const saved = localStorage.getItem('theme') || user.value?.theme || 'osu'
    applyTheme(saved)
  }

  return {
    user,
    token,
    isLoggedIn,
    login,
    register,
    logout,
    fetchUser,
    updateProfile,
    updatePassword,
    updateAvatar,
    updateTheme,
    loadTheme
  }
})
