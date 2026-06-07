<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useBgmStore } from '@/stores/bgmStore'

const bgmStore = useBgmStore()

// 用户交互后启用音频播放
function handleUserInteraction() {
  bgmStore.enableAudio()
  document.removeEventListener('click', handleUserInteraction)
}

onMounted(() => {
  bgmStore.loadPlaylist()
  document.addEventListener('click', handleUserInteraction)
})

onUnmounted(() => {
  document.removeEventListener('click', handleUserInteraction)
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
    <div class="song-info">
      <span class="song-icon">🎵</span>
      <div class="song-details">
        <span class="song-title">{{ bgmStore.currentSong.title }}</span>
        <span class="song-artist" v-if="bgmStore.currentSong.artist">
          - {{ bgmStore.currentSong.artist }}
        </span>
      </div>
    </div>

    <div class="controls">
      <button class="control-btn" @click="bgmStore.prev">⏮</button>
      <button class="control-btn play-btn" @click="bgmStore.togglePlay">
        {{ bgmStore.isPlaying ? '⏸️' : '▶️' }}
      </button>
      <button class="control-btn" @click="bgmStore.next">⏭</button>
    </div>

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
  transition: border-color 0.3s, box-shadow 0.3s;
}

.bgm-player:hover {
  border-color: var(--primary);
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.2);
}

.song-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.song-icon {
  font-size: 1.2rem;
}

.song-details {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  overflow: hidden;
}

.song-title {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  color: var(--text-muted);
  font-size: 0.85rem;
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
  border: none;
  border-radius: 50%;
  background: var(--bg-surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.control-btn:hover {
  background: var(--primary);
  color: #000;
  transform: scale(1.1);
}

.play-btn {
  width: 42px;
  height: 42px;
  font-size: 1.1rem;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
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
  background: var(--primary);
  transition: width 0.1s;
}
</style>
