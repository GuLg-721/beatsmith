/**
 * BeatGenerator - 根据检测到的节拍自动生成谱面
 */

import { nanoid } from 'nanoid'
import type { Beat } from './BeatDetector'

export interface Note {
  id: string
  type: 'circle' | 'hold' | 'slide'
  time: number      // 毫秒
  x: number         // 0-1
  y: number         // 0-1
  endTime?: number  // 仅 hold
  controlPoints?: { x: number; y: number }[] // 仅 slide
}

export type GenerateMode = 'simple' | 'advanced' | 'custom'

export interface CustomOptions {
  density: number      // 0.2 - 1.0
  circleRatio: number  // 0-1
  holdRatio: number    // 0-1
  slideRatio: number   // 0-1
}

/**
 * 避免音符重叠的最小距离（归一化坐标）
 */
const MIN_DISTANCE = 0.08

/**
 * 随机生成不与已有音符重叠的位置
 */
function randomPosition(existingNotes: Note[], canvasHeight: number): { x: number; y: number } {
  const aspectRatio = 16 / 9
  let attempts = 0

  while (attempts < 50) {
    const x = 0.1 + Math.random() * 0.8
    const y = 0.1 + Math.random() * 0.8

    const hasOverlap = existingNotes.some(note => {
      const dx = note.x - x
      const dy = note.y - y
      return Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE
    })

    if (!hasOverlap) return { x, y }
    attempts++
  }

  // 50 次尝试后放弃，随机返回
  return { x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8 }
}

/**
 * 简单模式：每个节拍一个 Circle
 */
function generateSimple(beats: Beat[]): Note[] {
  const notes: Note[] = []

  beats.forEach(beat => {
    const pos = randomPosition(notes, 1)
    notes.push({
      id: nanoid(8),
      type: 'circle',
      time: beat.time,
      x: pos.x,
      y: pos.y
    })
  })

  return notes
}

/**
 * 进阶模式：重拍 Circle + 弱拍 Hold
 */
function generateAdvanced(beats: Beat[], bpm: number): Note[] {
  const notes: Note[] = []
  const intervalMs = 60000 / bpm

  beats.forEach((beat, i) => {
    const pos = randomPosition(notes, 1)

    if (i % 4 === 0) {
      // 重拍：Circle
      notes.push({
        id: nanoid(8),
        type: 'circle',
        time: beat.time,
        x: pos.x,
        y: pos.y
      })
    } else if (i % 4 === 2) {
      // 弱拍：Hold（持续半拍）
      notes.push({
        id: nanoid(8),
        type: 'hold',
        time: beat.time,
        x: pos.x,
        y: pos.y,
        endTime: beat.time + intervalMs / 2
      })
    }
  })

  return notes
}

/**
 * 自定义模式：根据用户参数生成
 */
function generateCustom(beats: Beat[], options: CustomOptions): Note[] {
  const notes: Note[] = []
  const total = Math.floor(beats.length * options.density)
  const step = Math.max(1, Math.floor(beats.length / total))

  for (let i = 0; i < beats.length; i += step) {
    const beat = beats[i]
    const pos = randomPosition(notes, 1)

    // 根据比例随机选择类型
    const rand = Math.random()
    let type: 'circle' | 'hold' | 'slide'

    if (rand < options.circleRatio) {
      type = 'circle'
    } else if (rand < options.circleRatio + options.holdRatio) {
      type = 'hold'
    } else {
      type = 'slide'
    }

    const note: Note = {
      id: nanoid(8),
      type,
      time: beat.time,
      x: pos.x,
      y: pos.y
    }

    if (type === 'hold') {
      const nextBeat = beats[Math.min(i + step, beats.length - 1)]
      note.endTime = nextBeat.time
    }

    if (type === 'slide') {
      // 生成 2-3 个控制点
      const cp1 = randomPosition(notes, 1)
      const cp2 = randomPosition(notes, 1)
      note.controlPoints = [cp1, cp2]
    }

    notes.push(note)
  }

  return notes
}

/**
 * 主入口：根据模式生成谱面
 */
export function generateBeatmap(
  beats: Beat[],
  bpm: number,
  mode: GenerateMode,
  customOptions?: CustomOptions
): Note[] {
  if (beats.length === 0) return []

  switch (mode) {
    case 'simple':
      return generateSimple(beats)
    case 'advanced':
      return generateAdvanced(beats, bpm)
    case 'custom':
      return generateCustom(beats, customOptions || {
        density: 0.5,
        circleRatio: 0.6,
        holdRatio: 0.3,
        slideRatio: 0.1
      })
    default:
      return generateSimple(beats)
  }
}
