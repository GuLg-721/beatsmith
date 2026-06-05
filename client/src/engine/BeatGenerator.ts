/**
 * BeatGenerator - 音乐能量感知谱面生成
 */

import { nanoid } from 'nanoid'
import type { Beat } from './BeatDetector'

export interface Note {
  id: string
  type: 'circle' | 'tap' | 'spinner'
  time: number
  x: number
  y: number
  endTime?: number  // spinner 结束时间
}

export type GenerateMode = 'simple' | 'advanced' | 'custom'

export interface CustomOptions {
  density: number
  circleRatio: number
  tapRatio: number
  spinnerRatio: number
}

const MIN_DISTANCE = 0.08
const MAX_CIRCLE_DIST = 0.4

function randomPos(notes: Note[]): { x: number; y: number } {
  let att = 0
  while (att < 50) {
    const x = 0.1 + Math.random() * 0.8, y = 0.1 + Math.random() * 0.8
    if (!notes.some(n => Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) < MIN_DISTANCE)) return { x, y }
    att++
  }
  return { x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8 }
}

function tooFarFromCircle(notes: Note[], x: number, y: number): boolean {
  for (let i = notes.length - 1; i >= 0; i--) {
    if (notes[i].type === 'circle') {
      return Math.sqrt((notes[i].x - x) ** 2 + (notes[i].y - y) ** 2) > MAX_CIRCLE_DIST
    }
  }
  return false
}

function analyzeBeats(beats: Beat[], dur: number): Map<number, 'high' | 'low' | 'trans'> {
  const map = new Map<number, 'high' | 'low' | 'trans'>()
  if (beats.length < 2) return map
  const strengths = beats.map(b => b.strength)
  const avg = strengths.reduce((a, b) => a + b, 0) / strengths.length
  const range = Math.max(...strengths) - Math.min(...strengths)
  const adaptive = range < 0.1
  const win = Math.min(6, Math.floor(beats.length / 5))

  for (let i = 0; i < beats.length; i++) {
    const b = beats[i]
    const s = b.strength
    const start = Math.max(0, i - win), end = Math.min(beats.length, i + win + 1)
    const localAvg = beats.slice(start, end).reduce((s, b) => s + b.strength, 0) / (end - start)
    const change = Math.abs(beats[Math.min(i + 1, beats.length - 1)].strength - beats[Math.max(0, i - 1)].strength)
    const isEnd = b.time > dur * 0.85, isStart = b.time < dur * 0.05

    if (isEnd) map.set(i, 'trans')
    else if (isStart) map.set(i, 'low')
    else if (change > 0.15) map.set(i, 'trans')
    else if (adaptive) {
      const pos = i / beats.length
      map.set(i, (pos > 0.25 && pos < 0.75 && Math.random() < 0.35) ? 'high' : 'low')
    } else {
      map.set(i, s > avg * 1.05 ? 'high' : 'low')
    }
  }
  return map
}

// 检测空窗期并填充 Spinner
function fillGaps(notes: Note[], beats: Beat[], bpm: number) {
  if (notes.length < 2) return
  const intervalMs = 60000 / bpm
  const gapThreshold = intervalMs * 3 // 超过 3 拍的空窗需要填充

  const sorted = [...notes].sort((a, b) => a.time - b.time)
  const filled: Note[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].time - sorted[i].time
    if (gap > gapThreshold) {
      // 在空窗中间添加一个 Spinner
      const midTime = sorted[i].time + gap * 0.5
      const spinnerDur = Math.min(gap * 0.6, intervalMs * 2)
      filled.push({
        id: nanoid(8),
        type: 'spinner',
        time: midTime,
        x: 0.1 + Math.random() * 0.8,
        y: 0.1 + Math.random() * 0.8,
        endTime: midTime + spinnerDur
      })
    }
  }

  // 按时间排序并合并
  notes.push(...filled)
  notes.sort((a, b) => a.time - b.time)
}

/**
 * 简单模式：Circle 50% / Tap 35% / Spinner 15%
 */
function generateSimple(beats: Beat[], dur: number, bpm: number): Note[] {
  const notes: Note[] = []
  const energyMap = analyzeBeats(beats, dur)
  let tapCluster = 0, lastSpinnerEnd = 0
  const intervalMs = 60000 / bpm
  const targetTap = Math.floor(beats.length * 0.35)
  const targetSpinner = Math.floor(beats.length * 0.15)
  let tapCount = 0, spinnerCount = 0
  const endingStart = dur * 0.85 // 结尾段起点

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    if (beat.time < lastSpinnerEnd) continue

    // 结尾段：Tap 穿插，不生成 Circle
    if (beat.time >= endingStart) {
      const note: Note = {
        id: nanoid(8),
        type: Math.random() < 0.6 ? 'tap' : 'circle',
        time: beat.time,
        ...randomPos(notes)
      }
      notes.push(note)
      continue
    }

    const energy = energyMap.get(i) || 'low'
    const pos = randomPos(notes)
    let type: 'circle' | 'tap' | 'spinner'

    if (energy === 'high' && tapCount < targetTap) {
      type = 'tap'
      tapCluster++
      tapCount++
      if (tapCluster >= 8) { type = 'circle'; tapCluster = 0 }
    } else if (energy === 'trans' && spinnerCount < targetSpinner) {
      type = 'spinner'
      tapCluster = 0
      spinnerCount++
      lastSpinnerEnd = beat.time + intervalMs * [0.5, 0.75, 1.0][Math.floor(Math.random() * 3)]
    } else if (tapCount < targetTap && Math.random() < 0.4) {
      type = 'tap'
      tapCluster++
      tapCount++
      if (tapCluster >= 6) { type = 'circle'; tapCluster = 0 }
    } else {
      type = 'circle'
      tapCluster = 0
    }

    if (type === 'circle' && tooFarFromCircle(notes, pos.x, pos.y)) {
      type = 'tap'
      tapCount++
    }

    const note: Note = { id: nanoid(8), type, time: beat.time, x: pos.x, y: pos.y }
    if (type === 'spinner') note.endTime = lastSpinnerEnd
    notes.push(note)
  }

  // 填充空窗期
  fillGaps(notes, beats, bpm)

  // 结尾：一个至少 5 秒的长 Spinner
  addLongEndingSpinner(notes, beats, dur)

  logCounts('generateSimple', notes)
  return notes
}

/**
 * 进阶模式：高潮多 Tap / Circle 55% / Tap 30% / Spinner 15%
 */
function generateAdvanced(beats: Beat[], dur: number, bpm: number): Note[] {
  const notes: Note[] = []
  const energyMap = analyzeBeats(beats, dur)
  let tapCluster = 0, lastSpinnerEnd = 0
  const intervalMs = 60000 / bpm
  const targetTap = Math.floor(beats.length * 0.30)
  const targetSpinner = Math.floor(beats.length * 0.15)
  let tapCount = 0, spinnerCount = 0
  const endingStart = dur * 0.85

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    if (beat.time < lastSpinnerEnd) continue

    if (beat.time >= endingStart) {
      const note: Note = {
        id: nanoid(8),
        type: Math.random() < 0.6 ? 'tap' : 'circle',
        time: beat.time,
        ...randomPos(notes)
      }
      notes.push(note)
      continue
    }

    const energy = energyMap.get(i) || 'low'
    const pos = randomPos(notes)
    let type: 'circle' | 'tap' | 'spinner'

    if (energy === 'high' && tapCount < targetTap) {
      type = 'tap'
      tapCluster++
      tapCount++
      if (tapCluster >= 6) { type = 'circle'; tapCluster = 0 }
    } else if (energy === 'trans' && spinnerCount < targetSpinner) {
      type = 'spinner'
      tapCluster = 0
      spinnerCount++
      lastSpinnerEnd = beat.time + intervalMs * [0.5, 0.75, 1.0, 1.5][Math.floor(Math.random() * 4)]
    } else {
      type = 'circle'
      tapCluster = 0
    }

    if (type === 'circle' && tooFarFromCircle(notes, pos.x, pos.y)) {
      type = 'tap'
      tapCount++
    }

    const note: Note = { id: nanoid(8), type, time: beat.time, x: pos.x, y: pos.y }
    if (type === 'spinner') note.endTime = lastSpinnerEnd
    notes.push(note)
  }

  fillGaps(notes, beats, bpm)
  addLongEndingSpinner(notes, beats, dur)
  logCounts('generateAdvanced', notes)
  return notes
}

/**
 * 自定义模式：密度 + 三比例
 */
function generateCustom(beats: Beat[], dur: number, options: CustomOptions): Note[] {
  const notes: Note[] = []
  let lastSpinnerEnd = 0
  const total = Math.floor(beats.length * options.density)
  const step = Math.max(1, Math.floor(beats.length / total))
  const endingStart = dur * 0.85

  for (let i = 0; i < beats.length; i += step) {
    const beat = beats[i]
    if (beat.time < lastSpinnerEnd) continue

    if (beat.time >= endingStart) {
      const note: Note = {
        id: nanoid(8),
        type: Math.random() < 0.6 ? 'tap' : 'circle',
        time: beat.time,
        ...randomPos(notes)
      }
      notes.push(note)
      continue
    }

    const pos = randomPos(notes)
    const r = Math.random()
    let type: 'circle' | 'tap' | 'spinner'

    if (r < options.circleRatio) type = 'circle'
    else if (r < options.circleRatio + options.tapRatio) type = 'tap'
    else {
      type = 'spinner'
      lastSpinnerEnd = beat.time + 500 + Math.random() * 1500
    }

    if (type === 'circle' && tooFarFromCircle(notes, pos.x, pos.y)) type = 'tap'

    const note: Note = { id: nanoid(8), type, time: beat.time, x: pos.x, y: pos.y }
    if (type === 'spinner') note.endTime = lastSpinnerEnd
    notes.push(note)
  }

  fillGaps(notes, beats, 120) // 默认 120 BPM
  addLongEndingSpinner(notes, beats, dur)
  logCounts('generateCustom', notes)
  return notes
}

// 结尾：一个至少 5 秒的长 Spinner
function addLongEndingSpinner(notes: Note[], beats: Beat[], dur: number) {
  if (beats.length === 0) return
  const last = beats[beats.length - 1]
  const endTime = dur - 200
  const startTime = Math.max(last.time + 200, endTime - Math.max(5000, dur * 0.08))

  // 确保至少 5 秒
  if (endTime - startTime < 5000) return

  notes.push({
    id: nanoid(8),
    type: 'spinner',
    time: startTime,
    x: 0.5,
    y: 0.5,
    endTime
  })
}

function logCounts(label: string, notes: Note[]) {
  const c = { circle: 0, tap: 0, hold: 0 }
  notes.forEach(n => c[n.type]++)
  console.log(`${label}:`, c, `total=${notes.length}`)
}

export function generateBeatmap(
  beats: Beat[], bpm: number, mode: GenerateMode,
  dur: number, customOptions?: CustomOptions
): Note[] {
  if (beats.length === 0) return []
  switch (mode) {
    case 'simple': return generateSimple(beats, dur, bpm)
    case 'advanced': return generateAdvanced(beats, dur, bpm)
    case 'custom': return generateCustom(beats, dur, customOptions || { density: 0.5, circleRatio: 0.5, tapRatio: 0.3, spinnerRatio: 0.2 })
    default: return generateSimple(beats, dur, bpm)
  }
}
