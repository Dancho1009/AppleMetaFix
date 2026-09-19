import { parseFile } from "music-metadata";
import { LyricsScanner, LyricsInfo } from "./LyricsScanner";

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
  lyrics?: LyricsInfo;
}

export class MetadataScanner {
  private lyricsScanner = new LyricsScanner();

  async scanFile(filePath: string): Promise<AudioMetadata> {
    const metadata = await parseFile(filePath);
    const common = metadata.common;
    const format = metadata.format;

    const lyrics = await this.lyricsScanner.scan(filePath, metadata);

    return {
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
      cover: common.picture?.[0]
        ? `embedded:${common.picture[0].format}`
        : undefined,
      lyrics,
    };
  }
}
