<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import api from '@/utils/api'

const authStore = useAuthStore()

const cursorStyles = [
  {
    id: 'cross',
    name: '十字准星',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><line x1="16" y1="4" x2="16" y2="28" stroke="white" stroke-width="2"/><line x1="4" y1="16" x2="28" y2="16" stroke="white" stroke-width="2"/></svg>`
  },
  {
    id: 'square',
    name: '方框准星',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="20" height="20" fill="none" stroke="white" stroke-width="2"/></svg>`
  },
  {
    id: 'dot',
    name: '点状准星',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="13" width="6" height="6" fill="white"/><rect x="14" y="14" width="4" height="4" fill="#fcee09"/></svg>`
  }
]

const currentCursor = ref('cross')
const customCursor = ref<string | null>(null)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

onMounted(async () => {
  try {
    const res = await api.get(`/api/users/${authStore.user?.id}/skin`)
    currentCursor.value = res.data.cursor || 'cross'
    customCursor.value = res.data.customCursor || null
  } catch (err) {
    console.error('Failed to load skin settings:', err)
  }
})

function selectCursor(cursorId: string) {
  currentCursor.value = cursorId
  customCursor.value = null
  saveSettings()
}

function triggerUpload() {
  fileInput.value?.click()
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 100 * 1024) {
    alert('文件大小不能超过 100KB')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('cursor', file)

    const res = await api.post('/api/upload/cursor', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    customCursor.value = res.data.url
    currentCursor.value = 'custom'
    saveSettings()
  } catch (err) {
    alert(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function saveSettings() {
  try {
    await api.put(`/api/users/${authStore.user?.id}/skin`, {
      soundScheme: authStore.user?.skinSettings?.soundScheme || 'default',
      customSounds: authStore.user?.skinSettings?.customSounds || { click: null, hit: null, grade: null },
      cursor: currentCursor.value,
      customCursor: customCursor.value
    })
  } catch (err) {
    console.error('Failed to save skin settings:', err)
  }
}
</script>

<template>
  <div class="cursor-settings">
    <div class="cursor-grid">
      <button
        v-for="cursor in cursorStyles"
        :key="cursor.id"
        class="cursor-card"
        :class="{ active: currentCursor === cursor.id }"
        @click="selectCursor(cursor.id)"
      >
        <div class="cursor-preview" v-html="cursor.svg"></div>
        <div class="cursor-name">{{ cursor.name }}</div>
      </button>
    </div>

    <div class="custom-cursor">
      <button class="upload-btn" @click="triggerUpload" :disabled="uploading">
        {{ customCursor ? '✅ 已上传自定义光标' : '📤 上传自定义光标' }}
      </button>
      <p class="upload-hint">支持 PNG、SVG 格式，最大 100KB</p>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".png,.svg,.cur"
      style="display: none"
      @change="handleUpload"
    />
  </div>
</template>

<style scoped>
.cursor-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.cursor-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.cursor-card {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.cursor-card:hover {
  border-color: var(--primary);
}

.cursor-card.active {
  border-color: var(--primary);
  background: rgba(var(--primary-rgb), 0.1);
}

.cursor-preview {
  width: 40px;
  height: 40px;
  margin: 0 auto 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cursor-preview :deep(svg) {
  width: 100%;
  height: 100%;
}

.cursor-name {
  font-size: 0.85rem;
  color: var(--text);
}

.custom-cursor {
  text-align: center;
}

.upload-btn {
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.upload-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
}
</style>
