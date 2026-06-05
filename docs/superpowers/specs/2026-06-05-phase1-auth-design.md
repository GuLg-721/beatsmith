# Phase 1: Backend Authentication + Login Page UI

## Overview

BeatSmith 的第一个功能阶段：实现用户认证系统（注册/登录）和登录页面 UI。这是所有后续功能的基础。

## Goals

1. 用户可以注册账号（用户名 + 密码 + 昵称）
2. 用户可以登录并获取 JWT token
3. 登录页面有沉浸式视觉效果（动态背景 + 浮动表单）
4. 前端可以自动登录（localStorage 存 token）

## Backend API

### POST /api/auth/register

**Request:**
```json
{
  "username": "player1",
  "password": "abc12345",
  "nickname": "玩家一号"
}
```

**Validation:**
- username: 3-20 characters, alphanumeric + underscore, unique
- password: ≥8 characters, must contain letters AND numbers
- nickname: optional, max 20 characters

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "player1",
    "nickname": "玩家一号",
    "avatar": null,
    "created_at": "2026-06-05T10:00:00.000Z"
  }
}
```

**Error (400):**
```json
{
  "message": "用户名已存在"
}
```

### POST /api/auth/login

**Request:**
```json
{
  "username": "player1",
  "password": "abc12345"
}
```

**Response (200):** Same as register

**Error (401):**
```json
{
  "message": "用户名或密码错误"
}
```

### GET /api/auth/me

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "player1",
    "nickname": "玩家一号",
    "avatar": null,
    "created_at": "2026-06-05T10:00:00.000Z"
  }
}
```

**Error (401):**
```json
{
  "message": "未授权"
}
```

## JWT Authentication

- Secret: stored in `server/.env` as `JWT_SECRET`
- Expiry: 7 days
- Payload: `{ userId: number }`
- Middleware: `auth.ts` extracts userId from token, attaches to `req.user`

## Database

No new tables needed. The `users` table already exists in `db.ts`:
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Frontend: LoginView

### Layout
- Full-screen `ParticleBackground` (reuse from homepage)
- Centered floating card (400px max-width)
- Semi-transparent dark surface background

### Card Content
```
┌─────────────────────────┐
│   ⚒️ BeatSmith          │  ← Logo + brand name
│                         │
│   用户名                │  ← Input, neon focus ring
│   ┌───────────────────┐ │
│   │                   │ │
│   └───────────────────┘ │
│                         │
│   密码                  │  ← Input, neon focus ring
│   ┌───────────────────┐ │
│   │                   │ │
│   └───────────────────┘ │
│                         │
│   ┌───────────────────┐ │
│   │      登  录       │ │  ← Primary button, glow hover
│   └───────────────────┘ │
│                         │
│   没有账号？立即注册     │  ← Accent color link
└─────────────────────────┘
```

### Login/Register Toggle
- Same card, slide animation between forms
- Login form: username + password + submit + switch link
- Register form: username + nickname + password + confirm password + submit + switch link

### Form Validation
- Username: 3-20 chars, alphanumeric + underscore
- Password: ≥8 chars, letters + numbers
- Confirm password: must match (register only)
- Real-time validation on blur
- Error messages below inputs in error color

### States
- Default: form visible
- Loading: button shows spinner, inputs disabled
- Error: input border turns red, message below
- Success: redirect to `/songs` or `redirect` query param

## Files to Create/Modify

### Backend (server/)
- `server/src/index.ts` — Add auth routes
- `server/src/routes/auth.ts` — Auth route handlers
- `server/src/middleware/auth.ts` — JWT middleware
- `server/src/utils/jwt.ts` — JWT sign/verify helpers
- `server/.env` — JWT_SECRET

### Frontend (client/)
- `client/src/views/LoginView.vue` — Full login page
- `client/src/stores/authStore.ts` — Already exists, verify it works

## Verification

1. Start server: `npm run dev:server`
2. Register: `POST /api/auth/register` → returns token
3. Login: `POST /api/auth/login` → returns token
4. Get me: `GET /api/auth/me` with token → returns user
5. Open browser: `http://localhost:5173/login`
6. Register new user → redirects to /songs
7. Logout → login again → works
8. Try duplicate username → shows error
9. Try wrong password → shows error
