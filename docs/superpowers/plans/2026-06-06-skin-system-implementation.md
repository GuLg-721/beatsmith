# Skin System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add skin customization to Settings page with 3 preset sound schemes, 3 preset cursor styles, and custom upload options.

**Architecture:** Backend adds skin settings column and API endpoints. Frontend adds SoundSettings and CursorSettings components to SettingsView.

**Tech Stack:** Vue 3 + TypeScript, Express + sql.js, Web Audio API, CSS cursors

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/db.ts` | Modify | Add skin_settings column |
| `server/src/routes/users.ts` | Modify | Add skin GET/PUT endpoints |
| `server/src/routes/upload.ts` | Modify | Add sound/cursor upload |
| `server/uploads/sounds/` | Create dir | Store custom sounds |
| `server/uploads/cursors/` | Create dir | Store custom cursors |
| `client/src/components/settings/SoundSettings.vue` | Create | Sound scheme selector |
| `client/src/components/settings/CursorSettings.vue` | Create | Cursor style selector |
| `client/src/views/SettingsView.vue` | Modify | Add new settings cards |
| `client/src/stores/authStore.ts` | Modify | Add skin update methods |

---

### Task 1: Database Migration — Add Skin Settings Column

**Files:**
- Modify: `server/src/db.ts`

- [ ] **Step 1: Add skin_settings column to users table**

In `server/src/db.ts`, add migration after existing migrations:

```typescript
// 迁移：为现有数据库添加 skin_settings 列
try {
  db.run("ALTER TABLE users ADD COLUMN skin_settings TEXT DEFAULT NULL")
} catch (e) {
  // 列已存在，忽略错误
}
```

- [ ] **Step 2: Update CREATE TABLE statement**

Update the users table creation to include skin_settings:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  theme TEXT DEFAULT 'osu',
  skin_settings TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

- [ ] **Step 3: Commit**

```bash
git add server/src/db.ts
git commit -m "feat(db): add skin_settings column to users table"
```

---

### Task 2: Backend — Add Skin Endpoints

**Files:**
- Modify: `server/src/routes/users.ts`

- [ ] **Step 1: Add GET /api/users/:id/skin endpoint**

Add to `server/src/routes/users.ts`:

```typescript
// GET /api/users/:id/skin — 获取用户皮肤设置
router.get('/:id/skin', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const userId = parseInt(req.params.id)

    if (isNaN(userId)) {
      res.status(400).json({ message: '无效的用户 ID' })
      return
    }

    const result = db.exec(
      'SELECT skin_settings FROM users WHERE id = ?',
      [userId]
    )

    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ message: '用户不存在' })
      return
    }

    const skinSettings = result[0].values[0][0]
    const parsed = skinSettings ? JSON.parse(skinSettings as string) : {
      soundScheme: 'default',
      customSounds: { click: null, hit: null, grade: null },
      cursor: 'cross',
      customCursor: null
    }

    res.status(200).json(parsed)
  } catch (err) {
    console.error('Get skin settings error:', err)
    res.status(500).json({ message: '获取皮肤设置失败' })
  }
})
```

- [ ] **Step 2: Add PUT /api/users/:id/skin endpoint**

Add to `server/src/routes/users.ts`:

```typescript
// PUT /api/users/:id/skin — 更新用户皮肤设置
router.put('/:id/skin', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const userId = parseInt(req.params.id)

    if (isNaN(userId)) {
      res.status(400).json({ message: '无效的用户 ID' })
      return
    }

    const { soundScheme, customSounds, cursor, customCursor } = req.body

    const skinSettings = JSON.stringify({
      soundScheme: soundScheme || 'default',
      customSounds: customSounds || { click: null, hit: null, grade: null },
      cursor: cursor || 'cross',
      customCursor: customCursor || null
    })

    db.run(
      'UPDATE users SET skin_settings = ? WHERE id = ?',
      [skinSettings, userId]
    )
    scheduleSave()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Update skin settings error:', err)
    res.status(500).json({ message: '更新皮肤设置失败' })
  }
})
```

- [ ] **Step 3: Update GET /api/users/:id to include skin_settings**

Update the GET /api/users/:id endpoint to include skin_settings in the response.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/users.ts
git commit -m "feat(api): add skin settings endpoints"
```

---

### Task 3: Backend — Add Sound/Cursor Upload

**Files:**
- Modify: `server/src/routes/upload.ts`
- Create: `server/uploads/sounds/` directory
- Create: `server/uploads/cursors/` directory

- [ ] **Step 1: Create directories**

```bash
mkdir -p /d/vibecoding/beatforge/server/uploads/sounds
mkdir -p /d/vibecoding/beatforge/server/uploads/cursors
```

- [ ] **Step 2: Add sound upload endpoint**

Add to `server/src/routes/upload.ts`:

```typescript
// 音效文件存储配置
const soundStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'sounds'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `sound-${nanoid(8)}${ext}`)
  }
})

const uploadSound = multer({
  storage: soundStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
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

// POST /api/upload/sound
router.post('/sound', authMiddleware, (req: AuthRequest, res: Response) => {
  uploadSound.single('sound')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ message: '文件大小超过 1MB 限制' })
          return
        }
        res.status(400).json({ message: err.message })
        return
      }
      res.status(400).json({ message: err.message })
      return
    }

    if (!req.file) {
      res.status(400).json({ message: '请选择音效文件' })
      return
    }

    res.status(200).json({
      url: `/uploads/sounds/${req.file.filename}`
    })
  })
})
```

- [ ] **Step 3: Add cursor upload endpoint**

Add to `server/src/routes/upload.ts`:

```typescript
// 光标文件存储配置
const cursorStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'cursors'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `cursor-${nanoid(8)}${ext}`)
  }
})

const uploadCursor = multer({
  storage: cursorStorage,
  limits: { fileSize: 100 * 1024 }, // 100KB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.svg', '.cur']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的图片格式'))
    }
  }
})

// POST /api/upload/cursor
router.post('/cursor', authMiddleware, (req: AuthRequest, res: Response) => {
  uploadCursor.single('cursor')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ message: '文件大小超过 100KB 限制' })
          return
        }
        res.status(400).json({ message: err.message })
        return
      }
      res.status(400).json({ message: err.message })
      return
    }

    if (!req.file) {
      res.status(400).json({ message: '请选择光标文件' })
      return
    }

    res.status(200).json({
      url: `/uploads/cursors/${req.file.filename}`
    })
  })
})
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/upload.ts server/uploads/sounds/ server/uploads/cursors/
git commit -m "feat(api): add sound and cursor upload endpoints"
```

---

### Task 4: Frontend — Create SoundSettings Component

**Files:**
- Create: `client/src/components/settings/SoundSettings.vue`

- [ ] **Step 1: Create SoundSettings.vue**

Create `D:\vibecoding\beatforge\client\src\components\settings\SoundSettings.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import api from '@/utils/api'

const authStore = useAuthStore()

const soundSchemes = [
  { id: 'default', name: '默认', description: '轻敲声 + 打击声 + 叮咚声' },
  { id: 'electronic', name: '电子', description: '电子音 + 合成器 + 电音' },
  { id: 'mechanical', name: '机械', description: '机械键 + 金属撞击 + 齿轮声' }
]

const currentScheme = ref('default')
const customSounds = ref<{ click: string | null; hit: string | null; grade: string | null }>({
  click: null,
  hit: null,
  grade: null
})
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()
const uploadType = ref<'click' | 'hit' | 'grade'>('click')

onMounted(async () => {
  try {
    const res = await api.get(`/api/users/${authStore.user?.id}/skin`)
    currentScheme.value = res.data.soundScheme || 'default'
    customSounds.value = res.data.customSounds || { click: null, hit: null, grade: null }
  } catch (err) {
    console.error('Failed to load skin settings:', err)
  }
})

function selectScheme(schemeId: string) {
  currentScheme.value = schemeId
  saveSettings()
}

async function saveSettings() {
  try {
    await api.put(`/api/users/${authStore.user?.id}/skin`, {
      soundScheme: currentScheme.value,
      customSounds: customSounds.value,
      cursor: authStore.user?.skinSettings?.cursor || 'cross',
      customCursor: authStore.user?.skinSettings?.customCursor || null
    })
  } catch (err) {
    console.error('Failed to save skin settings:', err)
  }
}

function triggerUpload(type: 'click' | 'hit' | 'grade') {
  uploadType.value = type
  fileInput.value?.click()
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 1 * 1024 * 1024) {
    alert('文件大小不能超过 1MB')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('sound', file)

    const res = await api.post('/api/upload/sound', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    customSounds.value[uploadType.value] = res.data.url
    saveSettings()
  } catch (err) {
    alert(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function playPreview(type: 'click' | 'hit' | 'grade') {
  // Preview sound using Web Audio API
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  if (type === 'click') {
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
  } else if (type === 'hit') {
    oscillator.frequency.value = 400
    oscillator.type = 'square'
  } else {
    oscillator.frequency.value = 1200
    oscillator.type = 'triangle'
  }

  gainNode.gain.value = 0.3
  oscillator.start()
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
  oscillator.stop(ctx.currentTime + 0.1)
}
</script>

<template>
  <div class="sound-settings">
    <div class="scheme-grid">
      <button
        v-for="scheme in soundSchemes"
        :key="scheme.id"
        class="scheme-card"
        :class="{ active: currentScheme === scheme.id }"
        @click="selectScheme(scheme.id)"
      >
        <div class="scheme-name">{{ scheme.name }}</div>
        <div class="scheme-desc">{{ scheme.description }}</div>
      </button>
    </div>

    <div class="custom-sounds">
      <h4>自定义音效</h4>
      <div class="sound-list">
        <div class="sound-item">
          <span>点击音效</span>
          <button class="preview-btn" @click="playPreview('click')">预览</button>
          <button class="upload-btn" @click="triggerUpload('click')" :disabled="uploading">
            {{ customSounds.click ? '已上传' : '上传' }}
          </button>
        </div>
        <div class="sound-item">
          <span>打击音效</span>
          <button class="preview-btn" @click="playPreview('hit')">预览</button>
          <button class="upload-btn" @click="triggerUpload('hit')" :disabled="uploading">
            {{ customSounds.hit ? '已上传' : '上传' }}
          </button>
        </div>
        <div class="sound-item">
          <span>评级音效</span>
          <button class="preview-btn" @click="playPreview('grade')">预览</button>
          <button class="upload-btn" @click="triggerUpload('grade')" :disabled="uploading">
            {{ customSounds.grade ? '已上传' : '上传' }}
          </button>
        </div>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".mp3,.wav,.ogg"
      style="display: none"
      @change="handleUpload"
    />
  </div>
</template>

<style scoped>
.sound-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.scheme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.scheme-card {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.scheme-card:hover {
  border-color: var(--primary);
}

.scheme-card.active {
  border-color: var(--primary);
  background: rgba(var(--primary-rgb), 0.1);
}

.scheme-name {
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.3rem;
}

.scheme-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.custom-sounds h4 {
  color: var(--text);
  font-size: 0.9rem;
  margin-bottom: 0.8rem;
}

.sound-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sound-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem;
  background: var(--bg-surface);
  border-radius: 6px;
}

.sound-item span {
  flex: 1;
  color: var(--text);
  font-size: 0.9rem;
}

.preview-btn, .upload-btn {
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-btn:hover, .upload-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/settings/SoundSettings.vue
git commit -m "feat(components): add SoundSettings component"
```

---

### Task 5: Frontend — Create CursorSettings Component

**Files:**
- Create: `client/src/components/settings/CursorSettings.vue`

- [ ] **Step 1: Create CursorSettings.vue**

Create `D:\vibecoding\beatforge\client\src\components\settings\CursorSettings.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import api from '@/utils/api'

const authStore = useAuthStore()

const cursorStyles = [
  {
    id: 'cross',
    name: '十字准星',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><line x1="16" y1="4" x2="16" y2="28" stroke="white" stroke-width="2"/><line x1="4" y1="16" x2="28" y2="16" stroke="white" stroke-width="2"/></svg>`
  },
  {
    id: 'square',
    name: '方框准星',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="20" height="20" fill="none" stroke="white" stroke-width="2"/></svg>`
  },
  {
    id: 'dot',
    name: '点状准星',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="13" width="6" height="6" fill="white"/><rect x="14" y="14" width="4" height="4" fill="#fcee09"/></svg>`
  }
]

const currentCursor = ref('cross')
const customCursor = ref<string | null>(null)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

onMounted(async () => {
  try {
    const res = await api.get(`/api/users/${authStore.user?.id}/skin`)
    currentCursor.value = res.data.cursor || 'cross'
    customCursor.value = res.data.customCursor || null
  } catch (err) {
    console.error('Failed to load skin settings:', err)
  }
})

function selectCursor(cursorId: string) {
  currentCursor.value = cursorId
  customCursor.value = null
  saveSettings()
}

function triggerUpload() {
  fileInput.value?.click()
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 100 * 1024) {
    alert('文件大小不能超过 100KB')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('cursor', file)

    const res = await api.post('/api/upload/cursor', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    customCursor.value = res.data.url
    currentCursor.value = 'custom'
    saveSettings()
  } catch (err) {
    alert(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function saveSettings() {
  try {
    await api.put(`/api/users/${authStore.user?.id}/skin`, {
      soundScheme: authStore.user?.skinSettings?.soundScheme || 'default',
      customSounds: authStore.user?.skinSettings?.customSounds || { click: null, hit: null, grade: null },
      cursor: currentCursor.value,
      customCursor: customCursor.value
    })
  } catch (err) {
    console.error('Failed to save skin settings:', err)
  }
}
</script>

<template>
  <div class="cursor-settings">
    <div class="cursor-grid">
      <button
        v-for="cursor in cursorStyles"
        :key="cursor.id"
        class="cursor-card"
        :class="{ active: currentCursor === cursor.id }"
        @click="selectCursor(cursor.id)"
      >
        <div class="cursor-preview" v-html="cursor.svg"></div>
        <div class="cursor-name">{{ cursor.name }}</div>
      </button>
    </div>

    <div class="custom-cursor">
      <button class="upload-btn" @click="triggerUpload" :disabled="uploading">
        {{ customCursor ? '✅ 已上传自定义光标' : '📤 上传自定义光标' }}
      </button>
      <p class="upload-hint">支持 PNG、SVG 格式，最大 100KB</p>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".png,.svg,.cur"
      style="display: none"
      @change="handleUpload"
    />
  </div>
</template>

<style scoped>
.cursor-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.cursor-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.cursor-card {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.cursor-card:hover {
  border-color: var(--primary);
}

.cursor-card.active {
  border-color: var(--primary);
  background: rgba(var(--primary-rgb), 0.1);
}

.cursor-preview {
  width: 40px;
  height: 40px;
  margin: 0 auto 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cursor-preview :deep(svg) {
  width: 100%;
  height: 100%;
}

.cursor-name {
  font-size: 0.85rem;
  color: var(--text);
}

.custom-cursor {
  text-align: center;
}

.upload-btn {
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.upload-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/settings/CursorSettings.vue
git commit -m "feat(components): add CursorSettings component"
```

---

### Task 6: Frontend — Update SettingsView

**Files:**
- Modify: `client/src/views/SettingsView.vue`

- [ ] **Step 1: Add imports**

Add to the script section:

```typescript
import SoundSettings from '../components/settings/SoundSettings.vue'
import CursorSettings from '../components/settings/CursorSettings.vue'
```

- [ ] **Step 2: Add new cards to template**

After the personal info card and before the password card, add:

```vue
    <!-- 音效设置卡片 -->
    <div class="settings-card">
      <h2 class="card-title">🔊 音效设置</h2>
      <SoundSettings />
    </div>

    <!-- 光标样式卡片 -->
    <div class="settings-card">
      <h2 class="card-title">🎯 光标样式</h2>
      <CursorSettings />
    </div>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/views/SettingsView.vue
git commit -m "feat(settings): add sound and cursor settings cards"
```

---

### Task 7: Frontend — Update Auth Store

**Files:**
- Modify: `client/src/stores/authStore.ts`

- [ ] **Step 1: Add skin settings to User interface**

Update the User interface:

```typescript
interface User {
  id: number
  username: string
  nickname: string
  avatar: string | null
  theme: string
  skinSettings: {
    soundScheme: string
    customSounds: { click: string | null; hit: string | null; grade: string | null }
    cursor: string
    customCursor: string | null
  } | null
  created_at: string
}
```

- [ ] **Step 2: Add updateSkinSettings method**

Add to the authStore:

```typescript
async function updateSkinSettings(skinSettings: any) {
  const res = await fetch(`/api/users/${user.value?.id}/skin`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`
    },
    body: JSON.stringify(skinSettings)
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.message)
  }

  user.value = { ...user.value!, skinSettings }
}
```

- [ ] **Step 3: Update return statement**

Add `updateSkinSettings` to the return.

- [ ] **Step 4: Commit**

```bash
git add client/src/stores/authStore.ts
git commit -m "feat(store): add skin settings update method"
```

---

### Task 8: Integration Testing

**Files:**
- Test all endpoints and UI

- [ ] **Step 1: Start development server**

Run: `cd /d/vibecoding/beatforge && npm run dev`

- [ ] **Step 2: Test backend APIs**

Test skin GET:
```bash
curl http://localhost:3000/api/users/1/skin
```
Expected: Default skin settings

Test skin PUT:
```bash
curl -X PUT http://localhost:3000/api/users/1/skin -H "Content-Type: application/json" -d '{"soundScheme":"electronic","cursor":"square"}'
```
Expected: `{"success": true}`

- [ ] **Step 3: Test frontend**

1. Navigate to Settings page
2. Verify sound scheme selector works
3. Verify cursor style selector works
4. Verify custom upload buttons exist

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete skin system with sound and cursor customization"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Database migration | db.ts |
| 2 | Skin endpoints | users.ts |
| 3 | Sound/cursor upload | upload.ts |
| 4 | SoundSettings component | SoundSettings.vue |
| 5 | CursorSettings component | CursorSettings.vue |
| 6 | SettingsView update | SettingsView.vue |
| 7 | Auth store update | authStore.ts |
| 8 | Integration testing | All |

**Total: 8 tasks, ~30 steps**
