import initSqlJs, { Database } from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'

const DB_PATH = path.join(__dirname, '..', 'data.db')

let db: Database
let saveTimeout: ReturnType<typeof setTimeout> | null = null

export async function initDB(): Promise<Database> {
  const SQL = await initSqlJs()

  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
    console.log('Database loaded from file')
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
      theme TEXT DEFAULT 'osu',
      skin_settings TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 迁移：为现有数据库添加 theme 列
  try {
    db.run("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'osu'")
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 迁移：为现有数据库添加 skin_settings 列
  try {
    db.run("ALTER TABLE users ADD COLUMN skin_settings TEXT DEFAULT NULL")
  } catch (e) {
    // 列已存在，忽略错误
  }

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

  // 创建默认管理员账号
  createDefaultAdmin()

  saveDB()
  console.log('Database initialized')
  return db
}

function createDefaultAdmin() {
  // 检查是否已有管理员
  const result = db.exec("SELECT id FROM users WHERE username = 'admin'")
  if (result.length > 0 && result[0].values.length > 0) {
    return // 已存在
  }

  // 使用 bcryptjs 同步方法创建密码哈希
  const bcrypt = require('bcryptjs')
  const hashedPassword = bcrypt.hashSync('admin123', 10)

  db.run(
    "INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)",
    ['admin', hashedPassword, '管理员']
  )
  console.log('Default admin account created (admin / admin123)')
}

export function getDB(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

// 防抖保存：写入后 500ms 自动保存，避免频繁 IO
export function scheduleSave(): void {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveDB()
  }, 500)
}

export function saveDB(): void {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(DB_PATH, buffer)
}
