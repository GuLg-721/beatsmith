# Phase 4: Beatmap Editor with Auto-Generation

## Overview

谱面编辑器：用户上传歌曲后，系统自动生成基础谱面，用户在此基础上微调。支持三种音符类型（Circle/Hold/Slide）和三种生成模式（简单/进阶/自定义）。

## Goals

1. 用户上传歌曲后自动检测节拍并生成基础谱面
2. 支持三种生成模式：简单（每拍Circle）、进阶（混合音符）、自定义
3. Canvas 时间轴：波形显示 + 节拍网格 + 音符渲染
4. 音符操作：放置、移动、选中、删除
5. Undo/Redo 支持
6. 播放预览（播放头跟随音频）
7. 保存谱面到后端

## Auto-Generation Algorithm

### Input
- `beats: Beat[]` — 检测到的节拍（时间+强度）
- `bpm: number` — 估算的 BPM
- `canvasWidth: number` — 画布宽度（像素）
- `canvasHeight: number` — 画布高度（像素）
- `durationMs: number` — 音频总时长

### Output
- `Note[]` — 生成的音符数组

### Simple Mode
每个检测到的节拍放一个 Circle，x/y 随机分布。

### Advanced Mode
- 重拍（每4拍第1拍）：Circle
- 弱拍（每4拍第3拍）：Hold（持续半拍时长）
- 位置随机但避免重叠

### Custom Mode
用户可调参数：
- `density`: 生成密度（低/中/高）
- `circleRatio`: Circle 占比（0-100%）
- `holdRatio`: Hold 占比（0-100%）
- `slideRatio`: Slide 占比（0-100%）
三者之和必须为 100%

## Data Model

```typescript
interface Note {
  id: string           // nanoid
  type: 'circle' | 'hold' | 'slide'
  time: number         // 毫秒，命中时间
  x: number            // 0-1 归一化 x 坐标
  y: number            // 0-1 归一化 y 坐标
  endTime?: number     // 仅 hold：结束时间
  controlPoints?: {x: number, y: number}[] // 仅 slide：控制点
}

interface BeatMap {
  version: number
  metadata: {
    title: string
    artist: string
    bpm: number
    duration: number
    creator: string
  }
  notes: Note[]
  timingPoints: TimingPoint[]
}

interface TimingPoint {
  time: number         // 毫秒
  bpm: number
  scrollSpeed: number  // 1.0 = normal
}
```

## Editor Layout

```
┌─────────────────────────────────────────────────────┐
│  ⚒️ BeatSmith 编辑器    [播放] [保存] [导出JSON]      │  ← ToolbarPanel
├─────────────────────────────────────────────────────┤
│  音频: song.mp3    BPM: 128    进度: 1:23/3:45       │  ← AudioControlBar
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  TimelineCanvas                               │   │
│  │  ┌─ 背景层：音频波形                           │   │
│  │  ├─ 网格层：节拍线（垂直虚线）                   │   │
│  │  ├─ 音符层：Circle/Hold/Slide                  │   │
│  │  └─ 交互层：播放头 + 选择框                     │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  [自动生成] [模式: 简单▼] [吸附: 1/4▼]              │  ← BottomBar
│  [+Circle] [+Hold] [+Slide] [删除] [撤销] [重做]    │
└─────────────────────────────────────────────────────┘
```

## Canvas Rendering

### 层级（从下到上）
1. **背景层**：深色背景 + 音频波形（浅色线条）
2. **网格层**：节拍线（垂直虚线，对齐 BPM）
3. **音符层**：
   - Circle：圆形，带发光边框
   - Hold：长条矩形，起点圆点 + 半透明条
   - Slide：折线，控制点 + 连线
4. **交互层**：播放头（垂直实线）+ 选中高亮

### 坐标系
- X 轴 = 时间（像素 = 时间 * zoomLevel）
- Y 轴 = 位置（0-1 归一化，对应画布高度）
- zoomLevel：像素/毫秒，控制时间轴缩放

## Interaction

| 操作 | 效果 |
|------|------|
| 点击画布 | 在该时间+位置放置当前选中的音符类型 |
| 拖拽音符 | 移动音符的时间和/或位置 |
| 点击音符 | 选中，显示选中边框 |
| Delete/Backspace | 删除选中音符 |
| Ctrl+Z | 撤销 |
| Ctrl+Y / Ctrl+Shift+Z | 重做 |
| 空格 | 播放/暂停 |
| 鼠标滚轮 | 横向缩放时间轴 |
| 右键拖拽 | 平移时间轴 |

## Undo/Redo

使用 Command Pattern：
```typescript
interface EditorCommand {
  type: 'add' | 'remove' | 'move'
  noteId: string
  before?: Partial<Note>  // 移动前的状态
  after?: Partial<Note>   // 移动后的状态
  note?: Note             // 添加/删除的音符
}

// undoStack: EditorCommand[]
// redoStack: EditorCommand[]
```

## Files to Create/Modify

### Frontend
- `client/src/views/EditorView.vue` — 页面容器
- `client/src/components/editor/TimelineCanvas.vue` — Canvas 时间轴
- `client/src/components/editor/ToolbarPanel.vue` — 顶部工具栏
- `client/src/components/editor/AudioControlBar.vue` — 音频控制
- `client/src/components/editor/BottomBar.vue` — 底部控制栏
- `client/src/stores/editorStore.ts` — 编辑器状态管理
- `client/src/engine/BeatGenerator.ts` — 自动生成算法

### Backend
- `server/src/routes/maps.ts` — 更新 map_data 保存逻辑

## Verification

1. 上传歌曲 → 自动检测节拍 → 生成基础谱面
2. 选择不同生成模式 → 谱面变化
3. Canvas 显示波形 + 网格 + 音符
4. 点击画布放置音符
5. 拖拽移动音符
6. 选中 + Delete 删除音符
7. Ctrl+Z 撤销 / Ctrl+Y 重做
8. 播放预览（播放头移动）
9. 保存谱面到后端
10. 重新打开编辑器，谱面恢复
