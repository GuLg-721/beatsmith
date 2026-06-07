<script setup lang="ts">
import { ref } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NAlert,
} from 'naive-ui'
import api from '@/utils/api'
import jsmediatags from 'jsmediatags'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'uploaded'): void
}>()

const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const form = ref({
  title: '',
  artist: ''
})

const audioFile = ref<File | null>(null)
const coverFile = ref<File | null>(null)
const audioInputRef = ref<HTMLInputElement | null>(null)
const coverInputRef = ref<HTMLInputElement | null>(null)

// 读取 MP3 元数据
async function readMp3Metadata(file: File): Promise<{ artist: string; title: string } | null> {
  return new Promise((resolve) => {
    jsmediatags.read(file, {
      onSuccess: (tag) => {
        const artist = tag.tags.artist || ''
        const title = tag.tags.title || ''

        if (artist || title) {
          resolve({
            artist: artist || '未知艺术家',
            title: title || file.name.replace(/\.[^/.]+$/, '')
          })
        } else {
          resolve(null)
        }
      },
      onError: () => {
        resolve(null)
      }
    })
  })
}

// 解析文件名：格式为 "作者名 - 歌曲名.mp3"
function parseFileName(fileName: string): { artist: string; title: string } {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
  const parts = nameWithoutExt.split(' - ')

  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim()
    }
  }

  return {
    artist: '未知艺术家',
    title: nameWithoutExt.trim()
  }
}

async function handleAudioChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    audioFile.value = file

    // 自动识别歌曲信息
    const metadata = await readMp3Metadata(file)
    if (metadata) {
      form.value.title = metadata.title
      form.value.artist = metadata.artist
    } else {
      // 如果元数据读取失败，解析文件名
      const fileInfo = parseFileName(file.name)
      form.value.title = fileInfo.title
      form.value.artist = fileInfo.artist
    }
  }
}

function handleCoverChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    coverFile.value = input.files[0]
  }
}

function handleClose() {
  emit('update:show', false)
  form.value = { title: '', artist: '' }
  audioFile.value = null
  coverFile.value = null
  errorMsg.value = ''
  successMsg.value = ''
}

async function handleUpload() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!form.value.title.trim()) {
    errorMsg.value = '请输入歌曲名称'
    return
  }
  if (!audioFile.value) {
    errorMsg.value = '请选择音频文件'
    return
  }

  loading.value = true

  try {
    // 上传音频
    const audioFormData = new FormData()
    audioFormData.append('audio', audioFile.value)
    const audioRes = await api.post('/api/upload/audio', audioFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    // 上传封面（如果有）
    let coverFilename = null
    if (coverFile.value) {
      const coverFormData = new FormData()
      coverFormData.append('cover', coverFile.value)
      const coverRes = await api.post('/api/upload/cover', coverFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      coverFilename = coverRes.data.filename
    }

    // 创建谱面记录
    await api.post('/api/maps', {
      title: form.value.title.trim(),
      artist: form.value.artist.trim() || null,
      audioFile: audioRes.data.filename,
      coverImage: coverFilename,
      bpm: null,
      mapData: '{"notes":[],"timingPoints":[]}'
    })

    successMsg.value = '上传成功！'
    setTimeout(() => {
      emit('uploaded')
      handleClose()
    }, 1000)
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || '上传失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NModal
    :show="show"
    :mask-closable="false"
    @update:show="(val) => !val && handleClose()"
    transform-origin="center"
  >
    <div class="upload-dialog">
      <div class="dialog-header">
        <h3>上传歌曲</h3>
        <button class="close-btn" @click="handleClose">✕</button>
      </div>

      <NAlert v-if="errorMsg" type="error" :title="errorMsg" closable @close="errorMsg = ''" class="alert" />
      <NAlert v-if="successMsg" type="success" :title="successMsg" class="alert" />

      <NForm :model="form" label-placement="top">
        <NFormItem label="歌曲名称" required>
          <NInput v-model:value="form.title" placeholder="输入歌曲名称" :disabled="loading" />
        </NFormItem>

        <NFormItem label="艺术家（可选）">
          <NInput v-model:value="form.artist" placeholder="艺术家/歌手名" :disabled="loading" />
        </NFormItem>

        <NFormItem label="音频文件" required>
          <div class="file-upload" @click="audioInputRef?.click()">
            <input
              ref="audioInputRef"
              type="file"
              accept=".mp3,.wav,.ogg,.flac"
              style="display: none"
              @change="handleAudioChange"
            />
            <div class="file-upload-content">
              <div class="file-icon">🎵</div>
              <div class="file-name" v-if="audioFile">{{ audioFile.name }}</div>
              <div class="file-text" v-else>点击选择音频文件</div>
              <div class="file-hint">MP3, WAV, OGG, FLAC（最大 50MB）</div>
            </div>
          </div>
        </NFormItem>

        <NFormItem label="封面图片（可选）">
          <div class="file-upload" @click="coverInputRef?.click()">
            <input
              ref="coverInputRef"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              style="display: none"
              @change="handleCoverChange"
            />
            <div class="file-upload-content">
              <div class="file-icon">🖼️</div>
              <div class="file-name" v-if="coverFile">{{ coverFile.name }}</div>
              <div class="file-text" v-else>点击选择封面图片</div>
              <div class="file-hint">JPG, PNG, WebP（最大 5MB）</div>
            </div>
          </div>
        </NFormItem>
      </NForm>

      <div class="dialog-footer">
        <NButton :disabled="loading" @click="handleClose">取消</NButton>
        <NButton type="primary" :loading="loading" :disabled="loading" @click="handleUpload">
          上传
        </NButton>
      </div>
    </div>
  </NModal>
</template>

<style scoped>
.upload-dialog {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  width: 500px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.dialog-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ink);
}

.close-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--ink);
}

.alert {
  margin-bottom: 1rem;
}

:deep(.n-form-item-label__text) {
  color: var(--muted) !important;
}

:deep(.n-input) {
  --n-border: 1px solid var(--border) !important;
  --n-border-hover: 1px solid oklch(0.62 0.22 350 / 0.4) !important;
  --n-border-focus: 1px solid var(--primary) !important;
  --n-color: oklch(0.10 0.005 280) !important;
  --n-text-color: var(--ink) !important;
  --n-placeholder-color: oklch(0.40 0.005 280) !important;
  border-radius: 8px !important;
}

.file-upload {
  width: 100%;
  padding: 1.5rem;
  border: 2px dashed var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  text-align: center;
}

.file-upload:hover {
  border-color: oklch(0.62 0.22 350 / 0.4);
  background: oklch(0.62 0.22 350 / 0.03);
}

.file-upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.file-icon {
  font-size: 1.75rem;
}

.file-name {
  font-size: 0.875rem;
  color: var(--primary);
  font-weight: 500;
  word-break: break-all;
}

.file-text {
  font-size: 0.875rem;
  color: var(--ink);
}

.file-hint {
  font-size: 0.75rem;
  color: var(--muted);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
