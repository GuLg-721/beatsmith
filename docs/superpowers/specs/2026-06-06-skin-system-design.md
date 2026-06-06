# Skin System Design Spec

> **Date:** 2026-06-06
> **Status:** Draft
> **Feature:** Skin System (皮肤系统)

## Overview

Add skin customization to the Settings page, allowing users to customize game sounds and cursor styles. Includes 3 preset sound schemes and 3 preset cursor styles, plus custom upload options.

## Goals

- Allow users to customize game sounds
- Allow users to customize cursor styles
- Provide preset options for quick selection
- Support custom uploads for advanced users

---

## Settings Page Layout

Add new cards to the existing Settings page:

```
┌─────────────────────────────────────────┐
│  ⚙️ 设置                                │
├─────────────────────────────────────────┤
│  👤 个人信息卡片 (existing)              │
├─────────────────────────────────────────┤
│  🔊 音效设置 (NEW)                       │
│  - 预设音效方案选择                      │
│  - 自定义音效上传                        │
├─────────────────────────────────────────┤
│  🎯 光标样式 (NEW)                       │
│  - 预设准心样式选择                      │
│  - 自定义准心上传                        │
├─────────────────────────────────────────┤
│  🔒 修改密码卡片 (existing)              │
├─────────────────────────────────────────┤
│  🎨 主题配色卡片 (existing)              │
└─────────────────────────────────────────┘
```

---

## Sound Settings

### Preset Sound Schemes

| Scheme | Click Sound | Hit Sound | Grade Sound |
|--------|-------------|-----------|-------------|
| 默认 | 轻敲声 | 打击声 | 叮咚声 |
| 电子 | 电子音 | 合成器 | 电音 |
| 机械 | 机械键 | 金属撞击 | 齿轮声 |

### Sound Types

- **Click Sound**: Played when clicking a Circle note
- **Hit Sound**: Played when hitting a Tap note
- **Grade Sound**: Played when achieving a grade (SSS/SS/S/A/B)

### Implementation

- Store sound preference in user settings
- Use Web Audio API to play sounds
- Preset sounds bundled as base64 or small files
- Custom sounds uploaded to `server/uploads/sounds/`

---

## Cursor Settings

### Preset Cursor Styles

| Style | Image | Description |
|-------|-------|-------------|
| 十字准星 (Default) | ✚ | White cross/plus sign |
| 方框准星 | □ | White square outline |
| 点状准星 | • | Small square with yellow glow |

### Custom Cursor

- Upload custom cursor image
- Supported formats: PNG, SVG
- Max file size: 100KB
- Stored in `server/uploads/cursors/`

### Implementation

- Store cursor preference in user settings
- Apply cursor via CSS `cursor: url()`
- Preset cursors bundled as base64 or small files

---

## Backend API Changes

### New Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/users/:id/skin` | GET | Get user skin settings |
| `/api/users/:id/skin` | PUT | Update user skin settings |
| `/api/upload/sound` | POST | Upload custom sound |
| `/api/upload/cursor` | POST | Upload custom cursor |

### Database Changes

Add columns to `users` table:
```sql
ALTER TABLE users ADD COLUMN skin_settings TEXT DEFAULT NULL;
```

`skin_settings` JSON format:
```json
{
  "soundScheme": "default",
  "customSounds": {
    "click": "/uploads/sounds/custom-click.mp3",
    "hit": null,
    "grade": null
  },
  "cursor": "cross",
  "customCursor": null
}
```

---

## Frontend Components

### New Components

| File | Description |
|------|-------------|
| `client/src/components/settings/SoundSettings.vue` | Sound scheme selector + upload |
| `client/src/components/settings/CursorSettings.vue` | Cursor style selector + upload |

### Modified Files

| File | Changes |
|------|---------|
| `client/src/views/SettingsView.vue` | Add new settings cards |
| `server/src/routes/users.ts` | Add skin endpoints |
| `server/src/routes/upload.ts` | Add sound/cursor upload |
| `server/src/db.ts` | Add skin_settings column |

---

## Preset Sound Implementation

Use Web Audio API to generate sounds:

```typescript
function playClickSound() {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.frequency.value = 800
  oscillator.type = 'sine'
  gainNode.gain.value = 0.3

  oscillator.start()
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
  oscillator.stop(ctx.currentTime + 0.1)
}
```

---

## Preset Cursor Implementation

CSS cursor with embedded SVG:

```css
.cursor-cross {
  cursor: url('data:image/svg+xml,...') 16 16, auto;
}

.cursor-square {
  cursor: url('data:image/svg+xml,...') 16 16, auto;
}

.cursor-dot {
  cursor: url('data:image/svg+xml,...') 4 4, auto;
}
```

---

## Testing Checklist

- [ ] Sound scheme selector works
- [ ] Preset sounds play correctly
- [ ] Custom sound upload works
- [ ] Cursor style selector works
- [ ] Preset cursors display correctly
- [ ] Custom cursor upload works
- [ ] Settings persist after page reload
- [ ] All elements use theme CSS variables
