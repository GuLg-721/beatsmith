# Background Music Feature Design Spec

> **Date:** 2026-06-06
> **Status:** Draft
> **Feature:** Background Music Radio (背景音乐电台)

## Overview

Add a radio-style background music player with admin playlist management, volume control, and theme-adaptive styling. The player appears on all pages except homepage and game.

## Goals

- Play background music across pages
- Admin can upload songs or import from Netease Cloud Music
- Player adapts to current theme
- Volume control and playback controls

---

## Player UI

### Location
- **Homepage**: No player
- **Other pages**: Below top navigation bar
- **Game**: No player

### Player Layout

```
┌─────────────────────────────────────────────────────┐
│  🎵 歌曲名 - 艺术家   [⏮] [▶️/⏸️] [⏭]  [🔊 ━━━] │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
└─────────────────────────────────────────────────────┘
```

### Theme Adaptation

| Theme | Border Color | Glow Effect |
|-------|--------------|-------------|
| osu! 霓虹 | rgba(255, 102, 170, 0.3) | Pink glow |
| 赛博朋克 | rgba(252, 238, 9, 0.3) | Yellow glow |
| Valorant | rgba(255, 70, 85, 0.3) | Red glow |

---

## Playlist Management

### Admin Page

`/admin/bgm` - Admin-only page for managing background music

**Features:**
- View current playlist
- Upload songs (MP3, WAV, OGG)
- Import from Netease Cloud Music
- Search Netease Cloud Music
- Delete songs
- Reorder playlist

### API Endpoints

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/bgm/playlist` | GET | No | Get playlist |
| `/api/bgm/songs` | POST | Admin | Upload song |
| `/api/bgm/songs/:id` | DELETE | Admin | Delete song |
| `/api/bgm/import` | POST | Admin | Import from Netease |
| `/api/bgm/search` | GET | Admin | Search Netease |

---

## Netease Cloud Music Import

### Import Flow

1. Admin pastes playlist link or searches songs
2. Backend parses playlist/song info
3. Backend returns song list (title, artist, duration)
4. Admin selects songs to import
5. System downloads and stores audio files

### Netease API Integration

```typescript
// Parse playlist link
// Example: https://music.163.com/#/playlist?id=123456
// Extract playlist ID: 123456

// Search songs
// GET https://music.163.com/api/search/get?s=关键词&type=1
```

---

## Database Schema

### bgm_songs table

```sql
CREATE TABLE bgm_songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  artist TEXT,
  file_path TEXT NOT NULL,
  duration INTEGER,
  added_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

## File Changes

### New Files

| File | Description |
|------|-------------|
| `client/src/components/common/BgmPlayer.vue` | Background music player |
| `client/src/views/admin/BgmAdmin.vue` | Admin playlist management |
| `server/src/routes/bgm.ts` | BGM API endpoints |
| `server/uploads/bgm/` | Store BGM files |

### Modified Files

| File | Changes |
|------|---------|
| `client/src/views/SongsView.vue` | Add BgmPlayer |
| `client/src/views/SettingsView.vue` | Add BgmPlayer |
| `client/src/views/ProfileView.vue` | Add BgmPlayer |
| `client/src/views/LeaderboardView.vue` | Add BgmPlayer |
| `client/src/router/index.ts` | Add admin route |
| `server/src/index.ts` | Register BGM routes |
| `server/src/db.ts` | Add bgm_songs table |

---

## Testing Checklist

- [ ] BgmPlayer appears on all pages except homepage and game
- [ ] Player adapts to current theme
- [ ] Play/pause works correctly
- [ ] Previous/next track works
- [ ] Volume control works
- [ ] Admin can upload songs
- [ ] Admin can import from Netease
- [ ] Playlist persists after refresh
- [ ] Music continues playing across page navigation
