import { LocalMetadataReader } from "./LocalMetadataReader";
import { MetadataMatchService } from "./MetadataMatchService";
import { AppleMusicCatalogProvider } from "../providers/AppleMusicCatalogProvider";

export class MetadataMatchPipeline {
  private reader = new LocalMetadataReader();
  private matcher = new MetadataMatchService();
  private appleMusic = new AppleMusicCatalogProvider();

  async process(filePath: string) {
    const localTrack = await this.reader.read(filePath);

    console.log("[MATCH] local track", localTrack);

    const candidates = await this.appleMusic.search(
      localTrack.title ?? "",
      localTrack.artist ?? "",
      localTrack.album,
    );

    const safeCandidates = Array.isArray(candidates)
      ? candidates
      : [];

    console.log("[MATCH] candidates", {
      count: safeCandidates.length,
      candidates: safeCandidates.slice(0, 3),
    });

    const match = this.matcher.match(localTrack, safeCandidates);

    return {
      localTrack,
      match,
      candidates: safeCandidates,
    };
  }
}
