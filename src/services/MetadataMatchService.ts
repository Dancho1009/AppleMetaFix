import { TrackMetadata } from "../providers/AppleMusicProvider";

export interface LocalTrackInfo {
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  audioLocale?: string;
}

export interface MatchScoreDetail {
  score: number;
  weight: number;
  reason: string;
}

export interface MatchScoreDetails {
  title: MatchScoreDetail;
  artist: MatchScoreDetail;
  album: MatchScoreDetail;
  duration?: MatchScoreDetail;
  audioLocale?: MatchScoreDetail;
}

export interface MatchResult {
  track: TrackMetadata;
  score: number;
  confidence: "high" | "medium" | "low";
  scoreDetails: MatchScoreDetails;
}

export class MetadataMatchService {
  match(local: LocalTrackInfo, candidates?: TrackMetadata[] | null): MatchResult | null {
    if (!candidates || candidates.length === 0) return null;

    const results = candidates.map((track) => {
      const detail = this.scoreDetails(local, track);
      const score = Math.round(
        Object.values(detail).reduce((sum, item) => sum + item.score * item.weight, 0) / 100
      );

      return {
        track,
        score,
        scoreDetails: detail,
      };
    }).sort((a, b) => b.score - a.score);

    const result = results[0];

    return {
      ...result,
      confidence: result.score >= 90 ? "high" : result.score >= 70 ? "medium" : "low",
    };
  }

  private scoreDetails(local: LocalTrackInfo, track: TrackMetadata): MatchScoreDetails {
    const details: MatchScoreDetails = {
      title: {
        score: Math.round(this.similarity(local.title, track.title) * 100),
        weight: 50,
        reason: "标题匹配度",
      },
      artist: {
        score: Math.round(this.similarity(local.artist ?? "", track.artist) * 100),
        weight: 35,
        reason: "艺术家匹配度",
      },
      album: {
        score: Math.round(this.similarity(local.album ?? "", track.album ?? "") * 100),
        weight: 15,
        reason: "专辑匹配度",
      },
    };

    if (local.duration && track.durationInMillis) {
      const diff = Math.abs(local.duration - track.durationInMillis / 1000);
      details.duration = {
        score: diff <= 2 ? 100 : diff <= 5 ? 80 : diff <= 10 ? 50 : 0,
        weight: 0,
        reason: `时长差${diff.toFixed(1)}秒，仅作为辅助参考`,
      };
    }

    if (local.audioLocale && track.audioLocale) {
      const matched = local.audioLocale === track.audioLocale;
      details.audioLocale = {
        score: matched ? 100 : 0,
        weight: 0,
        reason: matched ? "音频语言一致" : "音频语言不同",
      };
    }

    return details;
  }

  private similarity(a: string, b?: string): number {
    if (!a || !b) return 0;

    const normalize = (v: string) =>
      v.toLowerCase()
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g, "");

    const left = normalize(a);
    const right = normalize(b);

    if (left === right) return 1;
    if (left.includes(right) || right.includes(left)) return 0.85;

    return 0;
  }
}
