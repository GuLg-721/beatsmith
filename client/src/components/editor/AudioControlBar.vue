<script setup lang="ts">
import { useAudioStore } from '@/stores/audioStore'
import { useEditorStore } from '@/stores/editorStore'
import { computed } from 'vue'

const audioStore = useAudioStore()
const editorStore = useEditorStore()

function formatTime(ms: number): string {
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

const progress = computed(() => {
  if (audioStore.duration === 0) return 0
  return (audioStore.currentTime / audioStore.duration) * 100
})

function handleSeek(e: Event) {
  const target = e.target as HTMLInputElement
  const time = (parseFloat(target.value) / 100) * audioStore.duration
  audioStore.seek(time)
  // 同步跳转时间轴视口到对应时间
  editorStore.viewportOffset = Math.max(0, time - 2000) // 前移 2 秒显示上下文
}
</script>

<template>
  <div class="audio-control" v-if="audioStore.isLoaded">
    <div class="file-info">
      <span class="file-icon">🎵</span>
      <span class="file-name">{{ audioStore.fileName }}</span>
      <span class="bpm" v-if="audioStore.estimatedBPM">BPM: {{ audioStore.estimatedBPM }}</span>
    </div>

    <div class="progress-section">
      <span class="time">{{ formatTime(audioStore.currentTime) }}</span>
      <input
        type="range"
        class="progress-bar"
        min="0"
        max="100"
        :value="progress"
        @input="handleSeek"
      />
      <span class="time">{{ formatTime(audioStore.duration) }}</span>
    </div>
  </div>
</template>

<style scoped>
.audio-control {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.5rem 1rem;
  background: oklch(0.10 0.005 280);
  border-bottom: 1px solid var(--border);
  font-size: 0.8125rem;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-icon {
  font-size: 1rem;
}

.file-name {
  color: var(--ink);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bpm {
  color: var(--primary);
  font-weight: 600;
}

.progress-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.time {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  min-width: 3.5em;
}

.progress-bar {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
}
</style>
