<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import ThemeBackground from '@/components/common/ThemeBackground.vue'
import api from '@/utils/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const profileUser = computed(() => authStore.user)
const loading = ref(true)
const recentPlays = ref<any[]>([])

const activeTab = ref<'overview' | 'recent' | 'best' | 'grades'>('overview')
const userStats = ref<any>(null)
const recentScores = ref<any[]>([])
const bestScores = ref<any[]>([])
const loadingTab = ref(false)

const tabs = [
  { key: 'overview' as const, label: '📊 概览' },
  { key: 'recent' as const, label: '🎵 最近游玩' },
  { key: 'best' as const, label: '🏆 最佳成绩' },
  { key: 'grades' as const, label: '📈 评级分布' }
]

async function fetchTabData() {
  if (!profileUser.value) return

  loadingTab.value = true
  try {
    const userId = profileUser.value.id

    if (activeTab.value === 'overview' || activeTab.value === 'grades') {
      const res = await api.get(`/api/users/${userId}/stats`)
      userStats.value = res.data
    }

    if (activeTab.value === 'recent') {
      const res = await api.get(`/api/users/${userId}/scores?limit=10`)
      recentScores.value = res.data.scores
    }

    if (activeTab.value === 'best') {
      const res = await api.get(`/api/users/${userId}/best`)
      bestScores.value = res.data.bestScores
    }
  } catch (err) {
    console.error('Failed to fetch tab data:', err)
  } finally {
    loadingTab.value = false
  }
}

function switchTab(tab: typeof activeTab.value) {
  activeTab.value = tab
  fetchTabData()
}

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'SSS': '#ff66aa', 'SS': '#bf00ff', 'S': '#00d4ff',
    'A': '#00ff88', 'B': '#fcee09', 'C': '#ff6600', 'D': '#ff4466'
  }
  return colors[grade] || '#888888'
}

function formatScore(score: number): string {
  return score.toLocaleString()
}

// 预设头像数据（与 AvatarPicker 保持一致）
const presetAvatars: Record<string, { color: string; path: string }> = {
  hexagon: { color: '#00d4ff', path: 'M50 5 L95 27.5 L95 72.5 L50 95 L5 72.5 L5 27.5 Z' },
  circle: { color: '#ff66aa', path: 'M50 5 A45 45 0 1 1 49.99 5 Z' },
  triangle: { color: '#00ff88', path: 'M50 5 L95 90 L5 90 Z' },
  diamond: { color: '#bf00ff', path: 'M50 5 L90 50 L50 95 L10 50 Z' },
  star: { color: '#fcee09', path: 'M50 5 L61 35 L95 35 L68 57 L79 90 L50 70 L21 90 L32 57 L5 35 L39 35 Z' },
  pentagon: { color: '#00d4ff', path: 'M50 5 L95 38 L77 90 L23 90 L5 38 Z' },
  octagon: { color: '#ff4466', path: 'M65 5 L90 20 L95 50 L80 80 L50 95 L20 80 L5 50 L10 20 Z' },
  cross: { color: '#ffffff', path: 'M35 5 L65 5 L65 35 L95 35 L95 65 L65 65 L65 95 L35 95 L35 65 L5 65 L5 35 L35 35 Z' }
}

function getPresetAvatar(id: string) {
  return presetAvatars[id]
}

const isOwnProfile = computed(() => {
  return authStore.user?.id === Number(route.params.id)
})

onMounted(async () => {
  loading.value = false
  fetchTabData()
})

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div class="profile-page">
    <ThemeBackground :reduced="true" />

    <!-- 主题装饰：左上角 -->
    <div class="corner-decor top-left"></div>
    <!-- 主题装饰：右下角 -->
    <div class="corner-decor bottom-right"></div>
    <!-- 主题装饰：水平线 -->
    <div class="decor-line horizontal"></div>

    <nav class="top-nav">
      <button class="back-btn" @click="goBack">← 返回</button>
      <span class="nav-title">👤 个人档案</span>
      <router-link v-if="authStore.isLoggedIn" to="/settings" class="settings-btn">
        ⚙️ 设置
      </router-link>
    </nav>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="profileUser" class="profile-content">
      <div class="avatar-section">
        <div v-if="profileUser.avatar?.startsWith('preset:')" class="avatar-display">
          <svg viewBox="0 0 100 100">
            <defs>
              <filter id="profile-glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path
              :d="getPresetAvatar(profileUser.avatar.replace('preset:', ''))?.path"
              :fill="getPresetAvatar(profileUser.avatar.replace('preset:', ''))?.color"
              filter="url(#profile-glow)"
            />
          </svg>
        </div>
        <div v-else-if="profileUser.avatar" class="avatar-display">
          <img :src="profileUser.avatar" alt="avatar" />
        </div>
        <div v-else class="avatar-display default">
          <span>👤</span>
        </div>
      </div>

      <div class="user-info">
        <h2 class="username">{{ profileUser.nickname || profileUser.username }}</h2>
        <p class="join-date">加入于 {{ new Date(profileUser.created_at).toLocaleDateString() }}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">0</div>
          <div class="stat-label">游玩次数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">0</div>
          <div class="stat-label">总分</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">-</div>
          <div class="stat-label">最高评级</div>
        </div>
      </div>

      <!-- 标签页 -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 标签页内容 -->
      <div class="tab-content">
        <div v-if="loadingTab" class="loading">加载中...</div>

        <!-- 概览 -->
        <template v-else-if="activeTab === 'overview' && userStats">
          <div class="stats-summary">
            <div class="stat-item">
              <span class="stat-label">总分</span>
              <span class="stat-value">{{ formatScore(userStats.totalScore) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">游玩次数</span>
              <span class="stat-value">{{ userStats.playCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">平均准确率</span>
              <span class="stat-value">{{ userStats.avgAccuracy }}%</span>
            </div>
          </div>
          <div class="grade-summary">
            <div
              v-for="(count, grade) in userStats.grades"
              :key="grade"
              class="grade-badge"
              :style="{ color: getGradeColor(grade.toUpperCase()), borderColor: getGradeColor(grade.toUpperCase()) }"
              v-if="count > 0"
            >
              {{ grade.toUpperCase() }} × {{ count }}
            </div>
          </div>
        </template>

        <!-- 最近游玩 -->
        <template v-else-if="activeTab === 'recent'">
          <div v-if="recentScores.length > 0" class="score-list">
            <div v-for="score in recentScores" :key="score.id" class="score-item">
              <div class="score-info">
                <div class="score-title">{{ score.title || '未知歌曲' }}</div>
                <div class="score-artist">{{ score.artist || 'Unknown' }}</div>
              </div>
              <div class="score-stats">
                <span
                  class="grade-badge"
                  :style="{ color: getGradeColor(score.grade), borderColor: getGradeColor(score.grade) }"
                >
                  {{ score.grade }}
                </span>
                <span class="score-value">{{ formatScore(score.score) }}</span>
                <span class="score-date">{{ new Date(score.playedAt).toLocaleDateString() }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>还没有游玩记录</p>
            <router-link to="/songs" class="explore-link">去浏览歌曲 →</router-link>
          </div>
        </template>

        <!-- 最佳成绩 -->
        <template v-else-if="activeTab === 'best'">
          <div v-if="bestScores.length > 0" class="score-list">
            <div v-for="score in bestScores" :key="score.beatmapId" class="score-item">
              <div class="score-info">
                <div class="score-title">{{ score.title || '未知歌曲' }}</div>
                <div class="score-artist">{{ score.artist || 'Unknown' }}</div>
              </div>
              <div class="score-stats">
                <span
                  class="grade-badge"
                  :style="{ color: getGradeColor(score.grade), borderColor: getGradeColor(score.grade) }"
                >
                  {{ score.grade }}
                </span>
                <span class="score-value">{{ formatScore(score.score) }}</span>
                <span class="score-accuracy">{{ score.accuracy }}%</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>还没有最佳成绩</p>
          </div>
        </template>

        <!-- 评级分布 -->
        <template v-else-if="activeTab === 'grades' && userStats">
          <div class="grade-distribution">
            <div
              v-for="(count, grade) in userStats.grades"
              :key="grade"
              class="grade-item"
            >
              <div
                class="grade-badge-large"
                :style="{ color: getGradeColor(grade.toUpperCase()), borderColor: getGradeColor(grade.toUpperCase()) }"
              >
                {{ grade.toUpperCase() }}
              </div>
              <div class="grade-count">{{ count }}</div>
              <div class="grade-bar">
                <div
                  class="grade-bar-fill"
                  :style="{
                    width: `${userStats.playCount > 0 ? (count / userStats.playCount) * 100 : 0}%`,
                    background: getGradeColor(grade.toUpperCase())
                  }"
                ></div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>用户不存在</p>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 2rem;
  max-width: 700px;
  margin: 0 auto;
}

/* 主题装饰元素 */
.corner-decor {
  position: fixed;
  width: 80px;
  height: 80px;
  pointer-events: none;
  z-index: 0;
}

.corner-decor.top-left {
  top: 60px;
  left: 30px;
  border-left: 2px solid var(--primary);
  border-top: 2px solid var(--primary);
  opacity: 0.4;
}

.corner-decor.bottom-right {
  bottom: 30px;
  right: 30px;
  border-right: 2px solid var(--primary);
  border-bottom: 2px solid var(--primary);
  opacity: 0.4;
}

.decor-line.horizontal {
  position: fixed;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
  opacity: 0.1;
  pointer-events: none;
  z-index: 0;
}

.top-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.back-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.back-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.nav-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary);
}

.settings-btn {
  margin-left: auto;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-muted);
  text-decoration: none;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.settings-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
}

.profile-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.avatar-section {
  margin-bottom: 0.5rem;
}

.avatar-display {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border: 2px solid var(--border);
  overflow: hidden;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.avatar-display:hover {
  border-color: var(--primary);
  box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.3);
}

.avatar-display svg {
  width: 100%;
  height: 100%;
}

.avatar-display img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-display.default {
  font-size: 3rem;
}

.user-info {
  text-align: center;
}

.username {
  color: var(--text);
  font-size: 1.5rem;
  margin-bottom: 0.3rem;
}

.join-date {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  width: 100%;
  margin-top: 1rem;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.2rem;
  text-align: center;
  transition: border-color 0.3s, transform 0.2s;
}

.stat-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.3rem;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* 最近游玩记录 */
.recent-section {
  width: 100%;
  margin-top: 1rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
  padding-left: 0.5rem;
  border-left: 3px solid var(--primary);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.2rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: border-color 0.2s, transform 0.2s;
}

.recent-item:hover {
  border-color: var(--primary);
  transform: translateX(4px);
}

.recent-info {
  flex: 1;
}

.recent-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.2rem;
}

.recent-artist {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.recent-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.grade-badge {
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border: 1px solid;
  border-radius: 4px;
  min-width: 35px;
  text-align: center;
}

.score {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  min-width: 80px;
  text-align: right;
}

.accuracy {
  font-size: 0.8rem;
  color: var(--text-muted);
  min-width: 50px;
  text-align: right;
}

.empty-recent {
  text-align: center;
  padding: 2rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-muted);
}

.explore-link {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: var(--primary);
  color: #000;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
}

.explore-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.4);
}

.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  margin: 2rem 0 1.5rem;
  overflow-x: auto;
}

.tab-btn {
  padding: 0.8rem 1.2rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-content {
  min-height: 200px;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}

.stats-summary {
  display: flex;
  justify-content: space-around;
  margin-bottom: 1.5rem;
}

.stat-item {
  text-align: center;
}

.stat-item .stat-label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.3rem;
}

.stat-item .stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary);
}

.grade-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  justify-content: center;
}

.grade-badge {
  padding: 0.4rem 0.8rem;
  border: 1px solid;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
}

.score-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: border-color 0.2s;
}

.score-item:hover {
  border-color: var(--primary);
}

.score-info {
  flex: 1;
}

.score-title {
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.2rem;
}

.score-artist {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.score-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.score-value {
  font-weight: 600;
  color: var(--primary);
}

.score-date, .score-accuracy {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-muted);
}

.explore-link {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: var(--primary);
  color: #000;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
}

.explore-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.4);
}

.grade-distribution {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.grade-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.grade-badge-large {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1.1rem;
}

.grade-count {
  width: 40px;
  font-weight: 600;
  color: var(--text);
}

.grade-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-surface);
  border-radius: 4px;
  overflow: hidden;
}

.grade-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}
</style>
