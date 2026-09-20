import { LocalMetadataReader } from "./LocalMetadataReader";
import { MetadataMatchService } from "./MetadataMatchService";
import { AppleMusicCatalogProvider } from "../providers/AppleMusicCatalogProvider";

export class MetadataMatchPipeline {
  private reader = new LocalMetadataReader();
  private matcher = new MetadataMatchService();
  private appleMusic = new AppleMusicCatalogProvider();

  async process(filePath: string) {
    const localTrack = await this.reader.read(filePath);

    const candidates = await this.appleMusic.searchTrack(
      localTrack.title ?? "",
      localTrack.artist ?? ""
    );

    return this.matcher.match(localTrack, candidates);
  }
}
