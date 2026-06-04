# ⚒️ BeatSmith — 节拍铁匠

> 一个类似 MCosu/osu! standard 模式的网页节拍游戏编辑器。用户注册登录后，上传歌曲、编辑谱面、用鼠标点击/连点/长按来玩节奏游戏。所有谱面公开共享，每张谱面有单曲排行榜和评级系统。

## 📐 系统架构

```
┌──────────────────────────────────────────────────────────┐
│                     Vue 3 Frontend                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ HomeView │ │EditorView│ │PlayerView│ │LibraryView│   │
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
| Canvas 2D | 游戏渲染 |
| Web Audio API | 音频分析与播放 |
| Vite | 构建工具 |
| motion-v | 动画效果 |
| Vue 组件库 | 待定（参考 UI 项目后确定） |

### 后端 (server/)
| 技术 | 用途 |
|------|------|
| Node.js + Express | REST API 服务 |
| better-sqlite3 | SQLite 数据库驱动 |
| bcryptjs | 密码哈希 |
| jsonwebtoken (JWT) | 身份认证 |
| multer | 文件上传处理 |
| nanoid | 生成唯一 ID |
| tsx | TypeScript 运行时 |

### 数据库
- **SQLite** — 轻量级，零配置，单文件 `data.db`
- 开发阶段单机使用，后期可迁移到 PostgreSQL/MySQL

## 📊 数据库 Schema

```sql
-- 用户表
CREATE TABLE users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,          -- bcrypt 哈希
  nickname    TEXT,
  avatar      TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 谱面表（公开共享）
CREATE TABLE beatmaps (
  id          TEXT PRIMARY KEY,       -- nanoid
  creator_id  INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  artist      TEXT,
  audio_file  TEXT NOT NULL,          -- 服务器上的文件路径
  duration    INTEGER,                -- 时长 ms
  bpm         REAL,
  map_data    TEXT NOT NULL,          -- JSON: 完整谱面数据
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
  grade       TEXT NOT NULL,          -- SSS/SS/S/A/B
  perfect     INTEGER DEFAULT 0,
  great       INTEGER DEFAULT 0,
  good        INTEGER DEFAULT 0,
  miss        INTEGER DEFAULT 0,
  played_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, beatmap_id)        -- 每人每谱面只保留最高分
);
```

## 🎮 游戏玩法（MCosu 风格）

- 音符在画布**任意位置**出现，不是固定车道
- 判定圈（approach circle）从大缩小到 note 位置，缩到匹配时点击
- **单击**：点击 Circle 类型 note
- **长按**：点击 Slider 起点后按住鼠标沿路径滑动
- **连点**：Spinner 类型需快速连续点击消掉
- 鼠标光标显示为自定义样式

### 三种音符类型
| 类型 | 操作 | 说明 |
|------|------|------|
| **Circle** | 单击 | 出现后缩小到判定圈，玩家在时机内点击 |
| **Slider** | 点击+按住 | 点击起点后按住沿路径滑动，松手判定 |
| **Spinner** | 快速连点 | 快速连续点击消掉，限时内达到目标次数 |

## 🏆 评级系统（5 级）

| 等级 | 准确率 | 颜色 |
|------|--------|------|
| **SSS** | 100.00% | 金色 ✨ |
| **SS** | 99.00% - 99.99% | 蓝色 |
| **S** | 95.00% - 98.99% | 绿色 |
| **A** | 90.00% - 94.99% | 橙色 |
| **B** | < 90.00% | 灰色 |

### 判定时间窗口
| 判定 | 时间窗口 | 得分 |
|------|---------|------|
| Perfect | ±20ms | 300 |
| Great | ±50ms | 100 |
| Good | ±100ms | 50 |
| Miss | >100ms / 未击中 | 0 |

## 🏗️ 页面/路由

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | HomeView | 上传音频，浏览公开谱面 |
| `/login` | LoginView | 登录 |
| `/register` | RegisterView | 注册 |
| `/editor` | EditorView | 时间轴编辑器 + 游戏场预览 |
| `/play/:mapId` | PlayerView | MCosu 风格节奏游戏 |
| `/map/:mapId` | MapDetailView | 谱面详情 + 排行榜 + 开始游戏 |

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
│   │   │   ├── audioStore.ts        # 音频播放
│   │   │   ├── editorStore.ts       # 谱面编辑
│   │   │   └── gameStore.ts         # 游戏分数
│   │   ├── engine/
│   │   │   ├── AudioEngine.ts       # Web Audio API
│   │   │   ├── BeatDetector.ts      # 节拍检测
│   │   │   ├── HitDetector.ts       # 判定逻辑
│   │   │   └── FrequencyAnalyzer.ts # FFT 分析
│   │   ├── models/
│   │   │   ├── BeatMap.ts           # 谱面数据模型
│   │   │   ├── Score.ts             # 分数模型
│   │   │   └── User.ts              # 用户模型
│   │   ├── utils/
│   │   │   ├── grade.ts             # 评级计算
│   │   │   ├── api.ts               # axios 封装
│   │   │   └── time.ts              # 时间工具
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── editor/
│   │   │   ├── player/
│   │   │   └── library/
│   │   └── views/
│   │       ├── HomeView.vue
│   │       ├── LoginView.vue
│   │       ├── RegisterView.vue
│   │       ├── EditorView.vue
│   │       ├── PlayerView.vue
│   │       └── MapDetailView.vue
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                          # Node.js 后端
│   ├── src/
│   │   ├── index.ts                 # Express 入口
│   │   ├── db.ts                    # SQLite 连接 + 建表
│   │   ├── middleware/
│   │   │   └── auth.ts             # JWT 验证中间件
│   │   ├── routes/
│   │   │   ├── auth.ts             # 注册/登录
│   │   │   ├── maps.ts             # 谱面 CRUD
│   │   │   ├── scores.ts           # 分数提交/查询
│   │   │   └── upload.ts           # 文件上传
│   │   └── utils/
│   │       └── jwt.ts              # JWT 签发/验证
│   ├── uploads/                     # 音频文件存储
│   ├── data.db                      # SQLite 数据库文件
│   ├── package.json
│   └── tsconfig.json
│
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
| GET | `/api/maps` | 获取所有公开谱面列表 | 否 |
| GET | `/api/maps/:id` | 获取谱面详情 | 否 |
| POST | `/api/maps` | 创建谱面 | 是 |
| PUT | `/api/maps/:id` | 更新谱面 | 是(作者) |
| DELETE | `/api/maps/:id` | 删除谱面 | 是(作者) |

### 分数
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/maps/:id/scores` | 获取该谱面排行榜 | 否 |
| POST | `/api/maps/:id/scores` | 提交分数 | 是 |

### 文件
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/upload/audio` | 上传音频文件 | 是 |

## 📅 开发计划

### Phase 1: 基础骨架 + 认证（Day 1-3）
- [ ] 前端脚手架：Vue 3 + TS + Vite
- [ ] 后端脚手架：Express + SQLite
- [ ] 数据库初始化
- [ ] AudioEngine — Web Audio API 封装
- [ ] 后端认证：注册/登录/JWT
- [ ] authStore — 前端登录状态
- [ ] LoginView / RegisterView
- [ ] HomeView — 上传音频

### Phase 2: 节拍检测（Day 4）
- [ ] BeatDetector — 能量检测 + 频谱通量
- [ ] 波形显示 + 节拍叠加
- [ ] BPM 估算 + 手动覆盖

### Phase 3: 谱面编辑器（Day 5-7）
- [ ] editorStore — 笔记数组、撤销栈
- [ ] TimelineCanvas — 水平滚动时间轴
- [ ] PlayfieldPreview — 音符位置预览
- [ ] 音符放置 + 节拍网格吸附
- [ ] Circle / Slider / Spinner 三种类型
- [ ] Slider 路径编辑
- [ ] 音符选择/拖拽/删除 + Undo/Redo
- [ ] 后端谱面 API

### Phase 4: 游戏模式（Day 8-9）
- [ ] GameCanvas — 全屏 Canvas + rAF 渲染
- [ ] HitDetector — 时间窗口 + 距离判定
- [ ] 鼠标点击/连点/长按输入
- [ ] 三种音符玩法
- [ ] 判定系统 + 分数/连击/准确率
- [ ] 评级计算 → SSS/SS/S/A/B
- [ ] 后端分数 API

### Phase 5: 排行榜 + 谱面库（Day 10）
- [ ] MapDetailView — 谱面信息 + 排行榜
- [ ] 排行榜组件
- [ ] HomeView — 公开谱面列表
- [ ] 评级等级颜色显示

### Phase 6: 持久化 + 视觉打磨（Day 11-12）
- [ ] 谱面 JSON 导出/导入
- [ ] 用户记录持久化
- [ ] Canvas 粒子特效 + 背景可视化
- [ ] 键盘快捷键
- [ ] 暗色霓虹主题 UI

### Phase 7: 后期增强（可选）
- [ ] 音乐文件迁移到云存储
- [ ] 更多排行榜类型
- [ ] 谱面搜索/筛选
- [ ] 用户个人主页

## 🎨 UI 设计

- **视觉风格**：暗色霓虹 — 深色背景 + 紫/蓝/粉霓虹高亮
- **动画**：motion-v（游戏特效 + 页面过渡 + 登录动效）
- **组件库**：待定（参考 UI 开源项目后确定）

## 🔧 开发命令

```bash
# 安装依赖
npm run install:all

# 同时启动前后端
npm run dev

# 仅启动前端
npm run dev:client

# 仅启动后端
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
- `chore:` 构建/工具变更

每个阶段完成后 git commit 并 push 到 GitHub。
