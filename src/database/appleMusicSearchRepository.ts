import { TrackMetadata } from "../providers/AppleMusicProvider";
import {
  normalizeAlbum,
  normalizeArtist,
  normalizeTitle,
} from "../utils/MetadataNormalizer";
import { getDatabase } from "./database";
import {
  mapAppleMusicTrackRow,
  upsertAppleMusicTrack,
} from "./appleMusicTrackRepository";

export interface AppleMusicSearchInput {
  searchKey: string;
  title?: string;
  artist?: string;
  album?: string;
}

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

export function saveAppleMusicSearchResults(
  input: AppleMusicSearchInput,
  candidates: TrackMetadata[],
): void {
  const db = getDatabase();

  const transaction = db.transaction(() => {
    const now = Date.now();

    db.prepare(`
      INSERT INTO apple_music_searches (
        search_key, title, artist, album,
        normalized_title, normalized_artist, normalized_album,
        created_at, updated_at
      ) VALUES (
        @search_key, @title, @artist, @album,
        @normalized_title, @normalized_artist, @normalized_album,
        @created_at, @updated_at
      )
      ON CONFLICT(search_key) DO UPDATE SET
        title=excluded.title,
        artist=excluded.artist,
        album=excluded.album,
        normalized_title=excluded.normalized_title,
        normalized_artist=excluded.normalized_artist,
        normalized_album=excluded.normalized_album,
        updated_at=excluded.updated_at
    `).run({
      search_key: input.searchKey,
      title: input.title ?? null,
      artist: input.artist ?? null,
      album: input.album ?? null,
      normalized_title: normalizeTitle(input.title),
      normalized_artist: normalizeArtist(input.artist),
      normalized_album: normalizeAlbum(input.album),
      created_at: now,
      updated_at: now,
    });

    const search = db
      .prepare(
        "SELECT id FROM apple_music_searches WHERE search_key = ? LIMIT 1",
      )
      .get(input.searchKey) as { id: number } | undefined;

    if (!search) {
      throw new Error("Apple Music搜索缓存写入失败");
    }

    candidates.forEach((candidate, index) => {
      if (!candidate.id) return;

      const trackId = upsertAppleMusicTrack(candidate);

      db.prepare(`
        INSERT INTO apple_music_search_results (
          search_id, track_id, result_rank, created_at
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(search_id, track_id) DO UPDATE SET
          result_rank=excluded.result_rank
      `).run(search.id, trackId, index, now);
    });
  });

  transaction();
}

export function getAppleMusicSearchResults(
  searchKey: string,
): TrackMetadata[] {
  const rows = getDatabase()
    .prepare(`
      SELECT tracks.*
      FROM apple_music_search_results AS results
      INNER JOIN apple_music_searches AS searches
        ON searches.id = results.search_id
      INNER JOIN apple_music_tracks AS tracks
        ON tracks.id = results.track_id
      WHERE searches.search_key = ?
      ORDER BY results.result_rank ASC, tracks.last_seen_at DESC
    `)
    .all(searchKey) as AppleMusicTrackRow[];

  return rows.map(mapAppleMusicTrackRow);
}

export function getAppleMusicSearchCount(): number {
  const row = getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM apple_music_searches")
    .get() as { count: number };

  return row.count;
}

export interface AppleMusicSearchCacheClearResult {
  searchDeleted: number;
  trackDeleted: number;
  totalDeleted: number;
}

export function clearAppleMusicSearchCache(): AppleMusicSearchCacheClearResult {
  const db = getDatabase();

  const transaction = db.transaction(() => {
    const searchResult = db.prepare(
      "DELETE FROM apple_music_searches",
    ).run();

    const trackResult = db.prepare(`
      DELETE FROM apple_music_tracks
      WHERE NOT EXISTS (
        SELECT 1
        FROM song_matches
        WHERE
          song_matches.apple_music_track_id = apple_music_tracks.id
          AND song_matches.confirmed = 1
      )
    `).run();

    return {
      searchDeleted: searchResult.changes,
      trackDeleted: trackResult.changes,
      totalDeleted: searchResult.changes + trackResult.changes,
    };
  });

  return transaction();
}
