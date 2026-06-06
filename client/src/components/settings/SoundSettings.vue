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
const currentCursor = ref('cross')
const customCursor = ref<string | null>(null)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

onMounted(async () => {
  try {
    const res = await api.get(`/api/users/${authStore.user?.id}/skin`)
    currentScheme.value = res.data.soundScheme || 'default'
    customSounds.value = res.data.customSounds || { click: null, hit: null, grade: null }
    currentCursor.value = res.data.cursor || 'cross'
    customCursor.value = res.data.customCursor || null
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
      cursor: currentCursor.value,
      customCursor: customCursor.value
    })
  } catch (err) {
    console.error('Failed to save skin settings:', err)
  }
}

function triggerUpload() {
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

    customSounds.value.click = res.data.url
    saveSettings()
  } catch (err) {
    alert(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function playCustomSound() {
  if (!customSounds.value.click) return
  const audio = new Audio(customSounds.value.click)
  audio.play()
}

function playPreview() {
  const ctx = new AudioContext()

  // 根据当前方案设置音效参数
  const schemes: Record<string, { click: { freq: number; type: OscillatorType }; hit: { freq: number; type: OscillatorType }; grade: { freq: number; type: OscillatorType } }> = {
    default: {
      click: { freq: 800, type: 'sine' },
      hit: { freq: 400, type: 'square' },
      grade: { freq: 1200, type: 'triangle' }
    },
    electronic: {
      click: { freq: 1200, type: 'sawtooth' },
      hit: { freq: 200, type: 'sawtooth' },
      grade: { freq: 1600, type: 'sine' }
    },
    mechanical: {
      click: { freq: 600, type: 'square' },
      hit: { freq: 150, type: 'sawtooth' },
      grade: { freq: 800, type: 'triangle' }
    }
  }

  const config = schemes[currentScheme.value] || schemes.default

  // Play click sound
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.frequency.value = config.click.freq
  osc1.type = config.click.type
  gain1.gain.value = 0.3
  osc1.start()
  gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
  osc1.stop(ctx.currentTime + 0.1)

  // Play hit sound
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.frequency.value = config.hit.freq
  osc2.type = config.hit.type
  gain2.gain.value = 0.3
  osc2.start(ctx.currentTime + 0.15)
  gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
  osc2.stop(ctx.currentTime + 0.25)

  // Play grade sound
  const osc3 = ctx.createOscillator()
  const gain3 = ctx.createGain()
  osc3.connect(gain3)
  gain3.connect(ctx.destination)
  osc3.frequency.value = config.grade.freq
  osc3.type = config.grade.type
  gain3.gain.value = 0.3
  osc3.start(ctx.currentTime + 0.3)
  gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
  osc3.stop(ctx.currentTime + 0.4)
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

    <div class="preview-section">
      <button class="preview-btn" @click="playPreview">
        🔊 预览音效
      </button>
    </div>

    <div class="custom-sound">
      <button class="upload-btn" @click="triggerUpload" :disabled="uploading">
        📤 上传自定义音效
      </button>
      <p class="upload-hint">支持 MP3、WAV、OGG 格式，最大 1MB，时长建议 0.5 秒内</p>
    </div>

    <div v-if="customSounds.click" class="uploaded-sound">
      <div class="uploaded-info">
        <span class="uploaded-icon">🎵</span>
        <span class="uploaded-name">自定义点击音效</span>
      </div>
      <button class="preview-uploaded-btn" @click="playCustomSound">
        🔊 预览
      </button>
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

.preview-section {
  text-align: center;
}

.preview-btn {
  padding: 0.6rem 1.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.preview-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.custom-sound {
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

.uploaded-sound {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.uploaded-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.uploaded-icon {
  font-size: 1.2rem;
}

.uploaded-name {
  color: var(--text);
  font-size: 0.9rem;
}

.preview-uploaded-btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--primary);
  border-radius: 6px;
  background: rgba(var(--primary-rgb), 0.1);
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
}

.preview-uploaded-btn:hover {
  background: rgba(var(--primary-rgb), 0.2);
}
</style>
