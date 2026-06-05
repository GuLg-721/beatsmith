/**
 * HitDetector - 判定引擎
 * 检测玩家的点击是否命中音符，以及判定等级
 */

export type JudgmentType = 'perfect' | 'great' | 'good' | 'miss'

export interface JudgmentResult {
  type: JudgmentType
  timeDiff: number // 时间差（毫秒）
  points: number
}

// 判定窗口（毫秒）
const WINDOWS = {
  perfect: 20,
  great: 50,
  good: 100,
}

// 分数
const POINTS: Record<JudgmentType, number> = {
  perfect: 300,
  great: 100,
  good: 50,
  miss: 0,
}

/**
 * 判定点击时机
 * @param hitTime 玩家点击的时间（毫秒）
 * @param noteTime 音符的目标时间（毫秒）
 * @returns 判定结果
 */
export function judgeHit(hitTime: number, noteTime: number): JudgmentResult {
  const diff = Math.abs(hitTime - noteTime)

  if (diff <= WINDOWS.perfect) {
    return { type: 'perfect', timeDiff: diff, points: POINTS.perfect }
  }
  if (diff <= WINDOWS.great) {
    return { type: 'great', timeDiff: diff, points: POINTS.great }
  }
  if (diff <= WINDOWS.good) {
    return { type: 'good', timeDiff: diff, points: POINTS.good }
  }

  return { type: 'miss', timeDiff: diff, points: 0 }
}

/**
 * 判定 Hold 音符的完成度
 * @param holdStart 玩家开始按住的时间
 * @param holdEnd 玩家松开的时间
 * @param noteStart 音符开始时间
 * @param noteEnd 音符结束时间
 * @returns 判定结果
 */
export function judgeHold(
  holdStart: number,
  holdEnd: number,
  noteStart: number,
  noteEnd: number
): JudgmentResult {
  const startDiff = Math.abs(holdStart - noteStart)
  const holdDuration = holdEnd - holdStart
  const noteDuration = noteEnd - noteStart
  const coverage = holdDuration / noteDuration

  if (startDiff <= WINDOWS.good && coverage >= 0.9) {
    return { type: 'perfect', timeDiff: startDiff, points: POINTS.perfect }
  }
  if (startDiff <= WINDOWS.good && coverage >= 0.7) {
    return { type: 'great', timeDiff: startDiff, points: POINTS.great }
  }
  if (startDiff <= WINDOWS.good && coverage >= 0.5) {
    return { type: 'good', timeDiff: startDiff, points: POINTS.good }
  }

  return { type: 'miss', timeDiff: startDiff, points: 0 }
}

/**
 * 计算准确率
 */
export function calculateAccuracy(
  perfect: number,
  great: number,
  good: number,
  miss: number
): number {
  const total = perfect + great + good + miss
  if (total === 0) return 0
  return (perfect * 300 + great * 100 + good * 50) / (total * 300) * 100
}

/**
 * 根据准确率计算评级
 */
export function calculateGrade(accuracy: number): string {
  if (accuracy >= 100) return 'SSS'
  if (accuracy >= 99) return 'SS'
  if (accuracy >= 95) return 'S'
  if (accuracy >= 90) return 'A'
  return 'B'
}
