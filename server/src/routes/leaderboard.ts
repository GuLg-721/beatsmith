import { Router, Request, Response } from 'express'
import { getDB } from '../db'

const router = Router()

// GET /api/leaderboard/total — 全局总分排行
router.get('/total', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const { limit = '50' } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)))

    const result = db.exec(
      `SELECT u.id, u.username, u.nickname,
              SUM(s.score) as total_score,
              MAX(s.grade) as best_grade,
              COUNT(s.id) as play_count
       FROM scores s
       JOIN users u ON s.user_id = u.id
       GROUP BY u.id
       ORDER BY total_score DESC
       LIMIT ?`,
      [limitNum]
    )

    const rankings = result.length > 0 ? result[0].values.map((row, index) => ({
      rank: index + 1,
      userId: row[0],
      username: row[1],
      nickname: row[2],
      totalScore: row[3],
      bestGrade: row[4],
      playCount: row[5]
    })) : []

    res.status(200).json({ rankings })
  } catch (err) {
    console.error('Get total leaderboard error:', err)
    res.status(500).json({ message: '获取排行榜失败' })
  }
})

// GET /api/leaderboard/plays — 游玩次数排行
router.get('/plays', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const { limit = '50' } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)))

    const result = db.exec(
      `SELECT u.id, u.username, u.nickname,
              COUNT(s.id) as play_count,
              AVG(s.accuracy) as avg_accuracy,
              COUNT(DISTINCT s.beatmap_id) as unique_songs
       FROM scores s
       JOIN users u ON s.user_id = u.id
       GROUP BY u.id
       ORDER BY play_count DESC
       LIMIT ?`,
      [limitNum]
    )

    const rankings = result.length > 0 ? result[0].values.map((row, index) => ({
      rank: index + 1,
      userId: row[0],
      username: row[1],
      nickname: row[2],
      playCount: row[3],
      avgAccuracy: Math.round((row[4] as number) * 10) / 10,
      uniqueSongs: row[5]
    })) : []

    res.status(200).json({ rankings })
  } catch (err) {
    console.error('Get plays leaderboard error:', err)
    res.status(500).json({ message: '获取排行榜失败' })
  }
})

// GET /api/leaderboard/grades — 评级排行
router.get('/grades', (req: Request, res: Response) => {
  try {
    const db = getDB()
    const { limit = '50' } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)))

    const result = db.exec(
      `SELECT u.id, u.username, u.nickname,
              SUM(CASE WHEN s.grade = 'SSS' THEN 1 ELSE 0 END) as sss,
              SUM(CASE WHEN s.grade = 'SS' THEN 1 ELSE 0 END) as ss_count,
              SUM(CASE WHEN s.grade = 'S' THEN 1 ELSE 0 END) as s_count,
              SUM(CASE WHEN s.grade = 'A' THEN 1 ELSE 0 END) as a_count,
              SUM(CASE WHEN s.grade = 'B' THEN 1 ELSE 0 END) as b_count,
              COUNT(s.id) as total_grades
       FROM scores s
       JOIN users u ON s.user_id = u.id
       GROUP BY u.id
       ORDER BY sss DESC, ss_count DESC, s_count DESC
       LIMIT ?`,
      [limitNum]
    )

    const rankings = result.length > 0 ? result[0].values.map((row, index) => ({
      rank: index + 1,
      userId: row[0],
      username: row[1],
      nickname: row[2],
      sss: row[3],
      ss: row[4],
      s: row[5],
      a: row[6],
      b: row[7],
      totalGrades: row[8]
    })) : []

    res.status(200).json({ rankings })
  } catch (err) {
    console.error('Get grades leaderboard error:', err)
    res.status(500).json({ message: '获取排行榜失败' })
  }
})

export default router
