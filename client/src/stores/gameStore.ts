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
  const processedNotes = ref<Set<string>>(new Set())
  const score = ref(0)
  const combo = ref(0)
  const maxCombo = ref(0)
  const perfect = ref(0)
  const great = ref(0)
  const good = ref(0)
  const miss = ref(0)
  const feedbacks = ref<HitFeedback[]>([])

  const totalNotes = computed(() => notes.value.length)
  const accuracy = computed(() => calculateAccuracy(perfect.value, great.value, good.value, miss.value))
  const grade = computed(() => calculateGrade(accuracy.value))

  function initGame(mapId: string, mapNotes: Note[]) {
    currentMapId.value = mapId
    notes.value = [...mapNotes].sort((a, b) => a.time - b.time)
    score.value = 0; combo.value = 0; maxCombo.value = 0
    perfect.value = 0; great.value = 0; good.value = 0; miss.value = 0
    feedbacks.value = []; processedNotes.value = new Set()
    state.value = 'ready'
  }

  function startGame() { state.value = 'playing' }
  function pauseGame() { if (state.value === 'playing') state.value = 'paused' }
  function resumeGame() { if (state.value === 'paused') state.value = 'playing' }
  function endGame() { state.value = 'result' }

  function handleHit(noteId: string, hitTime: number, noteTime: number, x: number, y: number) {
    const result = judgeHit(hitTime, noteTime)
    processedNotes.value.add(noteId)
    score.value += result.points
    if (result.type === 'miss') { combo.value = 0; miss.value++ }
    else {
      combo.value++
      maxCombo.value = Math.max(maxCombo.value, combo.value)
      if (result.type === 'perfect') perfect.value++
      else if (result.type === 'great') great.value++
      else if (result.type === 'good') good.value++
    }
    feedbacks.value.push({ id: Date.now(), type: result.type, x, y, time: Date.now() })
    feedbacks.value = feedbacks.value.filter(f => Date.now() - f.time < 1000)
    return result
  }

  function handleMiss(noteId: string) {
    if (processedNotes.value.has(noteId)) return
    processedNotes.value.add(noteId); combo.value = 0; miss.value++
  }

  function getResult() {
    return { score: score.value, maxCombo: maxCombo.value, accuracy: accuracy.value, grade: grade.value,
      perfect: perfect.value, great: great.value, good: good.value, miss: miss.value, totalNotes: totalNotes.value }
  }

  function reset() {
    state.value = 'loading'; notes.value = []; currentMapId.value = null
    score.value = 0; combo.value = 0; maxCombo.value = 0
    perfect.value = 0; great.value = 0; good.value = 0; miss.value = 0
    feedbacks.value = []; processedNotes.value = new Set()
  }

  return {
    state, notes, currentMapId, processedNotes, score, combo, maxCombo,
    perfect, great, good, miss, feedbacks, totalNotes, accuracy, grade,
    initGame, startGame, pauseGame, resumeGame, endGame, handleHit, handleMiss, getResult, reset
  }
})
