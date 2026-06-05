<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useAudioStore } from '@/stores/audioStore'
import type { Note } from '@/engine/BeatGenerator'

const gameStore = useGameStore()
const audioStore = useAudioStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animFrameId: number | null = null

const CANVAS_HEIGHT = 600
const NOTE_RADIUS = 20
const APPROACH_MAX = 3.0 // 判定圈最大缩放

// 颜色
const COLORS = {
  bg: '#0a0a14',
  circle: 'rgba(255, 100, 150, 0.9)',
  circleBorder: 'rgba(255, 100, 150, 1)',
  hold: 'rgba(100, 200, 255, 0.4)',
  holdBorder: 'rgba(100, 200, 255, 0.8)',
  slide: 'rgba(150, 255, 150, 0.8)',
  approach: 'rgba(255, 255, 255, 0.6)',
  judgment: {
    perfect: '#ffd700',
    great: '#4a9eff',
    good: '#4caf50',
    miss: '#ff5252'
  }
}

// 当前可点击的音符
const clickableNotes = ref<Note[]>([])

/**
 * 获取当前时间附近的音符
 */
function getActiveNotes(currentTime: number): Note[] {
  return gameStore.notes.filter(note => {
    if (gameStore.state !== 'playing') return false
    const timeDiff = note.time - currentTime
    // 显示在判定范围内的音符（提前 2 秒显示）
    return timeDiff > -200 && timeDiff < 2000
  })
}

/**
 * 绘制 Circle 音符
 */
function drawCircle(ctx: CanvasRenderingContext2D, note: Note, currentTime: number) {
  const x = note.x * ctx.canvas.width
  const y = note.y * CANVAS_HEIGHT
  const timeDiff = note.time - currentTime

  // Approach circle（从大缩小）
  const progress = 1 - (timeDiff / 1000) // 0→1 当时间到达时
  if (progress >= 0 && progress <= 1) {
    const scale = APPROACH_MAX - (APPROACH_MAX - 1) * progress
    ctx.strokeStyle = COLORS.approach
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, NOTE_RADIUS * scale, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 音符本体
  ctx.fillStyle = COLORS.circle
  ctx.strokeStyle = COLORS.circleBorder
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

/**
 * 绘制 Hold 音符
 */
function drawHold(ctx: CanvasRenderingContext2D, note: Note, currentTime: number) {
  if (!note.endTime) return

  const x = note.x * ctx.canvas.width
  const y = note.y * CANVAS_HEIGHT
  const endX = x // 简化：Hold 是垂直的
  const endY = y + ((note.endTime - note.time) / 1000) * 50 // 根据时长计算长度

  // Hold 条
  ctx.fillStyle = COLORS.hold
  ctx.strokeStyle = COLORS.holdBorder
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.roundRect(x - 8, y, 16, endY - y, 4)
  ctx.fill()
  ctx.stroke()

  // 起点圆
  ctx.fillStyle = COLORS.holdBorder
  ctx.beginPath()
  ctx.arc(x, y, NOTE_RADIUS * 0.6, 0, Math.PI * 2)
  ctx.fill()

  // 终点圆
  ctx.beginPath()
  ctx.arc(endX, endY, NOTE_RADIUS * 0.6, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * 绘制 Slide 音符
 */
function drawSlide(ctx: CanvasRenderingContext2D, note: Note, currentTime: number) {
  if (!note.controlPoints) return

  const x = note.x * ctx.canvas.width
  const y = note.y * CANVAS_HEIGHT

  ctx.strokeStyle = COLORS.slide
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x, y)

  note.controlPoints.forEach(cp => {
    ctx.lineTo(cp.x * ctx.canvas.width, cp.y * CANVAS_HEIGHT)
  })

  ctx.stroke()

  // 起点圆
  ctx.fillStyle = COLORS.slide
  ctx.beginPath()
  ctx.arc(x, y, NOTE_RADIUS * 0.6, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * 绘制判定反馈
 */
function drawFeedbacks(ctx: CanvasRenderingContext2D) {
  gameStore.feedbacks.forEach(feedback => {
    const age = (Date.now() - feedback.time) / 1000
    if (age > 1) return

    const x = feedback.x * ctx.canvas.width
    const y = feedback.y * CANVAS_HEIGHT - age * 50 // 向上飘
    const alpha = 1 - age

    ctx.font = 'bold 24px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = COLORS.judgment[feedback.type]
    ctx.globalAlpha = alpha
    ctx.fillText(feedback.type.toUpperCase(), x, y)
    ctx.globalAlpha = 1
  })
}

/**
 * 主渲染循环
 */
function render() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const currentTime = audioStore.currentTime

  // 清空
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, canvas.width, CANVAS_HEIGHT)

  if (gameStore.state === 'playing') {
    // 绘制音符
    const activeNotes = getActiveNotes(currentTime)
    activeNotes.forEach(note => {
      switch (note.type) {
        case 'circle': drawCircle(ctx, note, currentTime); break
        case 'hold': drawHold(ctx, note, currentTime); break
        case 'slide': drawSlide(ctx, note, currentTime); break
      }
    })

    // 绘制反馈
    drawFeedbacks(ctx)

    // 检查 Miss（超时未击中的 Circle）
    gameStore.notes.forEach(note => {
      if (note.type === 'circle' && !gameStore.processedNotes.has(note.id)) {
        if (currentTime - note.time > 100) {
          gameStore.handleMiss(note.id)
        }
      }
    })

    // 检查游戏结束
    if (currentTime >= audioStore.duration && audioStore.duration > 0) {
      gameStore.endGame()
    }
  }

  animFrameId = requestAnimationFrame(render)
}

/**
 * 鼠标点击
 */
function handleClick(e: MouseEvent) {
  if (gameStore.state !== 'playing') return

  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const clickY = e.clientY - rect.top
  const currentTime = audioStore.currentTime

  // 查找最近的可点击音符
  let closestNote: Note | null = null
  let closestDist = Infinity

  gameStore.notes.forEach(note => {
    if (gameStore.processedNotes.has(note.id)) return

    const noteX = note.x * canvas.width
    const noteY = note.y * CANVAS_HEIGHT
    const dist = Math.sqrt((clickX - noteX) ** 2 + (clickY - noteY) ** 2)

    // 只考虑在点击范围内的音符（200ms 内）
    const timeDiff = Math.abs(note.time - currentTime)
    if (dist < NOTE_RADIUS + 30 && timeDiff < 200) {
      if (dist < closestDist) {
        closestDist = dist
        closestNote = note
      }
    }
  })

  if (closestNote) {
    gameStore.handleHit(closestNote.id, currentTime, closestNote.time, closestNote.x, closestNote.y)
  }
}

onMounted(() => {
  const canvas = canvasRef.value
  if (canvas) {
    canvas.width = canvas.parentElement?.clientWidth || 800
    canvas.height = CANVAS_HEIGHT
  }
  render()
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    :height="CANVAS_HEIGHT"
    class="game-canvas"
    @click="handleClick"
  />
</template>

<style scoped>
.game-canvas {
  width: 100%;
  display: block;
  cursor: pointer;
  border-radius: 8px;
}
</style>
