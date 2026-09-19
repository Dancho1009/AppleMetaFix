export interface TrackMetadata {
  id?: string;
  title?: string;
  artist?: string;
  album?: string;
  releaseDate?: string;
  artwork?: string;
  isrc?: string;
  genre?: string[];
}

export class AppleMusicProvider {
  async searchTrack(
    title: string,
    artist?: string,
    album?: string,
  ): Promise<TrackMetadata[]> {
    // TODO: 接入 Apple Music Search API
    return [];
  }
}
