import express from 'express'
import cors from 'cors'
import compression from 'compression'
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

// 中间件
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

// 添加 Gzip 压缩
app.use(compression())

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

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
