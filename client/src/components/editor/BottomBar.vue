<script setup lang="ts">
import { useEditorStore } from '@/stores/editorStore'
import { useAudioStore } from '@/stores/audioStore'
import { NButton, NSelect } from 'naive-ui'
import { ref } from 'vue'

const editorStore = useEditorStore()
const audioStore = useAudioStore()

const showGenerateModal = ref(false)
const generateMode = ref<'simple' | 'advanced' | 'custom'>('simple')
const customDensity = ref(0.5)
const customCircle = ref(0.6)
const customHold = ref(0.3)
const customSlide = ref(0.1)

const snapOptions = [
  { label: '1/4', value: 4 },
  { label: '1/8', value: 8 },
  { label: '1/16', value: 16 },
]

const toolOptions = [
  { label: '🔘 Circle', value: 'circle' },
  { label: '📏 Hold', value: 'hold' },
  { label: '〰️ Slide', value: 'slide' },
  { label: '👆 选择', value: 'select' },
]

function handleGenerate() {
  if (audioStore.detectedBeats.length === 0) return

  editorStore.generateNotes(
    audioStore.detectedBeats,
    audioStore.estimatedBPM || 120,
    generateMode.value,
    generateMode.value === 'custom' ? {
      density: customDensity.value,
      circleRatio: customCircle.value,
      holdRatio: customHold.value,
      slideRatio: customSlide.value,
    } : undefined
  )

  showGenerateModal.value = false
}
</script>

<template>
  <div class="bottom-bar">
    <div class="bar-left">
      <NButton size="small" @click="showGenerateModal = true">
        🎲 自动生成
      </NButton>

      <NSelect
        v-model:value="editorStore.activeTool"
        :options="toolOptions"
        size="small"
        style="width: 120px"
      />

      <NSelect
        v-model:value="editorStore.snapDivisor"
        :options="snapOptions"
        size="small"
        style="width: 80px"
      />
    </div>

    <div class="bar-center">
      <span class="note-count">音符: {{ editorStore.notes.length }}</span>
    </div>

    <div class="bar-right">
      <NButton size="small" :disabled="!editorStore.canUndo" @click="editorStore.undo()">
        ↩ 撤销
      </NButton>
      <NButton size="small" :disabled="!editorStore.canRedo" @click="editorStore.redo()">
        ↪ 重做
      </NButton>
      <NButton size="small" :disabled="!editorStore.selectedNoteId" @click="editorStore.selectedNoteId && editorStore.removeNote(editorStore.selectedNoteId)">
        🗑 删除
      </NButton>
    </div>

    <!-- 自动生成弹窗 -->
    <div v-if="showGenerateModal" class="modal-overlay" @click.self="showGenerateModal = false">
      <div class="modal">
        <h3>自动生成谱面</h3>
        <p class="modal-desc">根据检测到的 {{ audioStore.detectedBeats.length }} 个节拍生成基础谱面</p>

        <div class="mode-select">
          <button
            class="mode-btn"
            :class="{ active: generateMode === 'simple' }"
            @click="generateMode = 'simple'"
          >
            <span class="mode-icon">⚡</span>
            <span class="mode-name">简单</span>
            <span class="mode-desc">每拍一个 Circle</span>
          </button>
          <button
            class="mode-btn"
            :class="{ active: generateMode === 'advanced' }"
            @click="generateMode = 'advanced'"
          >
            <span class="mode-icon">🎵</span>
            <span class="mode-name">进阶</span>
            <span class="mode-desc">重拍 Circle + 弱拍 Hold</span>
          </button>
          <button
            class="mode-btn"
            :class="{ active: generateMode === 'custom' }"
            @click="generateMode = 'custom'"
          >
            <span class="mode-icon">⚙️</span>
            <span class="mode-name">自定义</span>
            <span class="mode-desc">调整密度和类型比例</span>
          </button>
        </div>

        <div v-if="generateMode === 'custom'" class="custom-options">
          <label>密度: {{ (customDensity * 100).toFixed(0) }}%</label>
          <input type="range" v-model.number="customDensity" min="0.1" max="1" step="0.1" />

          <label>Circle: {{ (customCircle * 100).toFixed(0) }}%</label>
          <input type="range" v-model.number="customCircle" min="0" max="1" step="0.1" />

          <label>Hold: {{ (customHold * 100).toFixed(0) }}%</label>
          <input type="range" v-model.number="customHold" min="0" max="1" step="0.1" />

          <label>Slide: {{ (customSlide * 100).toFixed(0) }}%</label>
          <input type="range" v-model.number="customSlide" min="0" max="1" step="0.1" />
        </div>

        <div class="modal-actions">
          <NButton @click="showGenerateModal = false">取消</NButton>
          <NButton type="primary" @click="handleGenerate">生成</NButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: var(--surface);
  border-top: 1px solid var(--border);
  font-size: 0.8125rem;
}

.bar-left, .bar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bar-center {
  color: var(--muted);
}

.note-count {
  font-variant-numeric: tabular-nums;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: oklch(0 0 0 / 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  width: 400px;
  max-width: 90vw;
}

.modal h3 {
  margin: 0 0 0.5rem;
  color: var(--ink);
}

.modal-desc {
  color: var(--muted);
  font-size: 0.8125rem;
  margin-bottom: 1rem;
}

.mode-select {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  background: oklch(0.10 0.005 280);
  border: 2px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--ink);
  font-family: inherit;
}

.mode-btn:hover {
  border-color: oklch(0.62 0.22 350 / 0.4);
}

.mode-btn.active {
  border-color: var(--primary);
  background: oklch(0.62 0.22 350 / 0.1);
}

.mode-icon {
  font-size: 1.25rem;
}

.mode-name {
  font-weight: 600;
  font-size: 0.8125rem;
}

.mode-desc {
  font-size: 0.6875rem;
  color: var(--muted);
}

.custom-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.custom-options label {
  color: var(--muted);
  font-size: 0.75rem;
}

.custom-options input[type="range"] {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border);
  border-radius: 2px;
  outline: none;
}

.custom-options input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
