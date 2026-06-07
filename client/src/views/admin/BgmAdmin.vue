<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import api from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()

const playlist = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

onMounted(() => {
  if (!authStore.isLoggedIn || authStore.user?.username !== 'admin') {
    router.push('/')
    return
  }
  loadPlaylist()
})

async function loadPlaylist() {
  loading.value = true
  try {
    const res = await api.get('/api/bgm/playlist')
    playlist.value = res.data.songs
  } catch (err) {
    console.error('Failed to load playlist:', err)
  } finally {
    loading.value = false
  }
}

async function searchSongs() {
  if (!searchQuery.value.trim()) return
  try {
    const res = await api.get(`/api/bgm/search?keyword=${searchQuery.value}`)
    searchResults.value = res.data.results
  } catch (err) {
    console.error('Failed to search songs:', err)
  }
}

async function deleteSong(id: number) {
  if (!confirm('确定删除这首歌吗？')) return
  try {
    await api.delete(`/api/bgm/songs/${id}`)
    loadPlaylist()
  } catch (err) {
    console.error('Failed to delete song:', err)
  }
}

function triggerUpload() {
  fileInput.value?.click()
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('bgm', file)
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''))
    formData.append('artist', '未知艺术家')

    await api.post('/api/bgm/songs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    loadPlaylist()
  } catch (err) {
    alert(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="bgm-admin">
    <h1>🎵 背景音乐管理</h1>

    <!-- 上传歌曲 -->
    <div class="section">
      <h2>上传歌曲</h2>
      <button class="upload-btn" @click="triggerUpload" :disabled="uploading">
        {{ uploading ? '上传中...' : '📤 上传歌曲' }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".mp3,.wav,.ogg"
        style="display: none"
        @change="handleUpload"
      />
    </div>

    <!-- 搜索歌曲 -->
    <div class="section">
      <h2>搜索歌曲</h2>
      <div class="search-box">
        <input v-model="searchQuery" placeholder="输入歌曲名或艺术家..." @keyup.enter="searchSongs" />
        <button @click="searchSongs">搜索</button>
      </div>
      <div v-if="searchResults.length > 0" class="search-results">
        <div v-for="song in searchResults" :key="song.id" class="result-item">
          <span>{{ song.name }}</span>
          <span class="duration">{{ formatDuration(song.duration) }}</span>
        </div>
      </div>
    </div>

    <!-- 当前歌单 -->
    <div class="section">
      <h2>当前歌单 ({{ playlist.length }} 首)</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="playlist.length > 0" class="song-list">
        <div v-for="song in playlist" :key="song.id" class="song-item">
          <div class="song-info">
            <span class="song-title">{{ song.title }}</span>
            <span class="song-artist">{{ song.artist || '未知艺术家' }}</span>
          </div>
          <span class="duration">{{ formatDuration(song.duration || 0) }}</span>
          <button class="delete-btn" @click="deleteSong(song.id)">🗑️</button>
        </div>
      </div>
      <div v-else class="empty">暂无歌曲</div>
    </div>
  </div>
</template>

<style scoped>
.bgm-admin {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  color: var(--primary);
  margin-bottom: 2rem;
}

.section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

h2 {
  color: var(--text);
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.upload-btn {
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--primary);
  border-radius: 8px;
  background: rgba(var(--primary-rgb), 0.1);
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:hover:not(:disabled) {
  background: rgba(var(--primary-rgb), 0.2);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-box {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.search-box input {
  flex: 1;
  padding: 0.6rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text);
}

.search-box button {
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--primary);
  border-radius: 8px;
  background: var(--primary);
  color: #000;
  cursor: pointer;
  font-weight: 600;
}

.search-results {
  margin-top: 1rem;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem;
  background: var(--bg-surface);
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.duration {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.song-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem;
  background: var(--bg-surface);
  border-radius: 8px;
}

.song-info {
  flex: 1;
}

.song-title {
  font-weight: 600;
  color: var(--text);
}

.song-artist {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.delete-btn {
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--error);
  border-radius: 4px;
  background: rgba(255, 68, 102, 0.1);
  color: var(--error);
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: rgba(255, 68, 102, 0.2);
}

.loading, .empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}
</style>
