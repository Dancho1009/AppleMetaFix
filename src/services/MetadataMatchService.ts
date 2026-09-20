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
  duration: MatchScoreDetail;
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
      const details = this.scoreDetails(local, track);
      const score = Math.round(
        Object.values(details)
          .filter((item) => item.weight > 0)
          .reduce((sum, item) => sum + item.score * item.weight, 0) / 100
      );

      return {
        track,
        score,
        scoreDetails: details,
      };
    }).sort((a, b) => b.score - a.score);

    const result = results[0];

    return {
      ...result,
      confidence: this.getConfidence(result.score, result.scoreDetails),
    };
  }

  private scoreDetails(local: LocalTrackInfo, track: TrackMetadata): MatchScoreDetails {
    const details: MatchScoreDetails = {
      title: {
        score: this.titleScore(local.title, track.title),
        weight: 50,
        reason: "标题匹配度",
      },
      artist: {
        score: this.artistScore(local.artist, track.artist),
        weight: 30,
        reason: "艺术家匹配度",
      },
      album: {
        score: this.albumScore(local.album, track.album),
        weight: 15,
        reason: "专辑匹配度",
      },
      duration: {
        score: this.durationScore(local.duration, track.durationInMillis),
        weight: 5,
        reason: "时长匹配度",
      },
    };

    if (local.audioLocale && track.audioLocale) {
      details.audioLocale = {
        score: local.audioLocale === track.audioLocale ? 100 : 0,
        weight: 0,
        reason: local.audioLocale === track.audioLocale ? "音频语言一致" : "音频语言不同",
      };
    }

    return details;
  }

  private titleScore(a: string, b?: string): number {
    return this.textScore(a, b, 95);
  }

  private artistScore(a?: string, b?: string): number {
    if (!a || !b) return 0;

    const left = this.normalize(a);
    const right = this.normalize(b);

    if (left === right) return 100;
    if (right.includes(left) || left.includes(right)) return 90;

    const leftParts = left.split(/[&,\/]/).filter(Boolean);
    if (leftParts.some((part) => right.includes(part))) return 80;

    return this.similarity(left, right) * 100;
  }

  private albumScore(a?: string, b?: string): number {
    return this.textScore(a ?? "", b, 90);
  }

  private durationScore(local?: number, remote?: number): number {
    if (!local || !remote) return 0;

    const diff = Math.abs(local - remote / 1000);

    if (diff <= 2) return 100;
    if (diff <= 5) return 90;
    if (diff <= 10) return 70;
    if (diff <= 30) return 30;
    return 0;
  }

  private textScore(a: string, b?: string, containsScore = 85): number {
    if (!a || !b) return 0;

    const left = this.normalize(a);
    const right = this.normalize(b);

    if (left === right) return 100;
    if (left.includes(right) || right.includes(left)) return containsScore;

    return Math.round(this.similarity(left, right) * 100);
  }

  private similarity(a: string, b: string): number {
    if (!a || !b) return 0;
    let same = 0;
    const length = Math.max(a.length, b.length);

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) same++;
    }

    return same / length;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/【.*?】/g, "")
      .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g, "");
  }

  private getConfidence(score: number, details: MatchScoreDetails): "high" | "medium" | "low" {
    if (details.title.score >= 90 && details.artist.score >= 80 && score >= 85) {
      return "high";
    }

    if (score >= 70) return "medium";

    return "low";
  }
}
