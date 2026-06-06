# Navigation & Theme Backgrounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add navigation improvements (back buttons, settings entry) and implement 3 unique theme background animations across all pages.

**Architecture:** Create ThemeBackground wrapper component that renders theme-specific animated backgrounds (OsuBackground, CyberpunkBackground, ValorantBackground). Add navigation bars to SettingsView and ProfileView. Apply backgrounds to all pages except homepage.

**Tech Stack:** Vue 3 + TypeScript, Canvas 2D (osu! particles), CSS animations (cyberpunk/valorant)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `client/src/components/common/ThemeBackground.vue` | Create | Main wrapper - reads theme, renders correct background |
| `client/src/components/common/OsuBackground.vue` | Create | osu! particles + connections (Canvas) |
| `client/src/components/common/CyberpunkBackground.vue` | Create | Grid + scanlines + data flow (CSS + Canvas) |
| `client/src/components/common/ValorantBackground.vue` | Create | Geometric lines + corners (CSS) |
| `client/src/styles/themes.css` | Modify | Add background-specific CSS variables |
| `client/src/views/SettingsView.vue` | Modify | Add top nav with back button |
| `client/src/views/ProfileView.vue` | Rewrite | Full profile page with nav + settings entry |
| `client/src/views/SongsView.vue` | Modify | Add ThemeBackground |
| `client/src/views/LeaderboardView.vue` | Modify | Add ThemeBackground |

---

### Task 1: Add Background CSS Variables

**Files:**
- Modify: `client/src/styles/themes.css`

- [ ] **Step 1: Add background variables to each theme**

Append to each theme section in `client/src/styles/themes.css`:

```css
/* osu! 霓虹 - add to :root, [data-theme="osu"] */
:root, [data-theme="osu"] {
  /* ... existing variables ... */
  --bg-particle-1: #ff66aa;
  --bg-particle-2: #bf00ff;
  --bg-particle-3: #ff99cc;
  --bg-particle-count: 40;
}

/* 赛博朋克 - add to [data-theme="cyberpunk"] */
[data-theme="cyberpunk"] {
  /* ... existing variables ... */
  --bg-grid-color: rgba(252, 238, 9, 0.08);
  --bg-grid-line: rgba(252, 238, 9, 0.15);
  --bg-scanline: #00d4ff;
  --bg-data: #fcee09;
  --bg-data-opacity: 0.4;
}

/* Valorant - add to [data-theme="valorant"] */
[data-theme="valorant"] {
  /* ... existing variables ... */
  --bg-line-1: #ff4655;
  --bg-line-2: #bd3944;
  --bg-corner: #ff4655;
  --bg-line-opacity: 0.3;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/styles/themes.css
git commit -m "feat(theme): add background CSS variables for 3 themes"
```

---

### Task 2: Create OsuBackground Component

**Files:**
- Create: `client/src/components/common/OsuBackground.vue`

- [ ] **Step 1: Create OsuBackground.vue**

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ reduced?: boolean }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let particles: Particle[] = []
let mouseX = 0
let mouseY = 0

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
}

function createParticle(canvas: HTMLCanvasElement): Particle {
  const hues = [330, 280, 350] // pink/purple range
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * (props.reduced ? 0.2 : 0.5),
    vy: (Math.random() - 0.5) * (props.reduced ? 0.2 : 0.5),
    radius: Math.random() * 2 + 1,
    opacity: Math.random() * 0.4 + 0.2
  }
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  function resize() {
    canvas!.width = window.innerWidth
    canvas!.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  const count = props.reduced ? 20 : (Math.min(50, Math.floor((canvas.width * canvas.height) / 20000)))
  particles = Array.from({ length: count }, () => createParticle(canvas!))

  function onMouseMove(e: MouseEvent) {
    if (!props.reduced) {
      mouseX = e.clientX
      mouseY = e.clientY
    }
  }
  window.addEventListener('mousemove', onMouseMove)

  function animate() {
    ctx!.fillStyle = 'rgba(10, 10, 26, 0.12)'
    ctx!.fillRect(0, 0, canvas!.width, canvas!.height)

    particles.forEach((p, i) => {
      // Mouse gravity (only in full mode)
      if (!props.reduced) {
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200) {
          const force = (200 - dist) / 200 * 0.02
          p.vx += dx * force * 0.01
          p.vy += dy * force * 0.01
        }
      }

      p.x += p.vx
      p.y += p.vy

      if (p.x < 0 || p.x > canvas!.width) p.vx *= -1
      if (p.y < 0 || p.y > canvas!.height) p.vy *= -1
      p.x = Math.max(0, Math.min(canvas!.width, p.x))
      p.y = Math.max(0, Math.min(canvas!.height, p.y))

      // Draw particle
      ctx!.beginPath()
      ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx!.fillStyle = `rgba(255, 102, 170, ${p.opacity})`
      ctx!.fill()

      // Draw connections
      if (!props.reduced) {
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx2 = p.x - p2.x
          const dy2 = p.y - p2.y
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
          if (dist2 < 120) {
            ctx!.beginPath()
            ctx!.moveTo(p.x, p.y)
            ctx!.lineTo(p2.x, p2.y)
            ctx!.strokeStyle = `rgba(191, 0, 255, ${(1 - dist2 / 120) * 0.15})`
            ctx!.lineWidth = 0.5
            ctx!.stroke()
          }
        }
      }
    })

    animationId = requestAnimationFrame(animate)
  }

  animate()

  onUnmounted(() => {
    if (animationId) cancelAnimationFrame(animationId)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMouseMove)
  })
})
</script>

<template>
  <canvas ref="canvasRef" class="osu-bg" />
</template>

<style scoped>
.osu-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/OsuBackground.vue
git commit -m "feat(background): add osu! particle background component"
```

---

### Task 3: Create CyberpunkBackground Component

**Files:**
- Create: `client/src/components/common/CyberpunkBackground.vue`

- [ ] **Step 1: Create CyberpunkBackground.vue**

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ reduced?: boolean }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let dataStrings: DataString[] = []

interface DataString {
  x: number
  y: number
  speed: number
  text: string
  opacity: number
}

function randomBinary(length: number): string {
  return Array.from({ length }, () => Math.random() > 0.5 ? '1' : '0').join('')
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  function resize() {
    canvas!.width = window.innerWidth
    canvas!.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  // Init data strings (reduced mode: none)
  if (!props.reduced) {
    dataStrings = Array.from({ length: 15 }, () => ({
      x: Math.random() * canvas!.width,
      y: Math.random() * canvas!.height,
      speed: Math.random() * 0.5 + 0.3,
      text: randomBinary(8),
      opacity: Math.random() * 0.3 + 0.1
    }))
  }

  let scanY = 0

  function animate() {
    ctx!.fillStyle = 'rgba(10, 10, 10, 0.08)'
    ctx!.fillRect(0, 0, canvas!.width, canvas!.height)

    // Draw grid
    const gridSize = props.reduced ? 60 : 40
    ctx!.strokeStyle = 'rgba(252, 238, 9, 0.06)'
    ctx!.lineWidth = 0.5
    for (let x = 0; x < canvas!.width; x += gridSize) {
      ctx!.beginPath()
      ctx!.moveTo(x, 0)
      ctx!.lineTo(x, canvas!.height)
      ctx!.stroke()
    }
    for (let y = 0; y < canvas!.height; y += gridSize) {
      ctx!.beginPath()
      ctx!.moveTo(0, y)
      ctx!.lineTo(canvas!.width, y)
      ctx!.stroke()
    }

    // Draw scanline
    if (!props.reduced) {
      ctx!.fillStyle = 'rgba(0, 212, 255, 0.03)'
      ctx!.fillRect(0, scanY, canvas!.width, 2)
      scanY = (scanY + 1) % canvas!.height
    }

    // Draw data strings
    dataStrings.forEach(ds => {
      ctx!.font = '12px monospace'
      ctx!.fillStyle = `rgba(252, 238, 9, ${ds.opacity})`
      ctx!.fillText(ds.text, ds.x, ds.y)
      ds.y -= ds.speed
      if (ds.y < -20) {
        ds.y = canvas!.height + 20
        ds.x = Math.random() * canvas!.width
        ds.text = randomBinary(8)
      }
    })

    animationId = requestAnimationFrame(animate)
  }

  animate()

  onUnmounted(() => {
    if (animationId) cancelAnimationFrame(animationId)
    window.removeEventListener('resize', resize)
  })
})
</script>

<template>
  <canvas ref="canvasRef" class="cyber-bg" />
</template>

<style scoped>
.cyber-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/CyberpunkBackground.vue
git commit -m "feat(background): add cyberpunk grid + scanline background"
```

---

### Task 4: Create ValorantBackground Component

**Files:**
- Create: `client/src/components/common/ValorantBackground.vue`

- [ ] **Step 1: Create ValorantBackground.vue**

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ reduced?: boolean }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let lines: GeometricLine[] = []

interface GeometricLine {
  x1: number
  y1: number
  x2: number
  y2: number
  opacity: number
  pulseOffset: number
  color: string
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  function resize() {
    canvas!.width = window.innerWidth
    canvas!.height = window.innerHeight
    generateLines()
  }

  function generateLines() {
    const count = props.reduced ? 5 : 12
    lines = Array.from({ length: count }, () => {
      const side = Math.floor(Math.random() * 4)
      const offset = Math.random()
      const angle = (Math.random() - 0.5) * 0.5
      const len = Math.random() * 200 + 100
      let x1: number, y1: number, x2: number, y2: number

      switch (side) {
        case 0: // top
          x1 = offset * canvas!.width
          y1 = 0
          x2 = x1 + Math.cos(angle) * len
          y2 = Math.sin(angle) * len
          break
        case 1: // right
          x1 = canvas!.width
          y1 = offset * canvas!.height
          x2 = x1 - Math.cos(angle) * len
          y2 = y1 + Math.sin(angle) * len
          break
        case 2: // bottom
          x1 = offset * canvas!.width
          y1 = canvas!.height
          x2 = x1 + Math.cos(angle) * len
          y2 = y1 - Math.sin(angle) * len
          break
        default: // left
          x1 = 0
          y1 = offset * canvas!.height
          x2 = x1 + Math.cos(angle) * len
          y2 = y1 + Math.sin(angle) * len
      }

      return {
        x1, y1, x2, y2,
        opacity: Math.random() * 0.2 + 0.1,
        pulseOffset: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? '#ff4655' : '#bd3944'
      }
    })
  }

  resize()
  window.addEventListener('resize', resize)

  let time = 0

  function animate() {
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
    time += 0.02

    // Draw lines
    lines.forEach(line => {
      const pulse = Math.sin(time + line.pulseOffset) * 0.1 + 0.1
      ctx!.beginPath()
      ctx!.moveTo(line.x1, line.y1)
      ctx!.lineTo(line.x2, line.y2)
      ctx!.strokeStyle = line.color.replace(')', `, ${line.opacity + pulse})`).replace('rgb', 'rgba')
      ctx!.lineWidth = 1.5
      ctx!.stroke()
    })

    // Draw corner accents
    const cornerSize = 40
    const cornerOpacity = 0.3
    ctx!.strokeStyle = `rgba(255, 70, 85, ${cornerOpacity})`
    ctx!.lineWidth = 2

    // Top-left
    ctx!.beginPath()
    ctx!.moveTo(20, 20 + cornerSize)
    ctx!.lineTo(20, 20)
    ctx!.lineTo(20 + cornerSize, 20)
    ctx!.stroke()

    // Top-right
    ctx!.beginPath()
    ctx!.moveTo(canvas!.width - 20 - cornerSize, 20)
    ctx!.lineTo(canvas!.width - 20, 20)
    ctx!.lineTo(canvas!.width - 20, 20 + cornerSize)
    ctx!.stroke()

    // Bottom-left
    ctx!.beginPath()
    ctx!.moveTo(20, canvas!.height - 20 - cornerSize)
    ctx!.lineTo(20, canvas!.height - 20)
    ctx!.lineTo(20 + cornerSize, canvas!.height - 20)
    ctx!.stroke()

    // Bottom-right
    ctx!.beginPath()
    ctx!.moveTo(canvas!.width - 20 - cornerSize, canvas!.height - 20)
    ctx!.lineTo(canvas!.width - 20, canvas!.height - 20)
    ctx!.lineTo(canvas!.width - 20, canvas!.height - 20 - cornerSize)
    ctx!.stroke()

    animationId = requestAnimationFrame(animate)
  }

  animate()

  onUnmounted(() => {
    if (animationId) cancelAnimationFrame(animationId)
    window.removeEventListener('resize', resize)
  })
})
</script>

<template>
  <canvas ref="canvasRef" class="valorant-bg" />
</template>

<style scoped>
.valorant-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/ValorantBackground.vue
git commit -m "feat(background): add valorant geometric lines background"
```

---

### Task 5: Create ThemeBackground Wrapper

**Files:**
- Create: `client/src/components/common/ThemeBackground.vue`

- [ ] **Step 1: Create ThemeBackground.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import OsuBackground from './OsuBackground.vue'
import CyberpunkBackground from './CyberpunkBackground.vue'
import ValorantBackground from './ValorantBackground.vue'

const props = defineProps<{ reduced?: boolean }>()

const authStore = useAuthStore()

const currentTheme = computed(() => authStore.user?.theme || 'osu')
</script>

<template>
  <OsuBackground v-if="currentTheme === 'osu'" :reduced="reduced" />
  <CyberpunkBackground v-else-if="currentTheme === 'cyberpunk'" :reduced="reduced" />
  <ValorantBackground v-else-if="currentTheme === 'valorant'" :reduced="reduced" />
</template>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/ThemeBackground.vue
git commit -m "feat(background): add ThemeBackground wrapper component"
```

---

### Task 6: Add Back Navigation to SettingsView

**Files:**
- Modify: `client/src/views/SettingsView.vue`

- [ ] **Step 1: Add navigation bar to template**

Replace the `<h1>` title with a navigation bar. In the template, replace:

```vue
<template>
  <div class="settings-page">
    <h1 class="page-title">⚙️ 设置</h1>
```

With:

```vue
<template>
  <div class="settings-page">
    <nav class="top-nav">
      <button class="back-btn" @click="goBack">← 返回</button>
      <span class="nav-title">⚙️ 设置</span>
    </nav>
```

- [ ] **Step 2: Add goBack function**

Add after the `saveNickname` function:

```typescript
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
```

- [ ] **Step 3: Add nav styles**

Add to `<style scoped>`:

```css
.top-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
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
```

- [ ] **Step 4: Commit**

```bash
git add client/src/views/SettingsView.vue
git commit -m "feat(nav): add back button to settings page"
```

---

### Task 7: Implement ProfileView with Navigation

**Files:**
- Modify: `client/src/views/ProfileView.vue`

- [ ] **Step 1: Rewrite ProfileView.vue**

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const profileUser = ref<any>(null)
const loading = ref(true)

const isOwnProfile = computed(() => {
  return authStore.user?.id === Number(route.params.id)
})

onMounted(async () => {
  // For now, show current user's profile
  if (authStore.isLoggedIn) {
    profileUser.value = authStore.user
  }
  loading.value = false
})

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div class="profile-page">
    <nav class="top-nav">
      <button class="back-btn" @click="goBack">← 返回</button>
      <span class="nav-title">👤 个人档案</span>
      <router-link v-if="authStore.isLoggedIn" to="/settings" class="settings-btn">
        ⚙️ 设置
      </router-link>
    </nav>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="profileUser" class="profile-content">
      <div class="avatar-section">
        <div v-if="profileUser.avatar?.startsWith('preset:')" class="avatar-display">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="var(--primary)" opacity="0.3" />
            <text x="50" y="55" text-anchor="middle" fill="var(--primary)" font-size="40">👤</text>
          </svg>
        </div>
        <div v-else-if="profileUser.avatar" class="avatar-display">
          <img :src="profileUser.avatar" alt="avatar" />
        </div>
        <div v-else class="avatar-display default">
          <span>👤</span>
        </div>
      </div>

      <div class="user-info">
        <h2 class="username">{{ profileUser.nickname || profileUser.username }}</h2>
        <p class="join-date">加入于 {{ new Date(profileUser.created_at).toLocaleDateString() }}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">0</div>
          <div class="stat-label">游玩次数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">0</div>
          <div class="stat-label">总分</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">-</div>
          <div class="stat-label">最高评级</div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>用户不存在</p>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.top-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
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

.settings-btn {
  margin-left: auto;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-muted);
  text-decoration: none;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.settings-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
}

.profile-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.avatar-section {
  margin-bottom: 0.5rem;
}

.avatar-display {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border: 2px solid var(--border);
  overflow: hidden;
}

.avatar-display svg {
  width: 100%;
  height: 100%;
}

.avatar-display img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-display.default {
  font-size: 3rem;
}

.user-info {
  text-align: center;
}

.username {
  color: var(--text);
  font-size: 1.5rem;
  margin-bottom: 0.3rem;
}

.join-date {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  width: 100%;
  margin-top: 1rem;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.2rem;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.3rem;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/ProfileView.vue
git commit -m "feat(view): implement ProfileView with navigation and stats"
```

---

### Task 8: Add ThemeBackground to SongsView

**Files:**
- Modify: `client/src/views/SongsView.vue`

- [ ] **Step 1: Import ThemeBackground**

Add import at the top of the script:

```typescript
import ThemeBackground from '@/components/common/ThemeBackground.vue'
```

- [ ] **Step 2: Add ThemeBackground to template**

Add right after the opening `<div class="songs-page">`:

```vue
<ThemeBackground :reduced="true" />
```

- [ ] **Step 3: Update songs-page z-index**

Add `position: relative; z-index: 1;` to `.songs-page` style:

```css
.songs-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 0 2rem 2rem;
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/views/SongsView.vue
git commit -m "feat(background): add theme background to songs page"
```

---

### Task 9: Add ThemeBackground to SettingsView

**Files:**
- Modify: `client/src/views/SettingsView.vue`

- [ ] **Step 1: Import ThemeBackground**

Add import at the top of the script:

```typescript
import ThemeBackground from '@/components/common/ThemeBackground.vue'
```

- [ ] **Step 2: Add ThemeBackground to template**

Add right after the opening `<div class="settings-page">`:

```vue
<ThemeBackground :reduced="true" />
```

- [ ] **Step 3: Update settings-page z-index**

Add `position: relative; z-index: 1;` to `.settings-page` style:

```css
.settings-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/views/SettingsView.vue
git commit -m "feat(background): add theme background to settings page"
```

---

### Task 10: Add ThemeBackground to ProfileView

**Files:**
- Modify: `client/src/views/ProfileView.vue`

- [ ] **Step 1: Import ThemeBackground**

Add import at the top of the script:

```typescript
import ThemeBackground from '@/components/common/ThemeBackground.vue'
```

- [ ] **Step 2: Add ThemeBackground to template**

Add right after the opening `<div class="profile-page">`:

```vue
<ThemeBackground :reduced="true" />
```

- [ ] **Step 3: Update profile-page z-index**

Add `position: relative; z-index: 1;` to `.profile-page` style:

```css
.profile-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/views/ProfileView.vue
git commit -m "feat(background): add theme background to profile page"
```

---

### Task 11: Add ThemeBackground to LeaderboardView

**Files:**
- Modify: `client/src/views/LeaderboardView.vue`

- [ ] **Step 1: Rewrite LeaderboardView with ThemeBackground**

```vue
<script setup lang="ts">
import ThemeBackground from '@/components/common/ThemeBackground.vue'
</script>

<template>
  <div class="leaderboard-page">
    <ThemeBackground :reduced="true" />
    <div class="content">
      <h1>🏆 排行榜</h1>
      <p>全局总分 + 单曲排行</p>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 2rem;
}

.content {
  position: relative;
  z-index: 1;
}

h1 {
  color: var(--primary);
  margin-bottom: 1rem;
}

p {
  color: var(--muted);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/LeaderboardView.vue
git commit -m "feat(background): add theme background to leaderboard page"
```

---

### Task 12: Integration Testing

**Files:**
- Test all pages and theme switching

- [ ] **Step 1: Start development server**

Run: `cd /d/vibecoding/beatforge && npm run dev`

- [ ] **Step 2: Test navigation**

1. Go to Settings page
2. Click "← 返回" button
3. Expected: Returns to previous page

4. Go to Profile page
5. Click "⚙️ 设置" button
6. Expected: Navigates to Settings page

- [ ] **Step 3: Test theme backgrounds**

1. Go to Settings page
2. Switch to "赛博朋克" theme
3. Expected: Background shows yellow grid + scanlines
4. Navigate to Songs page
5. Expected: Same cyberpunk background (reduced)

6. Switch to "Valorant" theme
7. Expected: Background shows red geometric lines
8. Navigate to Profile page
9. Expected: Same valorant background (reduced)

- [ ] **Step 4: Test homepage unchanged**

1. Go to homepage
2. Expected: ParticleBackground still works (not ThemeBackground)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete navigation improvements and theme background system"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Background CSS variables | themes.css |
| 2 | OsuBackground component | OsuBackground.vue |
| 3 | CyberpunkBackground component | CyberpunkBackground.vue |
| 4 | ValorantBackground component | ValorantBackground.vue |
| 5 | ThemeBackground wrapper | ThemeBackground.vue |
| 6 | SettingsView navigation | SettingsView.vue |
| 7 | ProfileView implementation | ProfileView.vue |
| 8 | SongsView background | SongsView.vue |
| 9 | SettingsView background | SettingsView.vue |
| 10 | ProfileView background | ProfileView.vue |
| 11 | LeaderboardView background | LeaderboardView.vue |
| 12 | Integration testing | All |

**Total: 12 tasks, ~40 steps**
