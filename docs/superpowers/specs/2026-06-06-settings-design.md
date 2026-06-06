# Settings Page Design Spec

> **Date:** 2026-06-06
> **Status:** Draft
> **Feature:** Settings Page (设置页)

## Overview

A single-page settings page with card-based layout, allowing users to manage their profile, security, and appearance preferences.

## Goals

- Let users update their nickname and password
- Let users choose from preset avatars or upload custom images
- Let users switch between 3 neon theme color schemes
- Maintain the cyberpunk neon aesthetic throughout

## Page Layout

Single page with 3 cards stacked vertically:

```
┌─────────────────────────────────────────┐
│  ⚙️ 设置                                │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │ 👤 个人信息                      │    │
│  │  头像: [预设头像网格] [上传按钮]  │    │
│  │  昵称: [输入框]           [保存]  │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 🔒 修改密码                      │    │
│  │  旧密码: [输入框]                 │    │
│  │  新密码: [输入框]                 │    │
│  │  确认密码: [输入框]      [保存]   │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 🎨 主题配色                      │    │
│  │  [osu!霓虹] [赛博朋克] [Valorant]│    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Feature Details

### 1. Personal Info Card (个人信息)

**Avatar Section:**
- Display current avatar (large, centered)
- Preset avatar grid: 8 SVG geometric avatars in neon style
- Upload button: opens file picker for custom image
- Uploaded images stored in `server/uploads/avatars/`
- Max file size: 2MB, formats: jpg/png/gif

**Nickname Section:**
- Input field with current nickname pre-filled
- Validation: 2-20 characters, no special chars
- Save button sends PUT `/api/auth/profile`
- Success: show toast notification

### 2. Password Card (修改密码)

**Fields:**
- Current password (required)
- New password (required, min 6 chars)
- Confirm new password (must match)

**Behavior:**
- Save button sends PUT `/api/auth/password`
- Validates all fields before submit
- Clears form on success
- Shows error for wrong current password

### 3. Theme Card (主题配色)

**Theme Options:**

| # | Name | Reference | Primary | Secondary | Accent |
|---|------|-----------|---------|-----------|--------|
| 1 | osu! 霓虹 | osu! pink/purple | `#ff66aa` | `#bf00ff` | `#ff99cc` |
| 2 | 赛博朋克 | Cyberpunk 2077 | `#fcee09` | `#00d4ff` | `#ff6600` |
| 3 | Valorant | Valorant red/black | `#ff4655` | `#bd3944` | `#ece8e1` |

**Implementation:**
- Theme stored in `localStorage` and user record
- Apply via `document.documentElement.dataset.theme`
- CSS variables switch all colors instantly
- Default: osu! 霓虹 (theme 1)

## Backend API Changes

### New Routes

| Route | Method | Body | Response |
|-------|--------|------|----------|
| `/api/auth/profile` | PUT | `{ nickname }` | `{ user }` |
| `/api/auth/password` | PUT | `{ oldPassword, newPassword }` | `{ success }` |
| `/api/upload/avatar` | POST | FormData (file) | `{ url }` |
| `/api/auth/avatar` | PUT | `{ avatarUrl }` | `{ user }` |
| `/api/auth/theme` | PUT | `{ theme }` | `{ success }` |

### Database Changes

Add columns to `users` table:
```sql
ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'osu';
```

## Frontend Files

### New/Modified Files

| File | Action | Description |
|------|--------|-------------|
| `client/src/views/SettingsView.vue` | Modify | Full settings page |
| `client/src/components/settings/AvatarPicker.vue` | New | Avatar selection + upload |
| `client/src/components/settings/PasswordForm.vue` | New | Password change form |
| `client/src/components/settings/ThemePicker.vue` | New | Theme color selector |
| `client/src/styles/themes.css` | New | CSS variable definitions for each theme |
| `server/src/routes/auth.ts` | Modify | Add profile/password/avatar/theme endpoints |
| `server/src/routes/upload.ts` | Modify | Add avatar upload endpoint |

## Theme CSS Variables

```css
/* osu! 霓虹 (default) */
:root, [data-theme="osu"] {
  --primary: #ff66aa;
  --primary-rgb: 255, 102, 170;
  --secondary: #bf00ff;
  --accent: #ff99cc;
  --bg-deep: #0a0a1a;
  --bg-surface: #12122a;
  --bg-card: #1a1a3e;
  --text: #ffffff;
  --text-muted: #8888aa;
  --success: #00ff88;
  --error: #ff4466;
}

/* 赛博朋克 */
[data-theme="cyberpunk"] {
  --primary: #fcee09;
  --primary-rgb: 252, 238, 9;
  --secondary: #00d4ff;
  --accent: #ff6600;
  --bg-deep: #0a0a0a;
  --bg-surface: #1a1a1a;
  --bg-card: #2a2a2a;
  --text: #ffffff;
  --text-muted: #888888;
  --success: #00ff88;
  --error: #ff4466;
}

/* Valorant */
[data-theme="valorant"] {
  --primary: #ff4655;
  --primary-rgb: 255, 70, 85;
  --secondary: #bd3944;
  --accent: #ece8e1;
  --bg-deep: #0a0a0a;
  --bg-surface: #1a1a1a;
  --bg-card: #2a2a2a;
  --text: #ffffff;
  --text-muted: #888888;
  --success: #00ff88;
  --error: #ff4466;
}
```

## Preset Avatars

8 SVG geometric avatars with neon glow effects:
1. Hexagon (blue)
2. Circle (pink)
3. Triangle (green)
4. Diamond (purple)
5. Star (yellow)
6. Pentagon (cyan)
7. Octagon (red)
8. Cross (white)

## Error Handling

- Invalid nickname: show inline error
- Wrong current password: show error message
- Password mismatch: show error message
- Upload too large: show error message
- Upload failed: show error message, keep current avatar

## Testing Checklist

- [ ] Can change nickname and see it update in navbar
- [ ] Can change password and login with new password
- [ ] Can select preset avatar
- [ ] Can upload custom avatar
- [ ] Can switch themes and see colors change instantly
- [ ] Theme persists after page reload
- [ ] Theme persists after logout/login
- [ ] Form validation works (empty fields, mismatch, etc.)
- [ ] Error messages display correctly
