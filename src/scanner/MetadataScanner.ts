import { parseFile } from "music-metadata";

export interface AudioMetadata {
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  year?: number;
  genre?: string;
  isrc?: string;
  cover?: string;
}

export class MetadataScanner {
  async scanFile(filePath: string): Promise<AudioMetadata> {
    const metadata = await parseFile(filePath);
    const common = metadata.common;
    const format = metadata.format;

    return {
      path: filePath,
      title: common.title,
      artist: common.artist,
      album: common.album,
      duration: format.duration,
      year: common.year,
      genre: common.genre?.[0],
      isrc: common.isrc?.[0],
      cover: common.picture?.[0]
        ? `embedded:${common.picture[0].format}`
        : undefined,
    };
  }
}
