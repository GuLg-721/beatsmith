import express from 'express'
import cors from 'cors'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { initDB } from './db'
import authRoutes from './routes/auth'
import uploadRoutes from './routes/upload'
import mapsRoutes from './routes/maps'
import scoresRoutes from './routes/scores'
import leaderboardRoutes from './routes/leaderboard'
import userRoutes from './routes/users'
import bgmRoutes from './routes/bgm'

const app = express()
const PORT = process.env.PORT || 3000

// 安全中间件
// CORS 配置
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))

// 通用速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 1000, // 每个 IP 最多 100 次请求
  message: { message: '请求过于频繁，请稍后再试' }
})
app.use('/api/', limiter)

// 认证接口更严格的速率限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 1000, // 每个 IP 最多 100 次请求
  message: { message: '登录尝试过于频繁，请稍后再试' }
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// 文件上传速率限制
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 200, // 每个 IP 最多 20 次上传
  message: { message: '上传过于频繁，请稍后再试' }
})
app.use('/api/upload/', uploadLimiter)

app.use(express.json({ limit: '10mb' }))

// 静态资源缓存
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '1d', // 缓存 1 天
  etag: true
}))

// 路由
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/maps', mapsRoutes)
app.use('/api/maps', scoresRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/users', userRoutes)
app.use('/api/bgm', bgmRoutes)

// 启动服务器
async function start() {
  try {
    await initDB()
    app.listen(PORT, () => {
      console.log(`⚒️  BeatSmith server running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
