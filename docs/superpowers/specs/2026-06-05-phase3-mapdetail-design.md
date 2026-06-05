# Phase 3: Map Detail Page + Leaderboard API

## Overview

谱面详情页：展示歌曲信息、排行榜、操作按钮。用户可以从歌曲库点进详情，查看排行榜，然后开始游戏。

## Goals

1. 详情页展示歌曲完整信息（封面、名称、艺术家、BPM、时长、难度、游玩次数、创建者）
2. 展示该谱面的 Top 10 排行榜
3. 提供「开始游戏」和「编辑谱面」（仅作者）按钮
4. 空状态提示

## Backend API

### GET /api/maps/:id/scores

获取该谱面的排行榜 Top 10。

**Query params:**
- `limit`: 数量（默认 10，最大 50）

**Response (200):**
```json
{
  "mapId": "abc123",
  "scores": [
    {
      "rank": 1,
      "userId": 1,
      "username": "player1",
      "score": 985000,
      "accuracy": 99.5,
      "grade": "SS",
      "maxCombo": 420,
      "perfect": 150,
      "great": 20,
      "good": 5,
      "miss": 0,
      "playedAt": "2026-06-05T10:00:00.000Z"
    }
  ]
}
```

## Frontend: MapDetailView

### Layout

```
┌─────────────────────────────────────────────┐
│  ← 返回歌曲库                                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐  歌曲名称 (text-2xl)       │
│  │              │  艺术家名 (text-lg, muted) │
│  │   [封面]      │                           │
│  │  16:9 比例    │  BPM: 128                 │
│  │              │  时长: 3:45                │
│  └──────────────┘  难度: Normal              │
│                    游玩次数: 42              │
│                    创建者: player1            │
│                                             │
│  ┌─────────────┐ ┌─────────────┐            │
│  │ 🎮 开始游戏  │ │ ✏️ 编辑谱面  │            │
│  └─────────────┘ └─────────────┘            │
│                                             │
├─────────────────────────────────────────────┤
│  🏆 排行榜                                   │
│                                             │
│  ┌──┬────────┬────────┬──────┬──────┐       │
│  │# │ 玩家    │ 分数    │ 准确率│ 评级  │       │
│  ├──┼────────┼────────┼──────┼──────┤       │
│  │🥇│ player1│ 985000 │ 99.5%│ SS   │       │
│  │🥈│ player2│ 950000 │ 97.2%│ S    │       │
│  │🥉│ player3│ 920000 │ 95.1%│ S    │       │
│  │4 │ player4│ 880000 │ 92.3%│ A    │       │
│  │5 │ player5│ 850000 │ 90.1%│ A    │       │
│  └──┴────────┴────────┴──────┴──────┘       │
│                                             │
│  空状态: 还没有人玩过，成为第一个！            │
└─────────────────────────────────────────────┘
```

### 组件结构

- `MapDetailView.vue` — 页面容器
- 排行榜直接内联在详情页中（不需要独立组件）

### 交互

- 点击「开始游戏」→ 需登录，跳转 `/play/:mapId`
- 点击「编辑谱面」→ 需登录且是作者，跳转 `/editor?mapId=xxx`
- 排行榜加载中显示 skeleton
- 空状态显示提示文字

### Grade 颜色

| 等级 | 颜色 |
|------|------|
| SSS | gold |
| SS | blue |
| S | green |
| A | orange |
| B | gray |

## Files to Create/Modify

### Backend
- `server/src/routes/scores.ts` — Scores routes (GET /api/maps/:id/scores)
- `server/src/index.ts` — Mount scores routes

### Frontend
- `client/src/views/MapDetailView.vue` — Full detail page

## Verification

1. 点击歌曲库中的卡片 → 跳转到详情页
2. 详情页显示歌曲信息（封面、名称、BPM 等）
3. 排行榜为空时显示提示
4. 已有分数时排行榜正确排序
5. 点击「开始游戏」→ 跳转到游戏页
6. 非作者看不到「编辑谱面」按钮
