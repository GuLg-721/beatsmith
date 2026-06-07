import { Router, Request, Response } from 'express'
import { getDB, scheduleSave } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/bgm/songs — 添加歌曲到歌单
router.post('/songs', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDB()
    const { title, artist, filePath, duration } = req.body

    if (!title || !filePath) {
      res.status(400).json({ message: '标题和文件路径不能为空' })
      return
    }

    // 检查是否是管理员
    const userResult = db.exec('SELECT username FROM users WHERE id = ?', [req.user!.userId])
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'admin') {
      res.status(403).json({ message: '需要管理员权限' })
      return
    }

    db.run(
      'INSERT INTO bgm_songs (title, artist, file_path, duration, added_by) VALUES (?, ?, ?, ?, ?)',
      [title, artist || '未知艺术家', filePath, duration || 0, req.user!.userId]
    )
    scheduleSave()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Add song error:', err)
    res.status(500).json({ message: '添加歌曲失败' })
  }
})

// GET /api/bgm/playlist — 获取歌单
router.get('/playlist', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const result = db.exec(
      `SELECT id, title, artist, file_path, duration, created_at
       FROM bgm_songs
       ORDER BY created_at DESC`
    )

    const songs = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      title: row[1],
      artist: row[2],
      filePath: row[3],
      duration: row[4],
      createdAt: row[5]
    })) : []

    res.status(200).json({ songs })
  } catch (err) {
    console.error('Get playlist error:', err)
    res.status(500).json({ message: '获取歌单失败' })
  }
})

// DELETE /api/bgm/songs/:id — 删除歌曲
router.delete('/songs/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDB()
    const songId = parseInt(req.params.id)

    if (isNaN(songId)) {
      res.status(400).json({ message: '无效的歌曲 ID' })
      return
    }

    // 检查是否是管理员
    const userResult = db.exec('SELECT username FROM users WHERE id = ?', [req.user!.userId])
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'admin') {
      res.status(403).json({ message: '需要管理员权限' })
      return
    }

    db.run('DELETE FROM bgm_songs WHERE id = ?', [songId])
    scheduleSave()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Delete song error:', err)
    res.status(500).json({ message: '删除歌曲失败' })
  }
})

// GET /api/bgm/search — 搜索网易云音乐
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { keyword } = req.query
    if (!keyword) {
      res.status(400).json({ message: '请输入搜索关键词' })
      return
    }

    // 模拟搜索结果（实际应调用网易云API）
    const mockResults = [
      { id: 1, name: `${keyword} - 歌曲1`, artist: '艺术家1', duration: 240 },
      { id: 2, name: `${keyword} - 歌曲2`, artist: '艺术家2', duration: 300 },
      { id: 3, name: `${keyword} - 歌曲3`, artist: '艺术家3', duration: 180 }
    ]

    res.status(200).json({ results: mockResults })
  } catch (err) {
    console.error('Search error:', err)
    res.status(500).json({ message: '搜索失败' })
  }
})

export default router
