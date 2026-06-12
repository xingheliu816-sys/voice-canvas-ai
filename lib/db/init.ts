
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_DIR = path.join(process.cwd(), 'storage');
const THUMB_DIR = path.join(STORAGE_DIR, 'thumbnails');
const DB_PATH = path.join(DATA_DIR, 'app.db');

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (db) return db;

  for (const dir of [DATA_DIR, STORAGE_DIR, THUMB_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      username    TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drawings (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      title         TEXT NOT NULL,
      canvas_json   TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_drawings_user_updated
      ON drawings(user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS command_logs (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      drawing_id    TEXT,
      raw_text      TEXT NOT NULL,
      parsed_json   TEXT,
      status        TEXT NOT NULL,
      source        TEXT NOT NULL,
      created_at    INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  return db;
}
