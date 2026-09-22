import { TrackMetadata } from "../providers/AppleMusicProvider";

export interface LocalTrackInfo {
 title?: string;
 artist?: string;
 album?: string;
 year?: number;
 durationMs?: number;
 audioLocale?: string;
}

export interface MatchScoreDetail {
 score: number;
 weight: number;
 reason: string;
 available: boolean;
 conflict?: boolean;
}

export interface MatchScoreDetails {
 title: MatchScoreDetail;
 artist: MatchScoreDetail;
 album: MatchScoreDetail;
 duration: MatchScoreDetail;
 evidenceCount: number;
 conflictPenalty: number;
}

export interface MatchResult {
 track: TrackMetadata;
 score: number;
 confidence: "high" | "medium" | "low";
 scoreDetails: MatchScoreDetails;
}

const WEIGHTS = {
 title: 50,
 artist: 30,
 album: 15,
 duration: 5,
};

export class MetadataMatchService {
 match(local: LocalTrackInfo, candidates?: TrackMetadata[] | null): MatchResult | null {
  if (!candidates?.length) return null;

  const results = candidates
   .map((track) => {
    const scoreDetails = this.scoreDetails(local, track);
    const score = this.calculateScore(scoreDetails);

    return { track, score, scoreDetails };
   })
   .sort((a, b) => b.score - a.score);

  const result = results[0];

  return {
   ...result,
   confidence: this.getConfidence(result.score, result.scoreDetails),
  };
 }

 private calculateScore(details: MatchScoreDetails): number {
  const fields = [details.title, details.artist, details.album, details.duration];
  const availableWeight = fields
   .filter((field) => field.available)
   .reduce((sum, field) => sum + field.weight, 0);

  if (availableWeight === 0) return 0;

  const rawScore = fields
   .filter((field) => field.available)
   .reduce((sum, field) => sum + field.score * field.weight, 0) / availableWeight;

  const evidenceCap = this.getEvidenceCap(details);

  return Math.max(
   0,
   Math.min(100, Math.round(rawScore - details.conflictPenalty), evidenceCap),
  );
 }

 private getEvidenceCap(details: MatchScoreDetails): number {
  const names = [
   details.title,
   details.artist,
   details.album,
   details.duration,
  ].filter((field) => field.available);

  const hasTitle = details.title.available;
  const hasArtist = details.artist.available;
  const hasDuration = details.duration.available;
  const hasAlbum = details.album.available;

  if (hasTitle && hasArtist && hasDuration) return 100;
  if (hasTitle && hasArtist && hasAlbum) return 97;
  if (hasTitle && hasArtist) return 92;
  if (hasTitle && hasAlbum) return 85;
  if (names.length >= 2) return 80;
  if (hasTitle) return 65;

  return 50;
 }

 private scoreDetails(local: LocalTrackInfo, track: TrackMetadata): MatchScoreDetails {
  const title = this.textField(local.title, track.title, WEIGHTS.title, "标题匹配度");
  const artist = this.artistField(local.artist, track.artist);
  const album = this.textField(local.album, track.album, WEIGHTS.album, "专辑匹配度");
  const duration = this.durationField(local.durationMs, track.durationInMillis);

  let conflictPenalty = 0;

  if (artist.conflict) conflictPenalty += 25;
  if (duration.conflict) conflictPenalty += 20;
  if (title.conflict) conflictPenalty += 50;

  return {
   title,
   artist,
   album,
   duration,
   evidenceCount: [title, artist, album, duration].filter((v) => v.available).length,
   conflictPenalty,
  };
 }

 private textField(local: string | undefined, remote: string | undefined, weight: number, reason: string): MatchScoreDetail {
  if (!local || !remote) {
   return { score: 0, weight, reason: `${reason}(缺失)`, available: false };
  }

  const score = this.textScore(local, remote);

  return {
   score,
   weight,
   reason,
   available: true,
   conflict: score < 50,
  };
 }

 private artistField(local?: string, remote?: string): MatchScoreDetail {
  if (!local || !remote) {
   return { score: 0, weight: WEIGHTS.artist, reason: "艺术家匹配度(缺失)", available: false };
  }

  const score = this.artistScore(local, remote);

  return {
   score,
   weight: WEIGHTS.artist,
   reason: "艺术家匹配度",
   available: true,
   conflict: score < 40,
  };
 }

 private durationField(localMs?: number, remoteMs?: number): MatchScoreDetail {
  if (!localMs || !remoteMs) {
   return { score: 0, weight: WEIGHTS.duration, reason: "时长匹配度(缺失)", available: false };
  }

  const diff = Math.abs(localMs - remoteMs) / 1000;

  if (diff <= 2) return { score: 100, weight: WEIGHTS.duration, reason: "时长一致", available: true };
  if (diff <= 5) return { score: 90, weight: WEIGHTS.duration, reason: "时长接近", available: true };
  if (diff <= 10) return { score: 70, weight: WEIGHTS.duration, reason: "时长轻微差异", available: true };
  if (diff <= 30) return { score: 30, weight: WEIGHTS.duration, reason: "时长明显差异", available: true };

  return {
   score: 0,
   weight: WEIGHTS.duration,
   reason: "时长冲突",
   available: true,
   conflict: true,
  };
 }

 private artistScore(a: string, b: string) {
  const left = this.normalizeArtist(a);
  const right = this.normalizeArtist(b);

  if (left === right) return 100;
  if (right.includes(left) || left.includes(right)) return 90;

  return Math.round(this.similarity(left, right) * 100);
 }

 private textScore(a: string, b: string) {
  const x = this.normalize(a);
  const y = this.normalize(b);

  if (x === y) return 100;
  if (x.includes(y) || y.includes(x)) return 85;

  return Math.round(this.similarity(x, y) * 100);
 }

 private normalizeArtist(v: string) {
  return v.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g, "");
 }

 private normalize(v: string) {
  return v.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g, "");
 }

 private similarity(a: string, b: string) {
  let same = 0;
  const len = Math.max(a.length, b.length);

  for (let i = 0; i < Math.min(a.length, b.length); i++) {
   if (a[i] === b[i]) same++;
  }

  return len ? same / len : 0;
 }

 private getConfidence(score: number, details: MatchScoreDetails): "high" | "medium" | "low" {
  if (
   score >= 85 &&
   details.title.score >= 90 &&
   (!details.artist.available || details.artist.score >= 70) &&
   details.conflictPenalty === 0 &&
   details.evidenceCount >= 2
  ) {
   return "high";
  }

  if (score >= 70) return "medium";

  return "low";
 }
}
