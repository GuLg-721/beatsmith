<script setup lang="ts">
import { useEditorStore } from '@/stores/editorStore'
import { useAudioStore } from '@/stores/audioStore'
import { NButton } from 'naive-ui'
import api from '@/utils/api'

const editorStore = useEditorStore()
const audioStore = useAudioStore()

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
  if (!editorStore.mapId) return
  try {
    await api.put(`/api/maps/${editorStore.mapId}`, {
      mapData: editorStore.exportJSON()
    })
    editorStore.isDirty = false
  } catch (err) {
    console.error('Save failed:', err)
  }
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <router-link to="/songs" class="back-link">← 返回</router-link>
      <span class="title">⚒️ 编辑器</span>
    </div>
    <div class="toolbar-right">
      <NButton size="small" :disabled="!audioStore.isLoaded" @click="audioStore.isPlaying ? audioStore.pause() : audioStore.play()">
        {{ audioStore.isPlaying ? '⏸ 暂停' : '▶ 播放' }}
      </NButton>
      <NButton size="small" :disabled="!editorStore.isDirty" @click="handleSave">💾 保存</NButton>
      <NButton size="small" @click="handleExport">📤 导出JSON</NButton>
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

.toolbar-right {
  display: flex;
  gap: 0.5rem;
}
</style>
