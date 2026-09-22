import { getConfig } from "../config/ConfigService";
import { AppleMusicCatalogProvider } from "../providers/AppleMusicCatalogProvider";
import {
  AppleMusicCacheQuery,
  AppleMusicCacheService,
} from "./AppleMusicCacheService";
import { LanguageDetector } from "./LanguageDetector";
import { LocalMetadataReader } from "./LocalMetadataReader";
import {
  MatchResult,
  MetadataMatchService,
} from "./MetadataMatchService";

export class MetadataMatchPipeline {
  private reader = new LocalMetadataReader();
  private matcher = new MetadataMatchService();
  private appleMusic = new AppleMusicCatalogProvider();
  private cache = new AppleMusicCacheService();

  async process(filePath: string) {
    const localTrack = await this.reader.read(filePath);
    const cacheQuery = this.createCacheQuery(localTrack);

    console.log("[MATCH] local track", localTrack);

    let candidates = this.cache.findCandidates(cacheQuery);
    let match = this.matcher.match(localTrack, candidates);

    if (this.isAcceptableCacheMatch(match)) {
      console.log("[MATCH CACHE] hit", {
        storefronts: cacheQuery.storefronts,
        count: candidates.length,
        score: match?.score,
        confidence: match?.confidence,
        matchedStorefront: match?.track?.storefront,
      });

      return {
        localTrack,
        match,
        candidates,
        source: "cache" as const,
      };
    }

    console.log("[MATCH CACHE] miss", {
      storefronts: cacheQuery.storefronts,
      count: candidates.length,
      score: match?.score,
      confidence: match?.confidence,
    });

    const remoteCandidates = await this.appleMusic.search(
      localTrack.title ?? "",
      localTrack.artist ?? "",
      localTrack.album,
    );

    const safeRemoteCandidates = Array.isArray(remoteCandidates)
      ? remoteCandidates
      : [];

    console.log("[MATCH APPLE] candidates", {
      count: safeRemoteCandidates.length,
      storefront: safeRemoteCandidates[0]?.storefront,
      candidates: safeRemoteCandidates.slice(0, 3),
    });

    if (safeRemoteCandidates.length > 0) {
      this.cache.saveSearchResults(cacheQuery, safeRemoteCandidates);

      console.log("[MATCH CACHE] saved", {
        storefront: safeRemoteCandidates[0]?.storefront,
        count: safeRemoteCandidates.length,
      });
    }

    candidates = this.cache.findCandidates(cacheQuery);

    if (candidates.length === 0) {
      candidates = safeRemoteCandidates;
    }

    match = this.matcher.match(localTrack, candidates);

    return {
      localTrack,
      match,
      candidates,
      source: "apple-music" as const,
    };
  }

  private createCacheQuery(localTrack: {
    title?: string;
    artist?: string;
    album?: string;
    path?: string;
  }): AppleMusicCacheQuery {
    const configuredStorefront = getConfig().appleMusic.storefront
      .trim()
      .toLowerCase();

    const storefronts =
      configuredStorefront === "auto"
        ? LanguageDetector.detect(localTrack).storefronts
        : [configuredStorefront];

    return {
      title: localTrack.title,
      artist: localTrack.artist,
      album: localTrack.album,
      storefronts,
    };
  }

  private isAcceptableCacheMatch(match: MatchResult | null): boolean {
    return (
      match !== null &&
      match.score >= 85 &&
      match.confidence === "high"
    );
  }
}
