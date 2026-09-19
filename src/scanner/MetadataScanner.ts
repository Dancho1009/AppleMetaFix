export interface AudioMetadata {
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  year?: number;
  genre?: string;
  isrc?: string;
}

export class MetadataScanner {
  async scanFile(filePath: string): Promise<AudioMetadata> {
    return {
      path: filePath,
    };
  }
}
