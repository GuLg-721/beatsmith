import { Router, Request, Response } from 'express'
import { getDB, scheduleSave } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// ========== 歌单管理 ==========

// GET /api/bgm/playlists — 获取所有歌单
router.get('/playlists', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const result = db.exec(
      `SELECT id, name, description, is_active, created_at
       FROM bgm_playlists
       ORDER BY created_at DESC`
    )

    const playlists = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      name: row[1],
      description: row[2],
      isActive: row[3] === 1,
      createdAt: row[4]
    })) : []

    res.status(200).json({ playlists })
  } catch (err) {
    console.error('Get playlists error:', err)
    res.status(500).json({ message: '获取歌单失败' })
  }
})

// POST /api/bgm/playlists — 创建歌单
router.post('/playlists', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDB()
    const { name, description } = req.body

    if (!name) {
      res.status(400).json({ message: '歌单名称不能为空' })
      return
    }

    // 检查是否是管理员
    const userResult = db.exec('SELECT username FROM users WHERE id = ?', [req.user!.userId])
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'admin') {
      res.status(403).json({ message: '需要管理员权限' })
      return
    }

    db.run(
      'INSERT INTO bgm_playlists (name, description, created_by) VALUES (?, ?, ?)',
      [name, description || '', req.user!.userId]
    )
    scheduleSave()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Create playlist error:', err)
    res.status(500).json({ message: '创建歌单失败' })
  }
})

// PUT /api/bgm/playlists/:id/active — 设置活跃歌单
router.put('/playlists/:id/active', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDB()
    const playlistId = parseInt(req.params.id)

    if (isNaN(playlistId)) {
      res.status(400).json({ message: '无效的歌单 ID' })
      return
    }

    // 检查是否是管理员
    const userResult = db.exec('SELECT username FROM users WHERE id = ?', [req.user!.userId])
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'admin') {
      res.status(403).json({ message: '需要管理员权限' })
      return
    }

    // 取消所有歌单的活跃状态
    db.run('UPDATE bgm_playlists SET is_active = 0')

    // 设置指定歌单为活跃
    db.run('UPDATE bgm_playlists SET is_active = 1 WHERE id = ?', [playlistId])
    scheduleSave()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Set active playlist error:', err)
    res.status(500).json({ message: '设置活跃歌单失败' })
  }
})

// DELETE /api/bgm/playlists/:id — 删除歌单
router.delete('/playlists/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDB()
    const playlistId = parseInt(req.params.id)

    if (isNaN(playlistId)) {
      res.status(400).json({ message: '无效的歌单 ID' })
      return
    }

    // 检查是否是管理员
    const userResult = db.exec('SELECT username FROM users WHERE id = ?', [req.user!.userId])
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'admin') {
      res.status(403).json({ message: '需要管理员权限' })
      return
    }

    // 删除歌单中的歌曲
    db.run('DELETE FROM bgm_songs WHERE playlist_id = ?', [playlistId])
    // 删除歌单
    db.run('DELETE FROM bgm_playlists WHERE id = ?', [playlistId])
    scheduleSave()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Delete playlist error:', err)
    res.status(500).json({ message: '删除歌单失败' })
  }
})

// ========== 歌曲管理 ==========

// POST /api/bgm/songs — 添加歌曲到歌单
router.post('/songs', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDB()
    const { title, artist, filePath, duration, playlistId } = req.body

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

    // 如果没有指定歌单，使用活跃歌单
    let targetPlaylistId = playlistId
    if (!targetPlaylistId) {
      const activeResult = db.exec('SELECT id FROM bgm_playlists WHERE is_active = 1 LIMIT 1')
      targetPlaylistId = activeResult.length > 0 ? activeResult[0].values[0][0] : 1
    }

    db.run(
      'INSERT INTO bgm_songs (title, artist, file_path, duration, playlist_id, added_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, artist || '未知艺术家', filePath, duration || 0, targetPlaylistId, req.user!.userId]
    )
    scheduleSave()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Add song error:', err)
    res.status(500).json({ message: '添加歌曲失败' })
  }
})

// GET /api/bgm/playlist — 获取当前活跃歌单的歌曲
router.get('/playlist', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const { playlistId } = req.query

    let query = ''
    let params: any[] = []

    if (playlistId) {
      // 获取指定歌单的歌曲
      query = `SELECT id, title, artist, file_path, duration, created_at
               FROM bgm_songs
               WHERE playlist_id = ?
               ORDER BY created_at DESC`
      params = [parseInt(playlistId as string)]
    } else {
      // 获取活跃歌单的歌曲
      query = `SELECT s.id, s.title, s.artist, s.file_path, s.duration, s.created_at
               FROM bgm_songs s
               INNER JOIN bgm_playlists p ON s.playlist_id = p.id
               WHERE p.is_active = 1
               ORDER BY s.created_at DESC`
    }

    const result = db.exec(query, params)

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

// ========== 网易云音乐 ==========

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

// POST /api/bgm/import — 导入网易云歌单
router.post('/import', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { playlistUrl } = req.body

    if (!playlistUrl) {
      res.status(400).json({ message: '请输入歌单链接' })
      return
    }

    // 从链接中提取歌单ID
    const idMatch = playlistUrl.match(/id=(\d+)/)
    if (!idMatch) {
      res.status(400).json({ message: '无法解析歌单链接' })
      return
    }

    const playlistId = idMatch[1]

    // 模拟获取歌单歌曲（实际应调用网易云API）
    const mockSongs = [
      { name: `网易云歌曲1 - ${playlistId}`, artist: '艺术家A', duration: 240 },
      { name: `网易云歌曲2 - ${playlistId}`, artist: '艺术家B', duration: 300 },
      { name: `网易云歌曲3 - ${playlistId}`, artist: '艺术家C', duration: 180 }
    ]

    res.status(200).json({ songs: mockSongs })
  } catch (err) {
    console.error('Import error:', err)
    res.status(500).json({ message: '导入失败' })
  }
})

export default router
