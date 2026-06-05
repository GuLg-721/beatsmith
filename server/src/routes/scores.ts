import { Router, Request, Response } from 'express'
import { getDB } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/maps/:id/scores — 获取排行榜 Top N
router.get('/:id/scores', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const { limit = '10' } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)))

    // 检查谱面是否存在
    const mapResult = db.exec('SELECT id FROM beatmaps WHERE id = ?', [req.params.id])
    if (mapResult.length === 0 || mapResult[0].values.length === 0) {
      res.status(404).json({ message: '谱面不存在' })
      return
    }

    // 查询排行榜（每人只取最高分）
    const result = db.exec(
      `SELECT s.user_id, u.username, s.score, s.accuracy, s.grade, s.max_combo,
              s.perfect, s.great, s.good, s.miss, s.played_at
       FROM scores s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.beatmap_id = ?
       ORDER BY s.score DESC
       LIMIT ?`,
      [req.params.id, limitNum]
    )

    const scores = result.length > 0 ? result[0].values.map((row, index) => ({
      rank: index + 1,
      userId: row[0],
      username: row[1],
      score: row[2],
      accuracy: row[3],
      grade: row[4],
      maxCombo: row[5],
      perfect: row[6],
      great: row[7],
      good: row[8],
      miss: row[9],
      playedAt: row[10]
    })) : []

    res.status(200).json({
      mapId: req.params.id,
      scores
    })
  } catch (err) {
    console.error('Get scores error:', err)
    res.status(500).json({ message: '获取排行榜失败' })
  }
})

// POST /api/maps/:id/scores — 提交分数
router.post('/:id/scores', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDB()
    const { score, maxCombo, accuracy, grade, perfect, great, good, miss } = req.body

    if (score === undefined || accuracy === undefined || !grade) {
      res.status(400).json({ message: '缺少必要参数' })
      return
    }

    // 检查谱面是否存在
    const mapResult = db.exec('SELECT id FROM beatmaps WHERE id = ?', [req.params.id])
    if (mapResult.length === 0 || mapResult[0].values.length === 0) {
      res.status(404).json({ message: '谱面不存在' })
      return
    }

    // 检查是否已有分数，有则更新（只保留最高分）
    const existing = db.exec(
      'SELECT id, score FROM scores WHERE user_id = ? AND beatmap_id = ?',
      [req.user!.userId, req.params.id]
    )

    if (existing.length > 0 && existing[0].values.length > 0) {
      const existingScore = existing[0].values[0][1] as number
      if (score > existingScore) {
        db.run(
          `UPDATE scores SET score = ?, max_combo = ?, accuracy = ?, grade = ?,
           perfect = ?, great = ?, good = ?, miss = ?, played_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND beatmap_id = ?`,
          [score, maxCombo || 0, accuracy, grade, perfect || 0, great || 0, good || 0, miss || 0, req.user!.userId, req.params.id]
        )
      }
    } else {
      db.run(
        `INSERT INTO scores (user_id, beatmap_id, score, max_combo, accuracy, grade, perfect, great, good, miss)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user!.userId, req.params.id, score, maxCombo || 0, accuracy, grade, perfect || 0, great || 0, good || 0, miss || 0]
      )
    }

    // 增加游玩次数
    db.run('UPDATE beatmaps SET play_count = play_count + 1 WHERE id = ?', [req.params.id])

    res.status(200).json({ message: '分数提交成功' })
  } catch (err) {
    console.error('Submit score error:', err)
    res.status(500).json({ message: '提交分数失败' })
  }
})

export default router
