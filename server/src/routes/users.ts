import { Router, Request, Response } from 'express'
import { getDB, scheduleSave } from '../db'

const router = Router()

// GET /api/users/:id/stats — 用户统计数据
router.get('/:id/stats', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const userId = parseInt(req.params.id)

    if (isNaN(userId)) {
      res.status(400).json({ message: '无效的用户 ID' })
      return
    }

    // 检查用户是否存在
    const userResult = db.exec('SELECT id FROM users WHERE id = ?', [userId])
    if (userResult.length === 0 || userResult[0].values.length === 0) {
      res.status(404).json({ message: '用户不存在' })
      return
    }

    const result = db.exec(
      `SELECT
        COALESCE(SUM(s.score), 0) as total_score,
        COUNT(s.id) as play_count,
        MAX(s.grade) as best_grade,
        COALESCE(AVG(s.accuracy), 0) as avg_accuracy,
        SUM(CASE WHEN s.grade = 'SSS' THEN 1 ELSE 0 END) as sss,
        SUM(CASE WHEN s.grade = 'SS' THEN 1 ELSE 0 END) as ss,
        SUM(CASE WHEN s.grade = 'S' THEN 1 ELSE 0 END) as s,
        SUM(CASE WHEN s.grade = 'A' THEN 1 ELSE 0 END) as a,
        SUM(CASE WHEN s.grade = 'B' THEN 1 ELSE 0 END) as b
       FROM scores s
       WHERE s.user_id = ?`,
      [userId]
    )

    const row = result.length > 0 ? result[0].values[0] : null

    const stats = {
      totalScore: row?.[0] || 0,
      playCount: row?.[1] || 0,
      bestGrade: row?.[2] || '-',
      avgAccuracy: Math.round((row?.[3] as number) * 10) / 10 || 0,
      grades: {
        sss: row?.[4] || 0,
        ss: row?.[5] || 0,
        s: row?.[6] || 0,
        a: row?.[7] || 0,
        b: row?.[8] || 0
      }
    }

    res.status(200).json(stats)
  } catch (err) {
    console.error('Get user stats error:', err)
    res.status(500).json({ message: '获取用户统计失败' })
  }
})

// GET /api/users/:id/scores — 用户游玩记录
router.get('/:id/scores', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const userId = parseInt(req.params.id)
    const { limit = '10' } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)))

    if (isNaN(userId)) {
      res.status(400).json({ message: '无效的用户 ID' })
      return
    }

    const result = db.exec(
      `SELECT s.id, s.beatmap_id, s.score, s.accuracy, s.grade,
              s.max_combo, s.perfect, s.great, s.good, s.miss,
              s.played_at, b.title, b.artist
       FROM scores s
       LEFT JOIN beatmaps b ON s.beatmap_id = b.id
       WHERE s.user_id = ?
       ORDER BY s.played_at DESC
       LIMIT ?`,
      [userId, limitNum]
    )

    const scores = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      beatmapId: row[1],
      score: row[2],
      accuracy: row[3],
      grade: row[4],
      maxCombo: row[5],
      perfect: row[6],
      great: row[7],
      good: row[8],
      miss: row[9],
      playedAt: row[10],
      title: row[11],
      artist: row[12]
    })) : []

    res.status(200).json({ scores })
  } catch (err) {
    console.error('Get user scores error:', err)
    res.status(500).json({ message: '获取用户游玩记录失败' })
  }
})

// GET /api/users/:id/best — 用户最佳成绩
router.get('/:id/best', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const userId = parseInt(req.params.id)

    if (isNaN(userId)) {
      res.status(400).json({ message: '无效的用户 ID' })
      return
    }

    const result = db.exec(
      `SELECT s.beatmap_id, s.score, s.accuracy, s.grade,
              s.max_combo, s.played_at, b.title, b.artist
       FROM scores s
       LEFT JOIN beatmaps b ON s.beatmap_id = b.id
       WHERE s.user_id = ?
       GROUP BY s.beatmap_id
       HAVING s.score = (
         SELECT MAX(s2.score) FROM scores s2
         WHERE s2.user_id = s.user_id AND s2.beatmap_id = s.beatmap_id
       )
       ORDER BY s.score DESC`,
      [userId]
    )

    const bestScores = result.length > 0 ? result[0].values.map(row => ({
      beatmapId: row[0],
      score: row[1],
      accuracy: row[2],
      grade: row[3],
      maxCombo: row[4],
      playedAt: row[5],
      title: row[6],
      artist: row[7]
    })) : []

    res.status(200).json({ bestScores })
  } catch (err) {
    console.error('Get user best scores error:', err)
    res.status(500).json({ message: '获取用户最佳成绩失败' })
  }
})

// GET /api/users/:id/skin — 获取用户皮肤设置
router.get('/:id/skin', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const userId = parseInt(req.params.id)

    if (isNaN(userId)) {
      res.status(400).json({ message: '无效的用户 ID' })
      return
    }

    const result = db.exec(
      'SELECT skin_settings FROM users WHERE id = ?',
      [userId]
    )

    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ message: '用户不存在' })
      return
    }

    const skinSettings = result[0].values[0][0]
    const parsed = skinSettings ? JSON.parse(skinSettings as string) : {
      soundScheme: 'default',
      customSounds: { click: null, hit: null, grade: null },
      cursor: 'cross',
      customCursor: null
    }

    res.status(200).json(parsed)
  } catch (err) {
    console.error('Get skin settings error:', err)
    res.status(500).json({ message: '获取皮肤设置失败' })
  }
})

// PUT /api/users/:id/skin — 更新用户皮肤设置
router.put('/:id/skin', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const userId = parseInt(req.params.id)

    if (isNaN(userId)) {
      res.status(400).json({ message: '无效的用户 ID' })
      return
    }

    const { soundScheme, customSounds, cursor, customCursor } = req.body

    const skinSettings = JSON.stringify({
      soundScheme: soundScheme || 'default',
      customSounds: customSounds || { click: null, hit: null, grade: null },
      cursor: cursor || 'cross',
      customCursor: customCursor || null
    })

    db.run(
      'UPDATE users SET skin_settings = ? WHERE id = ?',
      [skinSettings, userId]
    )
    scheduleSave()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Update skin settings error:', err)
    res.status(500).json({ message: '更新皮肤设置失败' })
  }
})

export default router
