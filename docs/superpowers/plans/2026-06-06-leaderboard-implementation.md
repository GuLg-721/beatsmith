# Leaderboard Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-featured leaderboard page with tab-based navigation showing global total score, play count, grade distribution, and per-song rankings.

**Architecture:** Backend adds 3 new API endpoints for different ranking types. Frontend uses tab-based layout with TopThree podium, RankList, and SongSelector components.

**Tech Stack:** Vue 3 + TypeScript, Express + sql.js, Canvas 2D (for podium effects)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/routes/leaderboard.ts` | Create | 3 leaderboard API endpoints |
| `server/src/index.ts` | Modify | Register leaderboard routes |
| `client/src/components/leaderboard/TopThree.vue` | Create | Top 3 podium display |
| `client/src/components/leaderboard/RankList.vue` | Create | Ranking list component |
| `client/src/components/leaderboard/SongSelector.vue` | Create | Song selector for per-song tab |
| `client/src/views/LeaderboardView.vue` | Rewrite | Full leaderboard page |

---

### Task 1: Backend — Create Leaderboard Routes

**Files:**
- Create: `server/src/routes/leaderboard.ts`

- [ ] **Step 1: Create leaderboard.ts with total score endpoint**

Create `D:\vibecoding\beatforge\server\src\routes\leaderboard.ts`:

```typescript
import { Router, Request, Response } from 'express'
import { getDB } from '../db'

const router = Router()

// GET /api/leaderboard/total — 全局总分排行
router.get('/total', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const { limit = '50' } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)))

    const result = db.exec(
      `SELECT u.id, u.username, u.nickname,
              SUM(s.score) as total_score,
              MAX(s.grade) as best_grade,
              COUNT(s.id) as play_count
       FROM scores s
       JOIN users u ON s.user_id = u.id
       GROUP BY u.id
       ORDER BY total_score DESC
       LIMIT ?`,
      [limitNum]
    )

    const rankings = result.length > 0 ? result[0].values.map((row, index) => ({
      rank: index + 1,
      userId: row[0],
      username: row[1],
      nickname: row[2],
      totalScore: row[3],
      bestGrade: row[4],
      playCount: row[5]
    })) : []

    res.status(200).json({ rankings })
  } catch (err) {
    console.error('Get total leaderboard error:', err)
    res.status(500).json({ message: '获取排行榜失败' })
  }
})

export default router
```

- [ ] **Step 2: Add play count endpoint**

Add to `server/src/routes/leaderboard.ts`:

```typescript
// GET /api/leaderboard/plays — 游玩次数排行
router.get('/plays', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const { limit = '50' } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)))

    const result = db.exec(
      `SELECT u.id, u.username, u.nickname,
              COUNT(s.id) as play_count,
              AVG(s.accuracy) as avg_accuracy,
              COUNT(DISTINCT s.beatmap_id) as unique_songs
       FROM scores s
       JOIN users u ON s.user_id = u.id
       GROUP BY u.id
       ORDER BY play_count DESC
       LIMIT ?`,
      [limitNum]
    )

    const rankings = result.length > 0 ? result[0].values.map((row, index) => ({
      rank: index + 1,
      userId: row[0],
      username: row[1],
      nickname: row[2],
      playCount: row[3],
      avgAccuracy: Math.round((row[4] as number) * 10) / 10,
      uniqueSongs: row[5]
    })) : []

    res.status(200).json({ rankings })
  } catch (err) {
    console.error('Get plays leaderboard error:', err)
    res.status(500).json({ message: '获取排行榜失败' })
  }
})
```

- [ ] **Step 3: Add grade ranking endpoint**

Add to `server/src/routes/leaderboard.ts`:

```typescript
// GET /api/leaderboard/grades — 评级排行
router.get('/grades', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const { limit = '50' } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)))

    const result = db.exec(
      `SELECT u.id, u.username, u.nickname,
              SUM(CASE WHEN s.grade = 'SSS' THEN 1 ELSE 0 END) as sss,
              SUM(CASE WHEN s.grade = 'SS' THEN 1 ELSE 0 END) as ss_count,
              SUM(CASE WHEN s.grade = 'S' THEN 1 ELSE 0 END) as s_count,
              SUM(CASE WHEN s.grade = 'A' THEN 1 ELSE 0 END) as a_count,
              SUM(CASE WHEN s.grade = 'B' THEN 1 ELSE 0 END) as b_count,
              COUNT(s.id) as total_grades
       FROM scores s
       JOIN users u ON s.user_id = u.id
       GROUP BY u.id
       ORDER BY sss DESC, ss_count DESC, s_count DESC
       LIMIT ?`,
      [limitNum]
    )

    const rankings = result.length > 0 ? result[0].values.map((row, index) => ({
      rank: index + 1,
      userId: row[0],
      username: row[1],
      nickname: row[2],
      sss: row[3],
      ss: row[4],
      s: row[5],
      a: row[6],
      b: row[7],
      totalGrades: row[8]
    })) : []

    res.status(200).json({ rankings })
  } catch (err) {
    console.error('Get grades leaderboard error:', err)
    res.status(500).json({ message: '获取排行榜失败' })
  }
})
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/leaderboard.ts
git commit -m "feat(api): add leaderboard routes for total, plays, grades"
```

---

### Task 2: Backend — Register Leaderboard Routes

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Import and register leaderboard routes**

In `server/src/index.ts`, add import:

```typescript
import leaderboardRoutes from './routes/leaderboard'
```

Add route registration after the scores route:

```typescript
app.use('/api/leaderboard', leaderboardRoutes)
```

- [ ] **Step 2: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(api): register leaderboard routes"
```

---

### Task 3: Frontend — Create TopThree Component

**Files:**
- Create: `client/src/components/leaderboard/TopThree.vue`

- [ ] **Step 1: Create directory and TopThree.vue**

Run: `mkdir -p /d/vibecoding/beatforge/client/src/components/leaderboard`

Create `D:\vibecoding\beatforge\client\src\components\leaderboard\TopThree.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{
  rankings: any[]
  type: 'total' | 'plays' | 'grades'
}>()

const medals = ['🥇', '🥈', '🥉']

function formatScore(score: number): string {
  return score.toLocaleString()
}
</script>

<template>
  <div class="top-three">
    <div
      v-for="(player, index) in rankings.slice(0, 3)"
      :key="player.userId"
      class="podium-item"
      :class="{ first: index === 0, second: index === 1, third: index === 2 }"
    >
      <div class="medal">{{ medals[index] }}</div>
      <div class="player-name">{{ player.nickname || player.username }}</div>

      <div v-if="type === 'total'" class="player-stat">
        <span class="stat-value">{{ formatScore(player.totalScore) }}</span>
        <span class="stat-label">总分</span>
      </div>

      <div v-else-if="type === 'plays'" class="player-stat">
        <span class="stat-value">{{ player.playCount }}</span>
        <span class="stat-label">游玩次数</span>
      </div>

      <div v-else-if="type === 'grades'" class="player-stat grades">
        <div class="grade-badges">
          <span v-if="player.sss > 0" class="grade sss">SSS×{{ player.sss }}</span>
          <span v-if="player.ss > 0" class="grade ss">SS×{{ player.ss }}</span>
          <span v-if="player.s > 0" class="grade s">S×{{ player.s }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-three {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 1.5rem;
  padding: 2rem 1rem;
  margin-bottom: 1.5rem;
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.2rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  min-width: 120px;
  transition: transform 0.2s, border-color 0.2s;
}

.podium-item:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
}

.podium-item.first {
  transform: translateY(-10px);
  border-color: rgba(255, 215, 0, 0.5);
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.1), var(--bg-card));
}

.podium-item.first:hover {
  transform: translateY(-14px);
}

.podium-item.second {
  border-color: rgba(192, 192, 192, 0.4);
  background: linear-gradient(180deg, rgba(192, 192, 192, 0.08), var(--bg-card));
}

.podium-item.third {
  border-color: rgba(205, 127, 50, 0.4);
  background: linear-gradient(180deg, rgba(205, 127, 50, 0.08), var(--bg-card));
}

.medal {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.player-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
  text-align: center;
}

.player-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.grade-badges {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.grade {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.grade.sss { color: #ff66aa; background: rgba(255, 102, 170, 0.15); }
.grade.ss { color: #bf00ff; background: rgba(191, 0, 255, 0.15); }
.grade.s { color: #00d4ff; background: rgba(0, 212, 255, 0.15); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/leaderboard/TopThree.vue
git commit -m "feat(components): add TopThree podium component"
```

---

### Task 4: Frontend — Create RankList Component

**Files:**
- Create: `client/src/components/leaderboard/RankList.vue`

- [ ] **Step 1: Create RankList.vue**

Create `D:\vibecoding\beatforge\client\src\components\leaderboard\RankList.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{
  rankings: any[]
  type: 'total' | 'plays' | 'grades'
}>()

function formatScore(score: number): string {
  return score.toLocaleString()
}

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'SSS': '#ff66aa', 'SS': '#bf00ff', 'S': '#00d4ff',
    'A': '#00ff88', 'B': '#fcee09', 'C': '#ff6600', 'D': '#ff4466'
  }
  return colors[grade] || '#888888'
}
</script>

<template>
  <div class="rank-list">
    <div
      v-for="player in rankings"
      :key="player.userId"
      class="rank-item"
    >
      <span class="rank-num">{{ player.rank }}</span>
      <span class="player-name">{{ player.nickname || player.username }}</span>

      <div v-if="type === 'total'" class="rank-stats">
        <span class="grade-badge" :style="{ color: getGradeColor(player.bestGrade), borderColor: getGradeColor(player.bestGrade) }">
          {{ player.bestGrade }}
        </span>
        <span class="score">{{ formatScore(player.totalScore) }}</span>
      </div>

      <div v-else-if="type === 'plays'" class="rank-stats">
        <span class="accuracy">{{ player.avgAccuracy }}%</span>
        <span class="score">{{ player.playCount }} 次</span>
      </div>

      <div v-else-if="type === 'grades'" class="rank-stats grades">
        <span v-if="player.sss > 0" class="mini-grade sss">{{ player.sss }}SSS</span>
        <span v-if="player.ss > 0" class="mini-grade ss">{{ player.ss }}SS</span>
        <span v-if="player.s > 0" class="mini-grade s">{{ player.s }}S</span>
      </div>
    </div>

    <div v-if="rankings.length === 0" class="empty-state">
      <p>暂无数据</p>
    </div>
  </div>
</template>

<style scoped>
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rank-item {
  display: flex;
  align-items: center;
  padding: 0.8rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: border-color 0.2s, transform 0.2s;
}

.rank-item:hover {
  border-color: var(--primary);
  transform: translateX(4px);
}

.rank-num {
  width: 40px;
  font-weight: 600;
  color: var(--text-muted);
}

.player-name {
  flex: 1;
  font-weight: 500;
  color: var(--text);
}

.rank-stats {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.grade-badge {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border: 1px solid;
  border-radius: 4px;
}

.score {
  font-weight: 600;
  color: var(--primary);
  min-width: 80px;
  text-align: right;
}

.accuracy {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.grades {
  gap: 0.4rem;
}

.mini-grade {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}

.mini-grade.sss { color: #ff66aa; background: rgba(255, 102, 170, 0.15); }
.mini-grade.ss { color: #bf00ff; background: rgba(191, 0, 255, 0.15); }
.mini-grade.s { color: #00d4ff; background: rgba(0, 212, 255, 0.15); }

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/leaderboard/RankList.vue
git commit -m "feat(components): add RankList component"
```

---

### Task 5: Frontend — Create SongSelector Component

**Files:**
- Create: `client/src/components/leaderboard/SongSelector.vue`

- [ ] **Step 1: Create SongSelector.vue**

Create `D:\vibecoding\beatforge\client\src\components\leaderboard\SongSelector.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const props = defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const songs = ref<any[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get('/api/maps', { params: { limit: 100 } })
    songs.value = res.data.maps
  } catch (err) {
    console.error('Failed to fetch songs:', err)
  } finally {
    loading.value = false
  }
})

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value || null)
}
</script>

<template>
  <div class="song-selector">
    <label class="selector-label">选择歌曲</label>
    <select
      class="selector-select"
      :value="modelValue"
      @change="handleChange"
      :disabled="loading"
    >
      <option value="">-- 选择一首歌曲 --</option>
      <option
        v-for="song in songs"
        :key="song.id"
        :value="song.id"
      >
        {{ song.title }} - {{ song.artist || 'Unknown' }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.song-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.selector-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.selector-select {
  padding: 0.7rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text);
  font-size: 0.95rem;
  cursor: pointer;
  transition: border-color 0.2s;
}

.selector-select:focus {
  outline: none;
  border-color: var(--primary);
}

.selector-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/leaderboard/SongSelector.vue
git commit -m "feat(components): add SongSelector component"
```

---

### Task 6: Frontend — Rewrite LeaderboardView

**Files:**
- Modify: `client/src/views/LeaderboardView.vue`

- [ ] **Step 1: Rewrite LeaderboardView.vue**

Replace the entire content of `D:\vibecoding\beatforge\client\src\views\LeaderboardView.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
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
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/LeaderboardView.vue
git commit -m "feat(view): implement full leaderboard page with tabs"
```

---

### Task 7: Integration Testing

**Files:**
- Test all endpoints and UI

- [ ] **Step 1: Start development server**

Run: `cd /d/vibecoding/beatforge && npm run dev`

- [ ] **Step 2: Test backend APIs**

Test total leaderboard:
```bash
curl http://localhost:3000/api/leaderboard/total
```
Expected: `{"rankings": []}`

Test plays leaderboard:
```bash
curl http://localhost:3000/api/leaderboard/plays
```
Expected: `{"rankings": []}`

Test grades leaderboard:
```bash
curl http://localhost:3000/api/leaderboard/grades
```
Expected: `{"rankings": []}`

- [ ] **Step 3: Test frontend**

1. Navigate to `/leaderboard`
2. Verify tabs switch correctly
3. Verify empty state shows "暂无数据"
4. Select a song in the per-song tab

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete leaderboard page with all ranking types"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Backend leaderboard routes | leaderboard.ts |
| 2 | Register routes | index.ts |
| 3 | TopThree component | TopThree.vue |
| 4 | RankList component | RankList.vue |
| 5 | SongSelector component | SongSelector.vue |
| 6 | LeaderboardView page | LeaderboardView.vue |
| 7 | Integration testing | All |

**Total: 7 tasks, ~25 steps**
