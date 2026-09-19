import { parseFile } from "music-metadata";
import { LyricsScanner, LyricsInfo } from "./LyricsScanner";
import { MetadataQuality, analyzeMetadataQuality } from "./MetadataQuality";

export interface AudioMetadata {
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  composer?: string;
  duration?: number;
  year?: number;
  genre?: string;
  isrc?: string;
  cover?: string;
  coverDataUrl?: string;
  lyrics?: LyricsInfo;
  lyricsPath?: string;
  format?: string;
  bitrate?: number;
  sampleRate?: number;
  quality?: MetadataQuality;
}

function buildCoverDataUrl(picture?: { format?: string; data: Buffer }) {
  if (!picture?.data) return undefined;

  const format = (picture.format || "").toLowerCase();
  const mime = format.includes("png") ? "image/png" : "image/jpeg";

  return `data:${mime};base64,${picture.data.toString("base64")}`;
}

export class MetadataScanner {
  private lyricsScanner = new LyricsScanner();

  async scanFile(filePath: string): Promise<AudioMetadata> {
    const metadata = await parseFile(filePath);
    const common = metadata.common;
    const format = metadata.format;

    const lyrics = await this.lyricsScanner.scan(filePath, metadata);

    const picture = common.picture?.[0];
    const coverDataUrl = buildCoverDataUrl(picture);

    console.log("[Cover Debug]", {
      file: filePath,
      exists: !!picture,
      mime: picture?.format,
      bytes: picture?.data?.length ?? 0,
      base64Length: coverDataUrl?.length ?? 0,
      preview: coverDataUrl?.slice(0, 40),
    });

    const result: AudioMetadata = {
      path: filePath,
      title: common.title,
      artist: common.artist,
      album: common.album,
      albumArtist: common.albumartist,
      composer: common.composer?.[0],
      duration: format.duration,
      year: common.year,
      genre: common.genre?.[0],
      isrc: common.isrc?.[0],
      cover: picture ? `embedded:${picture.format}` : undefined,
      coverDataUrl,
      lyrics,
      lyricsPath: lyrics.path,
      format: format.container,
      bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : undefined,
      sampleRate: format.sampleRate,
    };

    result.quality = analyzeMetadataQuality(result);

    return result;
  }
}
