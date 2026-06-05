# Phase 5: Rhythm Game Player

## Overview

MCosu/osu! 风格的节奏游戏玩家。用户在全屏 Canvas 中，根据音乐节奏点击/长按/滑动音符。支持三种音符类型（Circle/Hold/Slide），标准判定系统，结算画面。

## Goals

1. 全屏 Canvas 游戏渲染（音符 + 判定圈 + HUD + 特效）
2. 三种音符操作：Circle 点击、Hold 长按、Slide 滑动
3. 标准判定系统：Perfect/Great/Good/Miss
4. 实时分数/连击/准确率追踪
5. 结算画面展示结果
6. 分数提交到排行榜

## Game Mechanics

### Circle（单击）
1. 音符在画布上指定位置出现
2. Approach circle 从 2x 缩小到 1x
3. 缩到匹配时，玩家点击鼠标
4. 根据时间精度判定

### Hold（长按）
1. 点击起点（判定同 Circle）
2. 按住鼠标不放
3. 期间有持续判定条
4. 到达终点时松开
5. 期间断开 = Miss

### Slide（滑动）
1. 点击起点
2. 按住鼠标沿路径滑动
3. 路径上有 slide tick，经过时判定
4. 到达终点时松开

## Scoring System

### Judgment Windows

| Judgment | Time Window | Points | Color |
|----------|-----------|--------|-------|
| Perfect | ±20ms | 300 | Gold |
| Great | ±50ms | 100 | Blue |
| Good | ±100ms | 50 | Green |
| Miss | >100ms or no hit | 0 | Red |

### Grade

| Grade | Accuracy |
|-------|----------|
| SSS | 100% |
| SS | 99%+ |
| S | 95%+ |
| A | 90%+ |
| B | <90% |

### Score Calculation
```
score = perfect*300 + great*100 + good*50
accuracy = (perfect*300 + great*100 + good*50) / (totalNotes * 300) * 100
```

## Game States

```
Loading → Ready → Playing → Paused → Result
                              ↓
                           Failed (optional)
```

## Canvas Rendering

### Layer Order (bottom to top)
1. Background (dark with subtle audio-reactive effects)
2. Notes (Circle/Hold/Slide)
3. Approach circles
4. Hit feedback (judgment text + particles)
5. HUD (score, combo, accuracy)

### Note Rendering
- **Circle**: Filled circle with glowing border + approach circle
- **Hold**: Start circle + end circle + connecting bar (semi-transparent)
- **Slide**: Path line + control points + slide ticks

## Input Handling

| Event | Action |
|-------|--------|
| mousedown on Circle | Check timing, judge hit |
| mousedown on Hold start | Start hold, begin duration check |
| mousemove while holding | Check if still on Hold path |
| mouseup during Hold | End hold, check if completed |
| mousedown on Slide start | Start slide |
| mousemove during Slide | Check path progress |
| mouseup on Slide end | Complete slide |

## Result Screen

- Show final grade, score, accuracy
- Show judgment breakdown (perfect/great/good/miss counts)
- Show max combo
- Buttons: Retry, Back to detail

## Files to Create/Modify

### Frontend
- `client/src/views/PlayerView.vue` — Game page
- `client/src/components/player/GameCanvas.vue` — Main canvas
- `client/src/components/player/ResultScreen.vue` — Result display
- `client/src/engine/HitDetector.ts` — Judgment logic
- `client/src/stores/gameStore.ts` — Game state

### Backend
- `server/src/routes/scores.ts` — Submit score (already exists)

## Verification

1. 从谱面详情页点击「开始游戏」
2. 游戏加载谱面数据和音频
3. Circle 音符出现 + 判定圈缩小 → 点击 → Perfect/Great/Good/Miss
4. Hold 音符 → 点击起点 → 按住 → 松开
5. Slide 音符 → 沿路径滑动
6. 分数/连击/准确率实时更新
7. 游戏结束 → 结算画面
8. 分数提交到排行榜
