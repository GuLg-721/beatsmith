import { Router, Request, Response } from 'express'
import { nanoid } from 'nanoid'
import { getDB, scheduleSave } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/maps — 获取公开谱面列表
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const { q, sort = 'popular', page = '1', limit = '20' } = req.query

    const pageNum = Math.max(1, parseInt(page as string))
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)))
    const offset = (pageNum - 1) * limitNum

    let whereClause = ''
    let orderClause = ''
    const params: any[] = []

    // 搜索
    if (q && typeof q === 'string' && q.trim()) {
      whereClause = 'WHERE m.title LIKE ? OR m.artist LIKE ?'
      const searchTerm = `%${q.trim()}%`
      params.push(searchTerm, searchTerm)
    }

    // 排序
    switch (sort) {
      case 'newest':
        orderClause = 'ORDER BY m.created_at DESC'
        break
      case 'bpm':
        orderClause = 'ORDER BY m.bpm ASC'
        break
      case 'popular':
      default:
        orderClause = 'ORDER BY m.play_count DESC'
        break
    }

    // 查询总数
    const countResult = db.exec(
      `SELECT COUNT(*) as total FROM beatmaps m ${whereClause}`,
      params
    )
    const total = countResult.length > 0 ? countResult[0].values[0][0] as number : 0

    // 查询列表
    const result = db.exec(
      `SELECT m.id, m.title, m.artist, m.audio_file, m.cover_image, m.duration, m.bpm, m.difficulty, m.play_count, m.created_at,
              u.username as creator_name
       FROM beatmaps m
       LEFT JOIN users u ON m.creator_id = u.id
       ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    )

    const maps = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      title: row[1],
      artist: row[2],
      audioFile: row[3],
      coverImage: row[4],
      duration: row[5],
      bpm: row[6],
      difficulty: row[7],
      playCount: row[8],
      createdAt: row[9],
      creatorName: row[10]
    })) : []

    res.status(200).json({
      maps,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    })
  } catch (err) {
    console.error('Get maps error:', err)
    res.status(500).json({ message: '获取谱面列表失败' })
  }
})

// GET /api/maps/:id/public — 获取公开谱面信息（无需认证）
router.get('/:id/public', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const mapId = req.params.id

    // 获取谱面信息
    const mapResult = db.exec(
      `SELECT m.id, m.title, m.artist, m.audio_file, m.cover_image,
              m.duration, m.bpm, m.difficulty, m.play_count,
              u.username as creator_name
       FROM beatmaps m
       LEFT JOIN users u ON m.creator_id = u.id
       WHERE m.id = ?`,
      [mapId]
    )

    if (mapResult.length === 0 || mapResult[0].values.length === 0) {
      res.status(404).json({ message: '谱面不存在' })
      return
    }

    const row = mapResult[0].values[0]
    const map = {
      id: row[0],
      title: row[1],
      artist: row[2],
      audioFile: row[3],
      coverImage: row[4],
      duration: row[5],
      bpm: row[6],
      difficulty: row[7],
      playCount: row[8],
      creatorName: row[9]
    }

    // 获取排行榜前10名
    const scoresResult = db.exec(
      `SELECT s.user_id, u.username, s.score, s.accuracy, s.grade
       FROM scores s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.beatmap_id = ?
       ORDER BY s.score DESC
       LIMIT 10`,
      [mapId]
    )

    const scores = scoresResult.length > 0 ? scoresResult[0].values.map((row, index) => ({
      rank: index + 1,
      userId: row[0],
      username: row[1],
      score: row[2],
      accuracy: row[3],
      grade: row[4]
    })) : []

    res.status(200).json({ map, scores })
  } catch (err) {
    console.error('Get public map error:', err)
    res.status(500).json({ message: '获取谱面信息失败' })
  }
})

// GET /api/maps/:id — 获取谱面详情
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const result = db.exec(
      `SELECT m.id, m.title, m.artist, m.audio_file, m.cover_image, m.duration, m.bpm, m.map_data, m.difficulty, m.play_count, m.created_at, m.creator_id,
              u.username as creator_name
       FROM beatmaps m
       LEFT JOIN users u ON m.creator_id = u.id
       WHERE m.id = ?`,
      [req.params.id]
    )

    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ message: '谱面不存在' })
      return
    }

    const row = result[0].values[0]
    res.status(200).json({
      map: {
        id: row[0],
        title: row[1],
        artist: row[2],
        audioFile: row[3],
        coverImage: row[4],
        duration: row[5],
        bpm: row[6],
        mapData: row[7],
        difficulty: row[8],
        playCount: row[9],
        createdAt: row[10],
        creatorId: row[11],
        creatorName: row[12]
      }
    })
  } catch (err) {
    console.error('Get map error:', err)
    res.status(500).json({ message: '获取谱面详情失败' })
  }
})

// POST /api/maps — 创建谱面
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { title, artist, audioFile, coverImage, bpm, mapData, duration, difficulty } = req.body

    if (!title || !audioFile) {
      res.status(400).json({ message: '歌曲名称和音频文件不能为空' })
      return
    }

    const db = getDB()
    const id = nanoid(12)

    // 如果没有提供 BPM，使用默认值
    const finalBpm = bpm || 120

    // 如果没有提供难度，根据 BPM 自动设置
    let finalDifficulty = difficulty
    if (!finalDifficulty) {
      if (finalBpm < 100) {
        finalDifficulty = 'Easy'
      } else if (finalBpm < 140) {
        finalDifficulty = 'Normal'
      } else {
        finalDifficulty = 'Hard'
      }
    }

    db.run(
      `INSERT INTO beatmaps (id, creator_id, title, artist, audio_file, cover_image, duration, bpm, map_data, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user!.userId,
        title,
        artist || null,
        audioFile,
        coverImage || null,
        duration || null,
        finalBpm,
        mapData || '{"notes":[],"timingPoints":[]}',
        finalDifficulty
      ]
    )
    scheduleSave()

    res.status(200).json({
      id,
      title,
      artist,
      audioFile,
      coverImage,
      bpm: finalBpm,
      difficulty: finalDifficulty,
      duration,
      message: '谱面创建成功'
    })
  } catch (err) {
    console.error('Create map error:', err)
    res.status(500).json({ message: '创建谱面失败' })
  }
})

// PUT /api/maps/:id — 更新谱面
router.put('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDB()
    const { title, artist, coverImage, bpm, mapData, duration, difficulty } = req.body

    // 检查是否存在且是自己的
    const existing = db.exec('SELECT creator_id FROM beatmaps WHERE id = ?', [req.params.id])
    if (existing.length === 0 || existing[0].values.length === 0) {
      res.status(404).json({ message: '谱面不存在' })
      return
    }

    if (existing[0].values[0][0] !== req.user!.userId) {
      res.status(403).json({ message: '无权修改此谱面' })
      return
    }

    // 构建动态 UPDATE
    const updates: string[] = []
    const params: any[] = []

    if (title !== undefined) { updates.push('title = ?'); params.push(title) }
    if (artist !== undefined) { updates.push('artist = ?'); params.push(artist) }
    if (coverImage !== undefined) { updates.push('cover_image = ?'); params.push(coverImage) }
    if (bpm !== undefined) { updates.push('bpm = ?'); params.push(bpm) }
    if (mapData !== undefined) { updates.push('map_data = ?'); params.push(mapData) }
    if (duration !== undefined) { updates.push('duration = ?'); params.push(duration) }
    if (difficulty !== undefined) { updates.push('difficulty = ?'); params.push(difficulty) }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    params.push(req.params.id)

    if (updates.length > 1) {
      db.run(`UPDATE beatmaps SET ${updates.join(', ')} WHERE id = ?`, params)
    }
    scheduleSave()

    res.status(200).json({ message: '谱面更新成功' })
  } catch (err) {
    console.error('Update map error:', err)
    res.status(500).json({ message: '更新谱面失败' })
  }
})

// DELETE /api/maps/:id — 删除谱面
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDB()
    const existing = db.exec('SELECT creator_id FROM beatmaps WHERE id = ?', [req.params.id])
    if (existing.length === 0 || existing[0].values.length === 0) {
      res.status(404).json({ message: '谱面不存在' })
      return
    }

    const isCreator = existing[0].values[0][0] === req.user!.userId

    // 检查是否是管理员
    const userResult = db.exec('SELECT username FROM users WHERE id = ?', [req.user!.userId])
    const isAdmin = userResult.length > 0 && userResult[0].values[0][0] === 'admin'

    if (!isCreator && !isAdmin) {
      res.status(403).json({ message: '无权删除此谱面' })
      return
    }

    db.run('DELETE FROM beatmaps WHERE id = ?', [req.params.id])
    scheduleSave()
    res.status(200).json({ message: '谱面删除成功' })
  } catch (err) {
    console.error('Delete map error:', err)
    res.status(500).json({ message: '删除谱面失败' })
  }
})

export default router
