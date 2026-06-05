import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { getDB, scheduleSave } from '../db'
import { signToken } from '../utils/jwt'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, nickname } = req.body

    // 验证
    if (!username || !password) {
      res.status(400).json({ message: '用户名和密码不能为空' })
      return
    }

    if (username.length < 3 || username.length > 20) {
      res.status(400).json({ message: '用户名长度应为 3-20 位' })
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({ message: '用户名只能包含字母、数字和下划线' })
      return
    }

    if (password.length < 8) {
      res.status(400).json({ message: '密码长度至少 8 位' })
      return
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      res.status(400).json({ message: '密码必须包含字母和数字' })
      return
    }

    const db = getDB()

    // 检查用户名是否已存在
    const existing = db.exec('SELECT id FROM users WHERE username = ?', [username])
    if (existing.length > 0 && existing[0].values.length > 0) {
      res.status(400).json({ message: '用户名已存在' })
      return
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 插入用户
    db.run('INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)', [
      username,
      hashedPassword,
      nickname || username
    ])
    scheduleSave()

    // 获取新用户 ID
    const result = db.exec('SELECT last_insert_rowid() as id')
    const userId = result[0].values[0][0] as number

    // 生成 token
    const token = signToken(userId)

    res.status(200).json({
      token,
      user: {
        id: userId,
        username,
        nickname: nickname || username,
        avatar: null,
        created_at: new Date().toISOString()
      }
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ message: '注册失败' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json({ message: '用户名和密码不能为空' })
      return
    }

    const db = getDB()
    const result = db.exec('SELECT id, username, password, nickname, avatar, created_at FROM users WHERE username = ?', [username])

    if (result.length === 0 || result[0].values.length === 0) {
      res.status(401).json({ message: '用户名或密码错误' })
      return
    }

    const row = result[0].values[0]
    const user = {
      id: row[0] as number,
      username: row[1] as string,
      password: row[2] as string,
      nickname: row[3] as string,
      avatar: row[4] as string | null,
      created_at: row[5] as string
    }

    // 验证密码
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ message: '用户名或密码错误' })
      return
    }

    // 生成 token
    const token = signToken(user.id)

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        created_at: user.created_at
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: '登录失败' })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDB()
    const result = db.exec('SELECT id, username, nickname, avatar, created_at FROM users WHERE id = ?', [req.user!.userId])

    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ message: '用户不存在' })
      return
    }

    const row = result[0].values[0]
    res.status(200).json({
      user: {
        id: row[0] as number,
        username: row[1] as string,
        nickname: row[2] as string,
        avatar: row[3] as string | null,
        created_at: row[4] as string
      }
    })
  } catch (err) {
    console.error('Get me error:', err)
    res.status(500).json({ message: '获取用户信息失败' })
  }
})

export default router
