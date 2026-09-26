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
import { mergeConfirmedTrack } from "./MatchCandidateMerge";
import { songMatchConfirmationService } from "./SongMatchConfirmationService";

export interface MatchPipelineResult {
  localTrack: Awaited<ReturnType<LocalMetadataReader["read"]>>;
  match: MatchResult | null;
  candidates: MatchResult[];
  source: "cache" | "apple-music";
}

export class MetadataMatchPipeline {
  private reader = new LocalMetadataReader();
  private matcher = new MetadataMatchService();
  private appleMusic = new AppleMusicCatalogProvider();
  private cache = new AppleMusicCacheService();

  async process(filePath: string): Promise<MatchPipelineResult> {
    const localTrack = await this.reader.read(filePath);
    const cacheQuery = this.createCacheQuery(localTrack);
    const confirmedTrack =
      songMatchConfirmationService.get(filePath)?.track ?? null;

    console.log("[MATCH] local track", localTrack);

    let trackCandidates = this.cache.findCandidates(cacheQuery);
    let candidates = this.matcher.rank(localTrack, trackCandidates);
    let match = candidates[0] ?? null;

    if (this.isAcceptableCacheMatch(match)) {
      console.log("[MATCH CACHE] hit", {
        storefronts: cacheQuery.storefronts,
        count: candidates.length,
        score: match?.score,
        confidence: match?.confidence,
        matchedStorefront: match?.track?.storefront,
        confirmedStorefront: confirmedTrack?.storefront,
      });

      trackCandidates = mergeConfirmedTrack(
        trackCandidates,
        confirmedTrack,
      );
      candidates = this.matcher.rank(localTrack, trackCandidates);
      match = candidates[0] ?? null;

      return {
        localTrack,
        match,
        candidates,
        source: "cache",
      };
    }

    console.log("[MATCH CACHE] miss", {
      storefronts: cacheQuery.storefronts,
      count: candidates.length,
      score: match?.score,
      confidence: match?.confidence,
      confirmedStorefront: confirmedTrack?.storefront,
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

    trackCandidates = this.cache.findCandidates(cacheQuery);

    if (trackCandidates.length === 0) {
      trackCandidates = safeRemoteCandidates;
    }

    trackCandidates = mergeConfirmedTrack(
      trackCandidates,
      confirmedTrack,
    );
    candidates = this.matcher.rank(localTrack, trackCandidates);
    match = candidates[0] ?? null;

    return {
      localTrack,
      match,
      candidates,
      source: "apple-music",
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
