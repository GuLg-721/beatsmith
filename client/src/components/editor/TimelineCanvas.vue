<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useAudioStore } from '@/stores/audioStore'
import { nanoid } from 'nanoid'
import type { Note } from '@/engine/BeatGenerator'

const editorStore = useEditorStore()
const audioStore = useAudioStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animFrameId: number | null = null
let isDragging = false
let dragNoteId: string | null = null
let dragStartX = 0
let dragStartY = 0
let dragIsResizing = false
let dragOffsetTime: number | undefined
let isPanning = false
let panStartX = 0
let panStartOffset = 0

const CANVAS_HEIGHT = 400
const NOTE_RADIUS = 12

// 颜色常量
const COLORS = {
  bg: '#0a0a14',
  waveform: 'rgba(100, 60, 200, 0.3)',
  grid: 'rgba(100, 60, 200, 0.15)',
  gridMajor: 'rgba(100, 60, 200, 0.3)',
  playhead: 'rgba(255, 100, 150, 0.9)',
  circle: 'rgba(255, 100, 150, 0.9)',
  circleStroke: 'rgba(255, 100, 150, 1)',
  tap: 'rgba(255, 140, 0, 0.9)',
  tapStroke: 'rgba(255, 140, 0, 1)',
  hold: 'rgba(255, 215, 0, 0.4)',
  holdStroke: 'rgba(255, 215, 0, 0.8)',
  selected: 'rgba(255, 255, 100, 0.9)',
  selectedGlow: 'rgba(255, 255, 100, 0.3)',
}

function timeToX(time: number): number {
  const offset = editorStore.viewportOffset
  return (time - offset) * editorStore.zoomLevel
}

function xToTime(x: number): number {
  return x / editorStore.zoomLevel + editorStore.viewportOffset
}

function yToNorm(y: number): number {
  return y / CANVAS_HEIGHT
}

function normToY(norm: number): number {
  return norm * CANVAS_HEIGHT
}

/**
 * 吸附到网格
 */
function snapTime(time: number): number {
  const bpm = audioStore.estimatedBPM || 120
  const beatInterval = 60000 / bpm
  const snapInterval = beatInterval / editorStore.snapDivisor
  return Math.round(time / snapInterval) * snapInterval
}

/**
 * 绘制波形
 */
function drawWaveform(ctx: CanvasRenderingContext2D, width: number) {
  const waveData = audioStore.frequencyData
  if (waveData.length === 0) return

  const barWidth = width / waveData.length
  ctx.fillStyle = COLORS.waveform

  for (let i = 0; i < waveData.length; i++) {
    const barHeight = (waveData[i] / 255) * CANVAS_HEIGHT * 0.6
    ctx.fillRect(
      i * barWidth,
      (CANVAS_HEIGHT - barHeight) / 2,
      barWidth - 1,
      barHeight
    )
  }
}

/**
 * 绘制节拍网格
 */
function drawGrid(ctx: CanvasRenderingContext2D, width: number) {
  const bpm = audioStore.estimatedBPM || 120
  const beatInterval = 60000 / bpm
  const startTime = editorStore.viewportOffset
  const endTime = xToTime(width)

  const firstBeat = Math.floor(startTime / beatInterval) * beatInterval

  for (let time = firstBeat; time <= endTime; time += beatInterval) {
    const x = timeToX(time)
    if (x < 0 || x > width) continue

    const beatIndex = Math.round(time / beatInterval)
    const isMajor = beatIndex % 4 === 0

    ctx.strokeStyle = isMajor ? COLORS.gridMajor : COLORS.grid
    ctx.lineWidth = isMajor ? 1 : 0.5
    ctx.setLineDash(isMajor ? [] : [4, 4])

    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CANVAS_HEIGHT)
    ctx.stroke()
  }

  ctx.setLineDash([])
}

/**
 * 绘制音符
 */
function drawNotes(ctx: CanvasRenderingContext2D, width: number) {
  editorStore.notes.forEach(note => {
    const x = timeToX(note.time)
    const y = normToY(note.y)

    if (x < -50 || x > width + 50) return

    const isSelected = note.id === editorStore.selectedNoteId
    const color = isSelected ? COLORS.selected : (
      note.type === 'circle' ? COLORS.circle :
      note.type === 'tap' ? COLORS.tap :
      note.type === 'hold' ? COLORS.holdStroke :
      COLORS.circle
    )

    // 选中高亮
    if (isSelected) {
      ctx.fillStyle = COLORS.selectedGlow
      ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 8, 0, Math.PI * 2); ctx.fill()
    }

    if (note.type === 'circle') {
      ctx.fillStyle = color
      ctx.strokeStyle = COLORS.circleStroke
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    }

    if (note.type === 'tap') {
      // Tap 音符：橙色菱形
      ctx.fillStyle = color
      ctx.strokeStyle = COLORS.tapStroke
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y - NOTE_RADIUS)
      ctx.lineTo(x + NOTE_RADIUS * 0.8, y)
      ctx.lineTo(x, y + NOTE_RADIUS)
      ctx.lineTo(x - NOTE_RADIUS * 0.8, y)
      ctx.closePath()
      ctx.fill(); ctx.stroke()
    }

    if (note.type === 'hold' && note.endTime) {
      const endX = timeToX(note.endTime)
      ctx.fillStyle = COLORS.hold
      ctx.fillRect(x, y - 6, endX - x, 12)
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS * 0.7, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(endX, y, NOTE_RADIUS * 0.7, 0, Math.PI * 2); ctx.fill()
      if (isSelected) {
        ctx.strokeStyle = COLORS.selected; ctx.lineWidth = 2
        ctx.strokeRect(x - 2, y - 8, endX - x + 4, 16)
      }
    }
  })
}

/**
 * 绘制播放头
 */
function drawPlayhead(ctx: CanvasRenderingContext2D) {
  const x = timeToX(audioStore.currentTime)
  if (x < 0) return

  ctx.strokeStyle = COLORS.playhead
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, CANVAS_HEIGHT)
  ctx.stroke()

  // 顶部三角形
  ctx.fillStyle = COLORS.playhead
  ctx.beginPath()
  ctx.moveTo(x - 6, 0)
  ctx.lineTo(x + 6, 0)
  ctx.lineTo(x, 8)
  ctx.closePath()
  ctx.fill()
}

/**
 * 主渲染循环
 */
function render() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width

  // 清空画布
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, width, CANVAS_HEIGHT)

  // 绘制各层
  drawGrid(ctx, width)
  drawWaveform(ctx, width)
  drawNotes(ctx, width)
  drawPlayhead(ctx)

  animFrameId = requestAnimationFrame(render)
}

/**
 * 查找点击位置的音符
 * Hold 音符：点击整个范围都能选中
 */
function findNoteAtPosition(canvasX: number, canvasY: number): Note | null {
  for (let i = editorStore.notes.length - 1; i >= 0; i--) {
    const note = editorStore.notes[i]
    const x = timeToX(note.time)
    const y = normToY(note.y)

    // Hold 音符：检查是否在时间范围内
    if (note.type === 'hold' && note.endTime) {
      const endX = timeToX(note.endTime)
      const inTimeRange = canvasX >= x - 10 && canvasX <= endX + 10
      const inYRange = Math.abs(canvasY - y) < NOTE_RADIUS + 10
      if (inTimeRange && inYRange) return note
    }

    // Circle/Tap 音符：检查距离
    const dx = canvasX - x
    const dy = canvasY - y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const hitRadius = note.type === 'tap' ? NOTE_RADIUS + 8 : NOTE_RADIUS + 5
    if (dist < hitRadius) return note
  }
  return null
}

/**
 * 鼠标按下
 */
function handleMouseDown(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // 右键拖拽平移
  if (e.button === 2) {
    isPanning = true
    panStartX = e.clientX
    panStartOffset = editorStore.viewportOffset
    return
  }

  // 查找点击的音符
  const note = findNoteAtPosition(x, y)

  if (note) {
    // 选中音符
    editorStore.selectNote(note.id)
    isDragging = true
    dragNoteId = note.id
    dragStartX = x
    dragStartY = y

    // Hold 音符：检测是否点击了端点（用于拉伸）
    if (note.type === 'hold' && note.endTime) {
      const endX = timeToX(note.endTime)
      const distToEnd = Math.abs(x - endX)
      if (distToEnd < 15) {
        dragIsResizing = true
        dragOffsetTime = undefined
      } else {
        dragIsResizing = false
        dragOffsetTime = note.endTime - note.time
      }
    } else {
      dragIsResizing = false
      dragOffsetTime = undefined
    }
  } else {
    // 放置新音符
    editorStore.selectNote(null)
    const time = snapTime(xToTime(x))
    const yNorm = yToNorm(y)

    if (editorStore.activeTool !== 'select') {
      const noteType = editorStore.activeTool as 'circle' | 'tap' | 'hold'
      const newNote: Note = {
        id: nanoid(8),
        type: noteType,
        time,
        x: 0.5 + (Math.random() - 0.5) * 0.3,
        y: yNorm,
        // Hold 音符默认持续 500ms
        ...(noteType === 'hold' ? { endTime: time + 500 } : {})
      }
      editorStore.addNote(newNote)
    }
  }
}

/**
 * 鼠标移动
 */
function handleMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left

  if (isPanning) {
    const dx = e.clientX - panStartX
    editorStore.viewportOffset = panStartOffset - dx / editorStore.zoomLevel
    return
  }

  if (isDragging && dragNoteId) {
    const note = editorStore.notes.find(n => n.id === dragNoteId)
    if (note) {
      const newTime = snapTime(xToTime(x))
      if (dragIsResizing && note.type === 'hold' && note.endTime) {
        // 拉伸 Hold 端点
        note.endTime = Math.max(note.time + 100, newTime)
      } else {
        note.time = newTime
        // Hold 音符：同步移动 endTime
        if (note.type === 'hold' && note.endTime && dragOffsetTime !== undefined) {
          note.endTime = newTime + dragOffsetTime
        }
      }
    }
  }
}

/**
 * 鼠标释放
 */
function handleMouseUp(e: MouseEvent) {
  if (isDragging && dragNoteId) {
    const note = editorStore.notes.find(n => n.id === dragNoteId)
    if (note) {
      // 记录移动操作到 undo 栈
      // （简化处理，实际应该记录完整移动）
    }
  }
  isDragging = false
  dragNoteId = null
  dragIsResizing = false
  dragOffsetTime = undefined
  isPanning = false
}

/**
 * 滚轮缩放
 */
function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  editorStore.zoomLevel = Math.max(0.02, Math.min(0.5, editorStore.zoomLevel * delta))
}

/**
 * 键盘事件
 */
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (editorStore.selectedNoteId) {
      editorStore.removeNote(editorStore.selectedNoteId)
    }
  }
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault()
    editorStore.undo()
  }
  if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
    e.preventDefault()
    editorStore.redo()
  }
  if (e.key === ' ') {
    e.preventDefault()
    if (audioStore.isPlaying) {
      audioStore.pause()
    } else {
      audioStore.play()
    }
  }
}

/**
 * 调整 Canvas 大小
 */
function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = canvas.parentElement?.clientWidth || 800
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('keydown', handleKeyDown)
  render()
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    :height="CANVAS_HEIGHT"
    class="timeline-canvas"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @wheel.prevent="handleWheel"
    @contextmenu.prevent
  />
</template>

<style scoped>
.timeline-canvas {
  width: 100%;
  display: block;
  cursor: crosshair;
  border-radius: 8px;
  border: 1px solid var(--border);
}
</style>
