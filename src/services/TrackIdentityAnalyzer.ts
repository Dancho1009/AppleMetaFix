export type ArtistMatchType =
  | "exact"
  | "performer"
  | "group"
  | "conflict";

export type TrackIdentity =
  | "same_recording"
  | "possible_version"
  | "different_recording";

export interface TrackIdentityResult {
  artistMatch: ArtistMatchType;
  identity: TrackIdentity;
  versionRisk: number;
  reasons: string[];
}

export class TrackIdentityAnalyzer {
  analyze(localArtist?: string, remoteArtist?: string): TrackIdentityResult {
    if (!localArtist || !remoteArtist) {
      return {
        artistMatch: "conflict",
        identity: "possible_version",
        versionRisk: 20,
        reasons: ["缺少艺术家信息，无法确认录音身份"],
      };
    }

    const local = this.normalize(localArtist);
    const remote = this.normalize(remoteArtist);

    if (local === remote) {
      return {
        artistMatch: "exact",
        identity: "same_recording",
        versionRisk: 0,
        reasons: ["艺术家完全一致"],
      };
    }

    if (remote.includes(local) || this.extractPerformer(remoteArtist).includes(localArtist)) {
      return {
        artistMatch: "performer",
        identity: "possible_version",
        versionRisk: 40,
        reasons: ["Apple Music艺术家包含本地演唱者，但可能为角色/多人版本"],
      };
    }

    const hasMultipleArtist = /,|&|feat\.|with|、/.test(remoteArtist.toLowerCase());

    if (hasMultipleArtist) {
      return {
        artistMatch: "group",
        identity: "possible_version",
        versionRisk: 50,
        reasons: ["检测到多人演唱或组合艺术家"],
      };
    }

    return {
      artistMatch: "conflict",
      identity: "different_recording",
      versionRisk: 80,
      reasons: ["艺术家不一致"],
    };
  }

  private extractPerformer(value: string): string {
    const matches = value.match(/CV:\s*([^,)]+)/i);
    return this.normalize(matches?.[1] ?? "");
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g, "");
  }
}
