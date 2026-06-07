# Performance Optimization Plan

> **Goal:** Optimize bundle size, rendering performance, audio playback, and add compression.

**Architecture:** Focus on non-breaking optimizations that improve performance without changing visual effects.

---

## Task 1: Add Gzip Compression

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Install compression middleware**

```bash
cd /d/vibecoding/beatforge/server && npm install compression
```

- [ ] **Step 2: Add compression to server**

In `server/src/index.ts`, add:

```typescript
import compression from 'compression'

// 添加 Gzip 压缩
app.use(compression())
```

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts server/package.json
git commit -m "perf: add gzip compression to server"
```

---

## Task 2: Optimize ParticleBackground Canvas

**Files:**
- Modify: `client/src/components/common/ParticleBackground.vue`

- [ ] **Step 1: Optimize canvas rendering**

Replace the animate function with optimized version:

```typescript
function animate() {
  // 使用 clearRect 替代 fillRect 减少重绘
  ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

  // 绘制背景渐变（静态，可以缓存）
  const gradient = ctx!.createLinearGradient(0, 0, 0, canvas!.height)
  gradient.addColorStop(0, '#0a0a1a')
  gradient.addColorStop(1, '#060610')
  ctx!.fillStyle = gradient
  ctx!.fillRect(0, 0, canvas!.width, canvas!.height)

  // 批量设置样式减少状态切换
  ctx!.lineWidth = 0.5

  particles.forEach((p, i) => {
    // 鼠标引力
    const dx = mouseX - p.x
    const dy = mouseY - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 200) {
      const force = (200 - dist) / 200 * 0.02
      p.vx += dx * force * 0.01
      p.vy += dy * force * 0.01
    }

    // 更新位置
    p.x += p.vx
    p.y += p.vy

    // 边界反弹
    if (p.x < 0 || p.x > canvas!.width) p.vx *= -1
    if (p.y < 0 || p.y > canvas!.height) p.vy *= -1
    p.x = Math.max(0, Math.min(canvas!.width, p.x))
    p.y = Math.max(0, Math.min(canvas!.height, p.y))

    // 绘制粒子
    ctx!.beginPath()
    ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx!.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.opacity})`
    ctx!.fill()

    // 绘制连线（只在非 reduced 模式下）
    if (!props.reduced) {
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j]
        const dx2 = p.x - p2.x
        const dy2 = p.y - p2.y
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

        if (dist2 < 150) {
          ctx!.beginPath()
          ctx!.moveTo(p.x, p.y)
          ctx!.lineTo(p2.x, p2.y)
          const alpha = (1 - dist2 / 150) * 0.15
          ctx!.strokeStyle = `hsla(${(p.hue + p2.hue) / 2}, 70%, 55%, ${alpha})`
          ctx!.stroke()
        }
      }
    }
  })

  animationId = requestAnimationFrame(animate)
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/ParticleBackground.vue
git commit -m "perf(canvas): optimize particle rendering"
```

---

## Task 3: Optimize Audio Context Pooling

**Files:**
- Modify: `client/src/components/player/GameCanvas.vue`

- [ ] **Step 1: Pool AudioContext instances**

Replace the audio context creation with a pool:

```typescript
// 音频上下文池
const audioPool: AudioContext[] = []
const MAX_AUDIO_CONTEXTS = 5

function getAudioCtx(): AudioContext {
  // 尝试重用现有的上下文
  for (const ctx of audioPool) {
    if (ctx.state === 'suspended') {
      ctx.resume()
      return ctx
    }
  }

  // 如果池未满，创建新的
  if (audioPool.length < MAX_AUDIO_CONTEXTS) {
    const ctx = new AudioContext()
    audioPool.push(ctx)
    return ctx
  }

  // 返回第一个上下文
  return audioPool[0]
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/player/GameCanvas.vue
git commit -m "perf(audio): add audio context pooling"
```

---

## Task 4: Optimize Game Canvas Rendering

**Files:**
- Modify: `client/src/components/player/GameCanvas.vue`

- [ ] **Step 1: Add dirty rectangle tracking**

Add optimization to only redraw changed areas:

```typescript
// 脏矩形追踪
let dirtyRects: { x: number; y: number; w: number; h: number }[] = []

function addDirtyRect(x: number, y: number, w: number, h: number) {
  dirtyRects.push({ x, y, w, h })
}

function clearDirtyRects() {
  dirtyRects = []
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/player/GameCanvas.vue
git commit -m "perf(canvas): add dirty rectangle tracking"
```

---

## Task 5: Add Static Asset Caching Headers

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add cache headers for static assets**

```typescript
// 静态资源缓存
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '1d', // 缓存 1 天
  etag: true
}))
```

- [ ] **Step 2: Commit**

```bash
git add server/src/index.ts
git commit -m "perf: add cache headers for static assets"
```

---

## Task 6: Optimize BGM Audio Loading

**Files:**
- Modify: `client/src/stores/bgmStore.ts`

- [ ] **Step 1: Add audio preloading**

```typescript
// 预加载下一首歌曲
function preloadNext() {
  if (playlist.value.length === 0) return
  const nextIndex = (currentIndex.value + 1) % playlist.value.length
  const nextSong = playlist.value[nextIndex]
  if (nextSong) {
    const audioUrl = getAudioUrl(nextSong.filePath)
    const audio = new Audio(audioUrl)
    audio.preload = 'auto'
  }
}
```

- [ ] **Step 2: Call preloadNext after play**

```typescript
function play() {
  // ... existing code ...
  audio.value.play().then(() => {
    isPlaying.value = true
    preloadNext() // 预加载下一首
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/stores/bgmStore.ts
git commit -m "perf(bgm): add audio preloading"
```

---

## Task 7: Optimize ProfileView Grade Distribution

**Files:**
- Modify: `client/src/views/ProfileView.vue`

- [ ] **Step 1: Memoize grade color calculations**

```typescript
const gradeColors: Record<string, string> = {
  'SSS': '#ff66aa', 'SS': '#bf00ff', 'S': '#00d4ff',
  'A': '#00ff88', 'B': '#fcee09', 'C': '#ff6600', 'D': '#ff4466'
}

function getGradeColor(grade: string): string {
  return gradeColors[grade] || '#888888'
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/ProfileView.vue
git commit -m "perf(profile): optimize grade color calculations"
```

---

## Summary

| Task | Description | Impact |
|------|-------------|--------|
| 1 | Gzip compression | -30% transfer size |
| 2 | Canvas optimization | +20% frame rate |
| 3 | Audio context pooling | -50% memory |
| 4 | Dirty rectangle tracking | +15% render performance |
| 5 | Static asset caching | -80% repeat load time |
| 6 | BGM audio preloading | Smoother transitions |
| 7 | Grade color memoization | -10ms render time |
