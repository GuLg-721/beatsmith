<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useBgmStore } from '@/stores/bgmStore'

const bgmStore = useBgmStore()

function handleUserInteraction() {
  if (!bgmStore.isPlaying && bgmStore.currentSong) {
    bgmStore.enableAudio()
  }
  document.removeEventListener('click', handleUserInteraction)
}

onMounted(() => {
  bgmStore.loadPlaylist()
  document.addEventListener('click', handleUserInteraction)
})

onUnmounted(() => {
  document.removeEventListener('click', handleUserInteraction)
})

watch(() => bgmStore.currentSong, (newSong) => {
  if (newSong && !bgmStore.isPlaying) {
    const audioUrl = newSong.filePath.startsWith('/uploads/')
      ? newSong.filePath
      : `/uploads/bgm/${newSong.filePath}`
    const audio = new Audio(audioUrl)
    audio.preload = 'auto'
  }
})

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function handleVolumeChange(event: Event) {
  const target = event.target as HTMLInputElement
  bgmStore.setVolume(parseFloat(target.value))
}
</script>

<template>
  <div class="bgm-player" v-if="bgmStore.currentSong">
    <!-- 歌曲信息 -->
    <div class="song-info">
      <div class="song-icon-wrapper">
        <span class="song-icon">🎵</span>
      </div>
      <div class="song-details">
        <span class="song-title">{{ bgmStore.currentSong.title }}</span>
        <span class="song-artist" v-if="bgmStore.currentSong.artist">
          {{ bgmStore.currentSong.artist }}
        </span>
      </div>
    </div>

    <!-- 播放控制 -->
    <div class="controls">
      <button class="control-btn prev-btn" @click="bgmStore.prev">
        <span>⏮</span>
      </button>

      <button class="control-btn play-btn" @click="bgmStore.togglePlay">
        <span>{{ bgmStore.isPlaying ? '⏸️' : '▶️' }}</span>
      </button>

      <button class="control-btn next-btn" @click="bgmStore.next">
        <span>⏭</span>
      </button>
    </div>

    <!-- 音量控制 -->
    <div class="volume-control">
      <span class="volume-icon">🔊</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        :value="bgmStore.volume"
        @input="handleVolumeChange"
        class="volume-slider"
      />
    </div>

    <!-- 进度条 -->
    <div class="progress-bar">
      <div class="progress" :style="{ width: `${bgmStore.progress * 100}%` }"></div>
    </div>
  </div>
</template>

<style scoped>
.bgm-player {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.8rem 1.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.bgm-player:hover {
  border-color: var(--primary);
  box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.15);
}

.song-info {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex: 1;
  min-width: 0;
}

.song-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.2), rgba(var(--secondary-rgb), 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.song-icon {
  font-size: 1.2rem;
}

.song-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.song-title {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
}

.song-artist {
  color: var(--text-muted);
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg-surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.control-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(var(--primary-rgb), 0.1);
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(var(--primary-rgb), 0.3);
}

.play-btn {
  width: 44px;
  height: 44px;
  font-size: 1.1rem;
  border: 2px solid var(--primary);
  background: rgba(var(--primary-rgb), 0.15);
  color: var(--primary);
}

.play-btn:hover {
  background: rgba(var(--primary-rgb), 0.25);
  box-shadow: 0 0 16px rgba(var(--primary-rgb), 0.4);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
}

.volume-icon {
  font-size: 1rem;
}

.volume-slider {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-surface);
  border-radius: 2px;
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  box-shadow: 0 0 8px rgba(var(--primary-rgb), 0.4);
  transition: all 0.2s;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 12px rgba(var(--primary-rgb), 0.6);
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--bg-surface);
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  transition: width 0.1s;
  box-shadow: 0 0 6px rgba(var(--primary-rgb), 0.5);
}
</style>
