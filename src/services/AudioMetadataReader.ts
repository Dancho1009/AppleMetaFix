import { parseFile } from 'music-metadata';
import { AudioFormatDetector } from './AudioFormatDetector';
import type { LocalTrackMetadata } from '../models/LocalTrackMetadata';

export class AudioMetadataReader {
  async read(filePath: string): Promise<LocalTrackMetadata> {
    const metadata = await parseFile(filePath);
    const common = metadata.common;

    return {
      filePath,
      format: AudioFormatDetector.detect(filePath),
      title: common.title,
      artist: common.artist,
      album: common.album,
      durationInMillis: metadata.format.duration
        ? Math.round(metadata.format.duration * 1000)
        : undefined,
      bitrate: metadata.format.bitrate,
      sampleRate: metadata.format.sampleRate,
      existingCover: common.picture?.[0]
        ? Buffer.from(common.picture[0].data)
        : undefined,
    };
  }
}

/**
 * 兼容命令行测试入口的文件 Metadata 读取方法
 */
export async function parseFileMetadata(
  filePath: string
): Promise<LocalTrackMetadata> {
  const reader = new AudioMetadataReader();
  return reader.read(filePath);
}
