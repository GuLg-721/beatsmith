# Play History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add play history, best scores, and grade distribution to the Profile page with tab-based navigation.

**Architecture:** Backend adds 3 new API endpoints for user stats, scores, and best scores. Frontend adds tab navigation to ProfileView with theme-adaptive cards.

**Tech Stack:** Vue 3 + TypeScript, Express + sql.js

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/routes/users.ts` | Create | User stats/scores/best endpoints |
| `server/src/index.ts` | Modify | Register user routes |
| `client/src/views/ProfileView.vue` | Modify | Add tabs and play history |

---

### Task 1: Backend — Create User Routes

**Files:**
- Create: `server/src/routes/users.ts`

- [ ] **Step 1: Create users.ts with stats endpoint**

Create `D:\vibecoding\beatforge\server\src\routes\users.ts`:

```typescript
import { Router, Request, Response } from 'express'
import { getDB } from '../db'

const router = Router()

// GET /api/users/:id/stats — 用户统计数据
router.get('/:id/stats', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const userId = parseInt(req.params.id)

    if (isNaN(userId)) {
      res.status(400).json({ message: '无效的用户 ID' })
      return
    }

    // 检查用户是否存在
    const userResult = db.exec('SELECT id FROM users WHERE id = ?', [userId])
    if (userResult.length === 0 || userResult[0].values.length === 0) {
      res.status(404).json({ message: '用户不存在' })
      return
    }

    const result = db.exec(
      `SELECT
        COALESCE(SUM(s.score), 0) as total_score,
        COUNT(s.id) as play_count,
        MAX(s.grade) as best_grade,
        COALESCE(AVG(s.accuracy), 0) as avg_accuracy,
        SUM(CASE WHEN s.grade = 'SSS' THEN 1 ELSE 0 END) as sss,
        SUM(CASE WHEN s.grade = 'SS' THEN 1 ELSE 0 END) as ss,
        SUM(CASE WHEN s.grade = 'S' THEN 1 ELSE 0 END) as s,
        SUM(CASE WHEN s.grade = 'A' THEN 1 ELSE 0 END) as a,
        SUM(CASE WHEN s.grade = 'B' THEN 1 ELSE 0 END) as b
       FROM scores s
       WHERE s.user_id = ?`,
      [userId]
    )

    const row = result.length > 0 ? result[0].values[0] : null

    const stats = {
      totalScore: row?.[0] || 0,
      playCount: row?.[1] || 0,
      bestGrade: row?.[2] || '-',
      avgAccuracy: Math.round((row?.[3] as number) * 10) / 10 || 0,
      grades: {
        sss: row?.[4] || 0,
        ss: row?.[5] || 0,
        s: row?.[6] || 0,
        a: row?.[7] || 0,
        b: row?.[8] || 0
      }
    }

    res.status(200).json(stats)
  } catch (err) {
    console.error('Get user stats error:', err)
    res.status(500).json({ message: '获取用户统计失败' })
  }
})
```

- [ ] **Step 2: Add scores endpoint**

Add to `server/src/routes/users.ts`:

```typescript
// GET /api/users/:id/scores — 用户游玩记录
router.get('/:id/scores', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const userId = parseInt(req.params.id)
    const { limit = '10' } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)))

    if (isNaN(userId)) {
      res.status(400).json({ message: '无效的用户 ID' })
      return
    }

    const result = db.exec(
      `SELECT s.id, s.beatmap_id, s.score, s.accuracy, s.grade,
              s.max_combo, s.perfect, s.great, s.good, s.miss,
              s.played_at, b.title, b.artist
       FROM scores s
       LEFT JOIN beatmaps b ON s.beatmap_id = b.id
       WHERE s.user_id = ?
       ORDER BY s.played_at DESC
       LIMIT ?`,
      [userId, limitNum]
    )

    const scores = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      beatmapId: row[1],
      score: row[2],
      accuracy: row[3],
      grade: row[4],
      maxCombo: row[5],
      perfect: row[6],
      great: row[7],
      good: row[8],
      miss: row[9],
      playedAt: row[10],
      title: row[11],
      artist: row[12]
    })) : []

    res.status(200).json({ scores })
  } catch (err) {
    console.error('Get user scores error:', err)
    res.status(500).json({ message: '获取用户游玩记录失败' })
  }
})
```

- [ ] **Step 3: Add best scores endpoint**

Add to `server/src/routes/users.ts`:

```typescript
// GET /api/users/:id/best — 用户最佳成绩
router.get('/:id/best', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const userId = parseInt(req.params.id)

    if (isNaN(userId)) {
      res.status(400).json({ message: '无效的用户 ID' })
      return
    }

    const result = db.exec(
      `SELECT s.beatmap_id, s.score, s.accuracy, s.grade,
              s.max_combo, s.played_at, b.title, b.artist
       FROM scores s
       LEFT JOIN beatmaps b ON s.beatmap_id = b.id
       WHERE s.user_id = ?
       GROUP BY s.beatmap_id
       HAVING s.score = (
         SELECT MAX(s2.score) FROM scores s2
         WHERE s2.user_id = s.user_id AND s2.beatmap_id = s.beatmap_id
       )
       ORDER BY s.score DESC`,
      [userId]
    )

    const bestScores = result.length > 0 ? result[0].values.map(row => ({
      beatmapId: row[0],
      score: row[1],
      accuracy: row[2],
      grade: row[3],
      maxCombo: row[4],
      playedAt: row[5],
      title: row[6],
      artist: row[7]
    })) : []

    res.status(200).json({ bestScores })
  } catch (err) {
    console.error('Get user best scores error:', err)
    res.status(500).json({ message: '获取用户最佳成绩失败' })
  }
})

export default router
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/users.ts
git commit -m "feat(api): add user stats, scores, and best endpoints"
```

---

### Task 2: Backend — Register User Routes

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Import and register user routes**

In `server/src/index.ts`, add import:

```typescript
import userRoutes from './routes/users'
```

Add route registration:

```typescript
app.use('/api/users', userRoutes)
```

- [ ] **Step 2: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(api): register user routes"
```

---

### Task 3: Frontend — Add Tabs to ProfileView

**Files:**
- Modify: `client/src/views/ProfileView.vue`

- [ ] **Step 1: Add tab state and data fetching**

Add to the script section:

```typescript
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

// Call fetchTabData when profile loads
onMounted(async () => {
  loading.value = false
  fetchTabData()
})
```

- [ ] **Step 2: Add tabs and content to template**

Replace the content section after stats-grid:

```vue
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
```

- [ ] **Step 3: Add tab styles**

Add to `<style scoped>`:

```css
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
```

- [ ] **Step 4: Commit**

```bash
git add client/src/views/ProfileView.vue
git commit -m "feat(profile): add tabs with play history, best scores, grade distribution"
```

---

### Task 4: Integration Testing

**Files:**
- Test all endpoints and UI

- [ ] **Step 1: Start development server**

Run: `cd /d/vibecoding/beatforge && npm run dev`

- [ ] **Step 2: Test backend APIs**

Test stats API:
```bash
curl http://localhost:3000/api/users/2/stats
```
Expected: Stats for user 2 (player1)

Test scores API:
```bash
curl http://localhost:3000/api/users/2/scores
```
Expected: Scores for user 2

Test best API:
```bash
curl http://localhost:3000/api/users/2/best
```
Expected: Best scores for user 2

- [ ] **Step 3: Test frontend**

1. Navigate to `/profile/2` (player1)
2. Verify tabs switch correctly
3. Verify grade badges show correct colors
4. Verify empty state shows for users with no data

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete play history feature with profile tabs"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Backend user routes | users.ts |
| 2 | Register routes | index.ts |
| 3 | ProfileView tabs | ProfileView.vue |
| 4 | Integration testing | All |

**Total: 4 tasks, ~15 steps**
