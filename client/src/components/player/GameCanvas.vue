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
const NOTE_RADIUS = 22
const HIT_RADIUS = 45 // 点击判定范围

// 颜色
const COLORS = {
  bg: '#080810',
  bgGrad1: '#0a0a18',
  bgGrad2: '#0d0520',

  circle: '#ff6496',
  circleGlow: 'rgba(255, 100, 150, 0.4)',
  circleInner: '#ffb3cc',

  hold: '#64c8ff',
  holdGlow: 'rgba(100, 200, 255, 0.3)',
  holdBar: 'rgba(100, 200, 255, 0.25)',

  slide: '#96ff96',
  slideGlow: 'rgba(150, 255, 150, 0.3)',
  slidePath: 'rgba(150, 255, 150, 0.6)',

  approach: 'rgba(255, 255, 255, 0.8)',
  approachRing: 'rgba(255, 255, 255, 0.3)',

  judgment: {
    perfect: '#ffd700',
    great: '#4a9eff',
    good: '#4caf50',
    miss: '#ff5252'
  }
}

// 粒子系统
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

let particles: Particle[] = []

function spawnHitParticles(x: number, y: number, color: string, count: number = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
    const speed = 2 + Math.random() * 4
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.4 + Math.random() * 0.3,
      color,
      size: 2 + Math.random() * 3
    })
  }
}

function updateParticles(dt: number) {
  particles = particles.filter(p => {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.1 // 重力
    p.life -= dt / (p.maxLife * 1000)
    return p.life > 0
  })
}

function drawParticles(ctx: CanvasRenderingContext2D) {
  particles.forEach(p => {
    ctx.globalAlpha = p.life
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

// 判定文字动画
interface JudgmentText {
  text: string
  color: string
  x: number
  y: number
  life: number
  scale: number
}

let judgmentTexts: JudgmentText[] = []

function addJudgmentText(type: string, x: number, y: number) {
  judgmentTexts.push({
    text: type.toUpperCase(),
    color: COLORS.judgment[type as keyof typeof COLORS.judgment] || '#fff',
    x, y,
    life: 1,
    scale: 1.5
  })
}

function updateJudgmentTexts(dt: number) {
  judgmentTexts = judgmentTexts.filter(t => {
    t.life -= dt / 800
    t.y -= dt * 0.05
    t.scale = Math.max(1, t.scale - dt * 0.002)
    return t.life > 0
  })
}

function drawJudgmentTexts(ctx: CanvasRenderingContext2D) {
  judgmentTexts.forEach(t => {
    ctx.save()
    ctx.globalAlpha = Math.min(1, t.life * 2)
    ctx.font = `bold ${28 * t.scale}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 发光效果
    ctx.shadowColor = t.color
    ctx.shadowBlur = 15
    ctx.fillStyle = t.color
    ctx.fillText(t.text, t.x, t.y)
    ctx.shadowBlur = 0

    ctx.restore()
  })
}

/**
 * 绘制背景（带音频响应）
 */
function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 渐变背景
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, COLORS.bgGrad1)
  grad.addColorStop(1, COLORS.bgGrad2)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // 音频响应的脉冲效果
  const energy = audioStore.frequencyData.length > 0
    ? audioStore.frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / (10 * 255)
    : 0

  if (energy > 0.1) {
    ctx.fillStyle = `rgba(255, 100, 150, ${energy * 0.05})`
    ctx.fillRect(0, 0, w, h)
  }

  // 网格线（微弱）
  ctx.strokeStyle = 'rgba(100, 60, 180, 0.06)'
  ctx.lineWidth = 0.5
  const gridSize = 60
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
}

/**
 * 绘制 Circle 音符
 */
function drawCircle(ctx: CanvasRenderingContext2D, note: Note, currentTime: number, canvasWidth: number) {
  const x = note.x * canvasWidth
  const y = note.y * CANVAS_HEIGHT
  const timeUntilHit = note.time - currentTime

  // 已过期的音符不绘制
  if (timeUntilHit < -300) return

  // 透明度：出现时淡入，过期时淡出
  let alpha = 1
  if (timeUntilHit > 800) alpha = Math.max(0, 1 - (timeUntilHit - 800) / 400)
  if (timeUntilHit < -100) alpha = Math.max(0, 1 + (timeUntilHit + 100) / 200)

  ctx.globalAlpha = alpha

  // 外层发光
  const glowSize = NOTE_RADIUS + 8 + Math.sin(Date.now() * 0.005) * 3
  ctx.fillStyle = COLORS.circleGlow
  ctx.beginPath()
  ctx.arc(x, y, glowSize, 0, Math.PI * 2)
  ctx.fill()

  // Approach circle（从大缩小）
  const approachDuration = 1200
  if (timeUntilHit > 0 && timeUntilHit < approachDuration) {
    const progress = 1 - (timeUntilHit / approachDuration)
    const scale = 3.5 - 2.5 * progress

    // 外圈
    ctx.strokeStyle = COLORS.approachRing
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y, NOTE_RADIUS * scale, 0, Math.PI * 2)
    ctx.stroke()

    // 内圈
    ctx.strokeStyle = COLORS.approach
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(x, y, NOTE_RADIUS * scale, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 音符本体 - 渐变填充
  const noteGrad = ctx.createRadialGradient(x - 4, y - 4, 0, x, y, NOTE_RADIUS)
  noteGrad.addColorStop(0, COLORS.circleInner)
  noteGrad.addColorStop(1, COLORS.circle)
  ctx.fillStyle = noteGrad
  ctx.beginPath()
  ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  // 边框
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.globalAlpha = 1
}

/**
 * 绘制 Hold 音符
 */
function drawHold(ctx: CanvasRenderingContext2D, note: Note, currentTime: number, canvasWidth: number) {
  if (!note.endTime) return

  const x = note.x * canvasWidth
  const y = note.y * CANVAS_HEIGHT
  const endY = y + Math.min((note.endTime - note.time) / 8, 250)
  const timeUntilHit = note.time - currentTime

  if (timeUntilHit < -300) return

  let alpha = 1
  if (timeUntilHit > 800) alpha = Math.max(0, 1 - (timeUntilHit - 800) / 400)

  ctx.globalAlpha = alpha

  // Hold 条（带发光）
  ctx.fillStyle = COLORS.holdBar
  ctx.strokeStyle = COLORS.hold
  ctx.lineWidth = 2

  // 发光效果
  ctx.shadowColor = COLORS.hold
  ctx.shadowBlur = 10

  ctx.beginPath()
  ctx.roundRect(x - 10, y, 20, endY - y, 6)
  ctx.fill()
  ctx.stroke()

  ctx.shadowBlur = 0

  // 起点圆
  const startGrad = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, NOTE_RADIUS * 0.7)
  startGrad.addColorStop(0, '#b3e5ff')
  startGrad.addColorStop(1, COLORS.hold)
  ctx.fillStyle = startGrad
  ctx.beginPath()
  ctx.arc(x, y, NOTE_RADIUS * 0.7, 0, Math.PI * 2)
  ctx.fill()

  // 终点圆
  ctx.fillStyle = COLORS.hold
  ctx.beginPath()
  ctx.arc(x, endY, NOTE_RADIUS * 0.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = 1
}

/**
 * 绘制 Slide 音符
 */
function drawSlide(ctx: CanvasRenderingContext2D, note: Note, currentTime: number, canvasWidth: number) {
  if (!note.controlPoints || note.controlPoints.length === 0) return

  const x = note.x * canvasWidth
  const y = note.y * CANVAS_HEIGHT
  const timeUntilHit = note.time - currentTime

  if (timeUntilHit < -300) return

  let alpha = 1
  if (timeUntilHit > 800) alpha = Math.max(0, 1 - (timeUntilHit - 800) / 400)

  ctx.globalAlpha = alpha

  // 路径线（带发光）
  ctx.shadowColor = COLORS.slide
  ctx.shadowBlur = 8
  ctx.strokeStyle = COLORS.slidePath
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(x, y)
  note.controlPoints.forEach(cp => {
    ctx.lineTo(cp.x * canvasWidth, cp.y * CANVAS_HEIGHT)
  })
  ctx.stroke()

  ctx.shadowBlur = 0

  // 起点圆
  ctx.fillStyle = COLORS.slide
  ctx.beginPath()
  ctx.arc(x, y, NOTE_RADIUS * 0.7, 0, Math.PI * 2)
  ctx.fill()

  // 控制点
  note.controlPoints.forEach(cp => {
    ctx.fillStyle = 'rgba(150, 255, 150, 0.6)'
    ctx.beginPath()
    ctx.arc(cp.x * canvasWidth, cp.y * CANVAS_HEIGHT, 6, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.globalAlpha = 1
}

/**
 * 主渲染循环
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
  const now = Date.now()
  const dt = 16 // 约 60fps

  // 绘制背景
  drawBackground(ctx, canvasWidth, CANVAS_HEIGHT)

  // 绘制音符
  if (gameStore.notes.length > 0) {
    gameStore.notes.forEach(note => {
      const timeDiff = note.time - currentTime
      if (timeDiff > -500 && timeDiff < 2500) {
        switch (note.type) {
          case 'circle': drawCircle(ctx, note, currentTime, canvasWidth); break
          case 'hold': drawHold(ctx, note, currentTime, canvasWidth); break
          case 'slide': drawSlide(ctx, note, currentTime, canvasWidth); break
        }
      }
    })
  }

  // 更新和绘制粒子
  updateParticles(dt)
  drawParticles(ctx)

  // 更新和绘制判定文字
  updateJudgmentTexts(dt)
  drawJudgmentTexts(ctx)

  // 检查 Miss
  if (gameStore.state === 'playing') {
    const processed = gameStore.processedNotes
    if (processed) {
      gameStore.notes.forEach(note => {
        if (note.type === 'circle' && !processed.has(note.id)) {
          if (currentTime - note.time > 150) {
            gameStore.handleMiss(note.id)
            const x = note.x * canvasWidth
            const y = note.y * CANVAS_HEIGHT
            addJudgmentText('miss', x, y)
          }
        }
      })
    }

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

  const processed = gameStore.processedNotes
  let closestNote: Note | null = null
  let closestDist = Infinity

  gameStore.notes.forEach(note => {
    if (processed && processed.has(note.id)) return

    const noteX = note.x * canvas.width
    const noteY = note.y * CANVAS_HEIGHT
    const dist = Math.sqrt((clickX - noteX) ** 2 + (clickY - noteY) ** 2)

    const timeDiff = Math.abs(note.time - currentTime)
    if (dist < HIT_RADIUS && timeDiff < 200) {
      if (dist < closestDist) {
        closestDist = dist
        closestNote = note
      }
    }
  })

  if (closestNote) {
    const result = gameStore.handleHit(closestNote.id, currentTime, closestNote.time, closestNote.x, closestNote.y)
    const noteX = closestNote.x * canvas.width
    const noteY = closestNote.y * CANVAS_HEIGHT

    if (result) {
      // 生成粒子
      const color = result.type === 'perfect' ? COLORS.judgment.perfect :
                    result.type === 'great' ? COLORS.judgment.great :
                    result.type === 'good' ? COLORS.judgment.good : COLORS.judgment.miss
      spawnHitParticles(noteX, noteY, color, result.type === 'perfect' ? 16 : 10)

      // 添加判定文字
      addJudgmentText(result.type, noteX, noteY - 40)
    }
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
}
</style>
