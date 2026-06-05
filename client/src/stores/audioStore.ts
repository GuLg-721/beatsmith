import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AudioEngine } from '@/engine/AudioEngine'
import { detectBeats, estimateBPM, type Beat } from '@/engine/BeatDetector'

export const useAudioStore = defineStore('audio', () => {
  const engine = new AudioEngine()

  const isLoaded = ref(false)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const fileName = ref('')

  // 节拍检测结果
  const detectedBeats = ref<Beat[]>([])
  const estimatedBPM = ref(0)
  const beatTimeline = ref<number[]>([])

  // 频谱数据
  const frequencyData = ref<Uint8Array>(new Uint8Array(0))

  let animFrameId: number | null = null

  /**
   * 加载音频文件
   */
  async function loadAudio(file: File) {
    await engine.loadFromFile(file)
    isLoaded.value = true
    duration.value = engine.getDuration()
    fileName.value = file.name
    currentTime.value = 0

    // 节拍检测
    const pcmData = engine.getPCMData()
    if (pcmData && engine.audioContext) {
      const sampleRate = engine.audioContext.sampleRate
      detectedBeats.value = detectBeats(pcmData, sampleRate)
      estimatedBPM.value = estimateBPM(detectedBeats.value)
      beatTimeline.value = detectedBeats.value.map(b => b.time)
    }
  }

  /**
   * 加载音频 URL
   */
  async function loadAudioUrl(url: string) {
    await engine.load(url)
    isLoaded.value = true
    duration.value = engine.getDuration()
    fileName.value = url.split('/').pop() || ''
    currentTime.value = 0

    const pcmData = engine.getPCMData()
    if (pcmData && engine.audioContext) {
      const sampleRate = engine.audioContext.sampleRate
      detectedBeats.value = detectBeats(pcmData, sampleRate)
      estimatedBPM.value = estimateBPM(detectedBeats.value)
      beatTimeline.value = detectedBeats.value.map(b => b.time)
    }
  }

  /**
   * 播放
   */
  function play() {
    engine.play(() => {
      isPlaying.value = false
      stopUpdateLoop()
    })
    isPlaying.value = true
    startUpdateLoop()
  }

  /**
   * 暂停
   */
  function pause() {
    engine.pause()
    isPlaying.value = false
    stopUpdateLoop()
  }

  /**
   * 停止
   */
  function stop() {
    engine.stop()
    isPlaying.value = false
    currentTime.value = 0
    stopUpdateLoop()
  }

  /**
   * 跳转
   */
  function seek(timeMs: number) {
    engine.seek(timeMs)
    currentTime.value = engine.getCurrentTime()
  }

  /**
   * 更新循环（同步时间和频谱数据）
   */
  function startUpdateLoop() {
    if (animFrameId) return

    function update() {
      currentTime.value = engine.getCurrentTime()
      frequencyData.value = engine.getFrequencyData()
      animFrameId = requestAnimationFrame(update)
    }
    animFrameId = requestAnimationFrame(update)
  }

  function stopUpdateLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId)
      animFrameId = null
    }
  }

  /**
   * 设置音量
   */
  function setVolume(value: number) {
    engine.setVolume(value)
  }

  /**
   * 重置
   */
  function reset() {
    stop()
    isLoaded.value = false
    duration.value = 0
    fileName.value = ''
    detectedBeats.value = []
    estimatedBPM.value = 0
    beatTimeline.value = []
    frequencyData.value = new Uint8Array(0)
  }

  const progress = computed(() => {
    if (duration.value === 0) return 0
    return currentTime.value / duration.value
  })

  return {
    isLoaded,
    isPlaying,
    currentTime,
    duration,
    fileName,
    detectedBeats,
    estimatedBPM,
    beatTimeline,
    frequencyData,
    progress,
    loadAudio,
    loadAudioUrl,
    play,
    pause,
    stop,
    seek,
    setVolume,
    reset
  }
})
