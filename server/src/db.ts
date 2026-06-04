import initSqlJs, { Database } from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'

const DB_PATH = path.join(__dirname, '..', 'data.db')

let db: Database

export async function initDB(): Promise<Database> {
  const SQL = await initSqlJs()

  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS beatmaps (
      id TEXT PRIMARY KEY,
      creator_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      artist TEXT,
      audio_file TEXT NOT NULL,
      cover_image TEXT,
      duration INTEGER,
      bpm REAL,
      map_data TEXT NOT NULL,
      difficulty TEXT DEFAULT 'Normal',
      play_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      beatmap_id TEXT NOT NULL REFERENCES beatmaps(id),
      score INTEGER NOT NULL,
      max_combo INTEGER NOT NULL,
      accuracy REAL NOT NULL,
      grade TEXT NOT NULL,
      perfect INTEGER DEFAULT 0,
      great INTEGER DEFAULT 0,
      good INTEGER DEFAULT 0,
      miss INTEGER DEFAULT 0,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, beatmap_id)
    )
  `)

  saveDB()
  console.log('Database initialized')
  return db
}

export function getDB(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function saveDB(): void {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(DB_PATH, buffer)
}
