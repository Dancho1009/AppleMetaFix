export interface LocalTrack {
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  durationInSeconds?: number;
}

export interface MatchResult {
  localTrack: LocalTrack;
  appleTrack: unknown;
  score: number;
  confidence: "high" | "medium" | "low";
}
