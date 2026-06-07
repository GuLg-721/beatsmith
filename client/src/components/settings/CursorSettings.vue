<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useSkinSettings } from '@/composables/useSkinSettings'

const authStore = useAuthStore()
const { cursor, customCursor, loadSkinSettings, saveSkinSettings } = useSkinSettings()

const cursorStyles = [
  {
    id: 'cross',
    name: '十字准星',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><line x1="16" y1="4" x2="16" y2="28" stroke="white" stroke-width="2"/><line x1="4" y1="16" x2="28" y2="16" stroke="white" stroke-width="2"/></svg>`
  },
  {
    id: 'square',
    name: '圆圈准星',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="8" fill="none" stroke="white" stroke-width="2"/></svg>`
  },
  {
    id: 'dot',
    name: '点状准星',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="13" width="6" height="6" fill="white"/><rect x="14" y="14" width="4" height="4" fill="#fcee09"/></svg>`
  }
]

const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

onMounted(() => {
  loadSkinSettings()
})

function selectCursor(cursorId: string) {
  saveSkinSettings({ cursor: cursorId, customCursor: null })
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

    const res = await fetch('/api/upload/cursor', {
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
    saveSkinSettings({ cursor: 'custom', customCursor: data.url })
  } catch (err) {
    alert(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}
</script>

<template>
  <div class="cursor-settings">
    <div class="cursor-grid">
      <button
        v-for="cursorStyle in cursorStyles"
        :key="cursorStyle.id"
        class="cursor-card"
        :class="{ active: cursor === cursorStyle.id }"
        @click="selectCursor(cursorStyle.id)"
      >
        <div class="cursor-preview" v-html="cursorStyle.svg"></div>
        <div class="cursor-name">{{ cursorStyle.name }}</div>
      </button>
    </div>

    <div class="custom-cursor">
      <button class="upload-btn" @click="triggerUpload" :disabled="uploading">
        📤 上传自定义光标
      </button>
      <p class="upload-hint">支持 PNG、SVG 格式，最大 100KB</p>
    </div>

    <div v-if="customCursor" class="uploaded-cursor">
      <div class="uploaded-info">
        <div class="uploaded-preview">
          <img :src="customCursor" alt="custom cursor" />
        </div>
        <span class="uploaded-name">自定义光标</span>
      </div>
      <button class="select-uploaded-btn" @click="selectCursor('custom')">
        ✓ 使用
      </button>
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

.uploaded-cursor {
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
  gap: 0.8rem;
}

.uploaded-preview {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.uploaded-preview img {
  max-width: 100%;
  max-height: 100%;
}

.uploaded-name {
  color: var(--text);
  font-size: 0.9rem;
}

.select-uploaded-btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--primary);
  border-radius: 6px;
  background: rgba(var(--primary-rgb), 0.1);
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
}

.select-uploaded-btn:hover {
  background: rgba(var(--primary-rgb), 0.2);
}
</style>
