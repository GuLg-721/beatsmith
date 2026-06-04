import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

interface User {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
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

  return { token, user, loading, isLoggedIn, login, register, fetchUser, logout }
})
