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
  max-width: 600px;
  margin: 0 auto;
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
</style>
