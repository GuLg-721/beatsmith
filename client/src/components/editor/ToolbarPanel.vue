<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useAudioStore } from '@/stores/audioStore'
import { NButton, NSlider } from 'naive-ui'
import api from '@/utils/api'

const editorStore = useEditorStore()
const audioStore = useAudioStore()
const volume = ref(80)
const saving = ref(false)

function handleVolumeChange(val: number) {
  volume.value = val
  audioStore.setVolume(val / 100)
}

function handleExport() {
  const json = editorStore.exportJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'beatmap.json'
  a.click()
  URL.revokeObjectURL(url)
}

async function handleSave() {
  saving.value = true
  try {
    if (editorStore.mapId) {
      // 更新已有谱面
      await api.put(`/api/maps/${editorStore.mapId}`, {
        mapData: editorStore.exportJSON()
      })
    } else {
      // 创建新谱面
      const res = await api.post('/api/maps', {
        title: audioStore.fileName.replace(/\.[^.]+$/, '') || '未命名歌曲',
        audioFile: audioStore.fileName,
        bpm: audioStore.estimatedBPM || null,
        mapData: editorStore.exportJSON()
      })
      editorStore.mapId = res.data.id
    }
    editorStore.isDirty = false
  } catch (err) {
    console.error('Save failed:', err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <router-link to="/songs" class="back-link">← 返回</router-link>
      <span class="title">⚒️ 编辑器</span>
    </div>

    <div class="toolbar-center">
      <div class="volume-control">
        <span class="volume-icon">🔊</span>
        <NSlider
          :value="volume"
          :min="0"
          :max="100"
          :step="5"
          style="width: 100px"
          @update:value="handleVolumeChange"
        />
      </div>
    </div>

    <div class="toolbar-right">
      <NButton size="small" :disabled="!audioStore.isLoaded" @click="audioStore.isPlaying ? audioStore.pause() : audioStore.play()">
        {{ audioStore.isPlaying ? '⏸ 暂停' : '▶ 播放' }}
      </NButton>
      <NButton size="small" :loading="saving" :disabled="!audioStore.isLoaded" @click="handleSave">
        💾 {{ editorStore.mapId ? '保存' : '另存为' }}
      </NButton>
      <NButton size="small" :disabled="!audioStore.isLoaded" @click="handleExport">📤 导出</NButton>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--ink);
}

.title {
  font-weight: 600;
  color: var(--ink);
}

.toolbar-center {
  display: flex;
  align-items: center;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.volume-icon {
  font-size: 1rem;
}

.toolbar-right {
  display: flex;
  gap: 0.5rem;
}
</style>
