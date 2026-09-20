import { TrackMetadata } from "../providers/AppleMusicProvider";

export interface LocalTrackInfo {
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  year?: number;
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
  duration: MatchScoreDetail;
  year: MatchScoreDetail;
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
    const titleScore = this.similarity(local.title, track.title);
    const artistScore = this.similarity(local.artist ?? "", track.artist);
    const albumScore = this.similarity(local.album ?? "", track.album ?? "");

    let durationScore = 0;
    let durationReason = "无时长信息";
    if (local.duration && track.durationInMillis) {
      const diff = Math.abs(local.duration - track.durationInMillis / 1000);
      if (diff <= 2) {
        durationScore = 100;
        durationReason = `时长差${diff.toFixed(1)}秒，完全匹配`;
      } else if (diff <= 5) {
        durationScore = 80;
        durationReason = `时长差${diff.toFixed(1)}秒，接近`;
      } else if (diff <= 10) {
        durationScore = 50;
        durationReason = `时长差${diff.toFixed(1)}秒`;
      }
    }

    const yearScore = local.year && track.releaseDate?.startsWith(String(local.year)) ? 100 : 0;

    return {
      title: {
        score: Math.round(titleScore * 100),
        weight: 35,
        reason: titleScore === 1 ? "标题完全匹配" : "标题部分匹配",
      },
      artist: {
        score: Math.round(artistScore * 100),
        weight: 25,
        reason: artistScore === 1 ? "艺术家完全匹配" : "艺术家部分匹配",
      },
      album: {
        score: Math.round(albumScore * 100),
        weight: 15,
        reason: albumScore === 1 ? "专辑完全匹配" : "专辑部分匹配",
      },
      duration: {
        score: durationScore,
        weight: 15,
        reason: durationReason,
      },
      year: {
        score: yearScore,
        weight: 5,
        reason: yearScore ? "发行年份匹配" : "发行年份未匹配",
      },
    };
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
