import type { MatchResult } from "./MetadataMatchService";
import type { SongMatchConfirmation } from "../models/SongMatchConfirmation";
import {
  getConfirmedSongMatch,
  saveSongMatchConfirmation,
} from "../database/songMatchRepository";

export class SongMatchConfirmationService {
  get(filePath: string): SongMatchConfirmation | null {
    if (!filePath) return null;
    return getConfirmedSongMatch(filePath);
  }

  confirm(
    filePath: string,
    match: MatchResult,
  ): SongMatchConfirmation {
    if (!filePath) {
      throw new Error("缺少本地歌曲路径");
    }

    if (!match?.track?.id) {
      throw new Error("缺少 Apple Music 曲目ID，无法确认匹配");
    }

    return saveSongMatchConfirmation(
      filePath,
      match.track,
      match.score,
      match.confidence,
    );
  }
}

export const songMatchConfirmationService =
  new SongMatchConfirmationService();
