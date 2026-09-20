import { TrackMetadata } from "../providers/AppleMusicProvider";

export interface LocalTrackInfo {
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  year?: number;
}

export interface MatchResult {
  track: TrackMetadata;
  score: number;
  confidence: "high" | "medium" | "low";
}

export class MetadataMatchService {
  match(local: LocalTrackInfo, candidates: TrackMetadata[]): MatchResult | null {
    if (!candidates.length) return null;

    const results = candidates.map((track) => ({
      track,
      score: this.score(local, track),
    })).sort((a, b) => b.score - a.score);

    const result = results[0];

    return {
      ...result,
      confidence: result.score >= 90 ? "high" : result.score >= 70 ? "medium" : "low",
    };
  }

  private score(local: LocalTrackInfo, track: TrackMetadata): number {
    let score = 0;
    const titleScore = this.similarity(local.title, track.title);
    const artistScore = this.similarity(local.artist ?? "", track.artist);
    const albumScore = this.similarity(local.album ?? "", track.album ?? "");

    score += titleScore * 35;
    score += artistScore * 25;

    if (local.album) score += albumScore * 15;
    else if (titleScore === 1 && artistScore === 1) score += 15;

    if (local.duration && track.durationInMillis) {
      const diff = Math.abs(local.duration - track.durationInMillis / 1000);
      if (diff <= 2) score += 15;
      else if (diff <= 5) score += 12;
      else if (diff <= 10) score += 8;
    }

    if (local.year && track.releaseDate?.startsWith(String(local.year))) score += 5;

    return Math.round(Math.min(Math.max(score, 0), 100));
  }

  private similarity(a: string, b?: string): number {
    if (!a || !b) return 0;
    const normalize = (v: string) => v.toLowerCase().replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "").replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g, "");
    const left = normalize(a);
    const right = normalize(b);
    if (left === right) return 1;
    if (left.includes(right) || right.includes(left)) return 0.85;
    return 0;
  }
}
