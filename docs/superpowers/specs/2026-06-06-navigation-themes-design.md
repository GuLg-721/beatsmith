# Navigation & Theme Backgrounds Design Spec

> **Date:** 2026-06-06
> **Status:** Draft
> **Feature:** Navigation Improvements + Theme Background System

## Overview

Improve navigation UX and implement theme-specific animated backgrounds across all pages. Each theme (osu!, Cyberpunk, Valorant) has a unique background animation that applies to all pages except the homepage (which keeps its existing ParticleBackground).

## Goals

- Add back navigation to settings page
- Add settings entry point on profile page
- Create 3 unique theme background animations
- Apply theme backgrounds to all pages (except homepage)
- Sync background changes across all pages when theme switches

---

## Part 1: Navigation Improvements

### Settings Page

**Layout:**
```
┌─────────────────────────────────────────┐
│ [← 返回]  ⚙️ 设置                       │
├─────────────────────────────────────────┤
│  ... settings content ...               │
└─────────────────────────────────────────┘
```

**Behavior:**
- Top-left: Back button with ← icon
- Uses `router.back()` if history exists
- Falls back to `router.push('/')` if no history

### Profile Page

**Layout:**
```
┌─────────────────────────────────────────┐
│ [← 返回]  👤 个人档案        [⚙️ 设置] │
├─────────────────────────────────────────┤
│  ... profile content ...                │
└─────────────────────────────────────────┘
```

**Behavior:**
- Top-left: Back button (same as settings)
- Top-right: Settings gear icon (only visible when logged in)
- Links to `/settings`

---

## Part 2: Theme Background System

### Architecture

Create a `ThemeBackground` component that:
1. Reads current theme from authStore
2. Renders the appropriate background animation
3. Applies reduced intensity for non-homepage pages

### Component Structure

```
client/src/components/common/
├── ThemeBackground.vue      # Main wrapper component
├── OsuBackground.vue        # osu! 霓虹: particles + connections
├── CyberpunkBackground.vue  # 赛博朋克: grid + scanlines + data flow
└── ValorantBackground.vue   # Valorant: geometric lines + corner accents
```

### Theme Backgrounds

#### 1. osu! 霓虹 (Default)

**Animation:** Particle system with connections and mouse interaction
- Particles: pink (#ff66aa) and purple (#bf00ff)
- Connections between nearby particles
- Mouse gravity effect (particles attracted to cursor)
- Reduced mode: fewer particles, no mouse interaction

**Implementation:** Canvas 2D with requestAnimationFrame

#### 2. 赛博朋克

**Animation:** Grid with scanlines and data flow
- Yellow grid lines (#fcee09) moving downward
- Cyan scanline (#00d4ff) sweeping vertically
- Binary data strings floating upward
- Reduced mode: slower grid, no data flow

**Implementation:** CSS animations + Canvas for data flow

#### 3. Valorant

**Animation:** Geometric lines with corner accents
- Red diagonal lines (#ff4655) pulsing
- Corner frame decorations
- Minimalist, precise aesthetic
- Reduced mode: fewer lines, slower pulse

**Implementation:** CSS animations

### Page Integration

| Page | Background | Intensity |
|------|------------|-----------|
| HomeView | ParticleBackground (existing) | Full |
| SongsView | ThemeBackground | Reduced |
| SettingsView | ThemeBackground | Reduced |
| ProfileView | ThemeBackground | Reduced |
| LeaderboardView | ThemeBackground | Reduced |
| EditorView | None (game canvas) | - |
| PlayerView | None (game canvas) | - |

### Theme Switching

1. User selects theme in ThemePicker
2. authStore.updateTheme() calls API + applies theme
3. ThemeBackground component watches theme changes
4. Background animation switches with smooth transition

---

## File Changes

### New Files

| File | Description |
|------|-------------|
| `client/src/components/common/ThemeBackground.vue` | Main wrapper |
| `client/src/components/common/OsuBackground.vue` | osu! particles |
| `client/src/components/common/CyberpunkBackground.vue` | Grid + scanlines |
| `client/src/components/common/ValorantBackground.vue` | Geometric lines |

### Modified Files

| File | Changes |
|------|---------|
| `client/src/views/SettingsView.vue` | Add top nav with back button |
| `client/src/views/ProfileView.vue` | Add top nav with back + settings |
| `client/src/views/SongsView.vue` | Add ThemeBackground |
| `client/src/views/LeaderboardView.vue` | Add ThemeBackground |
| `client/src/styles/themes.css` | Add background-specific variables |

---

## CSS Variables for Backgrounds

```css
/* osu! 霓虹 */
:root, [data-theme="osu"] {
  --bg-particle-1: #ff66aa;
  --bg-particle-2: #bf00ff;
  --bg-particle-3: #ff99cc;
}

/* 赛博朋克 */
[data-theme="cyberpunk"] {
  --bg-grid-color: rgba(252, 238, 9, 0.1);
  --bg-scanline: #00d4ff;
  --bg-data: #fcee09;
}

/* Valorant */
[data-theme="valorant"] {
  --bg-line-1: #ff4655;
  --bg-line-2: #bd3944;
  --bg-corner: #ff4655;
}
```

---

## Testing Checklist

- [ ] Settings page has back button that works
- [ ] Profile page has settings entry (logged in only)
- [ ] osu! theme shows particles on all pages except home
- [ ] Cyberpunk theme shows grid + scanlines
- [ ] Valorant theme shows geometric lines
- [ ] Theme switch updates all page backgrounds instantly
- [ ] Background animations don't impact performance
- [ ] Reduced mode has fewer animations
- [ ] Background persists across page navigation
