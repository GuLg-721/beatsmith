<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import api from '@/utils/api'

const authStore = useAuthStore()

const soundSchemes = [
  { id: 'default', name: '默认', description: '轻敲声 + 打击声 + 叮咚声' },
  { id: 'electronic', name: '电子', description: '电子音 + 合成器 + 电音' },
  { id: 'mechanical', name: '机械', description: '机械键 + 金属撞击 + 齿轮声' }
]

const currentScheme = ref('default')
const customSounds = ref<{ click: string | null; hit: string | null; grade: string | null }>({
  click: null,
  hit: null,
  grade: null
})
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()
const uploadType = ref<'click' | 'hit' | 'grade'>('click')

onMounted(async () => {
  try {
    const res = await api.get(`/api/users/${authStore.user?.id}/skin`)
    currentScheme.value = res.data.soundScheme || 'default'
    customSounds.value = res.data.customSounds || { click: null, hit: null, grade: null }
  } catch (err) {
    console.error('Failed to load skin settings:', err)
  }
})

function selectScheme(schemeId: string) {
  currentScheme.value = schemeId
  saveSettings()
}

async function saveSettings() {
  try {
    await api.put(`/api/users/${authStore.user?.id}/skin`, {
      soundScheme: currentScheme.value,
      customSounds: customSounds.value,
      cursor: authStore.user?.skinSettings?.cursor || 'cross',
      customCursor: authStore.user?.skinSettings?.customCursor || null
    })
  } catch (err) {
    console.error('Failed to save skin settings:', err)
  }
}

function triggerUpload(type: 'click' | 'hit' | 'grade') {
  uploadType.value = type
  fileInput.value?.click()
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 1 * 1024 * 1024) {
    alert('文件大小不能超过 1MB')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('sound', file)

    const res = await api.post('/api/upload/sound', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    customSounds.value[uploadType.value] = res.data.url
    saveSettings()
  } catch (err) {
    alert(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function playPreview(type: 'click' | 'hit' | 'grade') {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  if (type === 'click') {
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
  } else if (type === 'hit') {
    oscillator.frequency.value = 400
    oscillator.type = 'square'
  } else {
    oscillator.frequency.value = 1200
    oscillator.type = 'triangle'
  }

  gainNode.gain.value = 0.3
  oscillator.start()
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
  oscillator.stop(ctx.currentTime + 0.1)
}
</script>

<template>
  <div class="sound-settings">
    <div class="scheme-grid">
      <button
        v-for="scheme in soundSchemes"
        :key="scheme.id"
        class="scheme-card"
        :class="{ active: currentScheme === scheme.id }"
        @click="selectScheme(scheme.id)"
      >
        <div class="scheme-name">{{ scheme.name }}</div>
        <div class="scheme-desc">{{ scheme.description }}</div>
      </button>
    </div>

    <div class="custom-sounds">
      <h4>自定义音效</h4>
      <div class="sound-list">
        <div class="sound-item">
          <span>点击音效</span>
          <button class="preview-btn" @click="playPreview('click')">预览</button>
          <button class="upload-btn" @click="triggerUpload('click')" :disabled="uploading">
            {{ customSounds.click ? '已上传' : '上传' }}
          </button>
        </div>
        <div class="sound-item">
          <span>打击音效</span>
          <button class="preview-btn" @click="playPreview('hit')">预览</button>
          <button class="upload-btn" @click="triggerUpload('hit')" :disabled="uploading">
            {{ customSounds.hit ? '已上传' : '上传' }}
          </button>
        </div>
        <div class="sound-item">
          <span>评级音效</span>
          <button class="preview-btn" @click="playPreview('grade')">预览</button>
          <button class="upload-btn" @click="triggerUpload('grade')" :disabled="uploading">
            {{ customSounds.grade ? '已上传' : '上传' }}
          </button>
        </div>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".mp3,.wav,.ogg"
      style="display: none"
      @change="handleUpload"
    />
  </div>
</template>

<style scoped>
.sound-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.scheme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.scheme-card {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.scheme-card:hover {
  border-color: var(--primary);
}

.scheme-card.active {
  border-color: var(--primary);
  background: rgba(var(--primary-rgb), 0.1);
}

.scheme-name {
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.3rem;
}

.scheme-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.custom-sounds h4 {
  color: var(--text);
  font-size: 0.9rem;
  margin-bottom: 0.8rem;
}

.sound-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sound-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem;
  background: var(--bg-surface);
  border-radius: 6px;
}

.sound-item span {
  flex: 1;
  color: var(--text);
  font-size: 0.9rem;
}

.preview-btn, .upload-btn {
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-btn:hover, .upload-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
