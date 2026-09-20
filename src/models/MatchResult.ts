export type MatchStatus =
  | "pending"
  | "matching"
  | "matched"
  | "multiple"
  | "failed";

export interface MatchResult {
  status: MatchStatus;
  score?: number;
  confidence?: "high" | "medium" | "low";
  appleMusicId?: string;
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  releaseDate?: string;
}
