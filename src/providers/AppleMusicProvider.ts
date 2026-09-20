import { getMediaUserToken, loadConfig } from "../config/AppConfig";
import { AppleMusicAuthProvider } from "./AppleMusicAuthProvider";

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

interface AppleMusicSearchResponse {
  results?: {
    songs?: {
      data?: Array<{
        id: string;
        attributes: {
          name?: string;
          artistName?: string;
          albumName?: string;
          releaseDate?: string;
          genreNames?: string[];
          isrc?: string;
          artwork?: { url?: string };
        };
      }>;
    };
  };
}

function normalizeText(value?: string) {
  return value
    ?.normalize("NFKC")
    .replace(/[.…·]/g, "")
    .toLowerCase()
    .trim();
}

export class AppleMusicProvider {
  private storefront: string;
  private authProvider: AppleMusicAuthProvider;
  private mediaUserToken?: string;

  constructor(options?: { storefront?: string; mediaUserToken?: string }) {
    const config = loadConfig();
    this.storefront =
      options?.storefront ??
      process.env.APPLE_MUSIC_STOREFRONT ??
      config.appleMusic?.storefront ??
      "us";
    this.mediaUserToken =
      options?.mediaUserToken ??
      process.env.APPLE_MUSIC_MEDIA_USER_TOKEN ??
      getMediaUserToken();
    this.authProvider = new AppleMusicAuthProvider();
  }

  async searchTrack(title: string, artist?: string, album?: string): Promise<TrackMetadata[]> {
    const terms = [
      [title, artist, album],
      [artist, title, album],
      [title],
    ].map((items) => items.filter(Boolean).join(" "));

    for (const term of terms) {
      const results = await this.search(term);

      console.log("[APPLE] search", {
        term,
        count: results.length,
        first: results[0],
      });

      if (results.length > 0) {
        return results;
      }
    }

    return [];
  }

  private async search(term: string): Promise<TrackMetadata[]> {
    const auth = await this.authProvider.getAuthorizationToken();

    if (!this.mediaUserToken) {
      throw new Error("缺少 Apple Music media-user-token");
    }

    const url = new URL(`https://amp-api.music.apple.com/v1/catalog/${this.storefront}/search`);
    url.searchParams.set("term", normalizeText(term) ?? "");
    url.searchParams.set("types", "songs");
    url.searchParams.set("limit", "10");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Music-User-Token": this.mediaUserToken,
        "User-Agent": "Mozilla/5.0",
        Origin: "https://music.apple.com",
        Referer: "https://music.apple.com/",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Apple Music search failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as AppleMusicSearchResponse;
    const songs = data.results?.songs?.data;

    if (!Array.isArray(songs)) {
      console.log("[APPLE] invalid response", data);
      return [];
    }

    return songs.map((item) => ({
      id: item.id,
      title: item.attributes.name,
      artist: item.attributes.artistName,
      album: item.attributes.albumName,
      releaseDate: item.attributes.releaseDate,
      isrc: item.attributes.isrc,
      genre: item.attributes.genreNames,
      artwork: item.attributes.artwork?.url,
    }));
  }
}
