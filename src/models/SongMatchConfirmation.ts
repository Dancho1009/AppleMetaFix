import type { TrackMetadata } from "../providers/AppleMusicProvider";

export interface SongMatchConfirmation {
  id: number;
  songPath: string;
  track: TrackMetadata;
  score: number;
  confidence: "high" | "medium" | "low";
  confirmed: boolean;
  confirmedAt: number;
}
