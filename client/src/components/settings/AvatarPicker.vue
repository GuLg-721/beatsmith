<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/authStore'

const authStore = useAuthStore()
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

// 8 个预设霓虹头像 SVG
const presetAvatars = [
  { id: 'hexagon', color: '#00d4ff', path: 'M50 5 L95 27.5 L95 72.5 L50 95 L5 72.5 L5 27.5 Z' },
  { id: 'circle', color: '#ff66aa', path: 'M50 5 A45 45 0 1 1 49.99 5 Z' },
  { id: 'triangle', color: '#00ff88', path: 'M50 5 L95 90 L5 90 Z' },
  { id: 'diamond', color: '#bf00ff', path: 'M50 5 L90 50 L50 95 L10 50 Z' },
  { id: 'star', color: '#fcee09', path: 'M50 5 L61 35 L95 35 L68 57 L79 90 L50 70 L21 90 L32 57 L5 35 L39 35 Z' },
  { id: 'pentagon', color: '#00d4ff', path: 'M50 5 L95 38 L77 90 L23 90 L5 38 Z' },
  { id: 'octagon', color: '#ff4466', path: 'M65 5 L90 20 L95 50 L80 80 L50 95 L20 80 L5 50 L10 20 Z' },
  { id: 'cross', color: '#ffffff', path: 'M35 5 L65 5 L65 35 L95 35 L95 65 L65 65 L65 95 L35 95 L35 65 L5 65 L5 35 L35 35 Z' }
]

const currentAvatar = ref(authStore.user?.avatar || '')

function selectPreset(avatar: typeof presetAvatars[0]) {
  currentAvatar.value = `preset:${avatar.id}`
  authStore.updateAvatar(`preset:${avatar.id}`)
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    alert('文件大小不能超过 2MB')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('avatar', file)

    const res = await fetch('/api/upload/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      },
      body: formData
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message)
    }

    const data = await res.json()
    currentAvatar.value = data.url
    await authStore.updateAvatar(data.url)
  } catch (err) {
    alert(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function triggerUpload() {
  fileInput.value?.click()
}
</script>

<template>
  <div class="avatar-picker">
    <div class="current-avatar">
      <div v-if="currentAvatar?.startsWith('preset:')" class="avatar-display preset">
        <svg viewBox="0 0 100 100">
          <path
            :d="presetAvatars.find(a => `preset:${a.id}` === currentAvatar)?.path"
            :fill="presetAvatars.find(a => `preset:${a.id}` === currentAvatar)?.color"
            filter="url(#glow)"
          />
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>
      <div v-else-if="currentAvatar" class="avatar-display custom">
        <img :src="currentAvatar" alt="avatar" />
      </div>
      <div v-else class="avatar-display default">
        <span>👤</span>
      </div>
    </div>

    <div class="preset-grid">
      <button
        v-for="avatar in presetAvatars"
        :key="avatar.id"
        class="preset-item"
        :class="{ active: currentAvatar === `preset:${avatar.id}` }"
        @click="selectPreset(avatar)"
      >
        <svg viewBox="0 0 100 100">
          <path :d="avatar.path" :fill="avatar.color" />
        </svg>
      </button>
    </div>

    <button class="upload-btn" @click="triggerUpload" :disabled="uploading">
      {{ uploading ? '上传中...' : '📤 上传自定义头像' }}
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleUpload"
    />
  </div>
</template>

<style scoped>
.avatar-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.current-avatar {
  margin-bottom: 0.5rem;
}

.avatar-display {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border: 2px solid var(--border);
  overflow: hidden;
}

.avatar-display svg {
  width: 70%;
  height: 70%;
}

.avatar-display img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-display.default {
  font-size: 2.5rem;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.preset-item {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg-surface);
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preset-item:hover {
  border-color: var(--primary);
  transform: scale(1.1);
}

.preset-item.active {
  border-color: var(--primary);
  box-shadow: var(--primary-glow);
}

.preset-item svg {
  width: 60%;
  height: 60%;
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
  background: var(--bg-card);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
