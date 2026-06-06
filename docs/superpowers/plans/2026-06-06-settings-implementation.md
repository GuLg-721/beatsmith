# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete settings page with profile management, password change, avatar selection, and theme switching.

**Architecture:** Single-page card layout with 3 sections (Personal Info, Password, Theme). Backend adds 5 new API endpoints. Frontend uses CSS variable-based theme system with 3 neon color schemes.

**Tech Stack:** Vue 3 + TypeScript + Naive UI, Express + sql.js, CSS custom properties

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/db.ts` | Modify | Add `theme` column to users table |
| `server/src/routes/auth.ts` | Modify | Add profile/password/avatar/theme endpoints |
| `server/src/routes/upload.ts` | Modify | Add avatar upload endpoint |
| `server/uploads/avatars/` | Create dir | Store uploaded avatar files |
| `client/src/styles/themes.css` | Create | CSS variable definitions for 3 themes |
| `client/src/views/SettingsView.vue` | Rewrite | Full settings page layout |
| `client/src/components/settings/AvatarPicker.vue` | Create | Avatar selection + upload |
| `client/src/components/settings/PasswordForm.vue` | Create | Password change form |
| `client/src/components/settings/ThemePicker.vue` | Create | Theme color selector |
| `client/src/stores/authStore.ts` | Modify | Add theme/avatar update methods |
| `client/src/App.vue` | Modify | Load theme on startup |

---

### Task 1: Database Migration — Add Theme Column

**Files:**
- Modify: `server/src/db.ts:22-31`

- [ ] **Step 1: Add theme column to users table creation**

In `server/src/db.ts`, update the CREATE TABLE statement to include the `theme` column:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  theme TEXT DEFAULT 'osu',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

- [ ] **Step 2: Add migration for existing databases**

After the CREATE TABLE statements, add migration logic:

```typescript
// 迁移：为现有数据库添加 theme 列
try {
  db.run("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'osu'")
} catch (e) {
  // 列已存在，忽略错误
}
```

- [ ] **Step 3: Test database initialization**

Run: `cd /d/vibecoding/beatforge && npm run dev`
Expected: Server starts without errors, `data.db` file is created

- [ ] **Step 4: Commit**

```bash
git add server/src/db.ts
git commit -m "feat(db): add theme column to users table"
```

---

### Task 2: Backend — Profile Update Endpoint

**Files:**
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: Add PUT /api/auth/profile endpoint**

Add after the GET /me route:

```typescript
// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { nickname } = req.body

    if (!nickname || nickname.length < 2 || nickname.length > 20) {
      res.status(400).json({ message: '昵称长度应为 2-20 位' })
      return
    }

    if (!/^[a-zA-Z0-9一-龥_]+$/.test(nickname)) {
      res.status(400).json({ message: '昵称只能包含字母、数字、中文和下划线' })
      return
    }

    const db = getDB()
    db.run('UPDATE users SET nickname = ? WHERE id = ?', [nickname, req.user!.userId])
    scheduleSave()

    res.status(200).json({
      user: {
        id: req.user!.userId,
        nickname
      }
    })
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ message: '更新失败' })
  }
})
```

- [ ] **Step 2: Test profile update**

Run: `curl -X PUT http://localhost:3000/api/auth/profile -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"nickname": "新昵称"}'`
Expected: `{"user": {"id": 1, "nickname": "新昵称"}}`

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/auth.ts
git commit -m "feat(api): add profile update endpoint"
```

---

### Task 3: Backend — Password Change Endpoint

**Files:**
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: Add PUT /api/auth/password endpoint**

Add after the profile endpoint:

```typescript
// PUT /api/auth/password
router.put('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      res.status(400).json({ message: '请填写所有字段' })
      return
    }

    if (newPassword.length < 8) {
      res.status(400).json({ message: '新密码长度至少 8 位' })
      return
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      res.status(400).json({ message: '新密码必须包含字母和数字' })
      return
    }

    const db = getDB()
    const result = db.exec('SELECT password FROM users WHERE id = ?', [req.user!.userId])

    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ message: '用户不存在' })
      return
    }

    const currentPassword = result[0].values[0][0] as string
    const valid = await bcrypt.compare(oldPassword, currentPassword)

    if (!valid) {
      res.status(400).json({ message: '原密码错误' })
      return
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user!.userId])
    scheduleSave()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ message: '修改密码失败' })
  }
})
```

- [ ] **Step 2: Test password change**

Run: `curl -X PUT http://localhost:3000/api/auth/password -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"oldPassword": "admin123", "newPassword": "newpass123"}'`
Expected: `{"success": true}`

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/auth.ts
git commit -m "feat(api): add password change endpoint"
```

---

### Task 4: Backend — Avatar Upload Endpoint

**Files:**
- Modify: `server/src/routes/upload.ts`
- Create: `server/uploads/avatars/` directory

- [ ] **Step 1: Create avatars directory**

Run: `mkdir -p /d/vibecoding/beatforge/server/uploads/avatars`

- [ ] **Step 2: Add avatar upload storage config**

Add after the coverStorage config:

```typescript
// 头像文件存储配置
const avatarStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'avatars'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `avatar-${nanoid(8)}${ext}`)
  }
})

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的图片格式'))
    }
  }
})
```

- [ ] **Step 3: Add POST /api/upload/avatar route**

Add after the cover upload route:

```typescript
// POST /api/upload/avatar
router.post('/avatar', authMiddleware, (req: AuthRequest, res: Response) => {
  uploadAvatar.single('avatar')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ message: '文件大小超过 2MB 限制' })
          return
        }
        res.status(400).json({ message: err.message })
        return
      }
      res.status(400).json({ message: err.message })
      return
    }

    if (!req.file) {
      res.status(400).json({ message: '请选择头像文件' })
      return
    }

    res.status(200).json({
      url: `/uploads/avatars/${req.file.filename}`
    })
  })
})
```

- [ ] **Step 4: Test avatar upload**

Run: `curl -X POST http://localhost:3000/api/upload/avatar -H "Authorization: Bearer <token>" -F "avatar=@/path/to/image.jpg"`
Expected: `{"url": "/uploads/avatars/avatar-xxxxx.jpg"}`

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/upload.ts server/uploads/avatars/
git commit -m "feat(api): add avatar upload endpoint"
```

---

### Task 5: Backend — Avatar & Theme Update Endpoints

**Files:**
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: Add PUT /api/auth/avatar endpoint**

Add after the password endpoint:

```typescript
// PUT /api/auth/avatar
router.put('/avatar', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { avatarUrl } = req.body

    if (!avatarUrl) {
      res.status(400).json({ message: '头像地址不能为空' })
      return
    }

    const db = getDB()
    db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, req.user!.userId])
    scheduleSave()

    res.status(200).json({
      user: {
        id: req.user!.userId,
        avatar: avatarUrl
      }
    })
  } catch (err) {
    console.error('Update avatar error:', err)
    res.status(500).json({ message: '更新头像失败' })
  }
})
```

- [ ] **Step 2: Add PUT /api/auth/theme endpoint**

Add after the avatar endpoint:

```typescript
// PUT /api/auth/theme
router.put('/theme', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { theme } = req.body

    if (!theme || !['osu', 'cyberpunk', 'valorant'].includes(theme)) {
      res.status(400).json({ message: '无效的主题' })
      return
    }

    const db = getDB()
    db.run('UPDATE users SET theme = ? WHERE id = ?', [theme, req.user!.userId])
    scheduleSave()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Update theme error:', err)
    res.status(500).json({ message: '更新主题失败' })
  }
})
```

- [ ] **Step 3: Update GET /me to include theme**

In the GET /me route, update the SELECT to include theme:

```typescript
const result = db.exec('SELECT id, username, nickname, avatar, theme, created_at FROM users WHERE id = ?', [req.user!.userId])
```

And update the response:

```typescript
const row = result[0].values[0]
res.status(200).json({
  user: {
    id: row[0] as number,
    username: row[1] as string,
    nickname: row[2] as string,
    avatar: row[3] as string | null,
    theme: row[4] as string,
    created_at: row[5] as string
  }
})
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/auth.ts
git commit -m "feat(api): add avatar and theme update endpoints"
```

---

### Task 6: Frontend — Theme CSS System

**Files:**
- Create: `client/src/styles/themes.css`

- [ ] **Step 1: Create styles directory**

Run: `mkdir -p /d/vibecoding/beatforge/client/src/styles`

- [ ] **Step 2: Create themes.css**

```css
/* osu! 霓虹 (default) */
:root, [data-theme="osu"] {
  --primary: #ff66aa;
  --primary-rgb: 255, 102, 170;
  --primary-glow: 0 0 20px rgba(255, 102, 170, 0.5);
  --secondary: #bf00ff;
  --secondary-rgb: 191, 0, 255;
  --accent: #ff99cc;
  --bg-deep: #0a0a1a;
  --bg-surface: #12122a;
  --bg-card: #1a1a3e;
  --bg-card-hover: #222255;
  --text: #ffffff;
  --text-muted: #8888aa;
  --border: rgba(255, 102, 170, 0.3);
  --border-glow: rgba(255, 102, 170, 0.6);
  --success: #00ff88;
  --error: #ff4466;
  --warning: #ffaa00;
}

/* 赛博朋克 */
[data-theme="cyberpunk"] {
  --primary: #fcee09;
  --primary-rgb: 252, 238, 9;
  --primary-glow: 0 0 20px rgba(252, 238, 9, 0.5);
  --secondary: #00d4ff;
  --secondary-rgb: 0, 212, 255;
  --accent: #ff6600;
  --bg-deep: #0a0a0a;
  --bg-surface: #1a1a1a;
  --bg-card: #2a2a2a;
  --bg-card-hover: #3a3a3a;
  --text: #ffffff;
  --text-muted: #888888;
  --border: rgba(252, 238, 9, 0.3);
  --border-glow: rgba(252, 238, 9, 0.6);
  --success: #00ff88;
  --error: #ff4466;
  --warning: #ff6600;
}

/* Valorant */
[data-theme="valorant"] {
  --primary: #ff4655;
  --primary-rgb: 255, 70, 85;
  --primary-glow: 0 0 20px rgba(255, 70, 85, 0.5);
  --secondary: #bd3944;
  --secondary-rgb: 189, 57, 68;
  --accent: #ece8e1;
  --bg-deep: #0a0a0a;
  --bg-surface: #1a1a1a;
  --bg-card: #2a2a2a;
  --bg-card-hover: #3a3a3a;
  --text: #ffffff;
  --text-muted: #888888;
  --border: rgba(255, 70, 85, 0.3);
  --border-glow: rgba(255, 70, 85, 0.6);
  --success: #00ff88;
  --error: #ff4466;
  --warning: #ffaa00;
}
```

- [ ] **Step 3: Import themes.css in main.ts**

In `client/src/main.ts`, add import:

```typescript
import './styles/themes.css'
```

- [ ] **Step 4: Commit**

```bash
git add client/src/styles/themes.css client/src/main.ts
git commit -m "feat(theme): add CSS variable theme system"
```

---

### Task 7: Frontend — Auth Store Updates

**Files:**
- Modify: `client/src/stores/authStore.ts`

- [ ] **Step 1: Add theme to User interface**

Update the User interface:

```typescript
interface User {
  id: number
  username: string
  nickname: string
  avatar: string | null
  theme: string
  created_at: string
}
```

- [ ] **Step 2: Add updateProfile method**

Add after the logout action:

```typescript
async function updateProfile(nickname: string) {
  const res = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`
    },
    body: JSON.stringify({ nickname })
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.message)
  }

  const data = await res.json()
  user.value = { ...user.value!, ...data.user }
}

async function updatePassword(oldPassword: string, newPassword: string) {
  const res = await fetch('/api/auth/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`
    },
    body: JSON.stringify({ oldPassword, newPassword })
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.message)
  }
}

async function updateAvatar(avatarUrl: string) {
  const res = await fetch('/api/auth/avatar', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`
    },
    body: JSON.stringify({ avatarUrl })
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.message)
  }

  user.value = { ...user.value!, avatar: avatarUrl }
}

async function updateTheme(theme: string) {
  const res = await fetch('/api/auth/theme', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`
    },
    body: JSON.stringify({ theme })
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.message)
  }

  user.value = { ...user.value!, theme }
  applyTheme(theme)
}

function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem('theme', theme)
}

function loadTheme() {
  const saved = localStorage.getItem('theme') || user.value?.theme || 'osu'
  applyTheme(saved)
}
```

- [ ] **Step 3: Update return statement**

Add the new methods to the return:

```typescript
return {
  user,
  token,
  isLoggedIn,
  login,
  register,
  logout,
  fetchUser,
  updateProfile,
  updatePassword,
  updateAvatar,
  updateTheme,
  loadTheme
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/stores/authStore.ts
git commit -m "feat(store): add profile/password/avatar/theme update methods"
```

---

### Task 8: Frontend — Load Theme on App Start

**Files:**
- Modify: `client/src/App.vue`

- [ ] **Step 1: Add theme loading in onMounted**

```typescript
import { onMounted } from 'vue'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()

onMounted(() => {
  authStore.loadTheme()
})
```

- [ ] **Step 2: Commit**

```bash
git add client/src/App.vue
git commit -m "feat(app): load theme on startup"
```

---

### Task 9: Frontend — AvatarPicker Component

**Files:**
- Create: `client/src/components/settings/AvatarPicker.vue`

- [ ] **Step 1: Create settings directory**

Run: `mkdir -p /d/vibecoding/beatforge/client/src/components/settings`

- [ ] **Step 2: Create AvatarPicker.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/authStore'

const authStore = useAuthStore()
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

// 8 个预设霓虹头像 SVG
const presetAvatars = [
  { id: 'hexagon', color: '#00d4ff', path: 'M50 5 L95 27.5 L95 72.5 L50 95 L5 72.5 L5 27.5 Z' },
  { id: 'circle', color: '#ff66aa', path: 'M50 5 A45 45 0 1 1 49.99 5 Z' },
  { id: 'triangle', color: '#00ff88', path: 'M50 5 L95 90 L5 90 Z' },
  { id: 'diamond', color: '#bf00ff', path: 'M50 5 L90 50 L50 95 L10 50 Z' },
  { id: 'star', color: '#fcee09', path: 'M50 5 L61 35 L95 35 L68 57 L79 90 L50 70 L21 90 L32 57 L5 35 L39 35 Z' },
  { id: 'pentagon', color: '#00d4ff', path: 'M50 5 L95 38 L77 90 L23 90 L5 38 Z' },
  { id: 'octagon', color: '#ff4466', path: 'M65 5 L90 20 L95 50 L80 80 L50 95 L20 80 L5 50 L10 20 Z' },
  { id: 'cross', color: '#ffffff', path: 'M35 5 L65 5 L65 35 L95 35 L95 65 L65 65 L65 95 L35 95 L35 65 L5 65 L5 35 L35 35 Z' }
]

const currentAvatar = ref(authStore.user?.avatar || '')

function selectPreset(avatar: typeof presetAvatars[0]) {
  currentAvatar.value = `preset:${avatar.id}`
  authStore.updateAvatar(`preset:${avatar.id}`)
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    alert('文件大小不能超过 2MB')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('avatar', file)

    const res = await fetch('/api/upload/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      },
      body: formData
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message)
    }

    const data = await res.json()
    currentAvatar.value = data.url
    await authStore.updateAvatar(data.url)
  } catch (err) {
    alert(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function triggerUpload() {
  fileInput.value?.click()
}
</script>

<template>
  <div class="avatar-picker">
    <div class="current-avatar">
      <div v-if="currentAvatar?.startsWith('preset:')" class="avatar-display preset">
        <svg viewBox="0 0 100 100">
          <path
            :d="presetAvatars.find(a => `preset:${a.id}` === currentAvatar)?.path"
            :fill="presetAvatars.find(a => `preset:${a.id}` === currentAvatar)?.color"
            filter="url(#glow)"
          />
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>
      <div v-else-if="currentAvatar" class="avatar-display custom">
        <img :src="currentAvatar" alt="avatar" />
      </div>
      <div v-else class="avatar-display default">
        <span>👤</span>
      </div>
    </div>

    <div class="preset-grid">
      <button
        v-for="avatar in presetAvatars"
        :key="avatar.id"
        class="preset-item"
        :class="{ active: currentAvatar === `preset:${avatar.id}` }"
        @click="selectPreset(avatar)"
      >
        <svg viewBox="0 0 100 100">
          <path :d="avatar.path" :fill="avatar.color" />
        </svg>
      </button>
    </div>

    <button class="upload-btn" @click="triggerUpload" :disabled="uploading">
      {{ uploading ? '上传中...' : '📤 上传自定义头像' }}
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleUpload"
    />
  </div>
</template>

<style scoped>
.avatar-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.current-avatar {
  margin-bottom: 0.5rem;
}

.avatar-display {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border: 2px solid var(--border);
  overflow: hidden;
}

.avatar-display svg {
  width: 70%;
  height: 70%;
}

.avatar-display img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-display.default {
  font-size: 2.5rem;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.preset-item {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg-surface);
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preset-item:hover {
  border-color: var(--primary);
  transform: scale(1.1);
}

.preset-item.active {
  border-color: var(--primary);
  box-shadow: var(--primary-glow);
}

.preset-item svg {
  width: 60%;
  height: 60%;
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
  background: var(--bg-card);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/settings/AvatarPicker.vue
git commit -m "feat(components): add AvatarPicker with presets and upload"
```

---

### Task 10: Frontend — PasswordForm Component

**Files:**
- Create: `client/src/components/settings/PasswordForm.vue`

- [ ] **Step 1: Create PasswordForm.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/authStore'

const authStore = useAuthStore()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function handleSubmit() {
  error.value = ''
  success.value = ''

  if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    error.value = '请填写所有字段'
    return
  }

  if (newPassword.value.length < 8) {
    error.value = '新密码长度至少 8 位'
    return
  }

  if (!/[a-zA-Z]/.test(newPassword.value) || !/[0-9]/.test(newPassword.value)) {
    error.value = '新密码必须包含字母和数字'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    await authStore.updatePassword(oldPassword.value, newPassword.value)
    success.value = '密码修改成功！'
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '修改失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="password-form" @submit.prevent="handleSubmit">
    <div class="form-group">
      <label>当前密码</label>
      <input
        v-model="oldPassword"
        type="password"
        placeholder="请输入当前密码"
        autocomplete="current-password"
      />
    </div>

    <div class="form-group">
      <label>新密码</label>
      <input
        v-model="newPassword"
        type="password"
        placeholder="请输入新密码（至少8位，包含字母和数字）"
        autocomplete="new-password"
      />
    </div>

    <div class="form-group">
      <label>确认新密码</label>
      <input
        v-model="confirmPassword"
        type="password"
        placeholder="请再次输入新密码"
        autocomplete="new-password"
      />
    </div>

    <div v-if="error" class="message error">{{ error }}</div>
    <div v-if="success" class="message success">{{ success }}</div>

    <button type="submit" class="save-btn" :disabled="loading">
      {{ loading ? '保存中...' : '💾 保存' }}
    </button>
  </form>
</template>

<style scoped>
.password-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.form-group input {
  padding: 0.7rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-group input::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}

.message {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.message.error {
  background: rgba(255, 68, 102, 0.15);
  color: var(--error);
  border: 1px solid rgba(255, 68, 102, 0.3);
}

.message.success {
  background: rgba(0, 255, 136, 0.15);
  color: var(--success);
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.save-btn {
  align-self: flex-start;
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: #000;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--primary-glow);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/settings/PasswordForm.vue
git commit -m "feat(components): add PasswordForm with validation"
```

---

### Task 11: Frontend — ThemePicker Component

**Files:**
- Create: `client/src/components/settings/ThemePicker.vue`

- [ ] **Step 1: Create ThemePicker.vue**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/authStore'

const authStore = useAuthStore()

const themes = [
  {
    id: 'osu',
    name: 'osu! 霓虹',
    description: '粉紫色霓虹风格',
    primary: '#ff66aa',
    secondary: '#bf00ff'
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    description: '黄蓝科技感',
    primary: '#fcee09',
    secondary: '#00d4ff'
  },
  {
    id: 'valorant',
    name: 'Valorant',
    description: '红黑简约风格',
    primary: '#ff4655',
    secondary: '#bd3944'
  }
]

const currentTheme = ref('osu')

onMounted(() => {
  currentTheme.value = authStore.user?.theme || localStorage.getItem('theme') || 'osu'
})

function selectTheme(themeId: string) {
  currentTheme.value = themeId
  authStore.updateTheme(themeId)
}
</script>

<template>
  <div class="theme-picker">
    <button
      v-for="theme in themes"
      :key="theme.id"
      class="theme-card"
      :class="{ active: currentTheme === theme.id }"
      @click="selectTheme(theme.id)"
    >
      <div class="theme-preview">
        <div class="color-swatch primary" :style="{ background: theme.primary }"></div>
        <div class="color-swatch secondary" :style="{ background: theme.secondary }"></div>
      </div>
      <div class="theme-info">
        <div class="theme-name">{{ theme.name }}</div>
        <div class="theme-desc">{{ theme.description }}</div>
      </div>
      <div v-if="currentTheme === theme.id" class="check-mark">✓</div>
    </button>
  </div>
</template>

<style scoped>
.theme-picker {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.theme-card {
  flex: 1;
  min-width: 150px;
  padding: 1rem;
  border: 2px solid var(--border);
  border-radius: 12px;
  background: var(--bg-surface);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  position: relative;
}

.theme-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.theme-card.active {
  border-color: var(--primary);
  box-shadow: var(--primary-glow);
}

.theme-preview {
  display: flex;
  gap: 0.5rem;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
}

.theme-info {
  text-align: center;
}

.theme-name {
  color: var(--text);
  font-weight: 600;
  font-size: 0.95rem;
}

.theme-desc {
  color: var(--text-muted);
  font-size: 0.8rem;
  margin-top: 0.2rem;
}

.check-mark {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/settings/ThemePicker.vue
git commit -m "feat(components): add ThemePicker with 3 neon themes"
```

---

### Task 12: Frontend — SettingsView Page

**Files:**
- Modify: `client/src/views/SettingsView.vue`

- [ ] **Step 1: Rewrite SettingsView.vue**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import AvatarPicker from '../components/settings/AvatarPicker.vue'
import PasswordForm from '../components/settings/PasswordForm.vue'
import ThemePicker from '../components/settings/ThemePicker.vue'

const router = useRouter()
const authStore = useAuthStore()

const nickname = ref('')
const saving = ref(false)
const nicknameError = ref('')
const nicknameSuccess = ref('')

onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  nickname.value = authStore.user?.nickname || ''
})

async function saveNickname() {
  nicknameError.value = ''
  nicknameSuccess.value = ''

  if (nickname.value.length < 2 || nickname.value.length > 20) {
    nicknameError.value = '昵称长度应为 2-20 位'
    return
  }

  if (!/^[a-zA-Z0-9一-龥_]+$/.test(nickname.value)) {
    nicknameError.value = '昵称只能包含字母、数字、中文和下划线'
    return
  }

  saving.value = true
  try {
    await authStore.updateProfile(nickname.value)
    nicknameSuccess.value = '昵称修改成功！'
  } catch (err) {
    nicknameError.value = err instanceof Error ? err.message : '修改失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="settings-page">
    <h1 class="page-title">⚙️ 设置</h1>

    <!-- 个人信息卡片 -->
    <div class="settings-card">
      <h2 class="card-title">👤 个人信息</h2>
      <AvatarPicker />
      <div class="nickname-section">
        <div class="form-group">
          <label>昵称</label>
          <input
            v-model="nickname"
            type="text"
            placeholder="请输入昵称"
            maxlength="20"
          />
        </div>
        <div v-if="nicknameError" class="message error">{{ nicknameError }}</div>
        <div v-if="nicknameSuccess" class="message success">{{ nicknameSuccess }}</div>
        <button class="save-btn" @click="saveNickname" :disabled="saving">
          {{ saving ? '保存中...' : '💾 保存' }}
        </button>
      </div>
    </div>

    <!-- 修改密码卡片 -->
    <div class="settings-card">
      <h2 class="card-title">🔒 修改密码</h2>
      <PasswordForm />
    </div>

    <!-- 主题配色卡片 -->
    <div class="settings-card">
      <h2 class="card-title">🎨 主题配色</h2>
      <ThemePicker />
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  min-height: 100vh;
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.page-title {
  color: var(--primary);
  font-size: 2rem;
  margin-bottom: 2rem;
  text-shadow: var(--primary-glow);
}

.settings-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  transition: border-color 0.2s;
}

.settings-card:hover {
  border-color: var(--border-glow);
}

.card-title {
  color: var(--text);
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid var(--border);
}

.nickname-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.form-group input {
  padding: 0.7rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-group input::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}

.message {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.message.error {
  background: rgba(255, 68, 102, 0.15);
  color: var(--error);
  border: 1px solid rgba(255, 68, 102, 0.3);
}

.message.success {
  background: rgba(0, 255, 136, 0.15);
  color: var(--success);
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.save-btn {
  align-self: flex-start;
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: #000;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--primary-glow);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/SettingsView.vue
git commit -m "feat(view): complete SettingsView with all cards"
```

---

### Task 13: Integration Testing

**Files:**
- Test all endpoints and UI components

- [ ] **Step 1: Start the development server**

Run: `cd /d/vibecoding/beatforge && npm run dev`
Expected: Server starts on port 3000, client on port 5173

- [ ] **Step 2: Test profile update**

1. Login as admin
2. Go to Settings page
3. Change nickname to "测试管理员"
4. Click Save
5. Expected: Success message, navbar updates

- [ ] **Step 3: Test password change**

1. Enter current password: admin123
2. Enter new password: newpass123
3. Confirm new password: newpass123
4. Click Save
5. Expected: Success message
6. Logout and login with new password

- [ ] **Step 4: Test avatar selection**

1. Click on a preset avatar
2. Expected: Avatar updates immediately
3. Click Upload button
4. Select a custom image
5. Expected: Avatar updates to uploaded image

- [ ] **Step 5: Test theme switching**

1. Click "赛博朋克" theme
2. Expected: Colors change to yellow/blue instantly
3. Refresh page
4. Expected: Theme persists
5. Click "Valorant" theme
6. Expected: Colors change to red/black

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete settings page with profile, password, avatar, and themes"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Database migration | db.ts |
| 2 | Profile endpoint | auth.ts |
| 3 | Password endpoint | auth.ts |
| 4 | Avatar upload | upload.ts |
| 5 | Avatar/theme endpoints | auth.ts |
| 6 | Theme CSS system | themes.css |
| 7 | Auth store updates | authStore.ts |
| 8 | App theme loading | App.vue |
| 9 | AvatarPicker component | AvatarPicker.vue |
| 10 | PasswordForm component | PasswordForm.vue |
| 11 | ThemePicker component | ThemePicker.vue |
| 12 | SettingsView page | SettingsView.vue |
| 13 | Integration testing | All |

**Total: 13 tasks, ~50 steps**
