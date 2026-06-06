<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import SongCard from '@/components/library/SongCard.vue'
import UploadDialog from '@/components/library/UploadDialog.vue'
import { NInput, NButton, NEmpty, NSpin } from 'naive-ui'
import api from '@/utils/api'
import ThemeBackground from '@/components/common/ThemeBackground.vue'

const authStore = useAuthStore()

const songs = ref<any[]>([])
const hotSongs = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const sortBy = ref('popular')
const currentPage = ref(1)
const totalPages = ref(1)
const showUpload = ref(false)

async function fetchSongs() {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      limit: 20,
      sort: sortBy.value
    }
    if (searchQuery.value.trim()) {
      params.q = searchQuery.value.trim()
    }

    const res = await api.get('/api/maps', { params })
    songs.value = res.data.maps
    totalPages.value = res.data.pages
  } catch (err) {
    console.error('Failed to fetch songs:', err)
  } finally {
    loading.value = false
  }
}

async function fetchHotSongs() {
  try {
    const res = await api.get('/api/maps', { params: { sort: 'popular', limit: 6 } })
    hotSongs.value = res.data.maps
  } catch (err) {
    console.error('Failed to fetch hot songs:', err)
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchSongs()
}

function handleSort(sort: string) {
  sortBy.value = sort
  currentPage.value = 1
  fetchSongs()
}

function handleUploaded() {
  fetchSongs()
  fetchHotSongs()
}

onMounted(() => {
  fetchSongs()
  fetchHotSongs()
})

let searchTimer: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchSongs()
  }, 300)
})
</script>

<template>
  <div class="songs-page">
    <ThemeBackground :reduced="true" />
    <!-- 顶部栏 -->
    <header class="top-bar">
      <router-link to="/" class="logo-link">
        <span class="logo-icon">⚒️</span>
        <span class="logo-text">BeatSmith</span>
      </router-link>

      <div class="search-box">
        <NInput
          v-model:value="searchQuery"
          placeholder="搜索歌曲..."
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>🔍</template>
        </NInput>
      </div>

      <NButton v-if="authStore.isLoggedIn" type="primary" @click="showUpload = true">
        + 上传歌曲
      </NButton>
      <router-link v-if="authStore.isLoggedIn" :to="`/profile/${authStore.user?.id}`" class="profile-link">
        <span class="profile-icon">👤</span>
        <span class="profile-text">{{ authStore.user?.nickname || authStore.user?.username }}</span>
      </router-link>
      <router-link v-else to="/login">
        <NButton>登录</NButton>
      </router-link>
    </header>

    <main class="content">
      <!-- 热门歌曲 -->
      <section v-if="hotSongs.length > 0 && !searchQuery" class="section">
        <h2 class="section-title">🔥 热门歌曲</h2>
        <div class="song-grid">
          <SongCard
            v-for="song in hotSongs"
            :key="song.id"
            v-bind="song"
          />
        </div>
      </section>

      <!-- 全部歌曲 -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">📚 {{ searchQuery ? '搜索结果' : '全部歌曲' }}</h2>
          <div class="sort-buttons">
            <button
              class="sort-btn"
              :class="{ active: sortBy === 'popular' }"
              @click="handleSort('popular')"
            >热门</button>
            <button
              class="sort-btn"
              :class="{ active: sortBy === 'newest' }"
              @click="handleSort('newest')"
            >最新</button>
            <button
              class="sort-btn"
              :class="{ active: sortBy === 'bpm' }"
              @click="handleSort('bpm')"
            >BPM</button>
          </div>
        </div>

        <NSpin :show="loading">
          <div v-if="songs.length > 0" class="song-grid">
            <SongCard
              v-for="song in songs"
              :key="song.id"
              v-bind="song"
            />
          </div>
          <NEmpty v-else-if="!loading" description="还没有歌曲，上传一首吧！" class="empty" />
        </NSpin>
      </section>
    </main>

    <UploadDialog
      v-model:show="showUpload"
      @uploaded="handleUploaded"
    />
  </div>
</template>

<style scoped>
.songs-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 3.5rem 3rem 2rem;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2rem;
  margin-top: -1.875rem;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2rem;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink);
}

.profile-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  text-decoration: none;
  transition: all 0.2s;
  margin-left: auto;
}

.profile-link:hover {
  border-color: var(--primary);
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.4);
}

.profile-icon {
  font-size: 1.2rem;
}

.profile-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
}

.search-box {
  flex: 1;
  max-width: 400px;
}

:deep(.n-input) {
  --n-border: 1px solid var(--border) !important;
  --n-border-hover: 1px solid var(--primary) !important;
  --n-border-focus: 1px solid var(--primary) !important;
  --n-color: var(--bg-surface) !important;
  --n-text-color: var(--text) !important;
  --n-placeholder-color: var(--text-muted) !important;
  border-radius: 8px !important;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
}

.section {
  margin-bottom: 2.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 1rem;
}

.section-header .section-title {
  margin-bottom: 0;
}

.sort-buttons {
  display: flex;
  gap: 0.5rem;
}

.sort-btn {
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--muted);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.sort-btn:hover {
  border-color: var(--primary);
  color: var(--text);
}

.sort-btn.active {
  background: var(--primary-dim);
  border-color: var(--primary);
  color: var(--primary);
}

.song-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
}

.empty {
  padding: 3rem 0;
}

@media (max-width: 640px) {
  .songs-page {
    padding: 0 1rem 1rem;
  }

  .top-bar {
    flex-wrap: wrap;
  }

  .search-box {
    order: 3;
    max-width: 100%;
    width: 100%;
  }
}
</style>
