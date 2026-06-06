import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Note } from '@/engine/BeatGenerator'
import { judgeHit, calculateAccuracy, calculateGrade, type JudgmentType } from '@/engine/HitDetector'

export type GameState = 'loading' | 'ready' | 'playing' | 'paused' | 'result'

export interface HitFeedback {
  id: number
  type: JudgmentType
  x: number
  y: number
  time: number
}

export const useGameStore = defineStore('game', () => {
  const state = ref<GameState>('loading')
  const notes = ref<Note[]>([])
  const currentMapId = ref<string | null>(null)

  // Spinner 状态
  const activeSpinner = ref<Note | null>(null)
  const spinnerClicks = ref(0)
  const spinnerStartTime = ref(0)

  // 游戏分数
  const score = ref(0)
  const combo = ref(0)
  const maxCombo = ref(0)
  const perfect = ref(0)
  const great = ref(0)
  const good = ref(0)
  const miss = ref(0)

  // 判定反馈
  const feedbacks = ref<HitFeedback[]>([])
  let feedbackId = 0

  // 已处理的音符（避免重复判定）
  const processedNotes = ref<Set<string>>(new Set())

  // Hold 状态

  const totalNotes = computed(() => notes.value.length)
  const accuracy = computed(() => calculateAccuracy(perfect.value, great.value, good.value, miss.value))
  const grade = computed(() => calculateGrade(accuracy.value))

  /**
   * 初始化游戏
   */
  function initGame(mapId: string, mapNotes: Note[]) {
    currentMapId.value = mapId
    notes.value = [...mapNotes].sort((a, b) => a.time - b.time)
    score.value = 0
    combo.value = 0
    maxCombo.value = 0
    perfect.value = 0
    great.value = 0
    good.value = 0
    miss.value = 0
    feedbacks.value = []
    processedNotes.value = new Set()
    activeSpinner.value = null
    spinnerClicks.value = 0
    spinnerStartTime.value = 0
    state.value = 'ready'
  }

  /**
   * 开始游戏
   */
  function startGame() {
    state.value = 'playing'
  }

  /**
   * 暂停
   */
  function pauseGame() {
    if (state.value === 'playing') {
      state.value = 'paused'
    }
  }

  /**
   * 恢复
   */
  function resumeGame() {
    if (state.value === 'paused') {
      state.value = 'playing'
    }
  }

  /**
   * 结束游戏
   */
  function endGame() {
    state.value = 'result'
  }

  /**
   * 处理点击
   */
  function handleHit(noteId: string, hitTime: number, noteTime: number, x: number, y: number) {
    if (processedNotes.value.has(noteId)) return null

    const result = judgeHit(hitTime, noteTime)
    processedNotes.value.add(noteId)

    // 更新分数
    score.value += result.points
    if (result.type === 'miss') {
      combo.value = 0
      miss.value++
    } else {
      combo.value++
      maxCombo.value = Math.max(maxCombo.value, combo.value)
      if (result.type === 'perfect') perfect.value++
      else if (result.type === 'great') great.value++
      else if (result.type === 'good') good.value++
    }

    // 添加反馈
    feedbacks.value.push({
      id: ++feedbackId,
      type: result.type,
      x,
      y,
      time: Date.now()
    })

    // 清理旧反馈
    feedbacks.value = feedbacks.value.filter(f => Date.now() - f.time < 1000)

    return result
  }

  /**
   * 处理 Miss（超时未击中）
   */
  function handleMiss(noteId: string) {
    if (processedNotes.value.has(noteId)) return
    processedNotes.value.add(noteId)
    combo.value = 0
    miss.value++
  }

  /**
   * 开始 Hold
   */
  function startHold(noteId: string, time: number) {
  }

  /**
   * 结束 Hold
   */
  function endHold(noteId: string, endTime: number, noteStart: number, noteEnd: number) {

    processedNotes.value.add(noteId)

    score.value += result.points
    if (result.type === 'miss') {
      combo.value = 0
      miss.value++
    } else {
      combo.value++
      maxCombo.value = Math.max(maxCombo.value, combo.value)
      if (result.type === 'perfect') perfect.value++
      else if (result.type === 'great') great.value++
      else if (result.type === 'good') good.value++
    }

    feedbacks.value.push({
      id: ++feedbackId,
      type: result.type,
      x: 0.5,
      y: 0.5,
      time: Date.now()
    })

    return result
  }

  /**
   * 获取结果数据
   */
  function getResult() {
    return {
      score: score.value,
      maxCombo: maxCombo.value,
      accuracy: accuracy.value,
      grade: grade.value,
      perfect: perfect.value,
      great: great.value,
      good: good.value,
      miss: miss.value,
      totalNotes: totalNotes.value
    }
  }

  /**
   * 重置
   */
  function reset() {
    state.value = 'loading'
    notes.value = []
    currentMapId.value = null
    score.value = 0
    combo.value = 0
    maxCombo.value = 0
    perfect.value = 0
    great.value = 0
    good.value = 0
    miss.value = 0
    feedbacks.value = []
    processedNotes.value = new Set()
    activeSpinner.value = null
    spinnerClicks.value = 0
  }

  // Spinner 函数
  function startSpinner(note: Note, time: number) {
    activeSpinner.value = note
    spinnerClicks.value = 0
    spinnerStartTime.value = time
    processedNotes.value.add(note.id)
  }

  function clickSpinner() {
    if (!activeSpinner.value) return
    spinnerClicks.value++
    const requiredClicks = getRequiredClicks(activeSpinner.value)
    const progress = Math.min(1, spinnerClicks.value / requiredClicks)

    // 每次点击加分
    score.value += 30
    combo.value++
    maxCombo.value = Math.max(maxCombo.value, combo.value)

    // 检查是否完成
    if (spinnerClicks.value >= requiredClicks) {
      perfect.value++
      return 'perfect'
    }
    return null
  }

  function endSpinner(time: number) {
    if (!activeSpinner.value) return null

    const requiredClicks = getRequiredClicks(activeSpinner.value)
    const elapsed = time - spinnerStartTime.value
    const duration = (activeSpinner.value.endTime || activeSpinner.value.time + 3000) - activeSpinner.value.time
    const timeRatio = elapsed / duration

    let type: JudgmentType
    if (spinnerClicks.value >= requiredClicks) {
      type = 'perfect'
      perfect.value++
      score.value += 300
    } else if (spinnerClicks.value >= requiredClicks * 0.7) {
      type = 'great'
      great.value++
      score.value += 150
    } else if (spinnerClicks.value >= requiredClicks * 0.4) {
      type = 'good'
      good.value++
      score.value += 50
    } else {
      type = 'miss'
      miss.value++
      combo.value = 0
    }

    const result = { type, clicks: spinnerClicks.value, required: requiredClicks }
    activeSpinner.value = null
    spinnerClicks.value = 0
    return result
  }

  function getRequiredClicks(note: Note): number {
    const duration = (note.endTime || note.time + 3000) - note.time
    const seconds = duration / 1000
    return Math.floor(5 + seconds * 4) // 每秒约 4-5 次
  }

  return {
    state,
    notes,
    currentMapId,
    processedNotes,
    score,
    combo,
    maxCombo,
    perfect,
    great,
    good,
    miss,
    feedbacks,
    totalNotes,
    accuracy,
    grade,
    initGame,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    handleHit,
    handleMiss,
    startHold,
    endHold,
    activeSpinner,
    spinnerClicks,
    spinnerStartTime,
    startSpinner,
    clickSpinner,
    endSpinner,
    getResult,
    reset
  }
})
