/**
 * BeatGenerator - 根据音乐能量分布自动生成谱面
 *
 * 算法策略：
 * - 高能量段（鼓点多）：Tap 连续出现，给玩家爽感
 * - 低能量段（自然/安静）：Circle 为主
 * - 过渡段（能量变化大）：Hold 音符
 * - 音乐结尾：长时间 Hold
 */

import { nanoid } from 'nanoid'
import type { Beat } from './BeatDetector'

export interface Note {
  id: string
  type: 'circle' | 'hold' | 'tap'
  time: number      // 毫秒
  x: number         // 0-1
  y: number         // 0-1
  endTime?: number  // 仅 hold
}

export type GenerateMode = 'simple' | 'advanced' | 'custom'

export interface CustomOptions {
  density: number
  energyThreshold: number  // 高于此值为高能量段
}

const MIN_DISTANCE = 0.08

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

/**
 * 分析节拍能量
 */
function analyzeBeatEnergy(beats: Beat[], durationMs: number): Map<number, 'high' | 'low' | 'transition'> {
  const energyMap = new Map<number, 'high' | 'low' | 'transition'>()

  if (beats.length < 2) return energyMap

  const strengths = beats.map(b => b.strength)
  const avgStrength = strengths.reduce((a, b) => a + b, 0) / strengths.length
  const maxStrength = Math.max(...strengths)
  const minStrength = Math.min(...strengths)

  console.log('Energy analysis:', { avg: avgStrength.toFixed(3), max: maxStrength.toFixed(3), min: minStrength.toFixed(3), range: (maxStrength - minStrength).toFixed(3) })

  // 如果能量范围太小，强制分布
  const range = maxStrength - minStrength
  const useAdaptive = range < 0.1

  const windowSize = Math.min(6, Math.floor(beats.length / 5))

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const s = beat.strength

    // 局部能量
    const start = Math.max(0, i - windowSize)
    const end = Math.min(beats.length, i + windowSize + 1)
    const localAvg = beats.slice(start, end).reduce((sum, b) => sum + b.strength, 0) / (end - start)

    // 能量变化率
    const nextS = beats[Math.min(i + 1, beats.length - 1)].strength
    const prevS = beats[Math.max(0, i - 1)].strength
    const changeRate = Math.abs(nextS - prevS)

    const isEnding = beat.time > durationMs * 0.85
    const isBeginning = beat.time < durationMs * 0.05

    if (isEnding) {
      energyMap.set(i, 'transition')
    } else if (isBeginning) {
      energyMap.set(i, 'low')
    } else if (changeRate > 0.2) {
      energyMap.set(i, 'transition')
    } else if (useAdaptive) {
      // 能量范围小时，用位置和随机来分布
      const pos = i / beats.length
      if (pos > 0.3 && pos < 0.7) {
        energyMap.set(i, Math.random() < 0.4 ? 'high' : 'low')
      } else {
        energyMap.set(i, 'low')
      }
    } else {
      // 正常分布
      if (s > avgStrength * 1.1) {
        energyMap.set(i, 'high')
      } else if (s < avgStrength * 0.9) {
        energyMap.set(i, 'low')
      } else {
        energyMap.set(i, 'low')
      }
    }
  }

  // 统计
  let highCount = 0, lowCount = 0, transCount = 0
  energyMap.forEach(v => {
    if (v === 'high') highCount++
    else if (v === 'transition') transCount++
    else lowCount++
  })
  console.log('Energy distribution:', { high: highCount, low: lowCount, transition: transCount })

  return energyMap
}

/**
 * 简单模式：根据能量分布生成
 */
function generateSimple(beats: Beat[], durationMs: number, bpm: number): Note[] {
  const notes: Note[] = []
  const energyMap = analyzeBeatEnergy(beats, durationMs)
  let tapCluster = 0
  let lastHoldEnd = 0
  const intervalMs = 60000 / bpm

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const energy = energyMap.get(i) || 'low'

    if (beat.time < lastHoldEnd) continue

    const pos = randomPosition(notes)
    let type: 'circle' | 'tap' | 'hold'

    switch (energy) {
      case 'high':
        type = 'tap'
        tapCluster++
        if (tapCluster >= 8) { type = 'circle'; tapCluster = 0 }
        break
      case 'transition':
        type = 'hold'
        tapCluster = 0
        lastHoldEnd = beat.time + intervalMs * [0.5, 0.75, 1.0][Math.floor(Math.random() * 3)]
        break
      default:
        type = 'circle'
        tapCluster = 0
        break
    }

    const note: Note = { id: nanoid(8), type, time: beat.time, x: pos.x, y: pos.y }
    if (type === 'hold') note.endTime = lastHoldEnd
    notes.push(note)
  }

  // 歌曲结尾：长 Hold
  if (beats.length > 0) {
    const last = beats[beats.length - 1]
    const end = durationMs - 500
    if (end - last.time > 1000) {
      const pos = randomPosition(notes)
      notes.push({ id: nanoid(8), type: 'hold', time: last.time + 500, x: pos.x, y: pos.y, endTime: end })
    }
  }

  const counts = { circle: 0, tap: 0, hold: 0 }
  notes.forEach(n => counts[n.type]++)
  console.log('generateSimple result:', counts)

  return notes
}

/**
 * 进阶模式：更复杂的能量分析 + 更多变化
 */
function generateAdvanced(beats: Beat[], durationMs: number, bpm: number): Note[] {
  const notes: Note[] = []
  const energyMap = analyzeBeatEnergy(beats, durationMs)
  const intervalMs = 60000 / bpm
  let tapCluster = 0
  let lastHoldEnd = 0

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const energy = energyMap.get(i) || 'low'

    if (beat.time < lastHoldEnd) continue

    const pos = randomPosition(notes)
    let type: 'circle' | 'tap' | 'hold'

    switch (energy) {
      case 'high':
        // 高能量：密集 Tap + 偶尔 Circle
        if (tapCluster >= 6) {
          type = 'circle'
          tapCluster = 0
        } else {
          type = 'tap'
          tapCluster++
        }
        break

      case 'transition':
        // 过渡段：Hold（时长随机）
        type = 'hold'
        tapCluster = 0
        const holdDur = intervalMs * [0.5, 0.75, 1.0, 1.5][Math.floor(Math.random() * 4)]
        lastHoldEnd = beat.time + holdDur
        break

      default:
        // 低能量：Circle + 偶尔 Tap
        if (Math.random() < 0.15) {
          type = 'tap'
          tapCluster = 1
        } else {
          type = 'circle'
          tapCluster = 0
        }
        break
    }

    const note: Note = {
      id: nanoid(8),
      type,
      time: beat.time,
      x: pos.x,
      y: pos.y
    }

    if (type === 'hold') {
      note.endTime = lastHoldEnd
    }

    notes.push(note)
  }

  // 歌曲结尾：长时间 Hold
  if (beats.length > 0) {
    const lastBeat = beats[beats.length - 1]
    const endTime = durationMs - 300
    if (endTime - lastBeat.time > 1500) {
      const pos = randomPosition(notes)
      notes.push({
        id: nanoid(8),
        type: 'hold',
        time: lastBeat.time + 200,
        x: pos.x,
        y: pos.y,
        endTime: endTime
      })
    }
  }

  return notes
}

/**
 * 自定义模式：用户控制能量阈值
 */
function generateCustom(beats: Beat[], durationMs: number, options: CustomOptions): Note[] {
  const notes: Note[] = []
  const energyMap = analyzeBeatEnergy(beats, durationMs)
  let tapCluster = 0
  let lastHoldEnd = 0

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const strength = beats[i].strength

    if (beat.time < lastHoldEnd) continue

    const pos = randomPosition(notes)
    let type: 'circle' | 'tap' | 'hold'

    if (strength > options.energyThreshold) {
      // 高于阈值：Tap 连续
      type = 'tap'
      tapCluster++
      if (tapCluster >= 8) {
        type = 'circle'
        tapCluster = 0
      }
    } else if (strength < options.energyThreshold * 0.5) {
      // 很低能量：Hold 过渡
      type = 'hold'
      tapCluster = 0
      lastHoldEnd = beat.time + 500 + Math.random() * 1000
    } else {
      // 中等能量：Circle
      type = 'circle'
      tapCluster = 0
    }

    const note: Note = {
      id: nanoid(8),
      type,
      time: beat.time,
      x: pos.x,
      y: pos.y
    }

    if (type === 'hold') {
      note.endTime = lastHoldEnd
    }

    notes.push(note)
  }

  // 歌曲结尾：长时间 Hold
  if (beats.length > 0) {
    const lastBeat = beats[beats.length - 1]
    const endTime = durationMs - 300
    if (endTime - lastBeat.time > 1000) {
      const pos = randomPosition(notes)
      notes.push({
        id: nanoid(8),
        type: 'hold',
        time: lastBeat.time + 200,
        x: pos.x,
        y: pos.y,
        endTime: endTime
      })
    }
  }

  return notes
}

/**
 * 主入口
 */
export function generateBeatmap(
  beats: Beat[],
  bpm: number,
  mode: GenerateMode,
  durationMs: number,
  customOptions?: CustomOptions
): Note[] {
  if (beats.length === 0) return []

  switch (mode) {
    case 'simple':
      return generateSimple(beats, durationMs, bpm)
    case 'advanced':
      return generateAdvanced(beats, durationMs, bpm)
    case 'custom':
      return generateCustom(beats, durationMs, customOptions || {
        density: 0.5,
        energyThreshold: 0.5
      })
    default:
      return generateSimple(beats, durationMs, bpm)
  }
}
