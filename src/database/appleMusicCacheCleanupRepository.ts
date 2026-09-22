import { getDatabase } from "./database";

export function cleanupAppleMusicCache(retentionDays: number): number {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    return 0;
  }

  const expireAt = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const db = getDatabase();

  const transaction = db.transaction(() => {
    db.prepare(`
      DELETE FROM apple_music_searches
      WHERE updated_at < ?
    `).run(expireAt);

    db.prepare(`
      DELETE FROM apple_music_tracks
      WHERE last_seen_at < ?
    `).run(expireAt);
  });

  transaction();

  return 1;
}
