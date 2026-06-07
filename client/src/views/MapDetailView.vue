<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { NButton, NSpin, NEmpty } from 'naive-ui'
import { getGradeColor } from '@/utils/grade'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const mapData = ref<any>(null)
const scores = ref<any[]>([])
const loading = ref(true)

const mapId = computed(() => route.params.mapId as string)
const isOwner = computed(() => authStore.user?.id === mapData.value?.creatorId)

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--'
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

async function fetchData() {
  loading.value = true
  try {
    const [mapRes, scoresRes] = await Promise.all([
      api.get(`/api/maps/${mapId.value}`),
      api.get(`/api/maps/${mapId.value}/scores`, { params: { limit: 10 } })
    ])
    mapData.value = mapRes.data.map
    scores.value = scoresRes.data.scores
  } catch (err) {
    console.error('Failed to fetch map detail:', err)
  } finally {
    loading.value = false
  }
}

function startGame() {
  if (!authStore.isLoggedIn) {
    router.push({ name: 'Login', query: { redirect: `/play/${mapId.value}` } })
    return
  }
  router.push(`/play/${mapId.value}`)
}

function editMap() {
  router.push({ name: 'Editor', query: { mapId: mapId.value } })
}

function shareMap() {
  const shareUrl = `${window.location.origin}/share/${mapId.value}`
  navigator.clipboard.writeText(shareUrl).then(() => {
    alert('链接已复制！')
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = shareUrl
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    alert('链接已复制！')
  })
}

// 默认封面渐变
function getCoverGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 60) + 320
  return `linear-gradient(135deg, oklch(0.45 0.15 ${hue}), oklch(0.35 0.12 ${hue + 40}))`
}

onMounted(fetchData)
</script>

<template>
  <div class="detail-page">
    <div class="detail-container" v-if="!loading && mapData">
      <!-- 返回链接 -->
      <router-link to="/songs" class="back-link">← 返回歌曲库</router-link>

      <!-- 歌曲信息区 -->
      <div class="map-info">
        <div class="cover-section">
          <img
            v-if="mapData.coverImage"
            :src="`/uploads/${mapData.coverImage}`"
            :alt="mapData.title"
            class="cover-img"
          />
          <div v-else class="cover-placeholder" :style="{ background: getCoverGradient(mapData.id) }">
            <span class="cover-letter">{{ mapData.title.charAt(0).toUpperCase() }}</span>
          </div>
        </div>

        <div class="info-section">
          <h1 class="map-title">{{ mapData.title }}</h1>
          <p class="map-artist" v-if="mapData.artist">{{ mapData.artist }}</p>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">BPM</span>
              <span class="meta-value">{{ mapData.bpm || '--' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">时长</span>
              <span class="meta-value">{{ formatDuration(mapData.duration) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">难度</span>
              <span class="meta-value">{{ mapData.difficulty }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">游玩</span>
              <span class="meta-value">{{ mapData.playCount }} 次</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">创建者</span>
              <span class="meta-value">{{ mapData.creatorName }}</span>
            </div>
          </div>

          <div class="actions">
            <NButton type="primary" size="large" @click="startGame">
              🎮 开始游戏
            </NButton>
            <NButton v-if="isOwner" size="large" @click="editMap">
              ✏️ 编辑谱面
            </NButton>
            <NButton class="share-btn" @click="shareMap">📤 分享</NButton>
          </div>
        </div>
      </div>

      <!-- 排行榜 -->
      <div class="leaderboard-section">
        <h2 class="section-title">🏆 排行榜</h2>

        <div v-if="scores.length > 0" class="leaderboard-table">
          <div class="table-header">
            <span class="col-rank">#</span>
            <span class="col-player">玩家</span>
            <span class="col-score">分数</span>
            <span class="col-accuracy">准确率</span>
            <span class="col-grade">评级</span>
          </div>
          <div
            v-for="score in scores"
            :key="score.userId"
            class="table-row"
            :class="{ 'is-self': score.userId === authStore.user?.id }"
          >
            <span class="col-rank">{{ getRankIcon(score.rank) }}</span>
            <span class="col-player">{{ score.username }}</span>
            <span class="col-score">{{ score.score.toLocaleString() }}</span>
            <span class="col-accuracy">{{ score.accuracy.toFixed(1) }}%</span>
            <span class="col-grade" :style="{ color: getGradeColor(score.grade) }">{{ score.grade }}</span>
          </div>
        </div>

        <NEmpty v-else description="还没有人玩过，成为第一个！" class="empty" />
      </div>
    </div>

    <NSpin v-if="loading" size="large" class="loading" />
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding: 2rem;
}

.detail-container {
  max-width: 900px;
  margin: 0 auto;
}

.back-link {
  display: inline-block;
  color: var(--muted);
  font-size: 0.875rem;
  text-decoration: none;
  margin-bottom: 2rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--ink);
}

.map-info {
  display: flex;
  gap: 2rem;
  margin-bottom: 3rem;
}

.cover-section {
  flex-shrink: 0;
  width: 280px;
}

.cover-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.cover-placeholder {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-letter {
  font-size: 4rem;
  font-weight: 700;
  color: oklch(1 0 0 / 0.7);
}

.info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.map-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.2;
}

.map-artist {
  font-size: 1rem;
  color: var(--muted);
}

.meta-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-top: 0.5rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-label {
  font-size: 0.75rem;
  color: oklch(0.50 0.005 280);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ink);
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 1rem;
}

.share-btn {
  margin-left: 0.5rem;
}

:deep(.n-button--primary-type) {
  --n-color: var(--primary) !important;
  --n-color-hover: var(--primary-hover) !important;
  --n-border-color: var(--primary) !important;
  --n-text-color: white !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
}

:deep(.n-button--default-type) {
  --n-border-color: var(--border) !important;
  --n-text-color: var(--ink) !important;
  border-radius: 8px !important;
}

.leaderboard-section {
  border-top: 1px solid var(--border);
  padding-top: 2rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 1rem;
}

.leaderboard-table {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 60px 1fr 120px 100px 80px;
  padding: 0.75rem 1rem;
  background: var(--surface);
  font-size: 0.75rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-row {
  display: grid;
  grid-template-columns: 60px 1fr 120px 100px 80px;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
  font-size: 0.875rem;
  transition: background 0.2s;
}

.table-row:hover {
  background: oklch(0.62 0.22 350 / 0.03);
}

.table-row.is-self {
  background: oklch(0.62 0.22 350 / 0.06);
}

.col-rank {
  font-weight: 600;
  color: var(--muted);
}

.col-player {
  color: var(--ink);
}

.col-score {
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.col-accuracy {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.col-grade {
  font-weight: 700;
}

.empty {
  padding: 3rem 0;
}

.loading {
  display: flex;
  justify-content: center;
  padding-top: 4rem;
}

@media (max-width: 640px) {
  .map-info {
    flex-direction: column;
  }

  .cover-section {
    width: 100%;
  }

  .table-header,
  .table-row {
    grid-template-columns: 40px 1fr 80px 70px 60px;
    font-size: 0.8125rem;
  }
}
</style>
