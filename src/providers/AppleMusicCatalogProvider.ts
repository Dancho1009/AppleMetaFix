import { AppleMusicProvider, TrackMetadata } from "./AppleMusicProvider";

export class AppleMusicCatalogProvider {
  private provider: AppleMusicProvider;

  constructor(options?: {
    storefront?: string;
    developerToken?: string;
    mediaUserToken?: string;
    candidateLimit?: number;
  }) {
    this.provider = new AppleMusicProvider(options);
  }

  async search(
    title: string,
    artist?: string,
    album?: string,
  ): Promise<TrackMetadata[]> {
    return this.provider.searchTrack(title, artist, album);
  }

  async searchTrack(
    title: string,
    artist?: string,
    album?: string,
  ): Promise<TrackMetadata | null> {
    const results = await this.search(title, artist, album);
    return results[0] ?? null;
  }
}
