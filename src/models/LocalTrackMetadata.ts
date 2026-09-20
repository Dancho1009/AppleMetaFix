import type { AudioFormat } from '../services/AudioFormatDetector';

export interface LocalTrackMetadata {
  filePath: string;
  format: AudioFormat;
  title?: string;
  artist?: string;
  album?: string;
  durationInMillis?: number;
  bitrate?: number;
  sampleRate?: number;
  existingCover?: Buffer;
}
