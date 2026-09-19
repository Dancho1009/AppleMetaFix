import { parseFile } from "music-metadata";
import { LyricsScanner } from "./LyricsScanner";
import { MetadataQuality, analyzeMetadataQuality } from "./MetadataQuality";
import { saveCoverToCache } from "./CoverCache";

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
  coverPath?: string;
  lyrics?: any;
  lyricsPath?: string;
  format?: string;
  bitrate?: number;
  sampleRate?: number;
  quality?: MetadataQuality;
}

export class MetadataScanner {
  private lyricsScanner = new LyricsScanner();

  async scanFile(filePath: string): Promise<AudioMetadata> {
    const metadata = await parseFile(filePath);
    const common = metadata.common;
    const format = metadata.format;
    const lyrics = await this.lyricsScanner.scan(filePath, metadata);

    const picture = common.picture?.[0];
    let coverPath: string | undefined;

    if (picture?.data) {
      coverPath = await saveCoverToCache(filePath, picture.data, picture.format);
    }

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
      cover: coverPath ? "cached" : undefined,
      coverPath,
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
