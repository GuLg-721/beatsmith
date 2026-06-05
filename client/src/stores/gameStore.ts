import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Note } from '@/engine/BeatGenerator'
import { judgeHit, judgeHold, calculateAccuracy, calculateGrade, type JudgmentType } from '@/engine/HitDetector'

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
  const activeHold = ref<{ noteId: string; startTime: number } | null>(null)

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
    activeHold.value = null
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
    activeHold.value = { noteId, startTime: time }
  }

  /**
   * 结束 Hold
   */
  function endHold(noteId: string, endTime: number, noteStart: number, noteEnd: number) {
    if (!activeHold.value || activeHold.value.noteId !== noteId) return null

    const result = judgeHold(activeHold.value.startTime, endTime, noteStart, noteEnd)
    activeHold.value = null
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
    activeHold.value = null
  }

  return {
    state,
    notes,
    currentMapId,
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
    getResult,
    reset
  }
})
