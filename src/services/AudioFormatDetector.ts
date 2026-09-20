export type AudioFormat =
  | 'mp3'
  | 'flac'
  | 'm4a'
  | 'aac'
  | 'ogg'
  | 'opus'
  | 'wav'
  | 'unknown';

export class AudioFormatDetector {
  static detect(filePath: string): AudioFormat {
    const ext = filePath.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'mp3':
        return 'mp3';
      case 'flac':
        return 'flac';
      case 'm4a':
        return 'm4a';
      case 'aac':
        return 'aac';
      case 'ogg':
        return 'ogg';
      case 'opus':
        return 'opus';
      case 'wav':
        return 'wav';
      default:
        return 'unknown';
    }
  }

  static isSupported(filePath: string): boolean {
    return this.detect(filePath) !== 'unknown';
  }
}
