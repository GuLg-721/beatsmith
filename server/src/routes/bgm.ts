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

    const userResult = db.exec('SELECT username FROM users WHERE id = ?', [req.user!.userId])
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'admin') {
      res.status(403).json({ message: '需要管理员权限' })
      return
    }

    db.run('UPDATE bgm_playlists SET is_active = 0')
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

    const userResult = db.exec('SELECT username FROM users WHERE id = ?', [req.user!.userId])
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'admin') {
      res.status(403).json({ message: '需要管理员权限' })
      return
    }

    db.run('DELETE FROM bgm_songs WHERE playlist_id = ?', [playlistId])
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

    const userResult = db.exec('SELECT username FROM users WHERE id = ?', [req.user!.userId])
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'admin') {
      res.status(403).json({ message: '需要管理员权限' })
      return
    }

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

// GET /api/bgm/playlist — 获取歌曲
router.get('/playlist', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const { playlistId } = req.query

    let query = ''
    let params: any[] = []

    if (playlistId) {
      query = `SELECT id, title, artist, file_path, duration, created_at
               FROM bgm_songs
               WHERE playlist_id = ?
               ORDER BY created_at DESC`
      params = [parseInt(playlistId as string)]
    } else {
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

export default router
