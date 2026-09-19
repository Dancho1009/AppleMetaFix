import fs from "node:fs/promises";
import path from "node:path";

export type LyricsType = "embedded" | "external" | "both" | "none";

export interface LyricsInfo {
  exists: boolean;
  type: LyricsType;
  format?: "LRC" | "USLT" | "SYLT";
  path?: string;
  embedded?: {
    exists: boolean;
    content?: string;
    format?: "USLT" | "SYLT";
  };
  external?: {
    exists: boolean;
    path: string;
    content?: string;
  };
}

export class LyricsScanner {
  async scan(filePath: string, metadata: any): Promise<LyricsInfo> {
    const common = metadata.common || {};

    const embeddedLyrics = common.lyrics?.length
      ? {
          exists: true,
          content: Array.isArray(common.lyrics)
            ? common.lyrics.join("\n")
            : String(common.lyrics),
          format: "USLT" as const,
        }
      : undefined;

    const lrcPath = filePath.replace(/\.[^.]+$/, ".lrc");
    let externalLyrics:
      | {
          exists: boolean;
          path: string;
          content?: string;
        }
      | undefined;

    try {
      await fs.access(lrcPath);
      externalLyrics = {
        exists: true,
        path: lrcPath,
        content: await fs.readFile(lrcPath, "utf-8"),
      };
    } catch {
      externalLyrics = undefined;
    }

    if (!embeddedLyrics && !externalLyrics) {
      return {
        exists: false,
        type: "none",
      };
    }

    if (embeddedLyrics && externalLyrics) {
      return {
        exists: true,
        type: "both",
        embedded: embeddedLyrics,
        external: externalLyrics,
        format: "USLT",
        path: externalLyrics.path,
      };
    }

    if (embeddedLyrics) {
      return {
        exists: true,
        type: "embedded",
        embedded: embeddedLyrics,
        format: "USLT",
      };
    }

    return {
      exists: true,
      type: "external",
      external: externalLyrics,
      format: "LRC",
      path: externalLyrics?.path,
    };
  }
}
