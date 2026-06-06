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

const spinnerAngle = ref(0)

const COLORS = {
  circle: '#ff6496', circleGlow: 'rgba(255, 100, 150, 0.5)',
  spinner: '#ffd700', spinnerGlow: 'rgba(255, 215, 0, 0.4)', spinnerTrack: 'rgba(255, 215, 0, 0.3)',
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
 * 绘制 Spinner 音符（金色，空格长按，弧形轨道）
 */
function drawSpinner(ctx: CanvasRenderingContext2D, note: Note, ct: number) {
  if (!note.endTime) return
  const x = note.x * canvasWidth, y = note.y * canvasHeight
  const td = note.time - ct

  const isActive = gameStore.activeSpinner?.id === note.id
  const isCompleted = gameStore.processedNotes?.has(note.id)

  if (!isActive && !isCompleted && td < -500) return

  const duration = note.endTime - note.time
  const requiredClicks = Math.floor(5 + (duration / 1000) * 4)
  const progress = isActive ? Math.min(1, gameStore.spinnerClicks / requiredClicks) : (isCompleted ? 1 : 0)

  let alpha = 1
  if (td > 1200 && !isActive) alpha = Math.max(0, 1 - (td - 1200) / 600)
  ctx.globalAlpha = alpha

  const R = 55 // 圈半径

  // 未激活：判定圈 + 旋转预览
  if (!isActive && !isCompleted) {
    const ad = 1200
    if (td > 0 && td < ad) {
      const p = 1 - td / ad, sc = 3.5 - 2.5 * p
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS * sc, 0, Math.PI * 2); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS * sc, 0, Math.PI * 2); ctx.stroke()
    }

    drawPerfectFlash(ctx, x, y, td)

    // 外圈（待激活）
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'; ctx.lineWidth = 6
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke()

    // 旋转预览箭头
    ctx.save(); ctx.translate(x, y); ctx.rotate(Date.now() * 0.002)
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(0, 0, R - 12, 0, Math.PI * 1.2); ctx.stroke()
    ctx.fillStyle = 'rgba(255, 215, 0, 0.6)'
    ctx.beginPath(); ctx.moveTo(R - 12, -6); ctx.lineTo(R - 5, 0); ctx.lineTo(R - 12, 6); ctx.closePath(); ctx.fill()
    ctx.restore()

    // 中心提示
    ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255, 215, 0, 0.7)'
    ctx.fillText('连点', x, y)

    ctx.globalAlpha = 1
    return
  }

  // 激活/已完成：完整 Spinner
  // 外圈背景
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)'; ctx.lineWidth = 8
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke()

  // 进度弧
  ctx.strokeStyle = COLORS.spinner; ctx.lineWidth = 8; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke()

  // 旋转箭头（激活时旋转）
  const rotAngle = isActive ? spinnerAngle.value : Math.PI * 2
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotAngle)
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(0, 0, R - 14, 0, Math.PI * 1.3); ctx.stroke()
  ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'
  ctx.beginPath(); ctx.moveTo(R - 14, -6); ctx.lineTo(R - 6, 0); ctx.lineTo(R - 14, 6); ctx.closePath(); ctx.fill()
  ctx.restore()

  // 中心数字
  ctx.font = 'bold 22px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.5)'
  ctx.fillText(`${gameStore.spinnerClicks}/${requiredClicks}`, x, y)

  // 完成时的特效
  if (isCompleted && progress >= 1) {
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)'; ctx.lineWidth = 3
    const burstR = R + 10 + Math.sin(Date.now() * 0.01) * 5
    ctx.beginPath(); ctx.arc(x, y, burstR, 0, Math.PI * 2); ctx.stroke()
  }

  ctx.globalAlpha = 1
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

  canvasWidth = canvas.width; canvasHeight = canvas.height
  const ct = audioStore.currentTime

  drawBg(ctx, canvasWidth, canvasHeight)

  gameStore.notes.forEach(note => {
    const td = note.time - ct
    if (td > -500 && td < 2500) {
      if (note.type === 'circle') drawCircle(ctx, note, ct)
      else if (note.type === 'tap') drawTap(ctx, note, ct)
      else if (note.type === 'spinner') drawSpinner(ctx, note, ct)
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
        if (note.type === 'spinner' && note.endTime && !processed.has(note.id)) {
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
  if (e.code !== 'Space') return
  e.preventDefault()
  if (gameStore.state !== 'playing') return

  const ct = audioStore.currentTime
  const processed = gameStore.processedNotes

  // 如果有活跃的 Spinner，允许重复点击
  if (gameStore.activeSpinner) {
    const result = gameStore.clickSpinner()
    spinnerAngle.value += Math.PI / 3
    playTapSound()
    if (result === 'perfect') {
      const nx = gameStore.activeSpinner.x * canvasWidth
      const ny = gameStore.activeSpinner.y * canvasHeight
      spawnParticles(nx, ny, COLORS.spinner, 18)
      addJT('perfect', nx, ny - 50)
    }
    return
  }

  // Tap（不重复）
  if (e.repeat) return

  // 查找 Tap
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
    return
  }

  // 查找 Spinner（启动）
  let spinnerNote: Note | null = null, spinnerDist = Infinity
  gameStore.notes.forEach(note => {
    if (note.type !== 'spinner') return
    if (processed?.has(note.id)) return
    const td = Math.abs(note.time - ct)
    if (td < 200 && td < spinnerDist) { spinnerDist = td; spinnerNote = note }
  })

  if (spinnerNote) {
    gameStore.startSpinner(spinnerNote, ct)
    playTapSound()
    addRipple(spinnerNote.x * canvasWidth, spinnerNote.y * canvasHeight, COLORS.spinner)
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.code !== 'Space') return
  // Spinner 不需要 keyup 处理，点击即完成
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
  render() // 启动渲染循环
        if (res.data.map?.coverImage) loadCover(`/uploads/${res.data.map.coverImage}`)
      })
    })
  }
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
