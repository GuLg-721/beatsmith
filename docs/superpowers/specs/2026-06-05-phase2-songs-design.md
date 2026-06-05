# Phase 2: Upload Songs + Songs Library

## Overview

实现歌曲上传功能和歌曲库页面。用户可以上传音频文件（MP3/WAV），填写歌曲信息，所有用户可以在歌曲库中浏览、搜索和选择歌曲。

## Goals

1. 用户可以上传音频文件 + 歌曲信息（名称、艺术家、封面）
2. 歌曲库页面展示热门歌曲和全部歌曲
3. 支持搜索和筛选
4. 默认封面使用 OKLCH 渐变色 + 首字母

## Backend API

### POST /api/upload/audio

上传音频文件，保存到 `server/uploads/` 目录。

**Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`

**Body:**
- `audio`: 音频文件 (MP3/WAV, max 50MB)

**Response (200):**
```json
{
  "filename": "abc123.mp3",
  "originalName": "song.mp3",
  "size": 5242880
}
```

### POST /api/upload/cover

上传封面图片。

**Body:**
- `cover`: 图片文件 (JPG/PNG, max 5MB)

**Response (200):**
```json
{
  "filename": "cover-abc.jpg"
}
```

### POST /api/maps

创建谱面记录（歌曲信息）。

**Body:**
```json
{
  "title": "歌曲名称",
  "artist": "艺术家",
  "audioFile": "abc123.mp3",
  "coverImage": "cover-abc.jpg",
  "bpm": 128,
  "mapData": "{\"notes\":[],\"timingPoints\":[]}"
}
```

**Response (200):**
```json
{
  "id": "nanoid",
  "title": "歌曲名称",
  ...
}
```

### GET /api/maps

获取公开谱面列表。

**Query params:**
- `q`: 搜索关键词（标题/艺术家）
- `sort`: 排序方式（popular/newest/bpm）
- `page`: 页码
- `limit`: 每页数量（默认 20）

**Response (200):**
```json
{
  "maps": [...],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

### GET /api/maps/:id

获取谱面详情。

## Frontend: SongsView

### 布局

```
┌─────────────────────────────────────────┐
│  ⚒️ BeatSmith    [搜索框]    [上传歌曲]  │  ← 顶部栏
├─────────────────────────────────────────┤
│                                         │
│  🔥 热门歌曲                              │  ← 按游玩次数排序，最多 6 个
│  ┌───────────┐ ┌───────────┐ ┌─────────┐│
│  │           │ │           │ │         ││
│  │  [封面]   │ │  [封面]   │ │ [封面]  ││  ← osu! 风格大卡片
│  │           │ │           │ │         ││
│  ├───────────┤ ├───────────┤ ├─────────┤│
│  │ 歌名      │ │ 歌名      │ │ 歌名    ││
│  │ 艺术家    │ │ 艺术家    │ │ 艺术家  ││
│  │ 128 BPM   │ │ 128 BPM   │ │ 128 BPM ││
│  └───────────┘ └───────────┘ └─────────┘│
│                                         │
│  📚 全部歌曲（搜索结果/全部列表）          │
│  ┌───────────┐ ┌───────────┐ ┌─────────┐│
│  │ ...       │ │ ...       │ │ ...     ││
│  └───────────┘ └───────────┘ └─────────┘│
│                                         │
│  [加载更多]                              │  ← 分页/无限滚动
└─────────────────────────────────────────┘
```

### 卡片设计（osu! 风格）

```
┌─────────────────────────┐
│                         │
│    [封面图片]            │  ← 16:9 比例，圆角顶部
│    或                    │
│    [渐变占位+首字母]      │
│                         │
├─────────────────────────┤
│  歌曲名称               │  ← text-base, font-weight 600
│  艺术家名               │  ← text-sm, muted 色
│  ♫ 128 BPM   ▶ 42 次   │  ← text-xs, muted 色
└─────────────────────────┘
```

### 默认封面

没有上传封面时：
- 背景：OKLCH 渐变色（基于歌曲 ID 哈希映射到色相）
- 中心：歌曲名首字母（大号，白色，半透明）
- 渐变方向：135deg

### 搜索和筛选

- 搜索框：实时搜索（debounce 300ms）
- 筛选按钮：热门 / 最新 / 按 BPM
- 搜索结果为空时显示提示

### 上传对话框

点击「上传歌曲」按钮弹出对话框（需登录）：

```
┌─────────────────────────────┐
│  上传歌曲                    │
│                             │
│  歌曲名称 *                 │
│  [________________]         │
│                             │
│  艺术家（可选）              │
│  [________________]         │
│                             │
│  音频文件 *                  │
│  [点击选择或拖拽 MP3/WAV]    │
│                             │
│  封面图片（可选）             │
│  [点击选择或拖拽 JPG/PNG]    │
│                             │
│  [取消]        [上传]        │
└─────────────────────────────┘
```

## Files to Create/Modify

### Backend
- `server/src/routes/maps.ts` — Maps CRUD
- `server/src/routes/upload.ts` — File upload
- `server/src/index.ts` — Mount routes

### Frontend
- `client/src/views/SongsView.vue` — Songs library page
- `client/src/components/library/UploadDialog.vue` — Upload dialog
- `client/src/components/library/SongCard.vue` — Song card component

## Verification

1. 登录后点击「上传歌曲」→ 弹出对话框
2. 填写信息 + 选择文件 → 上传成功
3. 歌曲库页面显示新上传的歌曲
4. 搜索框输入关键词 → 实时过滤
5. 点击卡片 → 跳转到谱面详情页
6. 未登录时看不到上传按钮
