import { getDatabase } from "./database";

export interface CachedSong {
  path: string;
  filename: string;
  title?: string;
  artist?: string;
  album?: string;
  album_artist?: string;
  composer?: string;
  genre?: string;
  year?: number;
  duration?: number;
  format?: string;
  bitrate?: number;
  sample_rate?: number;
  lyrics_type?: string;
  lyrics_path?: string;
  embedded_lyrics?: string;
  cover_data_url?: string;
  cover_exist?: boolean;
}

export function upsertSong(song: CachedSong) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO songs (
      path, filename, title, artist, album, album_artist, composer,
      genre, year, duration, format, bitrate, sample_rate,
      lyrics_type, lyrics_path, embedded_lyrics,
      cover_data_url, cover_exist, last_scan_time
    ) VALUES (
      @path, @filename, @title, @artist, @album, @album_artist, @composer,
      @genre, @year, @duration, @format, @bitrate, @sample_rate,
      @lyrics_type, @lyrics_path, @embedded_lyrics,
      @cover_data_url, @cover_exist, @last_scan_time
    )
    ON CONFLICT(path) DO UPDATE SET
      title=excluded.title,
      artist=excluded.artist,
      album=excluded.album,
      album_artist=excluded.album_artist,
      composer=excluded.composer,
      genre=excluded.genre,
      year=excluded.year,
      duration=excluded.duration,
      format=excluded.format,
      bitrate=excluded.bitrate,
      sample_rate=excluded.sample_rate,
      lyrics_type=excluded.lyrics_type,
      lyrics_path=excluded.lyrics_path,
      embedded_lyrics=excluded.embedded_lyrics,
      cover_data_url=excluded.cover_data_url,
      cover_exist=excluded.cover_exist,
      last_scan_time=excluded.last_scan_time
  `);

  stmt.run({
    path: song.path,
    filename: song.filename,
    title: song.title ?? null,
    artist: song.artist ?? null,
    album: song.album ?? null,
    album_artist: song.album_artist ?? null,
    composer: song.composer ?? null,
    genre: song.genre ?? null,
    year: song.year ?? null,
    duration: song.duration ?? null,
    format: song.format ?? null,
    bitrate: song.bitrate ?? null,
    sample_rate: song.sample_rate ?? null,
    lyrics_type: song.lyrics_type ?? null,
    lyrics_path: song.lyrics_path ?? null,
    embedded_lyrics: song.embedded_lyrics ?? null,
    cover_data_url: song.cover_data_url ?? null,
    cover_exist: song.cover_exist ? 1 : 0,
    last_scan_time: Date.now(),
  });
}

export function getSongs() {
  return getDatabase().prepare("SELECT * FROM songs ORDER BY id DESC").all();
}

export function getSongByPath(filePath: string) {
  return getDatabase()
    .prepare("SELECT * FROM songs WHERE path = ? LIMIT 1")
    .get(filePath);
}
