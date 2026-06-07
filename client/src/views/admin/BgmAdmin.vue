<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import api from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()

const playlists = ref<any[]>([])
const currentPlaylistId = ref<number | null>(null)
const activePlaylistId = ref<number | null>(null)
const playlistSongs = ref<any[]>([])
const loading = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()
const newPlaylistName = ref('')
const showNewPlaylist = ref(false)

onMounted(() => {
  if (!authStore.isLoggedIn || authStore.user?.username !== 'admin') {
    router.push('/')
    return
  }
  loadPlaylists()
})

async function loadPlaylists() {
  loading.value = true
  try {
    const res = await api.get('/api/bgm/playlists')
    playlists.value = res.data.playlists
    // 找到活跃歌单
    const active = playlists.value.find((p: any) => p.isActive)
    activePlaylistId.value = active?.id || null
    // 默认选中第一个歌单
    if (playlists.value.length > 0 && !currentPlaylistId.value) {
      selectPlaylist(playlists.value[0].id)
    }
  } catch (err) {
    console.error('Failed to load playlists:', err)
  } finally {
    loading.value = false
  }
}

async function selectPlaylist(playlistId: number) {
  currentPlaylistId.value = playlistId
  await loadPlaylistSongs(playlistId)
}

async function loadPlaylistSongs(playlistId: number) {
  loading.value = true
  try {
    const res = await api.get(`/api/bgm/playlist?playlistId=${playlistId}`)
    playlistSongs.value = res.data.songs
  } catch (err) {
    console.error('Failed to load playlist songs:', err)
  } finally {
    loading.value = false
  }
}

async function setActivePlaylist(playlistId: number) {
  try {
    await api.put(`/api/bgm/playlists/${playlistId}/active`)
    activePlaylistId.value = playlistId
  } catch (err) {
    console.error('Failed to set active playlist:', err)
  }
}

async function createPlaylist() {
  if (!newPlaylistName.value.trim()) return
  try {
    await api.post('/api/bgm/playlists', {
      name: newPlaylistName.value,
      description: ''
    })
    newPlaylistName.value = ''
    showNewPlaylist.value = false
    loadPlaylists()
  } catch (err) {
    console.error('Failed to create playlist:', err)
  }
}

async function deletePlaylist(playlistId: number) {
  if (!confirm('确定删除这个歌单吗？歌单中的所有歌曲都会被删除。')) return
  try {
    await api.delete(`/api/bgm/playlists/${playlistId}`)
    // 如果删除的是当前查看的歌单，切换到第一个
    if (currentPlaylistId.value === playlistId) {
      currentPlaylistId.value = null
      playlistSongs.value = []
    }
    if (activePlaylistId.value === playlistId) {
      activePlaylistId.value = null
    }
    loadPlaylists()
  } catch (err) {
    console.error('Failed to delete playlist:', err)
  }
}

async function deleteSong(id: number) {
  if (!confirm('确定删除这首歌吗？')) return
  try {
    await api.delete(`/api/bgm/songs/${id}`)
    if (currentPlaylistId.value) {
      loadPlaylistSongs(currentPlaylistId.value)
    }
  } catch (err) {
    console.error('Failed to delete song:', err)
  }
}

function triggerUpload() {
  fileInput.value?.click()
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  uploading.value = true
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('bgm', file)

      const uploadRes = await api.post('/api/upload/bgm', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      await api.post('/api/bgm/songs', {
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: '未知艺术家',
        filePath: uploadRes.data.filename,
        duration: 0,
        playlistId: currentPlaylistId.value
      })
    }

    if (currentPlaylistId.value) {
      loadPlaylistSongs(currentPlaylistId.value)
    }
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

    <!-- 歌单管理 -->
    <div class="section">
      <h2>歌单管理</h2>
      <div class="playlist-list">
        <div
          v-for="pl in playlists"
          :key="pl.id"
          class="playlist-item"
          :class="{
            viewing: currentPlaylistId === pl.id,
            active: activePlaylistId === pl.id
          }"
          @click="selectPlaylist(pl.id)"
        >
          <div class="playlist-info">
            <span class="playlist-name">{{ pl.name }}</span>
            <span v-if="activePlaylistId === pl.id" class="active-badge">播放中</span>
            <span v-else-if="currentPlaylistId === pl.id" class="viewing-badge">查看中</span>
          </div>
          <div class="playlist-actions" @click.stop>
            <button v-if="activePlaylistId !== pl.id" @click="setActivePlaylist(pl.id)">设为播放</button>
            <button class="delete-btn" @click="deletePlaylist(pl.id)">🗑️</button>
          </div>
        </div>
      </div>
      <div class="new-playlist">
        <button v-if="!showNewPlaylist" @click="showNewPlaylist = true">+ 新建歌单</button>
        <div v-else class="new-playlist-form">
          <input v-model="newPlaylistName" placeholder="歌单名称" @keyup.enter="createPlaylist" />
          <button @click="createPlaylist">创建</button>
          <button @click="showNewPlaylist = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 上传歌曲 -->
    <div class="section" v-if="currentPlaylistId">
      <h2>上传歌曲到: {{ playlists.find(p => p.id === currentPlaylistId)?.name }}</h2>
      <button class="upload-btn" @click="triggerUpload" :disabled="uploading">
        {{ uploading ? '上传中...' : '📤 上传歌曲' }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".mp3,.wav,.ogg"
        multiple
        style="display: none"
        @change="handleUpload"
      />
    </div>

    <!-- 当前查看的歌单歌曲 -->
    <div class="section" v-if="currentPlaylistId">
      <h2>歌曲列表 ({{ playlistSongs.length }} 首)</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="playlistSongs.length > 0" class="song-list">
        <div v-for="song in playlistSongs" :key="song.id" class="song-item">
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

.playlist-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.playlist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem;
  background: var(--bg-surface);
  border-radius: 8px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
}

.playlist-item:hover {
  border-color: var(--primary);
}

.playlist-item.viewing {
  border-color: var(--primary);
  background: rgba(var(--primary-rgb), 0.05);
}

.playlist-item.active {
  border-color: var(--success);
  background: rgba(0, 255, 136, 0.05);
}

.playlist-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.playlist-name {
  font-weight: 600;
  color: var(--text);
}

.active-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  background: var(--success);
  color: #000;
  border-radius: 4px;
  font-weight: 600;
}

.viewing-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  background: var(--primary);
  color: #000;
  border-radius: 4px;
}

.playlist-actions {
  display: flex;
  gap: 0.5rem;
}

.playlist-actions button {
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8rem;
}

.playlist-actions button:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.new-playlist {
  margin-top: 1rem;
}

.new-playlist > button {
  padding: 0.5rem 1rem;
  border: 1px dashed var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  width: 100%;
}

.new-playlist > button:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.new-playlist-form {
  display: flex;
  gap: 0.5rem;
}

.new-playlist-form input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text);
}

.new-playlist-form button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--primary);
  border-radius: 6px;
  background: var(--primary);
  color: #000;
  cursor: pointer;
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

.duration {
  color: var(--text-muted);
  font-size: 0.85rem;
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
