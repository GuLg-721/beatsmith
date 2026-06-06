# ⚒️ BeatSmith — 节拍铁匠

> 一个类似 MCosu/osu! standard 模式的网页节奏游戏编辑器。用户注册登录后，上传歌曲，系统自动检测节拍并生成基础谱面，用户在编辑器中调整后，用鼠标点击/空格键来挑战节奏游戏。所有谱面公开共享，每张谱面有单曲排行榜和评级系统。

## 📐 系统架构

```
┌──────────────────────────────────────────────────────────┐
│                     Vue 3 Frontend                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ HomeView │ │EditorView│ │PlayerView│ │SongsView │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │
│       │            │            │             │           │
│  ┌────┴────────────┴────────────┴─────────────┴────┐     │
│  │              Pinia Stores                        │     │
│  │  authStore │ audioStore │ editorStore │ gameStore│     │
│  └────┬────────────────────────────────────────────┘     │
│       │ axios / fetch                                     │
└───────┼──────────────────────────────────────────────────┘
        │ HTTP + JWT
┌───────┼──────────────────────────────────────────────────┐
│       ▼           Node.js + Express Backend              │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Routes:                                         │     │
│  │  POST /api/auth/register   POST /api/auth/login │     │
│  │  GET  /api/auth/me                                  │
│  │  GET  /api/maps            POST /api/maps        │     │
│  │  GET  /api/maps/:id        PUT  /api/maps/:id    │     │
│  │  DELETE /api/maps/:id                               │
│  │  GET  /api/maps/:id/scores POST /api/maps/:id/scores│ │
│  │  POST /api/upload/audio                             │
│  └────┬────────────┬────────────┬──────────────────┘     │
│       │            │            │                         │
│  ┌────▼────┐  ┌────▼────┐  ┌───▼────────┐               │
│  │ SQLite  │  │ uploads/│  │ middleware │               │
│  │ data.db │  │ *.mp3   │  │ auth(JWT) │               │
│  └─────────┘  └─────────┘  └───────────┘               │
└──────────────────────────────────────────────────────────┘
```

## 🛠️ 技术栈

### 前端 (client/)
| 技术 | 用途 |
|------|------|
| Vue 3 + Composition API | UI 框架 |
| TypeScript | 类型安全 |
| Pinia | 状态管理 |
| Vue Router | 路由 |
| Naive UI | 组件库（暗色主题内置） |
| motion-v | 动画效果 |
| Canvas 2D | 游戏渲染 |
| Web Audio API | 音频分析与播放 |
| Vite | 构建工具 |
| ESLint + Prettier | 代码规范 |
| Inter + Noto Sans SC | 字体（英文 + 中文） |

### 后端 (server/)
| 技术 | 用途 |
|------|------|
| Node.js + Express | REST API 服务 |
| sql.js | SQLite 数据库（纯 JS，无需编译） |
| bcryptjs | 密码哈希 |
| jsonwebtoken (JWT) | 身份认证 |
| multer | 文件上传处理 |
| nanoid | 生成唯一 ID |
| tsx | TypeScript 运行时 |

### 数据库
- **SQLite** — 轻量级，零配置，单文件 `data.db`
- 开发阶段单机使用，后期可迁移到 PostgreSQL/MySQL

## 🎮 游戏玩法

- 音符在画布**任意位置**出现，不是固定车道
- **Circle（红色）**：判定圈缩小到音符位置时，**鼠标点击**
- **Tap（橙色）**：音符出现后，**按空格键**触发
- 系统自动检测节拍并生成基础谱面，用户可在编辑器中调整

### 两种音符类型
| 类型 | 操作 | 视觉 | 说明 |
|------|------|------|------|
| **Circle** | 鼠标点击 | 红色圆形 + 判定圈 | 标准节奏点 |
| **Tap** | 空格键 | 橙色圆形 + "空格" 提示 | 快速连击点 |

### 判定系统
| 判定 | 时间窗口 | 得分 | 颜色 |
|------|---------|------|------|
| Perfect | ±40ms | 300 | 金色 |
| Great | ±80ms | 150 | 蓝色 |
| Good | ±140ms | 50 | 绿色 |
| Miss | >140ms | 0 | 红色 |

### 评级系统
| 等级 | 准确率 | 颜色 |
|------|--------|------|
| **SSS** | 100.00% | 金色 ✨ |
| **SS** | 99.00%+ | 蓝色 |
| **S** | 95.00%+ | 绿色 |
| **A** | 90.00%+ | 橙色 |
| **B** | < 90.00% | 灰色 |

## 🏗️ 页面/路由

| 路由 | 页面 | 功能 | 需登录 |
|------|------|------|--------|
| `/` | HomeView | 沉浸式首页 + 粒子背景 | 否 |
| `/login` | LoginView | 登录/注册（极光背景） | 否 |
| `/songs` | SongsView | 歌曲库（唱片店风格卡片） | 否 |
| `/editor` | EditorView | 时间轴编辑器 + 自动生成 | ✅ |
| `/play/:mapId` | PlayerView | 节奏游戏（Circle + Tap） | ✅ |
| `/map/:mapId` | MapDetailView | 谱面详情 + 排行榜 | 否 |

## 📁 项目结构

```
beatforge/
├── client/                          # Vue 3 前端
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── router/index.ts
│   │   ├── stores/
│   │   │   ├── authStore.ts         # 登录状态 + JWT
│   │   │   ├── audioStore.ts        # 音频播放 + 节拍检测
│   │   │   ├── editorStore.ts       # 谱面编辑状态
│   │   │   └── gameStore.ts         # 游戏分数 + 判定
│   │   ├── engine/
│   │   │   ├── AudioEngine.ts       # Web Audio API 封装
│   │   │   ├── BeatDetector.ts      # 节拍检测算法
│   │   │   ├── BeatGenerator.ts     # 自动谱面生成
│   │   │   ├── HitDetector.ts       # 判定逻辑
│   │   │   └── FrequencyAnalyzer.ts # FFT 频谱分析
│   │   ├── utils/
│   │   │   ├── grade.ts             # 评级计算
│   │   │   └── api.ts               # axios 封装
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── ParticleBackground.vue  # 首页粒子背景
│   │   │   │   └── AuroraBackground.vue    # 登录极光背景
│   │   │   ├── editor/
│   │   │   │   ├── TimelineCanvas.vue      # 时间轴 Canvas
│   │   │   │   ├── ToolbarPanel.vue        # 工具栏
│   │   │   │   ├── AudioControlBar.vue     # 音频控制
│   │   │   │   └── BottomBar.vue           # 底部控制
│   │   │   ├── player/
│   │   │   │   ├── GameCanvas.vue          # 游戏 Canvas
│   │   │   │   └── ResultScreen.vue        # 结算画面
│   │   │   └── library/
│   │   │       ├── SongCard.vue            # 歌曲卡片
│   │   │       └── UploadDialog.vue        # 上传对话框
│   │   └── views/
│   │       ├── HomeView.vue
│   │       ├── LoginView.vue
│   │       ├── SongsView.vue
│   │       ├── EditorView.vue
│   │       ├── PlayerView.vue
│   │       ├── MapDetailView.vue
│   │       ├── ProfileView.vue
│   │       ├── SettingsView.vue
│   │       └── NotFoundView.vue
│   ├── vite.config.ts
│   └── package.json
│
├── server/                          # Node.js 后端
│   ├── src/
│   │   ├── index.ts                 # Express 入口
│   │   ├── db.ts                    # SQLite 连接 + 建表
│   │   ├── middleware/auth.ts       # JWT 验证
│   │   ├── routes/
│   │   │   ├── auth.ts             # 注册/登录
│   │   │   ├── maps.ts             # 谱面 CRUD
│   │   │   ├── scores.ts           # 分数提交/查询
│   │   │   └── upload.ts           # 文件上传
│   │   └── utils/jwt.ts            # JWT 签发
│   ├── uploads/                     # 音频文件
│   ├── data.db                      # SQLite 数据库
│   └── package.json
│
├── docs/superpowers/specs/          # 设计文档
├── PRODUCT.md                       # 产品定义
├── DESIGN.md                        # 设计系统
├── package.json                     # workspace root
└── README.md
```

## 🔌 API 路由

### 认证
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 否 |
| POST | `/api/auth/login` | 登录 | 否 |
| GET | `/api/auth/me` | 获取当前用户信息 | 是 |

### 谱面
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/maps` | 获取公开谱面列表 | 否 |
| GET | `/api/maps/:id` | 获取谱面详情 | 否 |
| POST | `/api/maps` | 创建谱面 | 是 |
| PUT | `/api/maps/:id` | 更新谱面 | 是(作者) |
| DELETE | `/api/maps/:id` | 删除谱面 | 是(作者) |

### 分数
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/maps/:id/scores` | 获取排行榜 | 否 |
| POST | `/api/maps/:id/scores` | 提交分数 | 是 |

### 文件
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/upload/audio` | 上传音频文件 | 是 |
| POST | `/api/upload/cover` | 上传封面图片 | 是 |

## 📊 数据库 Schema

```sql
-- 用户表
CREATE TABLE users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  nickname    TEXT,
  avatar      TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 谱面表（公开共享）
CREATE TABLE beatmaps (
  id          TEXT PRIMARY KEY,
  creator_id  INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  artist      TEXT,
  audio_file  TEXT NOT NULL,
  cover_image TEXT,
  duration    INTEGER,
  bpm         REAL,
  map_data    TEXT NOT NULL,
  difficulty  TEXT DEFAULT 'Normal',
  play_count  INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分数表
CREATE TABLE scores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  beatmap_id  TEXT NOT NULL REFERENCES beatmaps(id),
  score       INTEGER NOT NULL,
  max_combo   INTEGER NOT NULL,
  accuracy    REAL NOT NULL,
  grade       TEXT NOT NULL,
  perfect     INTEGER DEFAULT 0,
  great       INTEGER DEFAULT 0,
  good        INTEGER DEFAULT 0,
  miss        INTEGER DEFAULT 0,
  played_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, beatmap_id)
);
```

## 🎨 UI 设计

- **视觉风格**：暗色霓虹 — 深色背景 + 紫/蓝/粉霓虹高亮
- **组件库**：Naive UI（暗色主题内置）
- **动画**：motion-v + CSS transitions
- **设计系统**：OKLCH 色彩 + impeccable skill

## 📏 项目规范

### 密码规则
- 最少 8 位，必须包含字母和数字

### 上传限制
- 音频文件最大 50MB，支持 MP3/WAV
- 封面图可选上传，无封面时用 OKLCH 渐变色占位

### 路由权限
- 公开：首页、登录、歌曲库、谱面详情、404
- 需登录：编辑器、游戏、个人档案、设置

### 管理员账号
- 用户名：`admin`
- 密码：`admin123`

## 🔧 开发命令

```bash
# 安装所有依赖
npm run install:all

# 同时启动前后端
npm run dev

# 仅启动前端 (port 5173)
npm run dev:client

# 仅启动后端 (port 3000)
npm run dev:server

# 构建
npm run build
```

## 📝 Git 提交规范

- `init:` 项目初始化
- `feat:` 新功能
- `fix:` Bug 修复
- `style:` 样式调整
- `refactor:` 代码重构
- `docs:` 文档更新

## 📋 当前进度

### ✅ 已完成
- [x] 项目脚手架（Vue 3 + Express + SQLite）
- [x] 用户认证系统（注册/登录/JWT）
- [x] 首页（沉浸式粒子背景）
- [x] 登录页（极光背景 + 浮动卡片）
- [x] 歌曲上传 + 歌曲库页面
- [x] 音频引擎（Web Audio API + 节拍检测）
- [x] 自动谱面生成（Circle + Tap）
- [x] 谱面编辑器（Canvas 时间轴）
- [x] 节奏游戏（鼠标点击 + 空格键）
- [x] 判定系统 + 评级系统
- [x] 谱面详情页 + 排行榜

### 🔜 待开发
- [ ] 排行榜页面（全局排行）
- [ ] 个人档案页（游玩记录 + 评级分布）
- [ ] 设置页面（修改昵称/密码）
- [ ] 皮肤系统（自定义音效/光标）
- [ ] 后端分享功能（公开谱面链接）

## 🌿 分支说明

| 分支 | 内容 | 用途 |
|------|------|------|
| `main` | Circle + Tap | 当前开发版 |
| `v1-spinner-archive` | Circle + Tap + Spinner | 旧版存档 |
