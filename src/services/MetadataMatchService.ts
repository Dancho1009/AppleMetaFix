import { TrackMetadata } from "../providers/AppleMusicProvider";
import { TrackIdentityAnalyzer, TrackIdentityResult } from "./TrackIdentityAnalyzer";
import { MatchIdentityPolicy } from "./MatchIdentityPolicy";

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

export interface MatchIdentityInfo extends TrackIdentityResult {
 level: "none" | "warning" | "danger";
 penalty: number;
}

export interface MatchResult {
 track: TrackMetadata;
 score: number;
 confidence: "high" | "medium" | "low";
 scoreDetails: MatchScoreDetails;
 identity: MatchIdentityInfo;
}

const WEIGHTS = {
 title: 50,
 artist: 30,
 album: 15,
 duration: 5,
};

export class MetadataMatchService {
 private identityAnalyzer = new TrackIdentityAnalyzer();
 private identityPolicy = new MatchIdentityPolicy();

 rank(local: LocalTrackInfo, candidates?: TrackMetadata[] | null): MatchResult[] {
  if (!candidates?.length) return [];

  return candidates
   .map((track) => {
    const scoreDetails = this.scoreDetails(local, track);
    const identity = this.identityScore(local, track);
    const score = this.calculateScore(scoreDetails, identity.penalty);

    return {
     track,
     score,
     scoreDetails,
     identity,
     confidence: this.getConfidence(score, scoreDetails, identity),
    };
   })
   .sort((a, b) => b.score - a.score);
 }

 match(local: LocalTrackInfo, candidates?: TrackMetadata[] | null): MatchResult | null {
  return this.rank(local, candidates)[0] ?? null;
 }

 private identityScore(local: LocalTrackInfo, track: TrackMetadata): MatchIdentityInfo {
  const result = this.identityAnalyzer.analyze(local.artist, track.artist);
  const policy = this.identityPolicy.evaluate(result);

  return {
   ...result,
   level: policy.level,
   penalty: policy.penalty,
  };
 }

 private calculateScore(details: MatchScoreDetails, identityPenalty = 0): number {
  const fields = [details.title, details.artist, details.album, details.duration];
  const availableWeight = fields.filter((field) => field.available)
   .reduce((sum, field) => sum + field.weight, 0);

  if (!availableWeight) return 0;

  const rawScore = fields.filter((field) => field.available)
   .reduce((sum, field) => sum + field.score * field.weight, 0) / availableWeight;

  return Math.max(0, Math.min(100,
   Math.round(rawScore - details.conflictPenalty - identityPenalty),
   this.getEvidenceCap(details)));
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

 private getEvidenceCap(details: MatchScoreDetails): number {
  if (details.title.available && details.artist.available && details.duration.available) return 100;
  if (details.title.available && details.artist.available && details.album.available) return 97;
  if (details.title.available && details.artist.available) return 92;
  if (details.title.available) return 65;
  return 50;
 }

 private textField(local: string | undefined, remote: string | undefined, weight: number, reason: string): MatchScoreDetail {
  if (!local || !remote) return { score: 0, weight, reason: `${reason}(缺失)`, available: false };
  const score = this.textScore(local, remote);
  return { score, weight, reason, available: true, conflict: score < 50 };
 }

 private artistField(local?: string, remote?: string): MatchScoreDetail {
  if (!local || !remote) return { score: 0, weight: WEIGHTS.artist, reason: "艺术家匹配度(缺失)", available: false };
  const score = this.artistScore(local, remote);
  return { score, weight: WEIGHTS.artist, reason: "艺术家匹配度", available: true, conflict: score < 40 };
 }

 private durationField(local?: number, remote?: number): MatchScoreDetail {
  if (!local || !remote) return { score: 0, weight: WEIGHTS.duration, reason: "时长匹配度(缺失)", available: false };
  const diff = Math.abs(local - remote) / 1000;
  if (diff <= 2) return { score: 100, weight: WEIGHTS.duration, reason: "时长一致", available: true };
  if (diff <= 5) return { score: 90, weight: WEIGHTS.duration, reason: "时长接近", available: true };
  return { score: 0, weight: WEIGHTS.duration, reason: "时长冲突", available: true, conflict: true };
 }

 private artistScore(a: string, b: string) {
  const left = this.normalize(a);
  const right = this.normalize(b);
  if (left === right) return 100;
  if (right.includes(left) || left.includes(right)) return 90;
  return Math.round(this.similarity(left, right) * 100);
 }

 private textScore(a: string, b: string) {
  const left = this.normalize(a);
  const right = this.normalize(b);
  if (left === right) return 100;
  if (left.includes(right) || right.includes(left)) return 85;
  return Math.round(this.similarity(left, right) * 100);
 }

 private normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g, "");
 }

 private similarity(a: string, b: string) {
  let same = 0;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) same++;
  return len ? same / len : 0;
 }

 private getConfidence(score: number, details: MatchScoreDetails, identity: MatchIdentityInfo): "high" | "medium" | "low" {
  if (identity.level === "danger") return "low";
  if (identity.level === "warning") return score >= 70 ? "medium" : "low";
  if (score >= 85 && details.conflictPenalty === 0 && details.evidenceCount >= 2) return "high";
  if (score >= 70) return "medium";
  return "low";
 }
}
