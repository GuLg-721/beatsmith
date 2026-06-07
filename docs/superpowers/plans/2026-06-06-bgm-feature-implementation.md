# Background Music Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add radio-style background music player with admin playlist management and theme-adaptive styling.

**Architecture:** Backend adds BGM API endpoints and database table. Frontend adds BgmPlayer component and admin page. Player appears on all pages except homepage and game.

**Tech Stack:** Vue 3 + TypeScript, Express + sql.js, Web Audio API

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/db.ts` | Modify | Add bgm_songs table |
| `server/src/routes/bgm.ts` | Create | BGM API endpoints |
| `server/src/routes/upload.ts` | Modify | Add BGM upload |
| `server/src/index.ts` | Modify | Register BGM routes |
| `server/uploads/bgm/` | Create dir | Store BGM files |
| `client/src/stores/bgmStore.ts` | Create | BGM state management |
| `client/src/components/common/BgmPlayer.vue` | Create | BGM player component |
| `client/src/views/admin/BgmAdmin.vue` | Create | Admin playlist page |
| `client/src/router/index.ts` | Modify | Add admin route |
| `client/src/views/SongsView.vue` | Modify | Add BgmPlayer |
| `client/src/views/SettingsView.vue` | Modify | Add BgmPlayer |
| `client/src/views/ProfileView.vue` | Modify | Add BgmPlayer |
| `client/src/views/LeaderboardView.vue` | Modify | Add BgmPlayer |

---

### Task 1: Database — Add bgm_songs Table

**Files:**
- Modify: `server/src/db.ts`

- [ ] **Step 1: Add bgm_songs table**

In `server/src/db.ts`, add after existing table creations:

```typescript
db.run(`
  CREATE TABLE IF NOT EXISTS bgm_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT,
    file_path TEXT NOT NULL,
    duration INTEGER,
    added_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)
```

- [ ] **Step 2: Commit**

```bash
git add server/src/db.ts
git commit -m "feat(db): add bgm_songs table for background music"
```

---

### Task 2: Backend — Create BGM Routes

**Files:**
- Create: `server/src/routes/bgm.ts`

- [ ] **Step 1: Create bgm.ts with playlist endpoint**

Create `D:\vibecoding\beatforge\server\src\routes\bgm.ts`:

```typescript
import { Router, Request, Response } from 'express'
import { getDB } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/bgm/playlist — 获取歌单
router.get('/playlist', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const result = db.exec(
      `SELECT id, title, artist, file_path, duration, created_at
       FROM bgm_songs
       ORDER BY created_at DESC`
    )

    const songs = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      title: row[1],
      artist: row[2],
      filePath: row[3],
      duration: row[4],
      createdAt: row[5]
    })) : []

    res.status(200).json({ songs })
  } catch (err) {
    console.error('Get playlist error:', err)
    res.status(500).json({ message: '获取歌单失败' })
  }
})
```

- [ ] **Step 2: Add delete song endpoint**

Add to `server/src/routes/bgm.ts`:

```typescript
// DELETE /api/bgm/songs/:id — 删除歌曲
router.delete('/songs/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDB()
    const songId = parseInt(req.params.id)

    if (isNaN(songId)) {
      res.status(400).json({ message: '无效的歌曲 ID' })
      return
    }

    // 检查是否是管理员
    const userResult = db.exec('SELECT username FROM users WHERE id = ?', [req.user!.userId])
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'admin') {
      res.status(403).json({ message: '需要管理员权限' })
      return
    }

    db.run('DELETE FROM bgm_songs WHERE id = ?', [songId])
    scheduleSave()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Delete song error:', err)
    res.status(500).json({ message: '删除歌曲失败' })
  }
})
```

- [ ] **Step 3: Add search endpoint**

Add to `server/src/routes/bgm.ts`:

```typescript
// GET /api/bgm/search — 搜索网易云音乐
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { keyword } = req.query
    if (!keyword) {
      res.status(400).json({ message: '请输入搜索关键词' })
      return
    }

    // 模拟搜索结果（实际应调用网易云API）
    const mockResults = [
      { id: 1, name: `${keyword} - 歌曲1`, artist: '艺术家1', duration: 240 },
      { id: 2, name: `${keyword} - 歌曲2`, artist: '艺术家2', duration: 300 },
      { id: 3, name: `${keyword} - 歌曲3`, artist: '艺术家3', duration: 180 }
    ]

    res.status(200).json({ results: mockResults })
  } catch (err) {
    console.error('Search error:', err)
    res.status(500).json({ message: '搜索失败' })
  }
})

export default router
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/bgm.ts
git commit -m "feat(api): add BGM routes for playlist management"
```

---

### Task 3: Backend — Add BGM Upload

**Files:**
- Modify: `server/src/routes/upload.ts`
- Create: `server/uploads/bgm/` directory

- [ ] **Step 1: Create directory**

```bash
mkdir -p /d/vibecoding/beatforge/server/uploads/bgm
```

- [ ] **Step 2: Add BGM upload endpoint**

Add to `server/src/routes/upload.ts`:

```typescript
// BGM文件存储配置
const bgmStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'bgm'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `bgm-${nanoid(8)}${ext}`)
  }
})

const uploadBgm = multer({
  storage: bgmStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的音频格式'))
    }
  }
})

// POST /api/upload/bgm
router.post('/bgm', authMiddleware, (req: AuthRequest, res: Response) => {
  uploadBgm.single('bgm')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ message: '文件大小超过 20MB 限制' })
          return
        }
        res.status(400).json({ message: err.message })
        return
      }
      res.status(400).json({ message: err.message })
      return
    }

    if (!req.file) {
      res.status(400).json({ message: '请选择音频文件' })
      return
    }

    res.status(200).json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    })
  })
})
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/upload.ts server/uploads/bgm/
git commit -m "feat(api): add BGM upload endpoint"
```

---

### Task 4: Backend — Register BGM Routes

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Import and register BGM routes**

In `server/src/index.ts`, add import:

```typescript
import bgmRoutes from './routes/bgm'
```

Add route registration:

```typescript
app.use('/api/bgm', bgmRoutes)
```

- [ ] **Step 2: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(api): register BGM routes"
```

---

### Task 5: Frontend — Create BGM Store

**Files:**
- Create: `client/src/stores/bgmStore.ts`

- [ ] **Step 1: Create bgmStore.ts**

Create `D:\vibecoding\beatforge\client\src\stores\bgmStore.ts`:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useBgmStore = defineStore('bgm', () => {
  const playlist = ref<any[]>([])
  const currentIndex = ref(0)
  const isPlaying = ref(false)
  const volume = ref(0.3)
  const audio = ref<HTMLAudioElement | null>(null)
  const currentTime = ref(0)
  const duration = ref(0)

  const currentSong = computed(() => playlist.value[currentIndex.value] || null)

  async function loadPlaylist() {
    try {
      const res = await api.get('/api/bgm/playlist')
      playlist.value = res.data.songs
    } catch (err) {
      console.error('Failed to load playlist:', err)
    }
  }

  function play() {
    if (!currentSong.value) return

    if (!audio.value) {
      audio.value = new Audio(`/uploads/${currentSong.value.filePath}`)
      audio.value.addEventListener('timeupdate', () => {
        currentTime.value = audio.value?.currentTime || 0
      })
      audio.value.addEventListener('loadedmetadata', () => {
        duration.value = audio.value?.duration || 0
      })
      audio.value.addEventListener('ended', () => {
        next()
      })
    }

    audio.value.volume = volume.value
    audio.value.play()
    isPlaying.value = true
  }

  function pause() {
    audio.value?.pause()
    isPlaying.value = false
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  function next() {
    if (playlist.value.length === 0) return
    currentIndex.value = (currentIndex.value + 1) % playlist.value.length
    stop()
    play()
  }

  function prev() {
    if (playlist.value.length === 0) return
    currentIndex.value = (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
    stop()
    play()
  }

  function stop() {
    audio.value?.pause()
    audio.value = null
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
  }

  function setVolume(value: number) {
    volume.value = value
    if (audio.value) {
      audio.value.volume = value
    }
  }

  const progress = computed(() => {
    if (duration.value === 0) return 0
    return currentTime.value / duration.value
  })

  return {
    playlist,
    currentIndex,
    isPlaying,
    volume,
    currentTime,
    duration,
    currentSong,
    progress,
    loadPlaylist,
    play,
    pause,
    togglePlay,
    next,
    prev,
    stop,
    setVolume
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add client/src/stores/bgmStore.ts
git commit -m "feat(store): add BGM store for background music"
```

---

### Task 6: Frontend — Create BgmPlayer Component

**Files:**
- Create: `client/src/components/common/BgmPlayer.vue`

- [ ] **Step 1: Create BgmPlayer.vue**

Create `D:\vibecoding\beatforge\client\src\components\common\BgmPlayer.vue`:

```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useBgmStore } from '@/stores/bgmStore'

const bgmStore = useBgmStore()

onMounted(() => {
  bgmStore.loadPlaylist()
})

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function handleVolumeChange(event: Event) {
  const target = event.target as HTMLInputElement
  bgmStore.setVolume(parseFloat(target.value))
}
</script>

<template>
  <div class="bgm-player" v-if="bgmStore.currentSong">
    <div class="song-info">
      <span class="song-icon">🎵</span>
      <div class="song-details">
        <span class="song-title">{{ bgmStore.currentSong.title }}</span>
        <span class="song-artist" v-if="bgmStore.currentSong.artist">
          - {{ bgmStore.currentSong.artist }}
        </span>
      </div>
    </div>

    <div class="controls">
      <button class="control-btn" @click="bgmStore.prev">⏮</button>
      <button class="control-btn play-btn" @click="bgmStore.togglePlay">
        {{ bgmStore.isPlaying ? '⏸️' : '▶️' }}
      </button>
      <button class="control-btn" @click="bgmStore.next">⏭</button>
    </div>

    <div class="volume-control">
      <span class="volume-icon">🔊</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        :value="bgmStore.volume"
        @input="handleVolumeChange"
        class="volume-slider"
      />
    </div>

    <div class="progress-bar">
      <div class="progress" :style="{ width: `${bgmStore.progress * 100}%` }"></div>
    </div>
  </div>
</template>

<style scoped>
.bgm-player {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.8rem 1.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.bgm-player:hover {
  border-color: var(--primary);
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.2);
}

.song-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.song-icon {
  font-size: 1.2rem;
}

.song-details {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  overflow: hidden;
}

.song-title {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  color: var(--text-muted);
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--bg-surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.control-btn:hover {
  background: var(--primary);
  color: #000;
  transform: scale(1.1);
}

.play-btn {
  width: 42px;
  height: 42px;
  font-size: 1.1rem;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.volume-icon {
  font-size: 1rem;
}

.volume-slider {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-surface);
  border-radius: 2px;
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--bg-surface);
}

.progress {
  height: 100%;
  background: var(--primary);
  transition: width 0.1s;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/BgmPlayer.vue
git commit -m "feat(components): add BgmPlayer component"
```

---

### Task 7: Frontend — Add BgmPlayer to Pages

**Files:**
- Modify: `client/src/views/SongsView.vue`
- Modify: `client/src/views/SettingsView.vue`
- Modify: `client/src/views/ProfileView.vue`
- Modify: `client/src/views/LeaderboardView.vue`

- [ ] **Step 1: Add BgmPlayer to SongsView**

In `SongsView.vue`, add import and component:

```typescript
import BgmPlayer from '@/components/common/BgmPlayer.vue'
```

Add to template after top-bar:

```vue
<BgmPlayer />
```

- [ ] **Step 2: Add BgmPlayer to SettingsView**

In `SettingsView.vue`, add import and component:

```typescript
import BgmPlayer from '@/components/common/BgmPlayer.vue'
```

Add to template after top-nav:

```vue
<BgmPlayer />
```

- [ ] **Step 3: Add BgmPlayer to ProfileView**

In `ProfileView.vue`, add import and component:

```typescript
import BgmPlayer from '@/components/common/BgmPlayer.vue'
```

Add to template after top-nav:

```vue
<BgmPlayer />
```

- [ ] **Step 4: Add BgmPlayer to LeaderboardView**

In `LeaderboardView.vue`, add import and component:

```typescript
import BgmPlayer from '@/components/common/BgmPlayer.vue'
```

Add to template after top-nav:

```vue
<BgmPlayer />
```

- [ ] **Step 5: Commit**

```bash
git add client/src/views/SongsView.vue client/src/views/SettingsView.vue client/src/views/ProfileView.vue client/src/views/LeaderboardView.vue
git commit -m "feat(pages): add BgmPlayer to all pages except homepage and game"
```

---

### Task 8: Frontend — Create Admin Page

**Files:**
- Create: `client/src/views/admin/BgmAdmin.vue`
- Modify: `client/src/router/index.ts`

- [ ] **Step 1: Create BgmAdmin.vue**

Create `D:\vibecoding\beatforge\client\src\views\admin\BgmAdmin.vue`:

```vue
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
```

- [ ] **Step 2: Add admin route to router**

In `client/src/router/index.ts`, add:

```typescript
{
  path: '/admin/bgm',
  name: 'BgmAdmin',
  component: () => import('@/views/admin/BgmAdmin.vue'),
  meta: { requiresAuth: true }
},
```

- [ ] **Step 3: Commit**

```bash
git add client/src/views/admin/BgmAdmin.vue client/src/router/index.ts
git commit -m "feat(admin): add BGM admin page for playlist management"
```

---

### Task 9: Integration Testing

**Files:**
- Test all endpoints and UI

- [ ] **Step 1: Start development server**

Run: `cd /d/vibecoding/beatforge && npm run dev`

- [ ] **Step 2: Test backend APIs**

Test playlist:
```bash
curl http://localhost:3000/api/bgm/playlist
```
Expected: `{"songs": []}`

- [ ] **Step 3: Test frontend**

1. Login as admin
2. Navigate to `/admin/bgm`
3. Verify admin page loads
4. Verify BgmPlayer appears on other pages

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete BGM radio feature with admin management"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Database migration | db.ts |
| 2 | BGM routes | bgm.ts |
| 3 | BGM upload | upload.ts |
| 4 | Register routes | index.ts |
| 5 | BGM store | bgmStore.ts |
| 6 | BgmPlayer component | BgmPlayer.vue |
| 7 | Add to pages | 4 views |
| 8 | Admin page | BgmAdmin.vue |
| 9 | Integration testing | All |

**Total: 9 tasks, ~35 steps**
