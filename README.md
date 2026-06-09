# ⚒️ BeatSmith（节拍铁匠）

> 🌐 **在线体验：http://39.97.229.60/**

一款基于 Vue 3 + Express + SQLite 的网页节奏游戏，跟随音乐节拍打击音符，类似 osu! 的核心玩法。

---

## 🎮 游戏核心玩法

- **节奏打击** — 音符从外圈向中心收缩，在合适时机点击获得 Perfect / Great / Good / Miss 判定
- **音符类型** — 支持 Circle（圆圈）和 Tap（点击）两种音符
- **连击系统** — 连续命中累积 Combo，中断后重置
- **即时评分** — 实时显示分数、连击、准确率
- **结算画面** — 歌曲结束后展示完整成绩：总分、最大连击、准确率、各判定数量、最终评级（SSS / SS / S / A / B）

---

## 🎵 歌曲库

- **浏览歌曲** — 卡片式布局展示所有歌曲，5列网格排列，支持分页（每页15首）
- **热门排行** — 首页展示播放次数最多的10首热门歌曲
- **搜索功能** — 实时搜索歌曲标题和艺术家
- **排序方式** — 支持按热门、最新、BPM 排序
- **歌曲详情** — 点击卡片查看歌曲详情页，包含封面、BPM、播放次数、排行榜 Top 10
- **上传歌曲** — 登录用户可上传 MP3 音频（自动识别 ID3 标签：标题、艺术家、时长）
- **删除歌曲** — 创作者可删除自己上传的歌曲，管理员可删除任何歌曲

---

## 🎧 BGM 背景音乐

- **全局播放器** — 页面底部常驻音乐播放器控件
- **播放控制** — 上一首、播放/暂停、下一首
- **随机播放** — 支持顺序和随机两种播放模式，状态自动保存
- **音量调节** — 滑块控制音量，支持静音
- **进度条** — 显示当前播放进度
- **歌单管理** — 管理员可创建、切换、删除歌单
- **管理员上传** — 管理员可向歌单添加背景音乐

---

## 🏆 排行榜

- **总分排行** — 按累计总分排名，显示总分、最佳评级、游玩次数
- **游玩次数** — 按游玩次数排名，显示平均准确率、不同歌曲数
- **评级统计** — 按 SSS / SS / S 数量排名
- **单曲排行** — 每首歌独立排行，显示 Top 3 领奖台 + 完整排名列表

---

## 👤 用户系统

### 注册与登录
- JWT 鉴权，安全的密码哈希（bcrypt）
- 用户名 3-20 位（字母、数字、下划线）
- 密码至少 8 位（必须包含字母和数字）

### 个人档案
- **总览** — 总分、游玩次数、最佳评级、平均准确率
- **最近游玩** — 最近10次游戏记录
- **最佳成绩** — 每首歌的最高分记录
- **评级分布** — 各评级（SSS / SS / S / A / B）的获得次数

### 个性化设置
- **头像** — 上传自定义头像（支持 JPG / PNG / GIF / WebP，最大 2MB）
- **昵称** — 修改显示昵称
- **密码** — 修改登录密码
- **主题切换** — 三套主题风格可选
- **音效方案** — 选择不同的打击音效
- **自定义音效** — 上传自定义点击音、打击音、评级音
- **光标样式** — 选择不同的光标样式
- **自定义光标** — 上传自定义光标图片

---

## 🎨 三套主题系统

| 主题 | 色调 | 背景动画 |
|------|------|----------|
| **osu! Neon** | 粉色霓虹 | 粒子漂浮效果 |
| **Cyberpunk** | 黄色赛博 | 网格扫描线 + 数据流 |
| **Valorant** | 红色竞技 | 几何线条 + 发光轨迹 |

每套主题包含完整的 CSS 变量系统，一键切换全局配色。

---

## 🛠️ 管理后台

- **BGM 管理** — 创建歌单、切换活跃歌单、添加/删除背景音乐
- **歌曲管理** — 管理员可删除任何用户上传的歌曲
- **用户权限** — 管理员 vs 普通用户的权限区分

---

## 🏗️ 技术架构

### 前端
| 技术 | 用途 |
|------|------|
| Vue 3 + Composition API | UI 框架 |
| TypeScript | 类型安全 |
| Pinia | 状态管理 |
| Vue Router | 路由导航 |
| Naive UI | UI 组件库 |
| Canvas 2D | 游戏渲染 |
| Web Audio API | 音频播放 |
| OKLCH 色彩系统 | 主题配色 |
| jsmediatags | MP3 ID3 标签读取 |

### 后端
| 技术 | 用途 |
|------|------|
| Node.js + Express | API 服务 |
| SQLite（sql.js） | 数据库 |
| JWT + bcrypt | 鉴权安全 |
| multer | 文件上传 |
| compression | Gzip 压缩 |
| express-rate-limit | 速率限制 |

### 部署
| 组件 | 说明 |
|------|------|
| Nginx | 反向代理，前端静态文件 + API 转发 |
| PM2 | Node.js 进程管理，开机自启 |
| 阿里云 ECS | 云服务器 |

---

## 📁 项目结构

```
beatsmith/
├── client/                          # 前端 Vue 3 应用
│   └── src/
│       ├── views/                   # 页面组件（11个）
│       │   ├── HomeView.vue         # 首页
│       │   ├── LoginView.vue        # 登录/注册
│       │   ├── SongsView.vue        # 歌曲库
│       │   ├── PlayerView.vue       # 游戏播放器
│       │   ├── MapDetailView.vue    # 歌曲详情
│       │   ├── EditorView.vue       # 谱面编辑器
│       │   ├── LeaderboardView.vue  # 排行榜
│       │   ├── ProfileView.vue      # 个人档案
│       │   ├── SettingsView.vue     # 个人设置
│       │   ├── ShareView.vue        # 分享页
│       │   └── admin/BgmAdmin.vue   # 管理员BGM管理
│       ├── components/              # 通用组件
│       │   ├── common/              # 通用组件（背景动画、BGM播放器）
│       │   ├── player/              # 游戏组件（GameCanvas、ResultScreen）
│       │   ├── library/             # 歌曲组件（SongCard、UploadDialog）
│       │   ├── leaderboard/         # 排行榜组件（TopThree、RankList）
│       │   ├── editor/              # 编辑器组件
│       │   └── settings/            # 设置组件（头像、主题、音效、光标）
│       ├── stores/                  # Pinia 状态管理
│       │   ├── authStore.ts         # 用户鉴权
│       │   ├── gameStore.ts         # 游戏状态
│       │   ├── audioStore.ts        # 音频管理
│       │   ├── bgmStore.ts          # BGM 播放
│       │   └── editorStore.ts       # 编辑器
│       ├── engine/                  # 游戏引擎
│       │   ├── BeatGenerator.ts     # 音符生成
│       │   ├── HitDetector.ts       # 命中判定
│       │   ├── AudioEngine.ts       # 音频引擎
│       │   └── FrequencyAnalyzer.ts # 频率分析
│       ├── composables/             # 组合式函数
│       └── styles/                  # 主题样式
├── server/                          # 后端 Express 应用
│   └── src/
│       ├── routes/                  # API 路由
│       │   ├── auth.ts              # 注册/登录/用户信息
│       │   ├── maps.ts              # 歌曲谱面 CRUD
│       │   ├── scores.ts            # 成绩提交
│       │   ├── leaderboard.ts       # 排行榜查询
│       │   ├── users.ts             # 用户统计/皮肤
│       │   ├── upload.ts            # 文件上传（音频/封面/头像/音效/光标/BGM）
│       │   └── bgm.ts               # BGM 歌单管理
│       ├── middleware/auth.ts       # JWT 鉴权中间件
│       ├── utils/jwt.ts             # JWT 工具
│       ├── db.ts                    # 数据库初始化
│       └── index.ts                 # 服务入口
├── DEPLOYMENT.md                    # 部署指南
├── DESIGN.md                        # 设计文档
└── PRODUCT.md                       # 产品文档
```

---

## 🚀 快速开始

### 前端开发

```bash
cd client
npm install
npm run dev
```

### 后端开发

```bash
cd server
npm install
npm run dev
```

---

## 🌐 在线访问

| 项目 | 地址 |
|------|------|
| **网站** | http://39.97.229.60/ |

---

## 📄 相关文档

- [部署指南](DEPLOYMENT.md)
- [设计文档](DESIGN.md)
- [产品文档](PRODUCT.md)
