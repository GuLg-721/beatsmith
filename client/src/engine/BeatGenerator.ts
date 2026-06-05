/**
 * BeatGenerator - 音乐能量感知谱面生成
 *
 * 简单模式：Tap 50% / Circle 40% / Hold 10%
 * 进阶模式：高潮段多 Tap / Circle 50% / Tap 35% / Hold 15%
 * 自定义模式：用户控制密度 + 三种比例
 */

import { nanoid } from 'nanoid'
import type { Beat } from './BeatDetector'

export interface Note {
  id: string
  type: 'circle' | 'hold' | 'tap'
  time: number
  x: number
  y: number
  endTime?: number
}

export type GenerateMode = 'simple' | 'advanced' | 'custom'

export interface CustomOptions {
  density: number      // 0.2 - 1.0
  circleRatio: number  // 0-1
  tapRatio: number     // 0-1
  holdRatio: number    // 0-1
}

const MIN_DISTANCE = 0.08
const MAX_DISTANCE = 0.4 // Circle 最大间距（视口宽高的 40%）

function randomPosition(existingNotes: Note[]): { x: number; y: number } {
  let attempts = 0
  while (attempts < 50) {
    const x = 0.1 + Math.random() * 0.8
    const y = 0.1 + Math.random() * 0.8
    const hasOverlap = existingNotes.some(n => {
      const dx = n.x - x, dy = n.y - y
      return Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE
    })
    if (!hasOverlap) return { x, y }
    attempts++
  }
  return { x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8 }
}

// 检查 Circle 距离是否超限
function isTooFarFromLastCircle(notes: Note[], x: number, y: number): boolean {
  for (let i = notes.length - 1; i >= 0; i--) {
    if (notes[i].type === 'circle') {
      const dx = notes[i].x - x, dy = notes[i].y - y
      return Math.sqrt(dx * dx + dy * dy) > MAX_DISTANCE
    }
  }
  return false
}

/**
 * 能量分析
 */
function analyzeBeats(beats: Beat[], durationMs: number): Map<number, 'high' | 'low' | 'transition'> {
  const map = new Map<number, 'high' | 'low' | 'transition'>()
  if (beats.length < 2) return map

  const strengths = beats.map(b => b.strength)
  const avg = strengths.reduce((a, b) => a + b, 0) / strengths.length
  const range = Math.max(...strengths) - Math.min(...strengths)
  const useAdaptive = range < 0.1
  const window = Math.min(6, Math.floor(beats.length / 5))

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const s = beat.strength
    const start = Math.max(0, i - window)
    const end = Math.min(beats.length, i + window + 1)
    const localAvg = beats.slice(start, end).reduce((sum, b) => sum + b.strength, 0) / (end - start)
    const changeRate = Math.abs(beats[Math.min(i + 1, beats.length - 1)].strength - beats[Math.max(0, i - 1)].strength)
    const isEnding = beat.time > durationMs * 0.85
    const isBeginning = beat.time < durationMs * 0.05

    if (isEnding) map.set(i, 'transition')
    else if (isBeginning) map.set(i, 'low')
    else if (changeRate > 0.15) map.set(i, 'transition')
    else if (useAdaptive) {
      const pos = i / beats.length
      map.set(i, (pos > 0.25 && pos < 0.75 && Math.random() < 0.35) ? 'high' : 'low')
    } else {
      map.set(i, s > avg * 1.05 ? 'high' : 'low')
    }
  }
  return map
}

/**
 * 简单模式：Tap 50% / Circle 40% / Hold 10%
 * 降低高潮要求，让 Tap 更多
 */
function generateSimple(beats: Beat[], durationMs: number, bpm: number): Note[] {
  const notes: Note[] = []
  const energyMap = analyzeBeats(beats, durationMs)
  let tapCluster = 0
  let lastHoldEnd = 0
  const intervalMs = 60000 / bpm

  // 计算目标数量
  const totalBeats = beats.length
  const targetTap = Math.floor(totalBeats * 0.50)
  const targetHold = Math.floor(totalBeats * 0.10)
  let tapCount = 0
  let holdCount = 0

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const energy = energyMap.get(i) || 'low'
    if (beat.time < lastHoldEnd) continue

    const pos = randomPosition(notes)
    let type: 'circle' | 'tap' | 'hold'

    if (energy === 'high' && tapCount < targetTap) {
      // 高能量 → Tap
      type = 'tap'
      tapCluster++
      tapCount++
      if (tapCluster >= 8) { type = 'circle'; tapCluster = 0 }
    } else if (energy === 'transition' && holdCount < targetHold) {
      // 过渡 → Hold
      type = 'hold'
      tapCluster = 0
      holdCount++
      lastHoldEnd = beat.time + intervalMs * [0.5, 0.75, 1.0][Math.floor(Math.random() * 3)]
    } else if (tapCount < targetTap && Math.random() < 0.4) {
      // 随机补充 Tap
      type = 'tap'
      tapCluster++
      tapCount++
      if (tapCluster >= 6) { type = 'circle'; tapCluster = 0 }
    } else {
      // 默认 Circle
      type = 'circle'
      tapCluster = 0
    }

    // Circle 距离检查
    if (type === 'circle' && isTooFarFromLastCircle(notes, pos.x, pos.y)) {
      type = 'tap' // 太远就改成 Tap
      tapCount++
    }

    const note: Note = { id: nanoid(8), type, time: beat.time, x: pos.x, y: pos.y }
    if (type === 'hold') note.endTime = lastHoldEnd
    notes.push(note)
  }

  // 结尾长 Hold
  addEndingHold(notes, beats, durationMs)
  logCounts('generateSimple', notes)
  return notes
}

/**
 * 进阶模式：高潮多 Tap / Circle 50% / Tap 35% / Hold 15%
 */
function generateAdvanced(beats: Beat[], durationMs: number, bpm: number): Note[] {
  const notes: Note[] = []
  const energyMap = analyzeBeats(beats, durationMs)
  let tapCluster = 0
  let lastHoldEnd = 0
  const intervalMs = 60000 / bpm

  const totalBeats = beats.length
  const targetTap = Math.floor(totalBeats * 0.35)
  const targetHold = Math.floor(totalBeats * 0.15)
  let tapCount = 0
  let holdCount = 0

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const energy = energyMap.get(i) || 'low'
    if (beat.time < lastHoldEnd) continue

    const pos = randomPosition(notes)
    let type: 'circle' | 'tap' | 'hold'

    if (energy === 'high' && tapCount < targetTap) {
      type = 'tap'
      tapCluster++
      tapCount++
      if (tapCluster >= 6) { type = 'circle'; tapCluster = 0 }
    } else if (energy === 'transition' && holdCount < targetHold) {
      type = 'hold'
      tapCluster = 0
      holdCount++
      lastHoldEnd = beat.time + intervalMs * [0.5, 0.75, 1.0, 1.5][Math.floor(Math.random() * 4)]
    } else {
      type = 'circle'
      tapCluster = 0
    }

    if (type === 'circle' && isTooFarFromLastCircle(notes, pos.x, pos.y)) {
      type = 'tap'
      tapCount++
    }

    const note: Note = { id: nanoid(8), type, time: beat.time, x: pos.x, y: pos.y }
    if (type === 'hold') note.endTime = lastHoldEnd
    notes.push(note)
  }

  addEndingHold(notes, beats, durationMs)
  logCounts('generateAdvanced', notes)
  return notes
}

/**
 * 自定义模式：用户控制密度 + 三种比例
 */
function generateCustom(beats: Beat[], durationMs: number, options: CustomOptions): Note[] {
  const notes: Note[] = []
  let lastHoldEnd = 0

  // 根据密度决定生成数量
  const totalBeats = Math.floor(beats.length * options.density)
  const step = Math.max(1, Math.floor(beats.length / totalBeats))

  for (let i = 0; i < beats.length; i += step) {
    const beat = beats[i]
    if (beat.time < lastHoldEnd) continue

    const pos = randomPosition(notes)
    const r = Math.random()
    let type: 'circle' | 'tap' | 'hold'

    if (r < options.circleRatio) {
      type = 'circle'
    } else if (r < options.circleRatio + options.tapRatio) {
      type = 'tap'
    } else {
      type = 'hold'
      lastHoldEnd = beat.time + 500 + Math.random() * 1500
    }

    if (type === 'circle' && isTooFarFromLastCircle(notes, pos.x, pos.y)) {
      type = 'tap'
    }

    const note: Note = { id: nanoid(8), type, time: beat.time, x: pos.x, y: pos.y }
    if (type === 'hold') note.endTime = lastHoldEnd
    notes.push(note)
  }

  addEndingHold(notes, beats, durationMs)
  logCounts('generateCustom', notes)
  return notes
}

// 辅助：添加结尾长 Hold
function addEndingHold(notes: Note[], beats: Beat[], durationMs: number) {
  if (beats.length === 0) return
  const last = beats[beats.length - 1]
  const end = durationMs - 500
  if (end - last.time > 1000) {
    const pos = randomPosition(notes)
    notes.push({ id: nanoid(8), type: 'hold', time: last.time + 500, x: pos.x, y: pos.y, endTime: end })
  }
}

// 调试日志
function logCounts(label: string, notes: Note[]) {
  const c = { circle: 0, tap: 0, hold: 0 }
  notes.forEach(n => c[n.type]++)
  console.log(`${label}:`, c, `total=${notes.length}`)
}

/**
 * 主入口
 */
export function generateBeatmap(
  beats: Beat[], bpm: number, mode: GenerateMode,
  durationMs: number, customOptions?: CustomOptions
): Note[] {
  if (beats.length === 0) return []
  switch (mode) {
    case 'simple': return generateSimple(beats, durationMs, bpm)
    case 'advanced': return generateAdvanced(beats, durationMs, bpm)
    case 'custom': return generateCustom(beats, durationMs, customOptions || { density: 0.5, circleRatio: 0.4, tapRatio: 0.3, holdRatio: 0.3 })
    default: return generateSimple(beats, durationMs, bpm)
  }
}
