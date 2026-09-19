import Database from "better-sqlite3";
import path from "node:path";
import { app } from "electron";

let db: Database.Database | null = null;

export function getDatabase() {
  if (db) return db;

  const dbPath = path.join(app.getPath("userData"), "AppleMetaFix.db");
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      title TEXT,
      artist TEXT,
      album TEXT,
      genre TEXT,
      year INTEGER,
      duration REAL,
      format TEXT,
      bitrate INTEGER,
      lyrics_type TEXT,
      cover_exist INTEGER DEFAULT 0,
      file_hash TEXT,
      last_scan_time INTEGER
    )
  `);

  return db;
}
