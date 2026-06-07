const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

async function fix() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);
  
  // 删除重复的默认歌单，只保留ID最小的那个
  db.run("DELETE FROM bgm_playlists WHERE name = '默认歌单' AND id != (SELECT MIN(id) FROM bgm_playlists WHERE name = '默认歌单')")
  
  // 确保至少有一个活跃歌单
  const active = db.exec('SELECT id FROM bgm_playlists WHERE is_active = 1')
  if (active.length === 0 || active[0].values.length === 0) {
    db.run('UPDATE bgm_playlists SET is_active = 1 WHERE id = (SELECT MIN(id) FROM bgm_playlists)')
  }
  
  // 保存
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  
  console.log('Database fixed!');
}

fix().catch(console.error);
