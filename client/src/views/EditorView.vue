<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEditorStore } from '@/stores/editorStore'
import { useAudioStore } from '@/stores/audioStore'
import { NUpload, NButton, NSpin } from 'naive-ui'
import type { UploadFileInfo } from 'naive-ui'
import ToolbarPanel from '@/components/editor/ToolbarPanel.vue'
import AudioControlBar from '@/components/editor/AudioControlBar.vue'
import TimelineCanvas from '@/components/editor/TimelineCanvas.vue'
import BottomBar from '@/components/editor/BottomBar.vue'
import api from '@/utils/api'

const route = useRoute()
const editorStore = useEditorStore()
const audioStore = useAudioStore()

const loading = ref(false)
const showUpload = ref(true)
const uploadInputRef = ref<HTMLInputElement | null>(null)

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files || !input.files[0]) return

  const file = input.files[0]
  loading.value = true

  try {
    await audioStore.loadAudio(file)
    showUpload.value = false

    // 如果有 mapId，加载已有谱面
    const mapId = route.query.mapId as string
    if (mapId) {
      editorStore.mapId = mapId
      const res = await api.get(`/api/maps/${mapId}`)
      if (res.data.map.mapData) {
        editorStore.importJSON(res.data.map.mapData)
      }
    }
  } catch (err) {
    console.error('Failed to load audio:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 检查是否从谱面详情页跳转过来
  const mapId = route.query.mapId as string
  if (mapId) {
    // 加载谱面的音频
    api.get(`/api/maps/${mapId}`).then(async (res) => {
      const map = res.data.map
      editorStore.mapId = mapId
      audioStore.uploadedFilename = map.audioFile
      loading.value = true
      try {
        await audioStore.loadAudioUrl(`/uploads/${map.audioFile}`)
        showUpload.value = false
        if (map.mapData) {
          editorStore.importJSON(map.mapData)
        }
      } catch (err) {
        console.error('Failed to load map audio:', err)
      } finally {
        loading.value = false
      }
    })
  }
})
</script>

<template>
  <div class="editor-page">
    <ToolbarPanel />

    <!-- 上传音频区域 -->
    <div v-if="showUpload" class="upload-area">
      <NSpin :show="loading">
        <div class="upload-content">
          <div class="upload-icon">🎵</div>
          <h2>上传音频开始编辑</h2>
          <p>支持 MP3, WAV, OGG, FLAC</p>
          <div class="upload-btn-wrapper">
            <input
              ref="uploadInputRef"
              type="file"
              accept=".mp3,.wav,.ogg,.flac"
              style="display: none"
              @change="handleFileSelect"
            />
            <NButton type="primary" size="large" @click="uploadInputRef?.click()">
              选择音频文件
            </NButton>
          </div>
        </div>
      </NSpin>
    </div>

    <!-- 编辑器主体 -->
    <div v-else class="editor-body">
      <AudioControlBar />
      <div class="canvas-wrapper">
        <TimelineCanvas />
      </div>
      <BottomBar />
    </div>
  </div>
</template>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
}

.upload-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.upload-icon {
  font-size: 4rem;
}

.upload-content h2 {
  color: var(--ink);
  margin: 0;
}

.upload-content p {
  color: var(--muted);
  margin: 0;
}

.editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}
</style>
