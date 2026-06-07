import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import api from '@/utils/api'

const skinSettings = ref<any>(null)
const loading = ref(false)

export function useSkinSettings() {
  const authStore = useAuthStore()

  async function loadSkinSettings() {
    if (!authStore.user?.id) return
    loading.value = true
    try {
      const res = await api.get(`/api/users/${authStore.user.id}/skin`)
      skinSettings.value = res.data
    } catch (err) {
      console.error('Failed to load skin settings:', err)
    } finally {
      loading.value = false
    }
  }

  async function saveSkinSettings(updates: Partial<typeof skinSettings.value>) {
    if (!authStore.user?.id) return

    // 合并更新到当前状态
    const newSettings = {
      soundScheme: skinSettings.value?.soundScheme || 'default',
      customSounds: skinSettings.value?.customSounds || { click: null, hit: null, grade: null },
      cursor: skinSettings.value?.cursor || 'cross',
      customCursor: skinSettings.value?.customCursor || null,
      ...updates
    }

    try {
      await api.put(`/api/users/${authStore.user.id}/skin`, newSettings)
      skinSettings.value = newSettings
      return true
    } catch (err) {
      console.error('Failed to save skin settings:', err)
      return false
    }
  }

  const soundScheme = computed(() => skinSettings.value?.soundScheme || 'default')
  const customSounds = computed(() => skinSettings.value?.customSounds || { click: null, hit: null, grade: null })
  const cursor = computed(() => skinSettings.value?.cursor || 'cross')
  const customCursor = computed(() => skinSettings.value?.customCursor || null)

  return {
    skinSettings,
    loading,
    loadSkinSettings,
    saveSkinSettings,
    soundScheme,
    customSounds,
    cursor,
    customCursor
  }
}
