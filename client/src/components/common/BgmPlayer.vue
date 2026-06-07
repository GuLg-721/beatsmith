<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { NButton, NSlider } from 'naive-ui'
import { useBgmStore } from '@/stores/bgmStore'

const bgmStore = useBgmStore()

// 用户交互后启用音频播放
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

// 歌曲加载完成后自动准备播放
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

function handleVolumeChange(value: number) {
  bgmStore.setVolume(value)
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
      <NButton
        size="small"
        circle
        secondary
        @click="bgmStore.prev"
        class="control-btn"
      >
        <template #icon>
          <span>⏮</span>
        </template>
      </NButton>

      <NButton
        size="medium"
        circle
        type="primary"
        @click="bgmStore.togglePlay"
        class="play-btn"
      >
        <template #icon>
          <span>{{ bgmStore.isPlaying ? '⏸️' : '▶️' }}</span>
        </template>
      </NButton>

      <NButton
        size="small"
        circle
        secondary
        @click="bgmStore.next"
        class="control-btn"
      >
        <template #icon>
          <span>⏭</span>
        </template>
      </NButton>
    </div>

    <!-- 音量控制 -->
    <div class="volume-control">
      <span class="volume-icon">🔊</span>
      <NSlider
        :value="bgmStore.volume"
        :max="1"
        :step="0.1"
        :tooltip="false"
        class="volume-slider"
        @update:value="handleVolumeChange"
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
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.2), rgba(var(--secondary-rgb, 0, 0, 255), 0.2));
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

:deep(.control-btn) {
  --n-border: 1px solid var(--border);
  --n-border-hover: 1px solid var(--primary);
  --n-border-pressed: 1px solid var(--primary);
  --n-color: var(--bg-surface);
  --n-color-hover: rgba(var(--primary-rgb), 0.1);
  --n-color-pressed: rgba(var(--primary-rgb), 0.2);
  --n-text-color: var(--text);
  --n-text-color-hover: var(--primary);
}

:deep(.play-btn) {
  --n-border: 2px solid var(--primary);
  --n-border-hover: 2px solid var(--primary);
  --n-border-pressed: 2px solid var(--primary);
  --n-color: rgba(var(--primary-rgb), 0.15);
  --n-color-hover: rgba(var(--primary-rgb), 0.25);
  --n-color-pressed: rgba(var(--primary-rgb), 0.35);
  --n-text-color: var(--primary);
  --n-box-shadow-focus: 0 0 0 2px rgba(var(--primary-rgb), 0.3);
  width: 44px;
  height: 44px;
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

:deep(.volume-slider) {
  --n-rail-color: var(--bg-surface);
  --n-rail-color-hover: var(--bg-surface);
  --n-handle-color: var(--primary);
  --n-handle-size: 14px;
  --n-rail-height: 4px;
  --n-handle-box-shadow: 0 0 8px rgba(var(--primary-rgb), 0.4);
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
  background: linear-gradient(90deg, var(--primary), var(--secondary, var(--primary)));
  transition: width 0.1s;
  box-shadow: 0 0 6px rgba(var(--primary-rgb), 0.5);
}
</style>
