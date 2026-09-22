import { createHash } from "node:crypto";
import {
  clearAppleMusicSearchCache,
  getAppleMusicSearchCount,
  getAppleMusicSearchResults,
  saveAppleMusicSearchResults,
} from "../database/appleMusicSearchRepository";
import { getAppleMusicTrackCount } from "../database/appleMusicTrackRepository";
import { TrackMetadata } from "../providers/AppleMusicProvider";
import {
  normalizeAlbum,
  normalizeArtist,
  normalizeTitle,
} from "../utils/MetadataNormalizer";

export interface AppleMusicCacheQuery {
  title?: string;
  artist?: string;
  album?: string;
}

export interface AppleMusicCacheStats {
  trackCount: number;
  searchCount: number;
}

export function createAppleMusicSearchKey(
  query: AppleMusicCacheQuery,
): string | null {
  const title = normalizeTitle(query.title);

  if (!title) {
    return null;
  }

  const source = [
    title,
    normalizeArtist(query.artist),
    normalizeAlbum(query.album),
  ].join("|");

  return createHash("sha256").update(source, "utf8").digest("hex");
}

export class AppleMusicCacheService {
  findCandidates(query: AppleMusicCacheQuery): TrackMetadata[] {
    const searchKey = createAppleMusicSearchKey(query);

    if (!searchKey) {
      return [];
    }

    return getAppleMusicSearchResults(searchKey);
  }

  saveSearchResults(
    query: AppleMusicCacheQuery,
    candidates: TrackMetadata[],
  ): void {
    const searchKey = createAppleMusicSearchKey(query);

    if (!searchKey || candidates.length === 0) {
      return;
    }

    saveAppleMusicSearchResults(
      {
        searchKey,
        title: query.title,
        artist: query.artist,
        album: query.album,
      },
      candidates,
    );
  }

  getStats(): AppleMusicCacheStats {
    return {
      trackCount: getAppleMusicTrackCount(),
      searchCount: getAppleMusicSearchCount(),
    };
  }

  clear(): void {
    clearAppleMusicSearchCache();
  }
}
