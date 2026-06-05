import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { Note } from '@/engine/BeatGenerator'
import { generateBeatmap, type GenerateMode, type CustomOptions } from '@/engine/BeatGenerator'

// Undo/Redo 命令
interface EditorCommand {
  type: 'add' | 'remove' | 'move'
  noteId: string
  note?: Note
  before?: { time: number; x: number; y: number; endTime?: number }
  after?: { time: number; x: number; y: number; endTime?: number }
}

export const useEditorStore = defineStore('editor', () => {
  // 当前编辑的谱面 ID
  const mapId = ref<string | null>(null)

  // 音符数组
  const notes = ref<Note[]>([])

  // 选中的音符 ID
  const selectedNoteId = ref<string | null>(null)

  // 当前选中的工具/音符类型
  const activeTool = ref<'circle' | 'hold' | 'tap' | 'select'>('circle')

  // 吸附精度（毫秒）
  const snapDivisor = ref(4) // 1/4, 1/8, 1/16

  // 缩放级别（像素/毫秒）
  const zoomLevel = ref(0.1)

  // 视口偏移（毫秒）
  const viewportOffset = ref(0)

  // Undo/Redo 栈
  const undoStack = ref<EditorCommand[]>([])
  const redoStack = ref<EditorCommand[]>([])

  // 是否有未保存的更改
  const isDirty = ref(false)

  // --- 操作 ---

  /**
   * 生成谱面
   */
  function generateNotes(
    beats: any[],
    bpm: number,
    mode: GenerateMode,
    durationMs: number,
    customOptions?: CustomOptions
  ) {
    notes.value = generateBeatmap(beats, bpm, mode, durationMs, customOptions)
    undoStack.value = []
    redoStack.value = []
    isDirty.value = true
  }

  /**
   * 添加音符
   */
  function addNote(note: Note) {
    notes.value.push(note)
    undoStack.value.push({ type: 'add', noteId: note.id, note })
    redoStack.value = []
    isDirty.value = true
  }

  /**
   * 删除音符
   */
  function removeNote(noteId: string) {
    const index = notes.value.findIndex(n => n.id === noteId)
    if (index === -1) return

    const note = notes.value[index]
    notes.value.splice(index, 1)
    undoStack.value.push({ type: 'remove', noteId, note })
    redoStack.value = []

    if (selectedNoteId.value === noteId) {
      selectedNoteId.value = null
    }
    isDirty.value = true
  }

  /**
   * 移动音符
   */
  function moveNote(noteId: string, newTime: number, newX: number, newY: number) {
    const note = notes.value.find(n => n.id === noteId)
    if (!note) return

    const before = { time: note.time, x: note.x, y: note.y, endTime: note.endTime }
    note.time = newTime
    note.x = newX
    note.y = newY

    undoStack.value.push({ type: 'move', noteId, before, after: { time: newTime, x: newX, y: newY } })
    redoStack.value = []
    isDirty.value = true
  }

  /**
   * 选中音符
   */
  function selectNote(noteId: string | null) {
    selectedNoteId.value = noteId
  }

  /**
   * 撤销
   */
  function undo() {
    const cmd = undoStack.value.pop()
    if (!cmd) return

    switch (cmd.type) {
      case 'add': {
        const index = notes.value.findIndex(n => n.id === cmd.noteId)
        if (index !== -1) notes.value.splice(index, 1)
        break
      }
      case 'remove': {
        if (cmd.note) notes.value.push(cmd.note)
        break
      }
      case 'move': {
        const note = notes.value.find(n => n.id === cmd.noteId)
        if (note && cmd.before) {
          note.time = cmd.before.time
          note.x = cmd.before.x
          note.y = cmd.before.y
          note.endTime = cmd.before.endTime
        }
        break
      }
    }

    redoStack.value.push(cmd)
  }

  /**
   * 重做
   */
  function redo() {
    const cmd = redoStack.value.pop()
    if (!cmd) return

    switch (cmd.type) {
      case 'add': {
        if (cmd.note) notes.value.push(cmd.note)
        break
      }
      case 'remove': {
        const index = notes.value.findIndex(n => n.id === cmd.noteId)
        if (index !== -1) notes.value.splice(index, 1)
        break
      }
      case 'move': {
        const note = notes.value.find(n => n.id === cmd.noteId)
        if (note && cmd.after) {
          note.time = cmd.after.time
          note.x = cmd.after.x
          note.y = cmd.after.y
          note.endTime = cmd.after.endTime
        }
        break
      }
    }

    undoStack.value.push(cmd)
  }

  /**
   * 清空
   */
  function clear() {
    notes.value = []
    selectedNoteId.value = null
    undoStack.value = []
    redoStack.value = []
    isDirty.value = false
  }

  /**
   * 导出为 JSON
   */
  function exportJSON(): string {
    return JSON.stringify({
      version: 1,
      notes: notes.value
    }, null, 2)
  }

  /**
   * 导入 JSON
   */
  function importJSON(json: string) {
    try {
      const data = JSON.parse(json)
      if (data.notes && Array.isArray(data.notes)) {
        notes.value = data.notes
        undoStack.value = []
        redoStack.value = []
        isDirty.value = false
      }
    } catch (e) {
      console.error('Failed to import JSON:', e)
    }
  }

  const selectedNote = computed(() => {
    if (!selectedNoteId.value) return null
    return notes.value.find(n => n.id === selectedNoteId.value) || null
  })

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  return {
    mapId,
    notes,
    selectedNoteId,
    selectedNote,
    activeTool,
    snapDivisor,
    zoomLevel,
    viewportOffset,
    isDirty,
    canUndo,
    canRedo,
    generateNotes,
    addNote,
    removeNote,
    moveNote,
    selectNote,
    undo,
    redo,
    clear,
    exportJSON,
    importJSON
  }
})
