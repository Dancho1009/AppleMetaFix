import Database from "better-sqlite3";
import path from "node:path";
import { app } from "electron";

let db: Database.Database | null = null;

function addColumnIfMissing(db: Database.Database, column: string, definition: string) {
  const columns = db.prepare("PRAGMA table_info(songs)").all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE songs ADD COLUMN ${column} ${definition}`);
  }
}

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
      album_artist TEXT,
      composer TEXT,
      genre TEXT,
      year INTEGER,
      duration REAL,
      format TEXT,
      bitrate INTEGER,
      sample_rate INTEGER,
      lyrics_type TEXT,
      lyrics_path TEXT,
      embedded_lyrics TEXT,
      cover_data_url TEXT,
      cover_exist INTEGER DEFAULT 0,
      file_hash TEXT,
      last_scan_time INTEGER
    )
  `);

  addColumnIfMissing(db, "album_artist", "TEXT");
  addColumnIfMissing(db, "composer", "TEXT");
  addColumnIfMissing(db, "sample_rate", "INTEGER");
  addColumnIfMissing(db, "lyrics_path", "TEXT");
  addColumnIfMissing(db, "embedded_lyrics", "TEXT");
  addColumnIfMissing(db, "cover_data_url", "TEXT");

  return db;
}
