import { getDatabase } from "./database";

export interface AppleMusicCacheCleanupResult {
  searchDeleted: number;
  trackDeleted: number;
  totalDeleted: number;
}

export function cleanupAppleMusicCache(
  retentionDays: number,
): AppleMusicCacheCleanupResult {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    return {
      searchDeleted: 0,
      trackDeleted: 0,
      totalDeleted: 0,
    };
  }

  const expireAt = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const db = getDatabase();

  let searchDeleted = 0;
  let trackDeleted = 0;

  const transaction = db.transaction(() => {
    const searchResult = db.prepare(`
      DELETE FROM apple_music_searches
      WHERE updated_at < ?
    `).run(expireAt);

    const trackResult = db.prepare(`
      DELETE FROM apple_music_tracks
      WHERE
        last_seen_at < ?
        AND NOT EXISTS (
          SELECT 1
          FROM song_matches
          WHERE
            song_matches.apple_music_track_id = apple_music_tracks.id
            AND song_matches.confirmed = 1
        )
    `).run(expireAt);

    searchDeleted = searchResult.changes;
    trackDeleted = trackResult.changes;
  });

  transaction();

  return {
    searchDeleted,
    trackDeleted,
    totalDeleted: searchDeleted + trackDeleted,
  };
}
