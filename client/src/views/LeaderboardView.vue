<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import ThemeBackground from '@/components/common/ThemeBackground.vue'
import TopThree from '@/components/leaderboard/TopThree.vue'
import RankList from '@/components/leaderboard/RankList.vue'
import SongSelector from '@/components/leaderboard/SongSelector.vue'

const router = useRouter()

const activeTab = ref<'total' | 'plays' | 'grades' | 'song'>('total')
const rankings = ref<any[]>([])
const loading = ref(false)
const selectedSongId = ref<string | null>(null)

const tabs = [
  { key: 'total' as const, label: '🎯 全局总分' },
  { key: 'plays' as const, label: '🔥 游玩次数' },
  { key: 'grades' as const, label: '⭐ 评级排行' },
  { key: 'song' as const, label: '🎵 单曲排行' }
]

async function fetchRankings() {
  loading.value = true
  rankings.value = []
  try {
    let endpoint = ''
    switch (activeTab.value) {
      case 'total': endpoint = '/api/leaderboard/total'; break
      case 'plays': endpoint = '/api/leaderboard/plays'; break
      case 'grades': endpoint = '/api/leaderboard/grades'; break
      case 'song':
        if (selectedSongId.value) {
          endpoint = `/api/maps/${selectedSongId.value}/scores`
        }
        break
    }

    if (endpoint) {
      const res = await api.get(endpoint)
      rankings.value = res.data.rankings || res.data.scores || []
    }
  } catch (err) {
    console.error('Failed to fetch rankings:', err)
  } finally {
    loading.value = false
  }
}

function switchTab(tab: typeof activeTab.value) {
  activeTab.value = tab
  if (tab !== 'song') {
    selectedSongId.value = null
  }
  fetchRankings()
}

function handleSongChange(songId: string | null) {
  selectedSongId.value = songId
  fetchRankings()
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

onMounted(() => {
  fetchRankings()
})
</script>

<template>
  <div class="leaderboard-page">
    <ThemeBackground :reduced="true" />

    <!-- 主题装饰 -->
    <div class="corner-decor top-left"></div>
    <div class="corner-decor bottom-right"></div>

    <nav class="top-nav">
      <button class="back-btn" @click="goBack">← 返回</button>
      <span class="nav-title">🏆 排行榜</span>
    </nav>

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

    <!-- 内容区 -->
    <div class="content">
      <!-- 单曲排行：歌曲选择器 -->
      <SongSelector
        v-if="activeTab === 'song'"
        :model-value="selectedSongId"
        @update:model-value="handleSongChange"
      />

      <div v-if="loading" class="loading">加载中...</div>

      <template v-else>
        <!-- 前三名领奖台 -->
        <TopThree
          v-if="rankings.length >= 3"
          :rankings="rankings"
          :type="activeTab === 'song' ? 'total' : activeTab"
        />

        <!-- 排行列表 -->
        <RankList
          :rankings="activeTab === 'song' ? rankings : rankings.slice(3)"
          :type="activeTab === 'song' ? 'total' : activeTab"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

/* 主题装饰 */
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

.top-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
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

.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
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

.content {
  position: relative;
  z-index: 1;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
}
</style>
