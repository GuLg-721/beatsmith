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

const NOTE_RADIUS = 22
const HIT_RADIUS = 50

// 点击音效
let clickAudioCtx: AudioContext | null = null
function playClickSound(type: string) {
  if (!clickAudioCtx) clickAudioCtx = new AudioContext()
  const ctx = clickAudioCtx
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain); gain.connect(ctx.destination)
  const sounds: Record<string, { freq: number; end?: number; wave: OscillatorType; dur: number; vol: number }> = {
    perfect: { freq: 880, end: 1760, wave: 'sine', dur: 0.1, vol: 0.3 },
    great: { freq: 660, wave: 'sine', dur: 0.08, vol: 0.25 },
    good: { freq: 440, wave: 'triangle', dur: 0.06, vol: 0.2 },
    miss: { freq: 200, end: 100, wave: 'sawtooth', dur: 0.15, vol: 0.15 },
    click: { freq: 1200, wave: 'sine', dur: 0.03, vol: 0.1 },
    hold: { freq: 520, wave: 'sine', dur: 0.04, vol: 0.15 },
  }
  const s = sounds[type] || sounds.click
  osc.type = s.wave
  osc.frequency.setValueAtTime(s.freq, ctx.currentTime)
  if (s.end) osc.frequency.exponentialRampToValueAtTime(s.end, ctx.currentTime + s.dur)
  gain.gain.setValueAtTime(s.vol, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.dur)
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + s.dur + 0.05)
}

// 点击波纹
interface ClickRipple { x: number; y: number; life: number; color: string }
let clickRipples: ClickRipple[] = []
function addClickRipple(x: number, y: number, color: string) {
  clickRipples.push({ x, y, life: 1, color })
}

// 粒子
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }
let particles: Particle[] = []
function spawnHitParticles(x: number, y: number, color: string, count = 14) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
    const speed = 3 + Math.random() * 5
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, maxLife: 0.3 + Math.random() * 0.4, color, size: 2 + Math.random() * 4 })
  }
}

// 判定文字
interface JudgmentText { text: string; color: string; x: number; y: number; life: number; scale: number }
let judgmentTexts: JudgmentText[] = []
function addJudgmentText(type: string, x: number, y: number) {
  judgmentTexts.push({ text: type.toUpperCase(), color: { perfect: '#ffd700', great: '#4a9eff', good: '#4caf50', miss: '#ff5252' }[type] || '#fff', x, y, life: 1, scale: 1.8 })
}

// 封面
const coverImage = ref<HTMLImageElement | null>(null)
const coverLoaded = ref(false)
function loadCover(url: string) {
  const img = new Image()
  img.onload = () => { coverImage.value = img; coverLoaded.value = true }
  img.src = url
}

// 当前激活的 Hold/Slide 状态
const activeFollow = ref<{ noteId: string; progress: number } | null>(null)

const COLORS = {
  circle: '#ff6496', circleGlow: 'rgba(255, 100, 150, 0.5)', circleInner: '#ffb3cc',
  hold: '#64c8ff', holdTrack: 'rgba(100, 200, 255, 0.35)', holdBall: '#80d4ff',
  slide: '#96ff96', slideTrack: 'rgba(150, 255, 150, 0.35)', slideBall: '#b0ffb0',
  approach: 'rgba(255, 255, 255, 0.9)', approachRing: 'rgba(255, 255, 255, 0.4)',
  warning: 'rgba(255, 80, 80, 0.6)',
}

/**
 * 绘制背景
 */
function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
  grad.addColorStop(0, '#0d0520'); grad.addColorStop(0.5, '#0a0a18'); grad.addColorStop(1, '#060610')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)

  if (coverLoaded.value && coverImage.value) {
    ctx.save(); ctx.globalAlpha = 0.45; ctx.filter = 'blur(5px) saturate(1.2) brightness(0.85)'
    const imgAspect = coverImage.value.width / coverImage.value.height
    const canvasAspect = w / h
    let sw: number, sh: number, sx: number, sy: number
    if (imgAspect > canvasAspect) { sh = coverImage.value.height; sw = sh * canvasAspect; sx = (coverImage.value.width - sw) / 2; sy = 0 }
    else { sw = coverImage.value.width; sh = sw / canvasAspect; sx = 0; sy = (coverImage.value.height - sh) / 2 }
    ctx.drawImage(coverImage.value, sx, sy, sw, sh, 0, 0, w, h)
    ctx.restore()
  }

  const freq = audioStore.frequencyData
  if (freq.length > 0) {
    const bass = freq.slice(0, 5).reduce((a, b) => a + b, 0) / (5 * 255)
    if (bass > 0.15) {
      const pulseGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5)
      pulseGrad.addColorStop(0, `rgba(255, 100, 150, ${bass * 0.08})`); pulseGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = pulseGrad; ctx.fillRect(0, 0, w, h)
    }
  }

  ctx.strokeStyle = 'rgba(100, 60, 180, 0.05)'; ctx.lineWidth = 0.5
  for (let x = 0; x < w; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  for (let y = 0; y < h; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
}

/**
 * 绘制 Circle 音符（红色，单击）
 */
function drawCircle(ctx: CanvasRenderingContext2D, note: Note, currentTime: number) {
  const x = note.x * canvasWidth, y = note.y * canvasHeight
  const timeUntilHit = note.time - currentTime
  if (timeUntilHit < -400) return

  let alpha = 1
  if (timeUntilHit > 1000) alpha = Math.max(0, 1 - (timeUntilHit - 1000) / 500)
  if (timeUntilHit < -150) alpha = Math.max(0, 1 + (timeUntilHit + 150) / 250)
  ctx.globalAlpha = alpha

  // 警告
  if (timeUntilHit < -50 && timeUntilHit > -400 && !gameStore.processedNotes?.has(note.id)) {
    const wp = Math.sin(Date.now() * 0.015) * 0.5 + 0.5
    ctx.fillStyle = `rgba(255, 50, 50, ${0.12 * wp})`; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 35, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = `rgba(255, 80, 80, ${0.5 + wp * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 20 + wp * 10, 0, Math.PI * 2); ctx.stroke()
  }

  // 发光
  const gp = Math.sin(Date.now() * 0.004) * 0.15 + 0.85
  ctx.fillStyle = `rgba(255, 100, 150, ${0.3 * gp})`; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 12, 0, Math.PI * 2); ctx.fill()

  // 判定圈
  const ad = 1200
  if (timeUntilHit > 0 && timeUntilHit < ad) {
    const p = 1 - (timeUntilHit / ad), scale = 3.5 - 2.5 * p
    ctx.strokeStyle = COLORS.approachRing; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS * scale, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = COLORS.approach; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS * scale, 0, Math.PI * 2); ctx.stroke()
  }

  // 音符
  const ng = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, NOTE_RADIUS)
  ng.addColorStop(0, '#ffb3cc'); ng.addColorStop(0.7, COLORS.circle); ng.addColorStop(1, '#cc3060')
  ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke()

  ctx.globalAlpha = 1
}

/**
 * 绘制 Hold/Slide 轨道（MCosu 风格）
 * 轨道出现后，玩家需要将鼠标放在轨道上并按住跟随移动
 */
function drawTrack(ctx: CanvasRenderingContext2D, note: Note, currentTime: number, isSlide: boolean) {
  if (!note.controlPoints || note.controlPoints.length === 0) return
  const x = note.x * canvasWidth, y = note.y * canvasHeight
  const timeUntilHit = note.time - currentTime
  if (timeUntilHit < -500) return

  let alpha = 1
  if (timeUntilHit > 1200) alpha = Math.max(0, 1 - (timeUntilHit - 1200) / 600)
  ctx.globalAlpha = alpha

  const trackColor = isSlide ? COLORS.slideTrack : COLORS.holdTrack
  const ballColor = isSlide ? COLORS.slideBall : COLORS.holdBall
  const glowColor = isSlide ? 'rgba(150, 255, 150, 0.4)' : 'rgba(100, 200, 255, 0.4)'
  const mainColor = isSlide ? COLORS.slide : COLORS.hold

  // 构建路径点
  const points = [{ x, y }, ...note.controlPoints.map(cp => ({ x: cp.x * canvasWidth, y: cp.y * canvasHeight }))]

  // 轨道背景（宽条）
  ctx.shadowColor = mainColor; ctx.shadowBlur = 15
  ctx.strokeStyle = trackColor; ctx.lineWidth = 28; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  ctx.stroke()
  ctx.shadowBlur = 0

  // 轨道边线
  ctx.strokeStyle = mainColor; ctx.lineWidth = 2; ctx.globalAlpha = alpha * 0.6
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  ctx.stroke()
  ctx.globalAlpha = alpha

  // 流动发光点（沿轨道移动，提示方向）
  const flowSpeed = 0.002
  const flowTime = Date.now() * flowSpeed
  for (let i = 0; i < 4; i++) {
    const t = (flowTime + i * 0.25) % 1
    const totalLen = points.length - 1
    const seg = Math.floor(t * totalLen)
    const segT = (t * totalLen) - seg
    if (seg < points.length - 1) {
      const px = points[seg].x + (points[seg + 1].x - points[seg].x) * segT
      const py = points[seg].y + (points[seg + 1].y - points[seg].y) * segT
      ctx.fillStyle = `rgba(255, 255, 255, ${0.7 - i * 0.15})`
      ctx.beginPath(); ctx.arc(px, py, 4 - i * 0.5, 0, Math.PI * 2); ctx.fill()
    }
  }

  // 起点圆（大 + 脉冲光环）
  const pulse = Math.sin(Date.now() * 0.005) * 3
  const sg = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, NOTE_RADIUS + pulse)
  sg.addColorStop(0, isSlide ? '#e0ffe0' : '#e0f0ff')
  sg.addColorStop(0.5, mainColor)
  sg.addColorStop(1, isSlide ? '#208040' : '#2080c0')
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + pulse, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke()

  // 起点脉冲光环
  const rp = Math.sin(Date.now() * 0.008) * 0.3 + 0.7
  ctx.strokeStyle = `${mainColor}${Math.round(rp * 80).toString(16).padStart(2, '0')}`; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 18 + Math.sin(Date.now() * 0.006) * 5, 0, Math.PI * 2); ctx.stroke()

  // 终点圆
  const lastPt = points[points.length - 1]
  ctx.fillStyle = mainColor; ctx.beginPath(); ctx.arc(lastPt.x, lastPt.y, 12, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke()

  // 终点箭头
  if (points.length >= 2) {
    const prev = points[points.length - 2]
    const angle = Math.atan2(lastPt.y - prev.y, lastPt.x - prev.x)
    ctx.save(); ctx.translate(lastPt.x, lastPt.y); ctx.rotate(angle)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath()
    ctx.moveTo(12, 0); ctx.lineTo(-4, -7); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  // 文字提示
  ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillText(isSlide ? '滑动跟随' : '长按跟随', x, y - NOTE_RADIUS - 14)

  ctx.globalAlpha = 1
}

/**
 * 绘制粒子
 */
function drawParticles(ctx: CanvasRenderingContext2D) {
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.025
    if (p.life <= 0) return false
    ctx.globalAlpha = p.life; ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill()
    return true
  })
  ctx.globalAlpha = 1
}

function drawClickRipples(ctx: CanvasRenderingContext2D) {
  clickRipples = clickRipples.filter(r => {
    r.life -= 0.04; if (r.life <= 0) return false
    const radius = (1 - r.life) * 80
    ctx.strokeStyle = r.color; ctx.lineWidth = 3 * r.life; ctx.globalAlpha = r.life * 0.8
    ctx.beginPath(); ctx.arc(r.x, r.y, radius, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 1.5 * r.life; ctx.beginPath(); ctx.arc(r.x, r.y, radius * 0.5, 0, Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = 1; return true
  })
}

function drawJudgmentTexts(ctx: CanvasRenderingContext2D) {
  judgmentTexts = judgmentTexts.filter(t => {
    t.life -= 0.025; t.y -= 1.2; t.scale = Math.max(1, t.scale - 0.02)
    if (t.life <= 0) return false
    ctx.save(); ctx.globalAlpha = Math.min(1, t.life * 2)
    ctx.font = `bold ${32 * t.scale}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.shadowColor = t.color; ctx.shadowBlur = 20; ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y)
    ctx.restore(); return true
  })
}

function drawComboNumbers(ctx: CanvasRenderingContext2D) {
  judgmentTexts = judgmentTexts.filter(t => true) // already handled above
}

/**
 * 主渲染循环
 */
function render() {
  const canvas = canvasRef.value
  if (!canvas) { animFrameId = requestAnimationFrame(render); return }
  const ctx = canvas.getContext('2d')
  if (!ctx) { animFrameId = requestAnimationFrame(render); return }

  canvasWidth = canvas.width; canvasHeight = canvas.height
  const currentTime = audioStore.currentTime

  drawBackground(ctx, canvasWidth, canvasHeight)

  // 绘制音符
  if (gameStore.notes.length > 0) {
    gameStore.notes.forEach(note => {
      const td = note.time - currentTime
      if (td > -500 && td < 2500) {
        if (note.type === 'circle') drawCircle(ctx, note, currentTime)
        else drawTrack(ctx, note, currentTime, note.type === 'slide')
      }
    })
  }

  drawParticles(ctx)
  drawClickRipples(ctx)
  drawJudgmentTexts(ctx)

  // Miss
  if (gameStore.state === 'playing') {
    const processed = gameStore.processedNotes
    if (processed) {
      gameStore.notes.forEach(note => {
        if (note.type === 'circle' && !processed.has(note.id)) {
          if (currentTime - note.time > 150) {
            gameStore.handleMiss(note.id)
            playClickSound('miss')
            addJudgmentText('miss', note.x * canvasWidth, note.y * canvasHeight)
          }
        }
      })
    }
    if (currentTime >= audioStore.duration && audioStore.duration > 0) gameStore.endGame()
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

  // 查找 Circle 音符
  let closestCircle: Note | null = null
  let closestDist = Infinity

  gameStore.notes.forEach(note => {
    if (note.type !== 'circle') return
    if (processed && processed.has(note.id)) return
    const nx = note.x * canvasWidth, ny = note.y * canvasHeight
    const dist = Math.sqrt((clickX - nx) ** 2 + (clickY - ny) ** 2)
    const td = Math.abs(note.time - currentTime)
    if (dist < HIT_RADIUS && td < 200 && dist < closestDist) {
      closestDist = dist; closestCircle = note
    }
  })

  if (closestCircle) {
    const result = gameStore.handleHit(closestCircle.id, currentTime, closestCircle.time, closestCircle.x, closestCircle.y)
    const nx = closestCircle.x * canvasWidth, ny = closestCircle.y * canvasHeight
    if (result) {
      playClickSound(result.type)
      spawnHitParticles(nx, ny, COLORS.circle, result.type === 'perfect' ? 18 : 12)
      addJudgmentText(result.type, nx, ny - 50)
    }
    addClickRipple(nx, ny, result ? { perfect: '#ffd700', great: '#4a9eff', good: '#4caf50', miss: '#ff5252' }[result.type] : '#fff')
  } else {
    // 查找 Hold/Slide 起点
    let closestTrack: Note | null = null
    let closestTrackDist = Infinity
    gameStore.notes.forEach(note => {
      if (note.type === 'circle') return
      if (processed && processed.has(note.id)) return
      const nx = note.x * canvasWidth, ny = note.y * canvasHeight
      const dist = Math.sqrt((clickX - nx) ** 2 + (clickY - ny) ** 2)
      const td = Math.abs(note.time - currentTime)
      if (dist < HIT_RADIUS && td < 200 && dist < closestTrackDist) {
        closestTrackDist = dist; closestTrack = note
      }
    })
    if (closestTrack) {
      gameStore.handleHit(closestTrack.id, currentTime, closestTrack.time, closestTrack.x, closestTrack.y)
      playClickSound('click')
      addClickRipple(closestTrack.x * canvasWidth, closestTrack.y * canvasHeight, COLORS.hold)
    } else {
      addClickRipple(clickX, clickY, 'rgba(255,255,255,0.3)')
    }
  }
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth; canvas.height = window.innerHeight
  canvasWidth = canvas.width; canvasHeight = canvas.height
}

onMounted(() => {
  resizeCanvas(); window.addEventListener('resize', resizeCanvas)
  if (gameStore.currentMapId) {
    import('@/utils/api').then(({ default: api }) => {
      api.get(`/api/maps/${gameStore.currentMapId}`).then(res => {
        if (res.data.map?.coverImage) loadCover(`/uploads/${res.data.map.coverImage}`)
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
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  cursor: crosshair;
}
</style>
