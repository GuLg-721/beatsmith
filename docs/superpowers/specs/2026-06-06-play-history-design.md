# Play History Design Spec

> **Date:** 2026-06-06
> **Status:** Draft
> **Feature:** Play History in Profile Page (游玩记录)

## Overview

Add tab-based navigation to the Profile page showing play history, best scores, and grade distribution. All cards and elements must adapt to the three themes (osu!, Cyberpunk, Valorant).

## Goals

- Display user's play history in the profile page
- Show grade distribution statistics
- Show best scores per song
- All UI elements must use theme CSS variables

---

## Page Layout

```
┌─────────────────────────────────────────┐
│  👤 用户信息 + 统计卡片                  │
├─────────────────────────────────────────┤
│ [📊 概览] [🎵 最近游玩] [🏆 最佳] [📈 评级] │
├─────────────────────────────────────────┤
│  根据标签显示不同内容                     │
└─────────────────────────────────────────┘
```

---

## Tab: 概览 (Overview)

**API:** `GET /api/users/:id/stats`

**Response:**
```json
{
  "totalScore": 7190000,
  "playCount": 15,
  "bestGrade": "SS",
  "avgAccuracy": 92.5,
  "grades": {
    "sss": 2,
    "ss": 5,
    "s": 8,
    "a": 3,
    "b": 1
  }
}
```

**Display:**
- Grade distribution badges (SSS/SS/S/A/B)
- Statistics summary

---

## Tab: 最近游玩 (Recent Plays)

**API:** `GET /api/users/:id/scores?limit=10`

**Response:**
```json
{
  "scores": [
    {
      "id": 1,
      "beatmapId": "abc123",
      "title": "Faded",
      "artist": "Alan Walker",
      "score": 985000,
      "accuracy": 96.5,
      "grade": "S",
      "maxCombo": 150,
      "playedAt": "2026-06-05"
    }
  ]
}
```

**Display:**
- List of recent plays with song name, score, grade, date

---

## Tab: 最佳成绩 (Best Scores)

**API:** `GET /api/users/:id/best`

**Response:**
```json
{
  "bestScores": [
    {
      "beatmapId": "abc123",
      "title": "Faded",
      "artist": "Alan Walker",
      "score": 985000,
      "accuracy": 96.5,
      "grade": "S",
      "playedAt": "2026-06-05"
    }
  ]
}
```

**Display:**
- List of best scores per song, sorted by score

---

## Tab: 评级分布 (Grade Distribution)

**API:** `GET /api/users/:id/stats` (same as overview)

**Display:**
- Visual grade badges with counts
- Each grade has its own color:
  - SSS: #ff66aa (pink)
  - SS: #bf00ff (purple)
  - S: #00d4ff (cyan)
  - A: #00ff88 (green)
  - B: #fcee09 (yellow)

---

## Theme Adaptation

All cards and elements must use CSS variables:

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.card:hover {
  border-color: var(--primary);
}

.grade-badge {
  color: var(--primary);
  border-color: var(--primary);
}
```

---

## Backend API Changes

### New Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/users/:id/stats` | GET | User statistics |
| `/api/users/:id/scores` | GET | User play history |
| `/api/users/:id/best` | GET | User best scores |

### Database Queries

**Stats:**
```sql
SELECT
  SUM(s.score) as total_score,
  COUNT(s.id) as play_count,
  MAX(s.grade) as best_grade,
  AVG(s.accuracy) as avg_accuracy,
  SUM(CASE WHEN s.grade = 'SSS' THEN 1 ELSE 0 END) as sss,
  SUM(CASE WHEN s.grade = 'SS' THEN 1 ELSE 0 END) as ss,
  SUM(CASE WHEN s.grade = 'S' THEN 1 ELSE 0 END) as s,
  SUM(CASE WHEN s.grade = 'A' THEN 1 ELSE 0 END) as a,
  SUM(CASE WHEN s.grade = 'B' THEN 1 ELSE 0 END) as b
FROM scores s
WHERE s.user_id = ?
```

**Scores:**
```sql
SELECT s.*, b.title, b.artist
FROM scores s
JOIN beatmaps b ON s.beatmap_id = b.id
WHERE s.user_id = ?
ORDER BY s.played_at DESC
LIMIT ?
```

**Best:**
```sql
SELECT s.*, b.title, b.artist
FROM scores s
JOIN beatmaps b ON s.beatmap_id = b.id
WHERE s.user_id = ?
GROUP BY s.beatmap_id
HAVING s.score = MAX(s.score)
ORDER BY s.score DESC
```

---

## File Changes

### New Files

| File | Description |
|------|-------------|
| `server/src/routes/users.ts` | User stats/scores/best routes |

### Modified Files

| File | Changes |
|------|---------|
| `server/src/index.ts` | Register user routes |
| `client/src/views/ProfileView.vue` | Add tabs and play history |

---

## Testing Checklist

- [ ] Stats API returns correct data
- [ ] Scores API returns recent plays
- [ ] Best API returns best scores per song
- [ ] Profile page tabs switch correctly
- [ ] Grade badges show correct colors
- [ ] All elements use theme CSS variables
- [ ] Empty state shows when no data
