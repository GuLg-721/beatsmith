<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import ThemeBackground from '@/components/common/ThemeBackground.vue'

const router = useRouter()
const authStore = useAuthStore()
const showContent = ref(false)

onMounted(() => {
  setTimeout(() => {
    showContent.value = true
  }, 300)
})

function handleCTA() {
  if (authStore.isLoggedIn) {
    router.push('/songs')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="home">
    <ThemeBackground />

    <Transition name="fade-up">
      <div v-if="showContent" class="content">
        <div class="title-group">
          <h1 class="title">
            <span class="title-icon">⚒️</span>
            BeatSmith
          </h1>
          <p class="subtitle">节 拍 铁 匠</p>
        </div>

        <p class="tagline">上传歌曲，锻造谱面，挑战节奏</p>

        <button class="cta-button" @click="handleCTA">
          <span v-if="authStore.isLoggedIn">进入工作台</span>
          <span v-else>开始锻造 ⚒️</span>
        </button>

        <div class="nav-links">
          <router-link to="/songs" class="nav-link">浏览歌曲</router-link>
          <router-link to="/leaderboard" class="nav-link">排行榜</router-link>
          <router-link v-if="!authStore.isLoggedIn" to="/login" class="nav-link">登录</router-link>
          <router-link v-if="authStore.isLoggedIn" :to="`/profile/${authStore.user?.id}`" class="nav-link">个人档案</router-link>
        </div>
      </div>
    </Transition>

    <div class="bottom-fade" />
  </div>
</template>

<style scoped>
.home {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
  pointer-events: auto;
}

.title-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.title {
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 0.3em;
  text-shadow:
    0 0 40px rgba(var(--primary-rgb), 0.4),
    0 0 80px rgba(var(--primary-rgb), 0.2);
  animation: titlePulse 4s ease-in-out infinite;
}

.title-icon {
  font-size: 0.8em;
}

@keyframes titlePulse {
  0%, 100% {
    text-shadow:
      0 0 40px rgba(var(--primary-rgb), 0.4),
      0 0 80px rgba(var(--primary-rgb), 0.2);
  }
  50% {
    text-shadow:
      0 0 60px rgba(var(--primary-rgb), 0.6),
      0 0 120px rgba(var(--primary-rgb), 0.3);
  }
}

.subtitle {
  font-size: clamp(1rem, 2.5vw, 1.5rem);
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.5em;
  text-indent: 0.5em;
}

.tagline {
  font-size: 1rem;
  color: oklch(0.65 0.01 280);
  max-width: 40ch;
}

.cta-button {
  margin-top: 1rem;
  padding: 1rem 3rem;
  font-size: 1.125rem;
  font-weight: 600;
  font-family: inherit;
  color: white;
  background: transparent;
  border: 2px solid var(--primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease-out;
  box-shadow:
    0 0 15px rgba(var(--primary-rgb), 0.2),
    inset 0 0 15px rgba(var(--primary-rgb), 0.1);
}

.cta-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--primary);
  opacity: 0;
  transition: opacity 0.3s;
}

.cta-button:hover {
  border-color: var(--primary);
  box-shadow:
    0 0 30px rgba(var(--primary-rgb), 0.4),
    0 0 60px rgba(var(--primary-rgb), 0.2),
    inset 0 0 20px rgba(var(--primary-rgb), 0.15);
  transform: scale(1.05);
}

.cta-button:hover::before {
  opacity: 0.15;
}

.cta-button:active {
  transform: scale(0.98);
}

.cta-button span {
  position: relative;
  z-index: 1;
}

.nav-links {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
}

.nav-link {
  font-size: 0.875rem;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.2s;
  position: relative;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 1px;
  background: var(--accent);
  transition: width 0.3s ease-out;
}

.nav-link:hover {
  color: var(--accent);
}

.nav-link:hover::after {
  width: 100%;
}

.bottom-fade {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(to top, var(--bg), transparent);
  z-index: 1;
  pointer-events: none;
}

/* 进入/退出动画 */
.fade-up-enter-active {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-up-leave-active {
  transition: all 0.3s ease-in;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .title {
    animation: none;
  }

  .fade-up-enter-active,
  .fade-up-leave-active {
    transition: opacity 0.3s;
  }

  .fade-up-enter-from,
  .fade-up-leave-to {
    transform: none;
  }
}
</style>
