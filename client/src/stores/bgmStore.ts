import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useBgmStore = defineStore('bgm', () => {
  const playlist = ref<any[]>([])
  const currentIndex = ref(0)
  const isPlaying = ref(false)
  const volume = ref(0.15)
  const audio = ref<HTMLAudioElement | null>(null)
  const currentTime = ref(0)
  const duration = ref(0)

  const currentSong = computed(() => playlist.value[currentIndex.value] || null)

  async function loadPlaylist() {
    try {
      const res = await api.get('/api/bgm/playlist')
      playlist.value = res.data.songs
    } catch (err) {
      console.error('Failed to load playlist:', err)
    }
  }

  // 获取音频文件完整路径
  function getAudioUrl(filePath: string): string {
    // 如果路径已经包含 /uploads/，直接返回
    if (filePath.startsWith('/uploads/')) {
      return filePath
    }
    // 否则拼接完整路径
    return `/uploads/bgm/${filePath}`
  }

  // 预加载下一首歌曲
  function preloadNext() {
    if (playlist.value.length === 0) return
    const nextIndex = (currentIndex.value + 1) % playlist.value.length
    const nextSong = playlist.value[nextIndex]
    if (nextSong) {
      const audioUrl = nextSong.filePath.startsWith('/uploads/')
        ? nextSong.filePath
        : `/uploads/bgm/${nextSong.filePath}`
      const audio = new Audio(audioUrl)
      audio.preload = 'auto'
    }
  }

  // 用户交互后启用音频播放
  function enableAudio() {
    // 创建音频元素（如果还没有）
    if (!audio.value && currentSong.value) {
      const audioUrl = getAudioUrl(currentSong.value.filePath)
      console.log('Loading audio:', audioUrl)
      audio.value = new Audio(audioUrl)
      audio.value.addEventListener('timeupdate', () => {
        currentTime.value = audio.value?.currentTime || 0
      })
      audio.value.addEventListener('loadedmetadata', () => {
        duration.value = audio.value?.duration || 0
      })
      audio.value.addEventListener('ended', () => {
        next()
      })
      audio.value.addEventListener('error', (e) => {
        console.error('Audio error:', e)
        isPlaying.value = false
      })
    }

    // 尝试播放
    if (audio.value) {
      audio.value.volume = volume.value
      audio.value.play().then(() => {
        isPlaying.value = true
      }).catch(err => {
        console.error('Enable audio failed:', err)
      })
    }
  }

  function play() {
    if (!currentSong.value) return

    if (!audio.value) {
      const audioUrl = getAudioUrl(currentSong.value.filePath)
      console.log('Loading audio:', audioUrl)
      audio.value = new Audio(audioUrl)
      audio.value.addEventListener('timeupdate', () => {
        currentTime.value = audio.value?.currentTime || 0
      })
      audio.value.addEventListener('loadedmetadata', () => {
        duration.value = audio.value?.duration || 0
      })
      audio.value.addEventListener('ended', () => {
        next()
      })
      audio.value.addEventListener('error', (e) => {
        console.error('Audio error:', e)
        isPlaying.value = false
      })
    }

    audio.value.volume = volume.value
    audio.value.play().then(() => {
      isPlaying.value = true
      preloadNext()
    }).catch(err => {
      console.error('Play failed:', err)
      // 浏览器自动播放策略可能阻止播放
      isPlaying.value = false
    })
  }

  function pause() {
    audio.value?.pause()
    isPlaying.value = false
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  function next() {
    if (playlist.value.length === 0) return
    currentIndex.value = (currentIndex.value + 1) % playlist.value.length
    stop()
    play()
  }

  function prev() {
    if (playlist.value.length === 0) return
    currentIndex.value = (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
    stop()
    play()
  }

  function stop() {
    audio.value?.pause()
    audio.value = null
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
  }

  function setVolume(value: number) {
    volume.value = value
    if (audio.value) {
      audio.value.volume = value
    }
  }

  const progress = computed(() => {
    if (duration.value === 0) return 0
    return currentTime.value / duration.value
  })

  return {
    playlist,
    currentIndex,
    isPlaying,
    volume,
    currentTime,
    duration,
    currentSong,
    progress,
    loadPlaylist,
    preloadNext,
    play,
    pause,
    togglePlay,
    next,
    prev,
    stop,
    setVolume,
    enableAudio
  }
})
