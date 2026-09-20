import { parseFile } from "music-metadata";
import { LocalTrack } from "../models/Track";

export class LocalMetadataReader {
  async read(filePath: string): Promise<LocalTrack> {
    const metadata = await parseFile(filePath);
    const common = metadata.common;

    return {
      path: filePath,
      title: common.title,
      artist: common.artist,
      album: common.album,
      year: common.year,
      durationInSeconds: metadata.format.duration
    };
  }
}
