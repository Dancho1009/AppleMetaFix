import { TrackMetadata } from "../providers/AppleMusicProvider";
import {
  normalizeAlbum,
  normalizeArtist,
  normalizeTitle,
} from "../utils/MetadataNormalizer";
import { getDatabase } from "./database";

interface AppleMusicTrackRow {
  id: number;
  apple_music_id: string;
  storefront: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  release_date: string | null;
  duration_ms: number | null;
  genre_json: string | null;
  artwork: string | null;
  isrc: string | null;
  artist_id: string | null;
  album_id: string | null;
  composer: string | null;
  copyright: string | null;
  audio_locale: string | null;
  has_lyrics: number | null;
  url: string | null;
  raw_json: string | null;
}

export interface AppleMusicTrackLookup {
  title?: string;
  artist?: string;
  album?: string;
  storefront?: string;
}

function parseJson<T>(value: string | null): T | undefined {
  if (!value) return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function mapAppleMusicTrackRow(row: AppleMusicTrackRow): TrackMetadata {
  return {
    id: row.apple_music_id,
    storefront: row.storefront,
    title: row.title ?? undefined,
    artist: row.artist ?? undefined,
    album: row.album ?? undefined,
    releaseDate: row.release_date ?? undefined,
    durationInMillis: row.duration_ms ?? undefined,
    genre: parseJson<string[]>(row.genre_json),
    artwork: row.artwork ?? undefined,
    isrc: row.isrc ?? undefined,
    artistId: row.artist_id ?? undefined,
    albumId: row.album_id ?? undefined,
    composer: row.composer ?? undefined,
    copyright: row.copyright ?? undefined,
    audioLocale: row.audio_locale ?? undefined,
    hasLyrics:
      row.has_lyrics === null || row.has_lyrics === undefined
        ? undefined
        : Boolean(row.has_lyrics),
    url: row.url ?? undefined,
    raw: parseJson<unknown>(row.raw_json),
  };
}

export function upsertAppleMusicTrack(track: TrackMetadata): number {
  if (!track.id) {
    throw new Error("Apple Music缓存结果缺少track id");
  }

  const db = getDatabase();
  const now = Date.now();
  const storefront = track.storefront?.trim().toLowerCase() || "unknown";

  db.prepare(`
    INSERT INTO apple_music_tracks (
      apple_music_id, storefront, title, artist, album,
      normalized_title, normalized_artist, normalized_album,
      release_date, duration_ms, genre_json, artwork, isrc,
      artist_id, album_id, composer, copyright, audio_locale,
      has_lyrics, url, raw_json, first_seen_at, last_seen_at
    ) VALUES (
      @apple_music_id, @storefront, @title, @artist, @album,
      @normalized_title, @normalized_artist, @normalized_album,
      @release_date, @duration_ms, @genre_json, @artwork, @isrc,
      @artist_id, @album_id, @composer, @copyright, @audio_locale,
      @has_lyrics, @url, @raw_json, @first_seen_at, @last_seen_at
    )
    ON CONFLICT(apple_music_id, storefront) DO UPDATE SET
      title=excluded.title,
      artist=excluded.artist,
      album=excluded.album,
      normalized_title=excluded.normalized_title,
      normalized_artist=excluded.normalized_artist,
      normalized_album=excluded.normalized_album,
      release_date=excluded.release_date,
      duration_ms=excluded.duration_ms,
      genre_json=excluded.genre_json,
      artwork=excluded.artwork,
      isrc=excluded.isrc,
      artist_id=excluded.artist_id,
      album_id=excluded.album_id,
      composer=excluded.composer,
      copyright=excluded.copyright,
      audio_locale=excluded.audio_locale,
      has_lyrics=excluded.has_lyrics,
      url=excluded.url,
      raw_json=excluded.raw_json,
      last_seen_at=excluded.last_seen_at
  `).run({
    apple_music_id: track.id,
    storefront,
    title: track.title ?? null,
    artist: track.artist ?? null,
    album: track.album ?? null,
    normalized_title: normalizeTitle(track.title),
    normalized_artist: normalizeArtist(track.artist),
    normalized_album: normalizeAlbum(track.album),
    release_date: track.releaseDate ?? null,
    duration_ms: track.durationInMillis ?? null,
    genre_json: track.genre ? JSON.stringify(track.genre) : null,
    artwork: track.artwork ?? null,
    isrc: track.isrc ?? null,
    artist_id: track.artistId ?? null,
    album_id: track.albumId ?? null,
    composer: track.composer ?? null,
    copyright: track.copyright ?? null,
    audio_locale: track.audioLocale ?? null,
    has_lyrics:
      track.hasLyrics === undefined ? null : track.hasLyrics ? 1 : 0,
    url: track.url ?? null,
    raw_json: track.raw === undefined ? null : JSON.stringify(track.raw),
    first_seen_at: now,
    last_seen_at: now,
  });

  const row = db
    .prepare(
      "SELECT id FROM apple_music_tracks WHERE apple_music_id = ? AND storefront = ? LIMIT 1",
    )
    .get(track.id, storefront) as { id: number } | undefined;

  if (!row) {
    throw new Error("Apple Music缓存写入失败");
  }

  return row.id;
}

export function findAppleMusicTracksByMetadata(
  query: AppleMusicTrackLookup,
  limit = 50,
): TrackMetadata[] {
  const title = normalizeTitle(query.title);

  if (!title) {
    return [];
  }

  const artist = normalizeArtist(query.artist);
  const album = normalizeAlbum(query.album);
  const storefront = query.storefront?.trim().toLowerCase() || "";
  const safeLimit = Math.min(100, Math.max(1, Math.round(limit)));

  const rows = getDatabase()
    .prepare(`
      SELECT *
      FROM apple_music_tracks
      WHERE
        (@storefront = '' OR storefront = @storefront)
        AND (
          normalized_title = @title
          OR normalized_title LIKE @contains_title
          OR @title LIKE '%' || normalized_title || '%'
        )
      ORDER BY
        CASE WHEN normalized_title = @title THEN 0 ELSE 1 END,
        CASE
          WHEN @artist <> '' AND normalized_artist = @artist THEN 0
          ELSE 1
        END,
        CASE
          WHEN @album <> '' AND normalized_album = @album THEN 0
          ELSE 1
        END,
        last_seen_at DESC
      LIMIT @limit
    `)
    .all({
      title,
      contains_title: `%${title}%`,
      artist,
      album,
      storefront,
      limit: safeLimit,
    }) as AppleMusicTrackRow[];

  return rows.map(mapAppleMusicTrackRow);
}

export function getAppleMusicTrackCount(): number {
  const row = getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM apple_music_tracks")
    .get() as { count: number };

  return row.count;
}
