import type { TrackMetadata } from "../providers/AppleMusicProvider";
import type { SongMatchConfirmation } from "../models/SongMatchConfirmation";
import { getDatabase } from "./database";
import {
  mapAppleMusicTrackRow,
  upsertAppleMusicTrack,
} from "./appleMusicTrackRepository";

interface SongMatchRow {
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
  match_id: number;
  song_path: string;
  score: number;
  confidence: "high" | "medium" | "low";
  confirmed: number;
  confirmed_at: number;
}

function mapSongMatch(row: SongMatchRow | undefined): SongMatchConfirmation | null {
  if (!row) return null;

  return {
    id: row.match_id,
    songPath: row.song_path,
    track: mapAppleMusicTrackRow(row),
    score: row.score,
    confidence: row.confidence,
    confirmed: Boolean(row.confirmed),
    confirmedAt: row.confirmed_at,
  };
}

function findSongId(filePath: string): number {
  const row = getDatabase()
    .prepare("SELECT id FROM songs WHERE path = ? LIMIT 1")
    .get(filePath) as { id: number } | undefined;

  if (!row) {
    throw new Error("本地歌曲不存在，请先扫描音乐库");
  }

  return row.id;
}

export function saveSongMatchConfirmation(
  filePath: string,
  track: TrackMetadata,
  score: number,
  confidence: "high" | "medium" | "low",
): SongMatchConfirmation {
  const songId = findSongId(filePath);
  const trackId = upsertAppleMusicTrack(track);
  const db = getDatabase();
  const confirmedAt = Date.now();

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE song_matches
      SET confirmed = 0
      WHERE song_id = ? AND confirmed = 1
    `).run(songId);

    db.prepare(`
      INSERT INTO song_matches (
        song_id,
        apple_music_track_id,
        score,
        confidence,
        confirmed,
        confirmed_at
      ) VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(song_id, apple_music_track_id) DO UPDATE SET
        score=excluded.score,
        confidence=excluded.confidence,
        confirmed=1,
        confirmed_at=excluded.confirmed_at
    `).run(songId, trackId, score, confidence, confirmedAt);
  });

  transaction();

  const confirmation = getConfirmedSongMatch(filePath);
  if (!confirmation) {
    throw new Error("歌曲匹配确认保存失败");
  }

  return confirmation;
}

export function getConfirmedSongMatch(
  filePath: string,
): SongMatchConfirmation | null {
  const row = getDatabase()
    .prepare(`
      SELECT
        tracks.*,
        matches.id AS match_id,
        songs.path AS song_path,
        matches.score,
        matches.confidence,
        matches.confirmed,
        matches.confirmed_at
      FROM song_matches AS matches
      INNER JOIN songs
        ON songs.id = matches.song_id
      INNER JOIN apple_music_tracks AS tracks
        ON tracks.id = matches.apple_music_track_id
      WHERE songs.path = ? AND matches.confirmed = 1
      ORDER BY matches.confirmed_at DESC
      LIMIT 1
    `)
    .get(filePath) as SongMatchRow | undefined;

  return mapSongMatch(row);
}
