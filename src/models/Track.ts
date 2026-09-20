export interface LocalTrack {
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  durationMs?: number;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  size?: number;
  format?: string;
}

export interface MatchResult {
  localTrack: LocalTrack;
  appleTrack: unknown;
  score: number;
  confidence: "high" | "medium" | "low";
}
