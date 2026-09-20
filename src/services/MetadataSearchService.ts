import { AppleMusicCatalogProvider } from "../providers/AppleMusicCatalogProvider";
import { MetadataMatchService, LocalTrackInfo } from "./MetadataMatchService";
import { TrackMetadata } from "../providers/AppleMusicProvider";

export interface MetadataSearchResult {
  candidates: TrackMetadata[];
  match: ReturnType<MetadataMatchService["match"]>;
}

export class MetadataSearchService {
  private catalog = new AppleMusicCatalogProvider();
  private matcher = new MetadataMatchService();

  async search(local: LocalTrackInfo): Promise<MetadataSearchResult> {
    const candidates = await this.catalog.search(
      local.title,
      local.artist,
      local.album,
    );

    return {
      candidates,
      match: this.matcher.match(local, candidates),
    };
  }

  async searchByName(title: string, artist?: string, album?: string) {
    return this.search({ title, artist, album });
  }
}
