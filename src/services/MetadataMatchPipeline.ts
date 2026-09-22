import { AppleMusicCatalogProvider } from "../providers/AppleMusicCatalogProvider";
import { AppleMusicCacheService } from "./AppleMusicCacheService";
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

    console.log("[MATCH] local track", localTrack);

    let candidates = this.cache.findCandidates(localTrack);
    let match = this.matcher.match(localTrack, candidates);

    if (this.isAcceptableCacheMatch(match)) {
      console.log("[MATCH CACHE] hit", {
        count: candidates.length,
        score: match?.score,
        confidence: match?.confidence,
      });

      return {
        localTrack,
        match,
        candidates,
        source: "cache" as const,
      };
    }

    console.log("[MATCH CACHE] miss", {
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
      candidates: safeRemoteCandidates.slice(0, 3),
    });

    if (safeRemoteCandidates.length > 0) {
      this.cache.saveSearchResults(localTrack, safeRemoteCandidates);

      console.log("[MATCH CACHE] saved", {
        count: safeRemoteCandidates.length,
      });
    }

    candidates = this.cache.findCandidates(localTrack);

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

  private isAcceptableCacheMatch(match: MatchResult | null): boolean {
    return (
      match !== null &&
      match.score >= 85 &&
      match.confidence === "high"
    );
  }
}
