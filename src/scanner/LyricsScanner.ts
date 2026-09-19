import fs from "node:fs/promises";
import path from "node:path";

export type LyricsType = "embedded" | "external" | "none";

export interface LyricsInfo {
  exists: boolean;
  type: LyricsType;
  format?: "LRC" | "USLT" | "SYLT";
  path?: string;
}

export class LyricsScanner {
  async scan(filePath: string, metadata: any): Promise<LyricsInfo> {
    const common = metadata.common || {};

    if (common.lyrics?.length) {
      return {
        exists: true,
        type: "embedded",
        format: "USLT",
      };
    }

    const lrcPath = filePath.replace(/\.[^.]+$/, ".lrc");

    try {
      await fs.access(lrcPath);
      return {
        exists: true,
        type: "external",
        format: "LRC",
        path: lrcPath,
      };
    } catch {
      return {
        exists: false,
        type: "none",
      };
    }
  }
}
