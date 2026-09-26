import { getDatabase } from "./database";

interface SizeRow {
  sizeBytes: number | null;
}

export function getAppleMusicCacheSizeBytes(): number {
  const row = getDatabase()
    .prepare(`
      SELECT
        (
          SELECT COALESCE(SUM(
            LENGTH(COALESCE(apple_music_id, '')) +
            LENGTH(COALESCE(storefront, '')) +
            LENGTH(COALESCE(title, '')) +
            LENGTH(COALESCE(artist, '')) +
            LENGTH(COALESCE(album, '')) +
            LENGTH(COALESCE(genre_json, '')) +
            LENGTH(COALESCE(artwork, '')) +
            LENGTH(COALESCE(isrc, '')) +
            LENGTH(COALESCE(composer, '')) +
            LENGTH(COALESCE(raw_json, '')) +
            96
          ), 0)
          FROM apple_music_tracks AS tracks
          WHERE NOT EXISTS (
            SELECT 1
            FROM song_matches
            WHERE
              song_matches.apple_music_track_id = tracks.id
              AND song_matches.confirmed = 1
          )
        ) +
        (
          SELECT COALESCE(SUM(
            LENGTH(COALESCE(search_key, '')) +
            LENGTH(COALESCE(title, '')) +
            LENGTH(COALESCE(artist, '')) +
            LENGTH(COALESCE(album, '')) +
            48
          ), 0)
          FROM apple_music_searches
        ) +
        (
          SELECT COUNT(*) * 32
          FROM apple_music_search_results
        ) AS sizeBytes
    `)
    .get() as SizeRow | undefined;

  return Math.max(0, Number(row?.sizeBytes ?? 0));
}
