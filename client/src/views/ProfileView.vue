<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import ThemeBackground from '@/components/common/ThemeBackground.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const profileUser = ref<any>(null)
const loading = ref(true)
const recentPlays = ref<any[]>([])

const isOwnProfile = computed(() => {
  return authStore.user?.id === Number(route.params.id)
})

onMounted(async () => {
  if (authStore.isLoggedIn) {
    profileUser.value = authStore.user
  }
  loading.value = false
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
            <circle cx="50" cy="50" r="45" fill="var(--primary)" opacity="0.3" />
            <text x="50" y="55" text-anchor="middle" fill="var(--primary)" font-size="40">👤</text>
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

      <!-- 最近游玩记录 -->
      <div class="recent-section">
        <h3 class="section-title">🎵 最近游玩</h3>
        <div v-if="recentPlays.length > 0" class="recent-list">
          <div v-for="play in recentPlays" :key="play.id" class="recent-item">
            <div class="recent-info">
              <div class="recent-title">{{ play.title }}</div>
              <div class="recent-artist">{{ play.artist }}</div>
            </div>
            <div class="recent-stats">
              <span class="grade-badge">{{ play.grade }}</span>
              <div class="score">{{ play.score.toLocaleString() }}</div>
              <div class="accuracy">{{ play.accuracy }}%</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-recent">
          <p>还没有游玩记录</p>
          <router-link to="/songs" class="explore-link">去浏览歌曲 →</router-link>
        </div>
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
</style>
