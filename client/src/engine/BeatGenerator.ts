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
 * 分析节拍能量，返回每个节拍的能量等级
 * 'high' = 鼓点多，适合 Tap
 * 'low' = 自然安静，适合 Circle
 * 'transition' = 能量变化大，适合 Hold
 */
function analyzeBeatEnergy(beats: Beat[], durationMs: number): Map<number, 'high' | 'low' | 'transition'> {
  const energyMap = new Map<number, 'high' | 'low' | 'transition'>()

  if (beats.length < 2) return energyMap

  // 计算平均强度
  const avgStrength = beats.reduce((sum, b) => sum + b.strength, 0) / beats.length

  // 计算局部能量变化（滑动窗口）
  const windowSize = Math.min(8, Math.floor(beats.length / 4))

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]

    // 计算局部平均强度
    const start = Math.max(0, i - windowSize)
    const end = Math.min(beats.length, i + windowSize + 1)
    const localAvg = beats.slice(start, end).reduce((sum, b) => sum + b.strength, 0) / (end - start)

    // 计算能量变化率
    const nextIdx = Math.min(i + 1, beats.length - 1)
    const prevIdx = Math.max(0, i - 1)
    const changeRate = Math.abs(beats[nextIdx].strength - beats[prevIdx].strength)

    // 歌曲结尾（最后 15%）
    const isEnding = beat.time > durationMs * 0.85

    // 歌曲开头（前 5%）
    const isBeginning = beat.time < durationMs * 0.05

    if (isEnding) {
      energyMap.set(i, 'transition') // 结尾用 Hold
    } else if (isBeginning) {
      energyMap.set(i, 'low') // 开头用 Circle
    } else if (changeRate > 0.3) {
      energyMap.set(i, 'transition') // 能量变化大 = 过渡段
    } else if (localAvg > avgStrength * 1.2) {
      energyMap.set(i, 'high') // 局部能量高 = 高潮
    } else if (localAvg < avgStrength * 0.8) {
      energyMap.set(i, 'low') // 局部能量低 = 安静
    } else {
      energyMap.set(i, 'low') // 默认 Circle
    }
  }

  return energyMap
}

/**
 * 简单模式：根据能量分布生成
 * 高能量 → Tap 连续
 * 低能量 → Circle
 * 过渡 → Hold
 */
function generateSimple(beats: Beat[], durationMs: number): Note[] {
  const notes: Note[] = []
  const energyMap = analyzeBeatEnergy(beats, durationMs)
  let tapCluster = 0
  let lastHoldEnd = 0

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const energy = energyMap.get(i) || 'low'

    // 跳过 Hold 时间范围内的节拍
    if (beat.time < lastHoldEnd) continue

    const pos = randomPosition(notes)
    let type: 'circle' | 'tap' | 'hold'

    switch (energy) {
      case 'high':
        // 高能量：Tap 连续出现（给玩家爽感）
        type = 'tap'
        tapCluster++
        // 每 8 个 Tap 插入一个 Circle 作为节奏变化
        if (tapCluster >= 8) {
          type = 'circle'
          tapCluster = 0
        }
        break

      case 'transition':
        // 过渡段：Hold 音符
        type = 'hold'
        tapCluster = 0
        // Hold 持续时间：1/4 到 1 拍
        const intervalMs = 60000 / (120) // 默认 BPM
        const holdMult = [0.25, 0.5, 0.75, 1.0][Math.floor(Math.random() * 4)]
        lastHoldEnd = beat.time + intervalMs * holdMult
        break

      default:
        // 低能量：Circle 为主
        type = 'circle'
        tapCluster = 0
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

  // 在歌曲结尾添加一个长时间 Hold（如果有）
  if (beats.length > 0) {
    const lastBeat = beats[beats.length - 1]
    const endTime = durationMs - 500 // 结束前 500ms
    if (endTime - lastBeat.time > 1000) {
      const pos = randomPosition(notes)
      notes.push({
        id: nanoid(8),
        type: 'hold',
        time: lastBeat.time + 500,
        x: pos.x,
        y: pos.y,
        endTime: endTime
      })
    }
  }

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
      return generateSimple(beats, durationMs)
    case 'advanced':
      return generateAdvanced(beats, durationMs, bpm)
    case 'custom':
      return generateCustom(beats, durationMs, customOptions || {
        density: 0.5,
        energyThreshold: 0.5
      })
    default:
      return generateSimple(beats, durationMs)
  }
}
