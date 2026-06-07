<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { NButton, NSpin, NEmpty } from 'naive-ui'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const mapData = ref<any>(null)
const scores = ref<any[]>([])
const loading = ref(true)
const audio = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

const mapId = computed(() => route.params.mapId as string)

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function getRankIcon(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return String(rank)
}

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'SSS': '#ff66aa', 'SS': '#bf00ff', 'S': '#00d4ff',
    'A': '#00ff88', 'B': '#fcee09', 'C': '#ff6600', 'D': '#ff4466'
  }
  return colors[grade] || '#888888'
}

async function fetchData() {
  loading.value = true
  try {
    const res = await api.get(`/api/maps/${mapId.value}/public`)
    mapData.value = res.data.map
    scores.value = res.data.scores
  } catch (err) {
    console.error('Failed to fetch public map:', err)
  } finally {
    loading.value = false
  }
}

function toggleAudio() {
  if (!audio.value) {
    audio.value = new Audio(`/uploads/${mapData.value.audioFile}`)
    audio.value.addEventListener('timeupdate', () => {
      currentTime.value = audio.value?.currentTime || 0
    })
    audio.value.addEventListener('loadedmetadata', () => {
      duration.value = audio.value?.duration || 0
    })
    audio.value.addEventListener('ended', () => {
      isPlaying.value = false
    })
  }

  if (isPlaying.value) {
    audio.value.pause()
    isPlaying.value = false
  } else {
    audio.value.play()
    isPlaying.value = true
  }
}

function startGame() {
  if (!authStore.isLoggedIn) {
    router.push({ name: 'Login', query: { redirect: `/play/${mapId.value}` } })
    return
  }
  router.push(`/play/${mapId.value}`)
}

function getCoverGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 60) + 320
  return `linear-gradient(135deg, oklch(0.45 0.15 ${hue}), oklch(0.35 0.12 ${hue + 40}))`
}

onMounted(fetchData)

onUnmounted(() => {
  if (audio.value) {
    audio.value.pause()
    audio.value = null
  }
})
</script>

<template>
  <div class="share-page">
    <!-- 顶部导航 -->
    <header class="top-bar">
      <router-link to="/" class="logo-link">
        <span class="logo-icon">⚒️</span>
        <span class="logo-text">BeatSmith</span>
      </router-link>
    </header>

    <div v-if="loading" class="loading">
      <NSpin size="large" />
      <p>加载中...</p>
    </div>

    <div v-else-if="mapData" class="share-content">
      <!-- 谱面信息 -->
      <div class="map-header">
        <div class="cover-image" :style="{ background: getCoverGradient(mapData.id) }">
          <img v-if="mapData.coverImage" :src="`/uploads/${mapData.coverImage}`" alt="cover" />
        </div>
        <div class="map-info">
          <h1 class="map-title">{{ mapData.title }}</h1>
          <p class="map-artist" v-if="mapData.artist">{{ mapData.artist }}</p>
          <div class="map-meta">
            <span>⏱️ {{ formatDuration(mapData.duration || 0) }}</span>
            <span v-if="mapData.bpm">🎵 {{ Math.round(mapData.bpm) }} BPM</span>
            <span>📊 {{ mapData.difficulty }}</span>
            <span>🎮 {{ mapData.playCount }} 次游玩</span>
          </div>
          <p class="creator">创建者: {{ mapData.creatorName }}</p>
        </div>
      </div>

      <!-- 音频预览 -->
      <div class="audio-preview">
        <h3>🔊 音频预览</h3>
        <div class="audio-controls">
          <button class="play-btn" @click="toggleAudio">
            {{ isPlaying ? '⏸️ 暂停' : '▶️ 播放' }}
          </button>
          <div class="progress-bar">
            <div class="progress" :style="{ width: `${(currentTime / duration) * 100}%` }"></div>
          </div>
          <span class="time">{{ formatDuration(currentTime) }} / {{ formatDuration(duration) }}</span>
        </div>
      </div>

      <!-- 排行榜 -->
      <div class="leaderboard">
        <h3>🏆 排行榜</h3>
        <div v-if="scores.length > 0" class="score-list">
          <div v-for="score in scores" :key="score.userId" class="score-item">
            <span class="rank">{{ getRankIcon(score.rank) }}</span>
            <span class="username">{{ score.username }}</span>
            <span class="grade" :style="{ color: getGradeColor(score.grade) }">{{ score.grade }}</span>
            <span class="score">{{ score.score.toLocaleString() }}</span>
          </div>
        </div>
        <NEmpty v-else description="暂无排行榜数据" />
      </div>

      <!-- 开始游戏 -->
      <div class="action-section">
        <NButton type="primary" size="large" class="start-btn" @click="startGame">
          {{ authStore.isLoggedIn ? '🎮 开始游戏' : '🔐 登录后开始游戏' }}
        </NButton>
      </div>
    </div>

    <div v-else class="empty-state">
      <NEmpty description="谱面不存在或已被删除" />
    </div>
  </div>
</template>

<style scoped>
.share-page {
  min-height: 100vh;
  background: var(--bg-deep);
}

.top-bar {
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border);
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  text-decoration: none;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: var(--text-muted);
}

.share-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.map-header {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
}

.cover-image {
  width: 200px;
  height: 200px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
}

.cover-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.map-info {
  flex: 1;
}

.map-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.map-artist {
  font-size: 1.1rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.map-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.map-meta span {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.creator {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.audio-preview {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.audio-preview h3 {
  color: var(--text);
  margin-bottom: 1rem;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.play-btn {
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--primary);
  border-radius: 8px;
  background: rgba(var(--primary-rgb), 0.1);
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.play-btn:hover {
  background: rgba(var(--primary-rgb), 0.2);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-surface);
  border-radius: 3px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: var(--primary);
  transition: width 0.1s;
}

.time {
  font-size: 0.8rem;
  color: var(--text-muted);
  min-width: 80px;
}

.leaderboard {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.leaderboard h3 {
  color: var(--text);
  margin-bottom: 1rem;
}

.score-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.score-item {
  display: flex;
  align-items: center;
  padding: 0.8rem;
  background: var(--bg-surface);
  border-radius: 8px;
}

.rank {
  width: 40px;
  font-weight: 600;
}

.username {
  flex: 1;
  color: var(--text);
}

.grade {
  font-weight: 600;
  margin-right: 1rem;
}

.score {
  font-weight: 600;
  color: var(--primary);
}

.action-section {
  text-align: center;
  padding: 2rem 0;
}

.start-btn {
  min-width: 200px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}
</style>
