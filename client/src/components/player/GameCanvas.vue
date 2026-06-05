<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useAudioStore } from '@/stores/audioStore'
import type { Note } from '@/engine/BeatGenerator'

const gameStore = useGameStore()
const audioStore = useAudioStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animFrameId: number | null = null
let canvasWidth = 0
let canvasHeight = 0

// 封面图片
const coverImage = ref<HTMLImageElement | null>(null)
const coverLoaded = ref(false)

const NOTE_RADIUS = 24
const HIT_RADIUS = 50

// 点击波纹
interface ClickRipple {
  x: number; y: number; life: number; color: string
}
let clickRipples: ClickRipple[] = []

function addClickRipple(x: number, y: number, color: string) {
  clickRipples.push({ x, y, life: 1, color })
}

const COLORS = {
  circle: '#ff6496',
  circleGlow: 'rgba(255, 100, 150, 0.5)',
  circleInner: '#ffb3cc',

  hold: '#64c8ff',
  holdGlow: 'rgba(100, 200, 255, 0.4)',
  holdBar: 'rgba(100, 200, 255, 0.3)',

  slide: '#96ff96',
  slideGlow: 'rgba(150, 255, 150, 0.4)',
  slidePath: 'rgba(150, 255, 150, 0.7)',

  approach: 'rgba(255, 255, 255, 0.9)',
  approachRing: 'rgba(255, 255, 255, 0.4)',

  warning: 'rgba(255, 80, 80, 0.6)',

  judgment: {
    perfect: '#ffd700',
    great: '#4a9eff',
    good: '#4caf50',
    miss: '#ff5252'
  }
}

// 粒子
interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}
let particles: Particle[] = []

function spawnHitParticles(x: number, y: number, color: string, count = 14) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
    const speed = 3 + Math.random() * 5
    particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 1, maxLife: 0.3 + Math.random() * 0.4, color,
      size: 2 + Math.random() * 4
    })
  }
}

// 判定文字
interface JudgmentText {
  text: string; color: string; x: number; y: number; life: number; scale: number
}
let judgmentTexts: JudgmentText[] = []

function addJudgmentText(type: string, x: number, y: number) {
  judgmentTexts.push({
    text: type.toUpperCase(),
    color: COLORS.judgment[type as keyof typeof COLORS.judgment] || '#fff',
    x, y, life: 1, scale: 1.8
  })
}

// 连击数字提示
interface ComboNumber {
  num: number; x: number; y: number; life: number
}
let comboNumbers: ComboNumber[] = []

function addComboNumber(num: number, x: number, y: number) {
  comboNumbers.push({ num, x, y, life: 1 })
}

/**
 * 设置封面图片
 */
function loadCover(url: string) {
  const img = new Image()
  img.onload = () => { coverImage.value = img; coverLoaded.value = true }
  img.src = url
}

/**
 * 绘制背景
 */
function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 基础渐变
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
  grad.addColorStop(0, '#0d0520')
  grad.addColorStop(0.5, '#0a0a18')
  grad.addColorStop(1, '#060610')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // 封面背景（清晰但暗化）
  if (coverLoaded.value && coverImage.value) {
    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.filter = 'blur(8px) saturate(1.3) brightness(0.8)'

    // 居中裁剪填充
    const imgAspect = coverImage.value.width / coverImage.value.height
    const canvasAspect = w / h
    let sw: number, sh: number, sx: number, sy: number

    if (imgAspect > canvasAspect) {
      sh = coverImage.value.height
      sw = sh * canvasAspect
      sx = (coverImage.value.width - sw) / 2
      sy = 0
    } else {
      sw = coverImage.value.width
      sh = sw / canvasAspect
      sx = 0
      sy = (coverImage.value.height - sh) / 2
    }

    ctx.drawImage(coverImage.value, sx, sy, sw, sh, 0, 0, w, h)
    ctx.restore()
  }

  // 音频响应脉冲
  const freq = audioStore.frequencyData
  if (freq.length > 0) {
    const bass = freq.slice(0, 5).reduce((a, b) => a + b, 0) / (5 * 255)
    if (bass > 0.15) {
      const pulseGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5)
      pulseGrad.addColorStop(0, `rgba(255, 100, 150, ${bass * 0.08})`)
      pulseGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = pulseGrad
      ctx.fillRect(0, 0, w, h)
    }
  }

  // 网格线
  ctx.strokeStyle = 'rgba(100, 60, 180, 0.05)'
  ctx.lineWidth = 0.5
  const gridSize = 80
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }
}

/**
 * 绘制 Circle 音符
 */
function drawCircle(ctx: CanvasRenderingContext2D, note: Note, currentTime: number) {
  const x = note.x * canvasWidth
  const y = note.y * canvasHeight
  const timeUntilHit = note.time - currentTime

  if (timeUntilHit < -400) return

  // 淡入淡出
  let alpha = 1
  if (timeUntilHit > 1000) alpha = Math.max(0, 1 - (timeUntilHit - 1000) / 500)
  if (timeUntilHit < -150) alpha = Math.max(0, 1 + (timeUntilHit + 150) / 250)
  ctx.globalAlpha = alpha

  // 即将消失警告（更明显的脉冲红色光圈）
  if (timeUntilHit < -50 && timeUntilHit > -400 && !gameStore.processedNotes?.has(note.id)) {
    const warnPulse = Math.sin(Date.now() * 0.015) * 0.5 + 0.5
    const warnRadius = NOTE_RADIUS + 20 + warnPulse * 15

    // 外层大光圈
    ctx.fillStyle = `rgba(255, 50, 50, ${0.15 * warnPulse})`
    ctx.beginPath()
    ctx.arc(x, y, warnRadius + 20, 0, Math.PI * 2)
    ctx.fill()

    // 中层光圈
    ctx.strokeStyle = `rgba(255, 80, 80, ${0.6 + warnPulse * 0.4})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y, warnRadius, 0, Math.PI * 2)
    ctx.stroke()

    // 内层光圈
    ctx.strokeStyle = `rgba(255, 120, 120, ${0.4 + warnPulse * 0.3})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, NOTE_RADIUS + 8, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 外层发光
  const glowPulse = Math.sin(Date.now() * 0.004) * 0.15 + 0.85
  ctx.fillStyle = `rgba(255, 100, 150, ${0.3 * glowPulse})`
  ctx.beginPath()
  ctx.arc(x, y, NOTE_RADIUS + 12, 0, Math.PI * 2)
  ctx.fill()

  // Approach circle
  const approachDuration = 1200
  if (timeUntilHit > 0 && timeUntilHit < approachDuration) {
    const progress = 1 - (timeUntilHit / approachDuration)
    const scale = 3.5 - 2.5 * progress

    ctx.strokeStyle = COLORS.approachRing
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y, NOTE_RADIUS * scale, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = COLORS.approach
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(x, y, NOTE_RADIUS * scale, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 音符本体
  const noteGrad = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, NOTE_RADIUS)
  noteGrad.addColorStop(0, '#ffb3cc')
  noteGrad.addColorStop(0.7, COLORS.circle)
  noteGrad.addColorStop(1, '#cc3060')
  ctx.fillStyle = noteGrad
  ctx.beginPath()
  ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.globalAlpha = 1
}

/**
 * 绘制 Hold 音符（蓝色，长按）
 */
function drawHold(ctx: CanvasRenderingContext2D, note: Note, currentTime: number) {
  if (!note.endTime) return
  const x = note.x * canvasWidth
  const y = note.y * canvasHeight
  const endY = y + Math.min((note.endTime - note.time) / 6, 300)
  const timeUntilHit = note.time - currentTime

  if (timeUntilHit < -400) return

  let alpha = 1
  if (timeUntilHit > 1000) alpha = Math.max(0, 1 - (timeUntilHit - 1000) / 500)
  ctx.globalAlpha = alpha

  // 即将消失警告
  if (timeUntilHit < -50 && timeUntilHit > -400 && !gameStore.processedNotes?.has(note.id)) {
    const warnPulse = Math.sin(Date.now() * 0.015) * 0.5 + 0.5
    ctx.strokeStyle = `rgba(255, 80, 80, ${0.5 + warnPulse * 0.5})`
    ctx.lineWidth = 3
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.roundRect(x - 18, y - 8, 36, endY - y + 16, 10)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Hold 连接条（带渐变）
  const barGrad = ctx.createLinearGradient(x, y, x, endY)
  barGrad.addColorStop(0, 'rgba(100, 200, 255, 0.5)')
  barGrad.addColorStop(0.5, 'rgba(100, 200, 255, 0.3)')
  barGrad.addColorStop(1, 'rgba(100, 200, 255, 0.5)')
  ctx.fillStyle = barGrad
  ctx.strokeStyle = COLORS.hold
  ctx.lineWidth = 2
  ctx.shadowColor = COLORS.hold
  ctx.shadowBlur = 15
  ctx.beginPath()
  ctx.roundRect(x - 14, y, 28, endY - y, 10)
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0

  // 起点圆（大，明显 + 脉冲）
  const pulse = Math.sin(Date.now() * 0.005) * 3
  const startGrad = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, NOTE_RADIUS * 0.85 + pulse)
  startGrad.addColorStop(0, '#e0f0ff')
  startGrad.addColorStop(0.5, COLORS.hold)
  startGrad.addColorStop(1, '#2080c0')
  ctx.fillStyle = startGrad
  ctx.beginPath()
  ctx.arc(x, y, NOTE_RADIUS * 0.85 + pulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.lineWidth = 2
  ctx.stroke()

  // 终点圆
  ctx.fillStyle = COLORS.hold
  ctx.beginPath()
  ctx.arc(x, endY, NOTE_RADIUS * 0.5, 0, Math.PI * 2)
  ctx.fill()

  // 终点箭头提示
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath()
  ctx.moveTo(x - 8, endY - 10)
  ctx.lineTo(x + 8, endY - 10)
  ctx.lineTo(x, endY - 2)
  ctx.closePath()
  ctx.fill()

  // "HOLD" 文字提示
  ctx.font = 'bold 11px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fillText('HOLD', x, y - NOTE_RADIUS - 8)

  ctx.globalAlpha = 1
}

/**
 * 绘制 Slide 音符
 */
function drawSlide(ctx: CanvasRenderingContext2D, note: Note, currentTime: number) {
  if (!note.controlPoints || note.controlPoints.length === 0) return
  const x = note.x * canvasWidth
  const y = note.y * canvasHeight
  const timeUntilHit = note.time - currentTime

  if (timeUntilHit < -400) return

  let alpha = 1
  if (timeUntilHit > 1000) alpha = Math.max(0, 1 - (timeUntilHit - 1000) / 500)
  ctx.globalAlpha = alpha

  // 路径（带发光 + 方向箭头）
  ctx.shadowColor = COLORS.slide
  ctx.shadowBlur = 12
  ctx.strokeStyle = COLORS.slidePath
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  note.controlPoints.forEach(cp => {
    ctx.lineTo(cp.x * canvasWidth, cp.y * canvasHeight)
  })
  ctx.stroke()
  ctx.shadowBlur = 0

  // 路径上的方向箭头
  const lastCp = note.controlPoints[note.controlPoints.length - 1]
  const arrowX = (x + lastCp.x * canvasWidth) / 2
  const arrowY = (y + lastCp.y * canvasHeight) / 2
  const angle = Math.atan2(lastCp.y * canvasHeight - y, lastCp.x * canvasWidth - x)
  ctx.save()
  ctx.translate(arrowX, arrowY)
  ctx.rotate(angle)
  ctx.fillStyle = 'rgba(150, 255, 150, 0.7)'
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.lineTo(-5, -6)
  ctx.lineTo(-5, 6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // 起点圆（脉冲）
  const pulse = Math.sin(Date.now() * 0.005) * 2
  const startGrad = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, NOTE_RADIUS * 0.85 + pulse)
  startGrad.addColorStop(0, '#ccffcc')
  startGrad.addColorStop(0.5, COLORS.slide)
  startGrad.addColorStop(1, '#208040')
  ctx.fillStyle = startGrad
  ctx.beginPath()
  ctx.arc(x, y, NOTE_RADIUS * 0.85 + pulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.lineWidth = 2
  ctx.stroke()

  // 控制点
  note.controlPoints.forEach((cp, i) => {
    const cx = cp.x * canvasWidth
    const cy = cp.y * canvasHeight
    const isLast = i === note.controlPoints!.length - 1
    ctx.fillStyle = isLast ? COLORS.slide : 'rgba(150,255,150,0.4)'
    ctx.beginPath()
    ctx.arc(cx, cy, isLast ? 10 : 6, 0, Math.PI * 2)
    ctx.fill()
    if (isLast) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  })

  // "SLIDE" 文字提示
  ctx.font = 'bold 11px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fillText('SLIDE', x, y - NOTE_RADIUS - 8)

  ctx.globalAlpha = 1
}

/**
 * 绘制粒子
 */
function drawParticles(ctx: CanvasRenderingContext2D) {
  const now = Date.now()
  particles = particles.filter(p => {
    const dt = 16
    p.x += p.vx; p.y += p.vy; p.vy += 0.15
    p.life -= dt / (p.maxLife * 1000)
    if (p.life <= 0) return false

    ctx.globalAlpha = p.life
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
    ctx.fill()
    return true
  })
  ctx.globalAlpha = 1
}

/**
 * 绘制点击波纹
 */
function drawClickRipples(ctx: CanvasRenderingContext2D) {
  clickRipples = clickRipples.filter(r => {
    r.life -= 0.04
    if (r.life <= 0) return false

    const radius = (1 - r.life) * 80
    ctx.strokeStyle = r.color
    ctx.lineWidth = 3 * r.life
    ctx.globalAlpha = r.life * 0.8
    ctx.beginPath()
    ctx.arc(r.x, r.y, radius, 0, Math.PI * 2)
    ctx.stroke()

    // 内圈
    ctx.lineWidth = 1.5 * r.life
    ctx.beginPath()
    ctx.arc(r.x, r.y, radius * 0.5, 0, Math.PI * 2)
    ctx.stroke()

    ctx.globalAlpha = 1
    return true
  })
}

/**
 * 绘制判定文字
 */
function drawJudgmentTexts(ctx: CanvasRenderingContext2D) {
  judgmentTexts = judgmentTexts.filter(t => {
    t.life -= 0.025
    t.y -= 1.2
    t.scale = Math.max(1, t.scale - 0.02)
    if (t.life <= 0) return false

    ctx.save()
    ctx.globalAlpha = Math.min(1, t.life * 2)
    ctx.font = `bold ${32 * t.scale}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = t.color
    ctx.shadowBlur = 20
    ctx.fillStyle = t.color
    ctx.fillText(t.text, t.x, t.y)
    ctx.restore()
    return true
  })
}

/**
 * 绘制连击数字
 */
function drawComboNumbers(ctx: CanvasRenderingContext2D) {
  comboNumbers = comboNumbers.filter(c => {
    c.life -= 0.03
    c.y -= 0.8
    if (c.life <= 0) return false

    ctx.save()
    ctx.globalAlpha = c.life
    ctx.font = `bold ${24 * (1 + (1 - c.life) * 0.5)}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = `rgba(255, 255, 255, ${c.life * 0.8})`
    ctx.fillText(String(c.num), c.x, c.y)
    ctx.restore()
    return true
  })
}

/**
 * 主渲染循环
 */
function render() {
  const canvas = canvasRef.value
  if (!canvas) { animFrameId = requestAnimationFrame(render); return }
  const ctx = canvas.getContext('2d')
  if (!ctx) { animFrameId = requestAnimationFrame(render); return }

  canvasWidth = canvas.width
  canvasHeight = canvas.height
  const currentTime = audioStore.currentTime

  drawBackground(ctx, canvasWidth, canvasHeight)

  // 绘制音符
  if (gameStore.notes.length > 0) {
    gameStore.notes.forEach(note => {
      const timeDiff = note.time - currentTime
      if (timeDiff > -500 && timeDiff < 2500) {
        switch (note.type) {
          case 'circle': drawCircle(ctx, note, currentTime); break
          case 'hold': drawHold(ctx, note, currentTime); break
          case 'slide': drawSlide(ctx, note, currentTime); break
        }
      }
    })
  }

  drawParticles(ctx)
  drawClickRipples(ctx)
  drawJudgmentTexts(ctx)
  drawComboNumbers(ctx)

  // Miss 检测
  if (gameStore.state === 'playing') {
    const processed = gameStore.processedNotes
    if (processed) {
      gameStore.notes.forEach(note => {
        if (note.type === 'circle' && !processed.has(note.id)) {
          if (currentTime - note.time > 150) {
            gameStore.handleMiss(note.id)
            addJudgmentText('miss', note.x * canvasWidth, note.y * canvasHeight)
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
 * 点击处理
 */
function handleClick(e: MouseEvent) {
  if (gameStore.state !== 'playing') return
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const clickX = (e.clientX - rect.left) * (canvas.width / rect.width)
  const clickY = (e.clientY - rect.top) * (canvas.height / rect.height)
  const currentTime = audioStore.currentTime

  const processed = gameStore.processedNotes
  let closestNote: Note | null = null
  let closestDist = Infinity

  gameStore.notes.forEach(note => {
    if (processed && processed.has(note.id)) return
    const noteX = note.x * canvasWidth
    const noteY = note.y * canvasHeight
    const dist = Math.sqrt((clickX - noteX) ** 2 + (clickY - noteY) ** 2)
    const timeDiff = Math.abs(note.time - currentTime)
    if (dist < HIT_RADIUS && timeDiff < 200) {
      if (dist < closestDist) { closestDist = dist; closestNote = note }
    }
  })

  if (closestNote) {
    const result = gameStore.handleHit(closestNote.id, currentTime, closestNote.time, closestNote.x, closestNote.y)
    const nx = closestNote.x * canvasWidth
    const ny = closestNote.y * canvasHeight

    // 点击波纹（无论是否命中都有反馈）
    const rippleColor = result ? COLORS.judgment[result.type] : 'rgba(255,255,255,0.5)'
    addClickRipple(nx, ny, rippleColor)

    if (result) {
      const color = COLORS.judgment[result.type]
      spawnHitParticles(nx, ny, color, result.type === 'perfect' ? 18 : 12)
      addJudgmentText(result.type, nx, ny - 50)

      // 连击数字提示
      if (gameStore.combo > 0 && gameStore.combo % 10 === 0) {
        addComboNumber(gameStore.combo, nx, ny - 80)
      }
    }
  } else {
    // 没点中任何音符也显示点击波纹
    addClickRipple(clickX, clickY, 'rgba(255,255,255,0.3)')
  }
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  canvasWidth = canvas.width
  canvasHeight = canvas.height
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  // 加载封面
  if (gameStore.currentMapId) {
    import('@/utils/api').then(({ default: api }) => {
      api.get(`/api/maps/${gameStore.currentMapId}`).then(res => {
        if (res.data.map?.coverImage) {
          loadCover(`/uploads/${res.data.map.coverImage}`)
        }
      })
    })
  }

  render()
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<template>
  <canvas ref="canvasRef" class="game-canvas" @click="handleClick" />
</template>

<style scoped>
.game-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  cursor: crosshair;
}
</style>
