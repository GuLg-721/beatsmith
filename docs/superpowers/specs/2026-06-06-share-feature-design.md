# Share Feature Design Spec

> **Date:** 2026-06-06
> **Status:** Draft
> **Feature:** Share Feature (分享功能)

## Overview

Add sharing functionality to the beatmap detail page, allowing users to generate shareable links and view public beatmap previews.

## Goals

- Generate shareable links for beatmaps
- Display public beatmap preview without login
- Show audio preview and leaderboard

---

## Share Link Format

```
${window.location.origin}/share/${mapId}
```

Example: `http://localhost:5173/share/abc123xyz`

---

## Map Detail Page Changes

Add share button to the existing MapDetailView:

```
┌─────────────────────────────────────────┐
│  ← 返回歌曲库                           │
├─────────────────────────────────────────┤
│  [封面图]  歌曲标题                      │
│            艺术家                        │
│            时长 | BPM | 难度             │
├─────────────────────────────────────────┤
│  [🎮 开始游戏]  [✏️ 编辑]  [📤 分享]   │  ← 新增分享按钮
├─────────────────────────────────────────┤
│  🏆 排行榜                              │
│  ...                                    │
└─────────────────────────────────────────┘
```

### Share Button Behavior

1. Click "📤 分享" button
2. Generate share link
3. Copy to clipboard
4. Show toast notification "链接已复制！"

---

## Public Share Page

### Route

`/share/:mapId` - Public beatmap preview page

### Page Layout

```
┌─────────────────────────────────────────┐
│  ⚒️ BeatSmith                          │
├─────────────────────────────────────────┤
│  [封面图]  歌曲标题                      │
│            艺术家                        │
│            时长 | BPM | 难度             │
├─────────────────────────────────────────┤
│  🔊 音频预览 (30秒)                     │
│  [▶️ 播放]  [⏸️ 暂停]                   │
├─────────────────────────────────────────┤
│  🏆 排行榜 (前10名)                     │
│  1. 🥇 玩家1  985,000                  │
│  2. 🥈 玩家2  872,000                  │
│  ...                                    │
├─────────────────────────────────────────┤
│  [🎮 开始游戏] (需登录)                 │
└─────────────────────────────────────────┘
```

### Features

- Audio preview (first 30 seconds)
- Play/pause controls
- Leaderboard display
- "Start Game" button (redirects to login if not authenticated)

---

## Backend API Changes

### New Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/maps/:id/public` | GET | No | Get public beatmap info |

### Response Format

```json
{
  "map": {
    "id": "abc123",
    "title": "Faded",
    "artist": "Alan Walker",
    "audioFile": "xxx.mp3",
    "coverImage": "xxx.jpg",
    "duration": 240,
    "bpm": 90,
    "difficulty": "Normal",
    "playCount": 150,
    "creatorName": "admin"
  },
  "scores": [
    {
      "rank": 1,
      "username": "player1",
      "score": 985000,
      "accuracy": 96.5,
      "grade": "S"
    }
  ]
}
```

---

## File Changes

### New Files

| File | Description |
|------|-------------|
| `client/src/views/ShareView.vue` | Public share page |

### Modified Files

| File | Changes |
|------|---------|
| `client/src/views/MapDetailView.vue` | Add share button |
| `client/src/router/index.ts` | Add /share/:mapId route |
| `server/src/routes/maps.ts` | Add public endpoint |

---

## Testing Checklist

- [ ] Share button appears on map detail page
- [ ] Clicking share copies link to clipboard
- [ ] Toast notification shows "链接已复制！"
- [ ] Share page loads without login
- [ ] Audio preview plays correctly
- [ ] Leaderboard displays correctly
- [ ] "Start Game" button redirects to login
- [ ] Share link works when opened in new tab
