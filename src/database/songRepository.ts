import { getDatabase } from "./database";

export interface CachedSong {
  path: string;
  filename: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  duration?: number;
  format?: string;
  bitrate?: number;
  lyrics_type?: string;
  cover_exist?: boolean;
}

export function upsertSong(song: CachedSong) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO songs (
      path, filename, title, artist, album, genre, year,
      duration, format, bitrate, lyrics_type, cover_exist, last_scan_time
    ) VALUES (
      @path, @filename, @title, @artist, @album, @genre, @year,
      @duration, @format, @bitrate, @lyrics_type, @cover_exist, @last_scan_time
    )
    ON CONFLICT(path) DO UPDATE SET
      title=excluded.title,
      artist=excluded.artist,
      album=excluded.album,
      genre=excluded.genre,
      year=excluded.year,
      duration=excluded.duration,
      format=excluded.format,
      bitrate=excluded.bitrate,
      lyrics_type=excluded.lyrics_type,
      cover_exist=excluded.cover_exist,
      last_scan_time=excluded.last_scan_time
  `);

  stmt.run({
    ...song,
    cover_exist: song.cover_exist ? 1 : 0,
    last_scan_time: Date.now(),
  });
}

export function getSongs() {
  return getDatabase().prepare("SELECT * FROM songs ORDER BY id DESC").all();
}
