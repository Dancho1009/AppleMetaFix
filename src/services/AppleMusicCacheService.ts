import { createHash } from "node:crypto";
import {
  clearAppleMusicSearchCache,
  getAppleMusicSearchCount,
  getAppleMusicSearchResults,
  saveAppleMusicSearchResults,
} from "../database/appleMusicSearchRepository";
import {
  findAppleMusicTracksByMetadata,
  getAppleMusicTrackCount,
} from "../database/appleMusicTrackRepository";
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
  storefronts?: string[];
  language?: string;
}

export interface AppleMusicCacheStats {
  trackCount: number;
  searchCount: number;
}

function normalizeStorefront(value?: string): string {
  return value?.trim().toLowerCase() || "unknown";
}

function normalizeLanguage(value?: string): string {
  return value?.trim().toLowerCase() || "unknown";
}

function normalizeStorefronts(storefronts?: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const storefront of storefronts ?? []) {
    const normalized = normalizeStorefront(storefront);

    if (normalized === "unknown" || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function createAppleMusicSearchKey(
  query: AppleMusicCacheQuery,
  storefront: string,
): string | null {
  const title = normalizeTitle(query.title);

  if (!title) {
    return null;
  }

  const source = [
    "v3",
    normalizeStorefront(storefront),
    normalizeLanguage(query.language),
    title,
    normalizeArtist(query.artist),
    normalizeAlbum(query.album),
  ].join("|");

  return createHash("sha256").update(source, "utf8").digest("hex");
}

function trackCacheKey(track: TrackMetadata): string {
  return [
    normalizeStorefront(track.storefront),
    track.id ?? "",
    normalizeTitle(track.title),
    normalizeArtist(track.artist),
    normalizeAlbum(track.album),
  ].join("|");
}

export class AppleMusicCacheService {
  findCandidates(query: AppleMusicCacheQuery): TrackMetadata[] {
    const storefronts = normalizeStorefronts(query.storefronts);

    if (storefronts.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const candidates: TrackMetadata[] = [];

    for (const storefront of storefronts) {
      const searchKey = createAppleMusicSearchKey(query, storefront);
      const searchCandidates = searchKey
        ? getAppleMusicSearchResults(searchKey)
        : [];
      const catalogCandidates = findAppleMusicTracksByMetadata({
        title: query.title,
        artist: query.artist,
        album: query.album,
        storefront,
      });

      for (const candidate of [...searchCandidates, ...catalogCandidates]) {
        const key = trackCacheKey(candidate);

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  saveSearchResults(
    query: AppleMusicCacheQuery,
    candidates: TrackMetadata[],
  ): void {
    if (candidates.length === 0) {
      return;
    }

    const fallbackStorefront = normalizeStorefronts(query.storefronts)[0];
    const groups = new Map<string, TrackMetadata[]>();

    for (const candidate of candidates) {
      const storefront = normalizeStorefront(
        candidate.storefront ?? fallbackStorefront,
      );

      if (storefront === "unknown") {
        continue;
      }

      const group = groups.get(storefront) ?? [];
      group.push(candidate);
      groups.set(storefront, group);
    }

    for (const [storefront, storefrontCandidates] of groups) {
      const searchKey = createAppleMusicSearchKey(query, storefront);

      if (!searchKey) {
        continue;
      }

      saveAppleMusicSearchResults(
        {
          searchKey,
          title: query.title,
          artist: query.artist,
          album: query.album,
        },
        storefrontCandidates,
      );
    }
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
