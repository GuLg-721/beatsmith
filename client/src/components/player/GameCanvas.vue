<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useAudioStore } from '@/stores/audioStore'
import type { Note } from '@/engine/BeatGenerator'

const gameStore = useGameStore()
const audioStore = useAudioStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animFrameId: number | null = null

const CANVAS_HEIGHT = 600
const NOTE_RADIUS = 20

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

/**
 * 绘制 Circle 音符 + 判定圈动画
 */
function drawCircle(ctx: CanvasRenderingContext2D, note: Note, currentTime: number, canvasWidth: number) {
  const x = note.x * canvasWidth
  const y = note.y * CANVAS_HEIGHT
  const timeUntilHit = note.time - currentTime // 正数 = 还没到，负数 = 已过

  // Approach circle：从 3x 缩小到 1x，在命中前 1 秒开始缩小
  const approachDuration = 1000 // 1 秒内缩小
  if (timeUntilHit > 0 && timeUntilHit < approachDuration) {
    const progress = 1 - (timeUntilHit / approachDuration) // 0→1
    const scale = 3 - 2 * progress // 3→1
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

  // 未命中且已过期 → 变暗
  if (timeUntilHit < -200) {
    ctx.fillStyle = 'rgba(10, 10, 20, 0.7)'
    ctx.beginPath()
    ctx.arc(x, y, NOTE_RADIUS + 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * 绘制 Hold 音符
 */
function drawHold(ctx: CanvasRenderingContext2D, note: Note, currentTime: number, canvasWidth: number) {
  if (!note.endTime) return

  const x = note.x * canvasWidth
  const y = note.y * CANVAS_HEIGHT
  const endY = y + Math.min((note.endTime - note.time) / 10, 200) // 根据时长计算长度，最大 200px

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
  ctx.arc(x, endY, NOTE_RADIUS * 0.6, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * 绘制 Slide 音符
 */
function drawSlide(ctx: CanvasRenderingContext2D, note: Note, canvasWidth: number) {
  if (!note.controlPoints || note.controlPoints.length === 0) return

  const x = note.x * canvasWidth
  const y = note.y * CANVAS_HEIGHT

  ctx.strokeStyle = COLORS.slide
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x, y)

  note.controlPoints.forEach(cp => {
    ctx.lineTo(cp.x * canvasWidth, cp.y * CANVAS_HEIGHT)
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
function drawFeedbacks(ctx: CanvasRenderingContext2D, canvasWidth: number) {
  const now = Date.now()
  gameStore.feedbacks.forEach(feedback => {
    const age = (now - feedback.time) / 1000
    if (age > 1) return

    const x = feedback.x * canvasWidth
    const y = feedback.y * CANVAS_HEIGHT - age * 60
    const alpha = 1 - age
    const scale = 1 + age * 0.3

    ctx.save()
    ctx.font = `bold ${24 * scale}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = COLORS.judgment[feedback.type]
    ctx.globalAlpha = alpha
    ctx.fillText(feedback.type.toUpperCase(), x, y)
    ctx.restore()
  })
}

/**
 * 主渲染循环 — 永远运行，不依赖 gameStore.state
 */
function render() {
  const canvas = canvasRef.value
  if (!canvas) {
    animFrameId = requestAnimationFrame(render)
    return
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    animFrameId = requestAnimationFrame(render)
    return
  }

  const canvasWidth = canvas.width
  const currentTime = audioStore.currentTime

  // 清空
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, canvasWidth, CANVAS_HEIGHT)

  // 始终绘制音符（即使暂停也显示最后一帧）
  if (gameStore.notes.length > 0) {
    gameStore.notes.forEach(note => {
      const timeDiff = note.time - currentTime
      // 显示范围：提前 2 秒到过期 500ms
      if (timeDiff > -500 && timeDiff < 2000) {
        switch (note.type) {
          case 'circle': drawCircle(ctx, note, currentTime, canvasWidth); break
          case 'hold': drawHold(ctx, note, currentTime, canvasWidth); break
          case 'slide': drawSlide(ctx, note, canvasWidth); break
        }
      }
    })
  }

  // 绘制反馈
  drawFeedbacks(ctx, canvasWidth)

  // 检查 Miss（播放中且超时未击中）
  if (gameStore.state === 'playing') {
    gameStore.notes.forEach(note => {
      if (note.type === 'circle' && !gameStore.processedNotes.has(note.id)) {
        if (currentTime - note.time > 150) {
          gameStore.handleMiss(note.id)
        }
      }
    })

    // 游戏结束
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

    const timeDiff = Math.abs(note.time - currentTime)
    if (dist < NOTE_RADIUS + 40 && timeDiff < 200) {
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
  // 永远运行渲染循环
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
