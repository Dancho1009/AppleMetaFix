import { getDatabase } from "./database";

interface SizeRow {
  sizeBytes: number | null;
}

export function getAppleMusicCacheSizeBytes(): number {
  const db = getDatabase();

  try {
    const row = db.prepare(`
      SELECT COALESCE(SUM(pgsize), 0) AS sizeBytes
      FROM dbstat
      WHERE name IN (
        'apple_music_tracks',
        'apple_music_searches',
        'apple_music_search_results'
      )
    `).get() as SizeRow | undefined;

    return Math.max(0, Number(row?.sizeBytes ?? 0));
  } catch {
    const row = db.prepare(`
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
          FROM apple_music_tracks
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
    `).get() as SizeRow | undefined;

    return Math.max(0, Number(row?.sizeBytes ?? 0));
  }
}
