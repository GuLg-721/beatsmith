import express from 'express'
import cors from 'cors'
import path from 'path'
import { initDB } from './db'
import authRoutes from './routes/auth'

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// 路由
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)

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
