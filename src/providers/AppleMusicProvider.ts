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
    const term = [artist, title, album].filter(Boolean).join(" ");
    const auth = await this.authProvider.getAuthorizationToken();

    if (!this.mediaUserToken) {
      throw new Error("缺少 Apple Music media-user-token");
    }

    const url = new URL(`https://amp-api.music.apple.com/v1/catalog/${this.storefront}/search`);
    url.searchParams.set("term", term);
    url.searchParams.set("types", "songs");
    url.searchParams.set("limit", "10");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Music-User-Token": this.mediaUserToken,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
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

    return data.results?.songs?.data?.map((item) => ({
      id: item.id,
      title: item.attributes.name,
      artist: item.attributes.artistName,
      album: item.attributes.albumName,
      releaseDate: item.attributes.releaseDate,
      isrc: item.attributes.isrc,
      genre: item.attributes.genreNames,
      artwork: item.attributes.artwork?.url,
    })) ?? [];
  }
}
