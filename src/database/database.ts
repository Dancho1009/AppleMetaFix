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
  db.pragma("foreign_keys = ON");

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
      cover_path TEXT,
      cover_exist INTEGER DEFAULT 0,
      file_hash TEXT,
      last_scan_time INTEGER
    );

    CREATE TABLE IF NOT EXISTS apple_music_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apple_music_id TEXT NOT NULL,
      storefront TEXT NOT NULL,
      title TEXT,
      artist TEXT,
      album TEXT,
      normalized_title TEXT,
      normalized_artist TEXT,
      normalized_album TEXT,
      release_date TEXT,
      duration_ms INTEGER,
      genre_json TEXT,
      artwork TEXT,
      isrc TEXT,
      artist_id TEXT,
      album_id TEXT,
      composer TEXT,
      copyright TEXT,
      audio_locale TEXT,
      has_lyrics INTEGER,
      url TEXT,
      raw_json TEXT,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      UNIQUE(apple_music_id, storefront)
    );

    CREATE TABLE IF NOT EXISTS apple_music_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_key TEXT UNIQUE NOT NULL,
      title TEXT,
      artist TEXT,
      album TEXT,
      normalized_title TEXT,
      normalized_artist TEXT,
      normalized_album TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS apple_music_search_results (
      search_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      result_rank INTEGER,
      created_at INTEGER NOT NULL,
      PRIMARY KEY(search_id, track_id),
      FOREIGN KEY(search_id) REFERENCES apple_music_searches(id) ON DELETE CASCADE,
      FOREIGN KEY(track_id) REFERENCES apple_music_tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS song_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id INTEGER NOT NULL,
      apple_music_track_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      confidence TEXT NOT NULL,
      confirmed INTEGER NOT NULL DEFAULT 1,
      confirmed_at INTEGER NOT NULL,
      FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE,
      FOREIGN KEY(apple_music_track_id) REFERENCES apple_music_tracks(id) ON DELETE CASCADE,
      UNIQUE(song_id, apple_music_track_id)
    );

    CREATE INDEX IF NOT EXISTS idx_song_matches_song_id
      ON song_matches(song_id);

    CREATE INDEX IF NOT EXISTS idx_song_matches_confirmed
      ON song_matches(song_id, confirmed);

    CREATE INDEX IF NOT EXISTS idx_apple_music_tracks_normalized_title
      ON apple_music_tracks(normalized_title);

    CREATE INDEX IF NOT EXISTS idx_apple_music_tracks_normalized_artist
      ON apple_music_tracks(normalized_artist);

    CREATE INDEX IF NOT EXISTS idx_apple_music_tracks_isrc
      ON apple_music_tracks(isrc);

    CREATE INDEX IF NOT EXISTS idx_apple_music_search_results_search_id
      ON apple_music_search_results(search_id);
  `);

  addColumnIfMissing(db, "album_artist", "TEXT");
  addColumnIfMissing(db, "composer", "TEXT");
  addColumnIfMissing(db, "sample_rate", "INTEGER");
  addColumnIfMissing(db, "lyrics_path", "TEXT");
  addColumnIfMissing(db, "embedded_lyrics", "TEXT");
  addColumnIfMissing(db, "cover_path", "TEXT");

  return db;
}
