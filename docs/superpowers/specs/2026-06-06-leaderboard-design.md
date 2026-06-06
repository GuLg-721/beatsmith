# Leaderboard Page Design Spec

> **Date:** 2026-06-06
> **Status:** Draft
> **Feature:** Leaderboard Page (排行榜)

## Overview

A full-featured leaderboard page with tab-based navigation showing four different ranking types: global total score, play count, grade distribution, and per-song rankings.

## Goals

- Display global rankings across multiple dimensions
- Show top 3 players with special visual treatment
- Allow users to browse per-song leaderboards
- Provide responsive and theme-adaptive UI

---

## Page Layout

```
┌─────────────────────────────────────────┐
│ [← 返回]  🏆 排行榜                     │
├─────────────────────────────────────────┤
│ [🎯 全局总分] [🔥 游玩次数] [⭐ 评级] [🎵 单曲] │
├─────────────────────────────────────────┤
│        🥈          🥇          🥉       │
│       玩家2       玩家1       玩家3     │
│     2,450,000   2,890,000   2,120,000  │
├─────────────────────────────────────────┤
│  4  玩家4                    1,850,000  │
│  5  玩家5                    1,620,000  │
│  ...                                   │
└─────────────────────────────────────────┘
```

---

## Tab: 全局总分 (Total Score)

**API:** `GET /api/leaderboard/total?limit=50`

**Response:**
```json
{
  "rankings": [
    {
      "rank": 1,
      "userId": 1,
      "username": "player1",
      "nickname": "玩家1",
      "totalScore": 2890000,
      "bestGrade": "SS",
      "playCount": 15
    }
  ]
}
```

**Display:**
- Top 3: Medal icons (🥇🥈🥉) with larger cards
- 4-50: Compact list with rank, name, score

---

## Tab: 游玩次数 (Play Count)

**API:** `GET /api/leaderboard/plays?limit=50`

**Response:**
```json
{
  "rankings": [
    {
      "rank": 1,
      "userId": 1,
      "username": "player1",
      "nickname": "玩家1",
      "playCount": 25,
      "avgAccuracy": 92.5,
      "uniqueSongs": 12
    }
  ]
}
```

**Display:**
- Top 3: Medal icons with play count and avg accuracy
- 4-50: Compact list with rank, name, plays, accuracy

---

## Tab: 评级排行 (Grade Ranking)

**API:** `GET /api/leaderboard/grades?limit=50`

**Response:**
```json
{
  "rankings": [
    {
      "rank": 1,
      "userId": 1,
      "username": "player1",
      "nickname": "玩家1",
      "sss": 2,
      "ss": 5,
      "s": 8,
      "a": 3,
      "b": 1,
      "totalGrades": 19
    }
  ]
}
```

**Display:**
- Top 3: Medal icons with grade breakdown
- 4-50: Compact list with grade badges

---

## Tab: 单曲排行 (Per-Song)

**API:** `GET /api/maps` (to get song list)
**API:** `GET /api/maps/:id/scores` (existing)

**Display:**
1. Song selector dropdown
2. Selected song's leaderboard

---

## Backend API Changes

### New Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/leaderboard/total` | GET | Global total score ranking |
| `/api/leaderboard/plays` | GET | Play count ranking |
| `/api/leaderboard/grades` | GET | Grade distribution ranking |

### Database Queries

**Total Score:**
```sql
SELECT u.id, u.username, u.nickname,
       SUM(s.score) as total_score,
       MAX(s.grade) as best_grade,
       COUNT(s.id) as play_count
FROM scores s
JOIN users u ON s.user_id = u.id
GROUP BY u.id
ORDER BY total_score DESC
LIMIT ?
```

**Play Count:**
```sql
SELECT u.id, u.username, u.nickname,
       COUNT(s.id) as play_count,
       AVG(s.accuracy) as avg_accuracy,
       COUNT(DISTINCT s.beatmap_id) as unique_songs
FROM scores s
JOIN users u ON s.user_id = u.id
GROUP BY u.id
ORDER BY play_count DESC
LIMIT ?
```

**Grade Ranking:**
```sql
SELECT u.id, u.username, u.nickname,
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
LIMIT ?
```

---

## File Changes

### New Files

| File | Description |
|------|-------------|
| `server/src/routes/leaderboard.ts` | Leaderboard API routes |
| `client/src/components/leaderboard/TopThree.vue` | Top 3 podium display |
| `client/src/components/leaderboard/RankList.vue` | Ranking list component |
| `client/src/components/leaderboard/SongSelector.vue` | Song selector for per-song tab |

### Modified Files

| File | Changes |
|------|---------|
| `client/src/views/LeaderboardView.vue` | Full leaderboard implementation |
| `server/src/index.ts` | Register leaderboard routes |

---

## Testing Checklist

- [ ] Global total score tab shows correct rankings
- [ ] Play count tab shows correct rankings
- [ ] Grade ranking tab shows correct rankings
- [ ] Per-song tab allows song selection
- [ ] Top 3 have special visual treatment
- [ ] Tabs switch correctly
- [ ] Theme colors apply to all elements
- [ ] Empty state shows when no data
