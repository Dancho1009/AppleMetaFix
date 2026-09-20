import { parseFile } from "music-metadata";
import { LocalTrack } from "../models/Track";
import { statSync } from "fs";

export class LocalMetadataReader {
  async read(filePath: string): Promise<LocalTrack> {
    const metadata = await parseFile(filePath);
    const common = metadata.common;
    const format = metadata.format;

    return {
      path: filePath,
      title: common.title,
      artist: common.artist,
      album: common.album,
      year: common.year,
      durationInSeconds: format.duration,
      bitrate: format.bitrate,
      sampleRate: format.sampleRate,
      bitDepth: format.bitsPerSample,
      size: statSync(filePath).size,
      format: format.container
    };
  }
}
