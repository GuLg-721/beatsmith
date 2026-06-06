/**
 * BeatGenerator - 音乐能量感知谱面生成
 * 只保留 Circle 和 Tap 两种音符
 */

import { nanoid } from 'nanoid'
import type { Beat } from './BeatDetector'

export interface Note {
  id: string
  type: 'circle' | 'tap'
  time: number
  x: number
  y: number
}

export type GenerateMode = 'simple' | 'advanced' | 'custom'

export interface CustomOptions {
  density: number
  circleRatio: number
  tapRatio: number
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

function analyzeBeats(beats: Beat[], dur: number): Map<number, 'high' | 'low'> {
  const map = new Map<number, 'high' | 'low'>()
  if (beats.length < 2) return map
  const strengths = beats.map(b => b.strength)
  const avg = strengths.reduce((a, b) => a + b, 0) / strengths.length
  const adaptive = (Math.max(...strengths) - Math.min(...strengths)) < 0.1

  for (let i = 0; i < beats.length; i++) {
    const s = beats[i].strength
    if (adaptive) {
      const pos = i / beats.length
      map.set(i, (pos > 0.25 && pos < 0.75 && Math.random() < 0.35) ? 'high' : 'low')
    } else {
      map.set(i, s > avg * 1.05 ? 'high' : 'low')
    }
  }
  return map
}

function generateSimple(beats: Beat[], dur: number, bpm: number): Note[] {
  const notes: Note[] = []
  const energyMap = analyzeBeats(beats, dur)
  let tapCluster = 0
  const targetTap = Math.floor(beats.length * 0.35)
  let tapCount = 0
  const endingStart = dur * 0.85

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const pos = randomPos(notes)

    if (beat.time >= endingStart) {
      notes.push({ id: nanoid(8), type: Math.random() < 0.6 ? 'tap' : 'circle', time: beat.time, ...pos })
      continue
    }

    const energy = energyMap.get(i) || 'low'
    let type: 'circle' | 'tap'

    if (energy === 'high' && tapCount < targetTap) {
      type = 'tap'; tapCluster++; tapCount++
      if (tapCluster >= 8) { type = 'circle'; tapCluster = 0 }
    } else if (tapCount < targetTap && Math.random() < 0.4) {
      type = 'tap'; tapCluster++; tapCount++
      if (tapCluster >= 6) { type = 'circle'; tapCluster = 0 }
    } else {
      type = 'circle'; tapCluster = 0
    }

    if (type === 'circle' && tooFarFromCircle(notes, pos.x, pos.y)) { type = 'tap'; tapCount++ }
    notes.push({ id: nanoid(8), type, time: beat.time, x: pos.x, y: pos.y })
  }

  logCounts('generateSimple', notes)
  return notes
}

function generateAdvanced(beats: Beat[], dur: number, bpm: number): Note[] {
  const notes: Note[] = []
  const energyMap = analyzeBeats(beats, dur)
  let tapCluster = 0
  const targetTap = Math.floor(beats.length * 0.30)
  let tapCount = 0
  const endingStart = dur * 0.85

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const pos = randomPos(notes)

    if (beat.time >= endingStart) {
      notes.push({ id: nanoid(8), type: Math.random() < 0.6 ? 'tap' : 'circle', time: beat.time, ...pos })
      continue
    }

    const energy = energyMap.get(i) || 'low'
    let type: 'circle' | 'tap'

    if (energy === 'high' && tapCount < targetTap) {
      type = 'tap'; tapCluster++; tapCount++
      if (tapCluster >= 6) { type = 'circle'; tapCluster = 0 }
    } else {
      type = 'circle'; tapCluster = 0
    }

    if (type === 'circle' && tooFarFromCircle(notes, pos.x, pos.y)) { type = 'tap'; tapCount++ }
    notes.push({ id: nanoid(8), type, time: beat.time, x: pos.x, y: pos.y })
  }

  logCounts('generateAdvanced', notes)
  return notes
}

function generateCustom(beats: Beat[], dur: number, options: CustomOptions): Note[] {
  const notes: Note[] = []
  const total = Math.floor(beats.length * options.density)
  const step = Math.max(1, Math.floor(beats.length / total))
  const endingStart = dur * 0.85

  for (let i = 0; i < beats.length; i += step) {
    const beat = beats[i]
    const pos = randomPos(notes)

    if (beat.time >= endingStart) {
      notes.push({ id: nanoid(8), type: Math.random() < 0.6 ? 'tap' : 'circle', time: beat.time, ...pos })
      continue
    }

    const r = Math.random()
    let type: 'circle' | 'tap'
    if (r < options.circleRatio) type = 'circle'
    else type = 'tap'

    if (type === 'circle' && tooFarFromCircle(notes, pos.x, pos.y)) type = 'tap'
    notes.push({ id: nanoid(8), type, time: beat.time, x: pos.x, y: pos.y })
  }

  logCounts('generateCustom', notes)
  return notes
}

function logCounts(label: string, notes: Note[]) {
  const c = { circle: 0, tap: 0 }
  notes.forEach(n => c[n.type]++)
  console.log(`${label}:`, c, `total=${notes.length}`)
}

export function generateBeatmap(beats: Beat[], bpm: number, mode: GenerateMode, dur: number, customOptions?: CustomOptions): Note[] {
  if (beats.length === 0) return []
  switch (mode) {
    case 'simple': return generateSimple(beats, dur, bpm)
    case 'advanced': return generateAdvanced(beats, dur, bpm)
    case 'custom': return generateCustom(beats, dur, customOptions || { density: 0.5, circleRatio: 0.5, tapRatio: 0.5 })
    default: return generateSimple(beats, dur, bpm)
  }
}
