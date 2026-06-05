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
const PERFECT_WINDOW = 40 // 与 HitDetector 一致

// 空格键状态
let spaceDown = false
let activeHoldNote: Note | null = null
let holdStartTime = 0

// 音效
let clickAudioCtx: AudioContext | null = null
function getAudioCtx() {
  if (!clickAudioCtx) clickAudioCtx = new AudioContext()
  return clickAudioCtx
}

function playTone(freq: number, dur: number, vol: number, wave: OscillatorType = 'sine', endFreq?: number) {
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain); gain.connect(ctx.destination)
  osc.type = wave
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + dur)
  gain.gain.setValueAtTime(vol, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur + 0.05)
}

function playHitSound(type: string) {
  const s: Record<string, [number, number, OscillatorType, number?]> = {
    perfect: [880, 0.1, 'sine', 1760], great: [660, 0.08, 'sine'],
    good: [440, 0.06, 'triangle'], miss: [200, 0.15, 'sawtooth', 100],
  }
  const d = s[type]; if (d) playTone(d[0], d[1], 0.25, d[2], d[3])
}
function playHoldStart() { playTone(520, 0.06, 0.2, 'sine') }
function playHoldProgress() { playTone(600, 0.03, 0.1, 'triangle') }
function playHoldEnd() { playTone(880, 0.1, 0.3, 'sine', 1200) }
function playTapSound() { playTone(750, 0.08, 0.25, 'sine', 1100) }

// 波纹
interface Ripple { x: number; y: number; life: number; color: string }
let ripples: Ripple[] = []
function addRipple(x: number, y: number, color: string) { ripples.push({ x, y, life: 1, color }) }

// 粒子
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }
let particles: Particle[] = []
function spawnParticles(x: number, y: number, color: string, count = 14) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.3
    const spd = 3 + Math.random() * 5
    particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1, color, size: 2 + Math.random() * 4 })
  }
}

// 判定文字
interface JT { text: string; color: string; x: number; y: number; life: number; scale: number }
let jts: JT[] = []
function addJT(type: string, x: number, y: number) {
  jts.push({ text: type.toUpperCase(), color: { perfect: '#ffd700', great: '#4a9eff', good: '#4caf50', miss: '#ff5252' }[type] || '#fff', x, y, life: 1, scale: 1.8 })
}

// 封面
const coverImage = ref<HTMLImageElement | null>(null)
const coverLoaded = ref(false)
function loadCover(url: string) {
  const img = new Image()
  img.onload = () => { coverImage.value = img; coverLoaded.value = true }
  img.src = url
}

const holdProgress = ref(0)

const COLORS = {
  circle: '#ff6496', circleGlow: 'rgba(255, 100, 150, 0.5)',
  hold: '#ffd700', holdGlow: 'rgba(255, 215, 0, 0.4)', holdTrack: 'rgba(255, 215, 0, 0.3)',
  tap: '#ff8c00', tapGlow: 'rgba(255, 140, 0, 0.5)',
  approach: 'rgba(255, 255, 255, 0.9)', approachRing: 'rgba(255, 255, 255, 0.4)',
}

function drawBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
  g.addColorStop(0, '#0d0520'); g.addColorStop(0.5, '#0a0a18'); g.addColorStop(1, '#060610')
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)

  if (coverLoaded.value && coverImage.value) {
    ctx.save(); ctx.globalAlpha = 0.45; ctx.filter = 'blur(5px) saturate(1.2) brightness(0.85)'
    const ia = coverImage.value.width / coverImage.value.height, ca = w / h
    let sw: number, sh: number, sx: number, sy: number
    if (ia > ca) { sh = coverImage.value.height; sw = sh * ca; sx = (coverImage.value.width - sw) / 2; sy = 0 }
    else { sw = coverImage.value.width; sh = sw / ca; sx = 0; sy = (coverImage.value.height - sh) / 2 }
    ctx.drawImage(coverImage.value, sx, sy, sw, sh, 0, 0, w, h); ctx.restore()
  }

  const f = audioStore.frequencyData
  if (f.length > 0) {
    const bass = f.slice(0, 5).reduce((a, b) => a + b, 0) / (5 * 255)
    if (bass > 0.15) {
      const pg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5)
      pg.addColorStop(0, `rgba(255, 100, 150, ${bass * 0.08})`); pg.addColorStop(1, 'transparent')
      ctx.fillStyle = pg; ctx.fillRect(0, 0, w, h)
    }
  }

  ctx.strokeStyle = 'rgba(100, 60, 180, 0.05)'; ctx.lineWidth = 0.5
  for (let x = 0; x < w; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  for (let y = 0; y < h; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
}

// 绘制 Perfect 闪烁效果
function drawPerfectFlash(ctx: CanvasRenderingContext2D, x: number, y: number, td: number) {
  const isPerfect = td >= -PERFECT_WINDOW && td <= PERFECT_WINDOW
  if (!isPerfect) return false

  const flash = Math.sin(Date.now() * 0.03) * 0.5 + 0.5
  // 外层金色大光圈
  ctx.strokeStyle = `rgba(255, 215, 0, ${0.7 + flash * 0.3})`
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 10 + flash * 8, 0, Math.PI * 2); ctx.stroke()
  // 内层白色闪烁
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + flash * 0.5})`
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 5, 0, Math.PI * 2); ctx.stroke()
  // 整体发光
  ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 25 + flash * 20
  ctx.fillStyle = `rgba(255, 215, 0, ${0.12 + flash * 0.08})`
  ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 20, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0
  return true
}

/**
 * 绘制 Circle 音符（红色，鼠标点击）
 */
function drawCircle(ctx: CanvasRenderingContext2D, note: Note, ct: number) {
  const x = note.x * canvasWidth, y = note.y * canvasHeight
  const td = note.time - ct
  if (td < -400) return

  let alpha = 1
  if (td > 1000) alpha = Math.max(0, 1 - (td - 1000) / 500)
  if (td < -150) alpha = Math.max(0, 1 + (td + 150) / 250)
  ctx.globalAlpha = alpha

  // 警告
  if (td < -50 && td > -400 && !gameStore.processedNotes?.has(note.id)) {
    const wp = Math.sin(Date.now() * 0.015) * 0.5 + 0.5
    ctx.fillStyle = `rgba(255, 50, 50, ${0.12 * wp})`; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 35, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = `rgba(255, 80, 80, ${0.5 + wp * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 20 + wp * 10, 0, Math.PI * 2); ctx.stroke()
  }

  // 发光
  const gp = Math.sin(Date.now() * 0.004) * 0.15 + 0.85
  ctx.fillStyle = `rgba(255, 100, 150, ${0.3 * gp})`; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 12, 0, Math.PI * 2); ctx.fill()

  // 判定圈
  const ad = 1200
  if (td > 0 && td < ad) {
    const p = 1 - td / ad, sc = 3.5 - 2.5 * p
    ctx.strokeStyle = COLORS.approachRing; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS * sc, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = COLORS.approach; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS * sc, 0, Math.PI * 2); ctx.stroke()
  }

  drawPerfectFlash(ctx, x, y, td)

  // 音符
  const ng = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, NOTE_RADIUS)
  ng.addColorStop(0, '#ffb3cc'); ng.addColorStop(0.7, COLORS.circle); ng.addColorStop(1, '#cc3060')
  ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke()
  ctx.globalAlpha = 1
}

/**
 * 绘制 Tap 音符（橙色，空格单击）
 */
function drawTap(ctx: CanvasRenderingContext2D, note: Note, ct: number) {
  const x = note.x * canvasWidth, y = note.y * canvasHeight
  const td = note.time - ct
  if (td < -400) return

  let alpha = 1
  if (td > 1000) alpha = Math.max(0, 1 - (td - 1000) / 500)
  if (td < -150) alpha = Math.max(0, 1 + (td + 150) / 250)
  ctx.globalAlpha = alpha

  // 警告
  if (td < -50 && td > -400 && !gameStore.processedNotes?.has(note.id)) {
    const wp = Math.sin(Date.now() * 0.015) * 0.5 + 0.5
    ctx.fillStyle = `rgba(255, 50, 50, ${0.12 * wp})`; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 35, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = `rgba(255, 80, 80, ${0.5 + wp * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 20 + wp * 10, 0, Math.PI * 2); ctx.stroke()
  }

  // 发光（橙色）
  const gp = Math.sin(Date.now() * 0.004) * 0.15 + 0.85
  ctx.fillStyle = `rgba(255, 140, 0, ${0.3 * gp})`; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 12, 0, Math.PI * 2); ctx.fill()

  // 判定圈
  const ad = 1200
  if (td > 0 && td < ad) {
    const p = 1 - td / ad, sc = 3.5 - 2.5 * p
    ctx.strokeStyle = COLORS.approachRing; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS * sc, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = COLORS.approach; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS * sc, 0, Math.PI * 2); ctx.stroke()
  }

  drawPerfectFlash(ctx, x, y, td)

  // 音符（橙色渐变）
  const ng = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, NOTE_RADIUS)
  ng.addColorStop(0, '#ffcc80'); ng.addColorStop(0.7, COLORS.tap); ng.addColorStop(1, '#cc6600')
  ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke()

  // "空格" 提示
  ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.fillText('空格', x, y - NOTE_RADIUS - 10)

  ctx.globalAlpha = 1
}

/**
 * 绘制 Hold 音符（金色，空格长按，弧形轨道）
 */
function drawHold(ctx: CanvasRenderingContext2D, note: Note, ct: number) {
  if (!note.endTime) return
  const x = note.x * canvasWidth, y = note.y * canvasHeight
  const td = note.time - ct

  const isActive = activeHoldNote?.id === note.id
  const isCompleted = gameStore.processedNotes?.has(note.id)

  // 未激活且已过期：不绘制
  if (!isActive && !isCompleted && td < -500) return

  const holdDuration = note.endTime - note.time
  const margin = 40
  const availH = canvasHeight - y - margin
  const endY = Math.min(y + holdDuration * 0.2, y + availH, canvasHeight - margin)
  const endX = x + (x > canvasWidth / 2 ? -1 : 1) * 25

  // 调试：记录 Hold 参数（减少日志量）
  if (isActive && Math.random() < 0.05) { // 只记录 5% 的帧
    console.log('Hold:', { dur: Math.round(holdDuration), x: Math.round(x), y: Math.round(y), ex: Math.round(endX), ey: Math.round(endY), prog: holdProgress.value.toFixed(2) })
  }

  let alpha = 1
  if (td > 1200 && !isActive) alpha = Math.max(0, 1 - (td - 1200) / 600)
  ctx.globalAlpha = alpha

  // 未激活时：显示判定圈
  if (!isActive && !isCompleted) {
    const ad = 1200
    if (td > 0 && td < ad) {
      const p = 1 - td / ad, sc = 3.5 - 2.5 * p
      ctx.strokeStyle = COLORS.approachRing; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS * sc, 0, Math.PI * 2); ctx.stroke()
      ctx.strokeStyle = COLORS.approach; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS * sc, 0, Math.PI * 2); ctx.stroke()
    }

    drawPerfectFlash(ctx, x, y, td)

    const gp = Math.sin(Date.now() * 0.004) * 0.15 + 0.85
    ctx.fillStyle = `rgba(255, 215, 0, ${0.3 * gp})`; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + 12, 0, Math.PI * 2); ctx.fill()

    const sg = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, NOTE_RADIUS)
    sg.addColorStop(0, '#fff8dc'); sg.addColorStop(0.7, COLORS.hold); sg.addColorStop(1, '#b8860b')
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke()

    ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'; ctx.fillText('按住空格', x, y - NOTE_RADIUS - 12)
    ctx.globalAlpha = 1
    return
  }

  // 激活或已完成：显示分段弧形轨道
  if (isActive || isCompleted) {
    const progress = isActive ? holdProgress.value : 1

    try {
    // 分段弧形：将轨道分成多个短段，每段有轻微弧度
    const totalLen = Math.sqrt((endX - x) ** 2 + (endY - y) ** 2)
    const segmentCount = Math.max(3, Math.floor(totalLen / 80)) // 每 80px 一段
    const segmentLen = totalLen / segmentCount

    // 绘制轨道
    ctx.save()
    ctx.shadowColor = COLORS.hold
    ctx.shadowBlur = 15
    ctx.strokeStyle = COLORS.holdTrack
    ctx.lineWidth = 28
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(x, y)

    let drawnLen = 0
    const targetLen = totalLen * progress

    for (let i = 0; i < segmentCount; i++) {
      const segStart = i * segmentLen
      const segEnd = Math.min((i + 1) * segmentLen, targetLen)

      if (segStart >= targetLen) break

      // 每段的起点和终点
      const sx = x + (endX - x) * (segStart / totalLen)
      const sy = y + (endY - y) * (segStart / totalLen)
      const ex = x + (endX - x) * (segEnd / totalLen)
      const ey = y + (endY - y) * (segEnd / totalLen)

      // 弧形控制点：交替向左和向右弯曲
      const curveDir = (i % 2 === 0) ? 1 : -1
      const curveAmt = Math.min(segmentLen * 0.3, 40) // 弧度
      const mx = (sx + ex) / 2 + curveDir * curveAmt
      const my = (sy + ey) / 2

      // 绘制二次贝塞尔曲线段
      ctx.quadraticCurveTo(mx, my, ex, ey)
    }

    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.restore()

    // 流动点
    ctx.save()
    const flowSpeed = 0.003
    const ft = Date.now() * flowSpeed
    for (let i = 0; i < 6; i++) {
      const t = ((ft + i * 0.17) % 1) * progress
      // 计算流动点位置（沿分段路径）
      const segIdx = Math.floor(t * segmentCount)
      const segT = (t * segmentCount) - segIdx
      const seg = Math.min(segIdx, segmentCount - 1)
      const segStart = seg * segmentLen
      const segEnd = Math.min((seg + 1) * segmentLen, totalLen)
      const sx = x + (endX - x) * (segStart / totalLen)
      const sy = y + (endY - y) * (segStart / totalLen)
      const ex = x + (endX - x) * (segEnd / totalLen)
      const ey = y + (endY - y) * (segEnd / totalLen)
      const curveDir = (seg % 2 === 0) ? 1 : -1
      const curveAmt = Math.min(segmentLen * 0.3, 40)
      const mx = (sx + ex) / 2 + curveDir * curveAmt

      const mt = 1 - segT
      const px = mt * mt * sx + 2 * mt * segT * mx + segT * segT * ex
      const py = mt * mt * sy + 2 * mt * segT * (sy + ey) / 2 + segT * segT * ey

      ctx.fillStyle = `rgba(255, 255, 255, ${0.9 - i * 0.12})`
      ctx.beginPath()
      ctx.arc(px, py, 4 - i * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // 起点
    ctx.save()
    const sg = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, NOTE_RADIUS)
    sg.addColorStop(0, '#fff8dc')
    sg.addColorStop(0.7, COLORS.hold)
    sg.addColorStop(1, '#b8860b')
    ctx.fillStyle = sg
    ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.restore()

    // 终点
    ctx.save()
    const endPt = { x: endX, y: endY }
    ctx.fillStyle = COLORS.hold
    ctx.beginPath(); ctx.arc(endPt.x, endPt.y, 12, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.restore()

    // 进度指示（沿路径）
    ctx.save()
    const progT = progress
    const progSeg = Math.min(Math.floor(progT * segmentCount), segmentCount - 1)
    const progSegT = (progT * segmentCount) - progSeg
    const pSegStart = progSeg * segmentLen
    const pSegEnd = Math.min((progSeg + 1) * segmentLen, totalLen)
    const psx = x + (endX - x) * (pSegStart / totalLen)
    const psy = y + (endY - y) * (pSegStart / totalLen)
    const pex = x + (endX - x) * (pSegEnd / totalLen)
    const pey = y + (endY - y) * (pSegEnd / totalLen)
    const pCurveDir = (progSeg % 2 === 0) ? 1 : -1
    const pCurveAmt = Math.min(segmentLen * 0.3, 40)
    const pmx = (psx + pex) / 2 + pCurveDir * pCurveAmt
    const pmt = 1 - progSegT
    const ppx = pmt * pmt * psx + 2 * pmt * progSegT * pmx + progSegT * progSegT * pex
    const ppy = pmt * pmt * psy + 2 * pmt * progSegT * (psy + pey) / 2 + progSegT * progSegT * pey

    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'
    ctx.beginPath(); ctx.arc(ppx, ppy, 6, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.restore()

    ctx.globalAlpha = 1

    } catch (e) {
      // 渲染失败时的后备：绘制简单直线
      console.error('Hold render error, using fallback:', e)
      ctx.strokeStyle = COLORS.holdTrack
      ctx.lineWidth = 26
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (endX - x) * progress, y + (endY - y) * progress)
      ctx.stroke()
    }
  }
}

function drawParticles(ctx: CanvasRenderingContext2D) {
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.025
    if (p.life <= 0) return false
    ctx.globalAlpha = p.life; ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill()
    return true
  }); ctx.globalAlpha = 1
}

function drawRipples(ctx: CanvasRenderingContext2D) {
  ripples = ripples.filter(r => {
    r.life -= 0.04; if (r.life <= 0) return false
    const rad = (1 - r.life) * 80
    ctx.strokeStyle = r.color; ctx.lineWidth = 3 * r.life; ctx.globalAlpha = r.life * 0.8
    ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 1.5 * r.life; ctx.beginPath(); ctx.arc(r.x, r.y, rad * 0.5, 0, Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = 1; return true
  })
}

function drawJTs(ctx: CanvasRenderingContext2D) {
  jts = jts.filter(t => {
    t.life -= 0.025; t.y -= 1.2; t.scale = Math.max(1, t.scale - 0.02)
    if (t.life <= 0) return false
    ctx.save(); ctx.globalAlpha = Math.min(1, t.life * 2)
    ctx.font = `bold ${32 * t.scale}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.shadowColor = t.color; ctx.shadowBlur = 20; ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y)
    ctx.restore(); return true
  })
}

function render() {
  const canvas = canvasRef.value
  if (!canvas) { animFrameId = requestAnimationFrame(render); return }
  const ctx = canvas.getContext('2d')
  if (!ctx) { animFrameId = requestAnimationFrame(render); return }

  // 先更新 Hold 进度（在同一帧内）
  updateHoldProgress()

  canvasWidth = canvas.width; canvasHeight = canvas.height
  const ct = audioStore.currentTime

  drawBg(ctx, canvasWidth, canvasHeight)

  gameStore.notes.forEach(note => {
    const td = note.time - ct
    if (td > -500 && td < 2500) {
      if (note.type === 'circle') drawCircle(ctx, note, ct)
      else if (note.type === 'tap') drawTap(ctx, note, ct)
      else if (note.type === 'hold') drawHold(ctx, note, ct)
    }
  })

  drawParticles(ctx); drawRipples(ctx); drawJTs(ctx)

  // Miss
  if (gameStore.state === 'playing') {
    const processed = gameStore.processedNotes
    if (processed) {
      gameStore.notes.forEach(note => {
        if ((note.type === 'circle' || note.type === 'tap') && !processed.has(note.id)) {
          if (ct - note.time > 150) {
            gameStore.handleMiss(note.id); playHitSound('miss')
            addJT('miss', note.x * canvasWidth, note.y * canvasHeight)
          }
        }
        if (note.type === 'hold' && note.endTime && !processed.has(note.id)) {
          if (ct - note.endTime > 150) {
            gameStore.handleMiss(note.id); playHitSound('miss')
            addJT('miss', note.x * canvasWidth, note.y * canvasHeight)
          }
        }
      })
    }
    if (ct >= audioStore.duration && audioStore.duration > 0) gameStore.endGame()
  }

  animFrameId = requestAnimationFrame(render)
}

function handleClick(e: MouseEvent) {
  if (gameStore.state !== 'playing') return
  const canvas = canvasRef.value; if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const cx = (e.clientX - rect.left) * (canvas.width / rect.width)
  const cy = (e.clientY - rect.top) * (canvas.height / rect.height)
  const ct = audioStore.currentTime; const processed = gameStore.processedNotes

  let closest: Note | null = null, closestDist = Infinity
  gameStore.notes.forEach(note => {
    if (note.type !== 'circle') return
    if (processed?.has(note.id)) return
    const nx = note.x * canvasWidth, ny = note.y * canvasHeight
    const dist = Math.sqrt((cx - nx) ** 2 + (cy - ny) ** 2)
    const td = Math.abs(note.time - ct)
    if (dist < HIT_RADIUS && td < 200 && dist < closestDist) { closestDist = dist; closest = note }
  })

  if (closest) {
    const result = gameStore.handleHit(closest.id, ct, closest.time, closest.x, closest.y)
    const nx = closest.x * canvasWidth, ny = closest.y * canvasHeight
    if (result) { playHitSound(result.type); spawnParticles(nx, ny, COLORS.circle, result.type === 'perfect' ? 18 : 12); addJT(result.type, nx, ny - 50) }
    addRipple(nx, ny, result ? { perfect: '#ffd700', great: '#4a9eff', good: '#4caf50', miss: '#ff5252' }[result!.type] : '#fff')
  } else { addRipple(cx, cy, 'rgba(255,255,255,0.3)') }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.code !== 'Space' || e.repeat) return
  e.preventDefault()
  if (gameStore.state !== 'playing' || spaceDown) return
  spaceDown = true
  const ct = audioStore.currentTime; const processed = gameStore.processedNotes

  // 先查找 Tap（单击空格）
  let tapNote: Note | null = null, tapDist = Infinity
  gameStore.notes.forEach(note => {
    if (note.type !== 'tap') return
    if (processed?.has(note.id)) return
    const td = Math.abs(note.time - ct)
    if (td < 200 && td < tapDist) { tapDist = td; tapNote = note }
  })

  if (tapNote) {
    const result = gameStore.handleHit(tapNote.id, ct, tapNote.time, tapNote.x, tapNote.y)
    playTapSound()
    const nx = tapNote.x * canvasWidth, ny = tapNote.y * canvasHeight
    if (result) { spawnParticles(nx, ny, COLORS.tap, result.type === 'perfect' ? 18 : 12); addJT(result.type, nx, ny - 50) }
    addRipple(nx, ny, COLORS.tap)
    spaceDown = false
    return
  }

  // 查找 Hold
  let holdNote: Note | null = null, holdDist = Infinity
  gameStore.notes.forEach(note => {
    if (note.type !== 'hold') return
    if (processed?.has(note.id)) return
    const td = Math.abs(note.time - ct)
    if (td < 200 && td < holdDist) { holdDist = td; holdNote = note }
  })

  if (holdNote) {
    activeHoldNote = holdNote; holdStartTime = ct; holdProgress.value = 0
    gameStore.handleHit(holdNote.id, ct, holdNote.time, holdNote.x, holdNote.y)
    playHoldStart()
    addRipple(holdNote.x * canvasWidth, holdNote.y * canvasHeight, COLORS.hold)
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.code !== 'Space') return
  e.preventDefault()
  if (!spaceDown || !activeHoldNote) { spaceDown = false; return }

  spaceDown = false
  const ct = audioStore.currentTime; const note = activeHoldNote

  if (note.endTime) {
    const holdDur = ct - holdStartTime
    const expected = note.endTime - note.time
    const coverage = holdDur / expected
    let type = 'miss'
    if (coverage >= 0.9) type = 'perfect'
    else if (coverage >= 0.7) type = 'great'
    else if (coverage >= 0.5) type = 'good'

    gameStore.handleHit(note.id, ct, note.time, note.x, note.y)
    playHitSound(type)
    spawnParticles(note.x * canvasWidth, note.y * canvasHeight, COLORS.hold, type === 'perfect' ? 18 : 12)
    addJT(type, note.x * canvasWidth, note.y * canvasHeight - 50)
  }

  activeHoldNote = null; holdProgress.value = 0
}

function updateHoldProgress() {
  if (!activeHoldNote || !activeHoldNote.endTime) return
  const ct = audioStore.currentTime
  const elapsed = ct - holdStartTime
  const total = activeHoldNote.endTime - activeHoldNote.time
  holdProgress.value = Math.min(1, elapsed / total)

  if (Math.floor(holdProgress.value * 10) > Math.floor((holdProgress.value - 0.02) * 10)) playHoldProgress()

  if (holdProgress.value >= 1) {
    playHoldEnd()
    const note = activeHoldNote
    gameStore.handleHit(note.id, ct, note.time, note.x, note.y)
    spawnParticles(note.x * canvasWidth, note.y * canvasHeight, COLORS.hold, 18)
    addJT('perfect', note.x * canvasWidth, note.y * canvasHeight - 50)
    activeHoldNote = null; holdProgress.value = 0; spaceDown = false
  }
}

function resizeCanvas() {
  const canvas = canvasRef.value; if (!canvas) return
  canvas.width = window.innerWidth; canvas.height = window.innerHeight
  canvasWidth = canvas.width; canvasHeight = canvas.height
}

onMounted(() => {
  resizeCanvas(); window.addEventListener('resize', resizeCanvas)
  window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp)
  if (gameStore.currentMapId) {
    import('@/utils/api').then(({ default: api }) => {
      api.get(`/api/maps/${gameStore.currentMapId}`).then(res => {
        if (res.data.map?.coverImage) loadCover(`/uploads/${res.data.map.coverImage}`)
      })
    })
  }
  render() // render 内部已经包含 updateHoldProgress
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp)
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
