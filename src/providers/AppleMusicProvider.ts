import { getMediaUserToken, loadConfig } from "../config/AppConfig";
import { LanguageDetector } from "../services/LanguageDetector";
import { AppleMusicAuthProvider } from "./AppleMusicAuthProvider";

export interface TrackMetadata {
  id?: string;
  title?: string;
  artist?: string;
  album?: string;
  releaseDate?: string;
  durationInMillis?: number;
  genre?: string[];
  artwork?: string;
  isrc?: string;
  artistId?: string;
  albumId?: string;
  composer?: string;
  copyright?: string;
  audioLocale?: string;
  hasLyrics?: boolean;
  url?: string;
  raw?: unknown;
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
          artistId?: string;
          albumId?: string;
          releaseDate?: string;
          durationInMillis?: number;
          genreNames?: string[];
          isrc?: string;
          composerName?: string;
          copyright?: string;
          audioLocale?: string;
          hasLyrics?: boolean;
          url?: string;
          artwork?: { url?: string };
          [key: string]: unknown;
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
    const preference = LanguageDetector.detect({ title, artist, album });

    const terms = [
      [title, artist, album],
      [artist, title, album],
      [title],
    ].map((items) => items.filter(Boolean).join(" "));

    for (const storefront of preference.storefronts) {
      for (const term of terms) {
        const results = await this.search(term, storefront);

        console.log("[APPLE] search", {
          storefront,
          language: preference.primary,
          term,
          count: results.length,
          first: results[0],
        });

        if (results.length > 0) {
          return results;
        }
      }
    }

    return [];
  }

  private async search(term: string, storefront = this.storefront): Promise<TrackMetadata[]> {
    const auth = await this.authProvider.getAuthorizationToken();

    if (!this.mediaUserToken) {
      throw new Error("缺少 Apple Music media-user-token");
    }

    const url = new URL(`https://amp-api.music.apple.com/v1/catalog/${storefront}/search`);
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
      return [];
    }

    const data = (await response.json()) as AppleMusicSearchResponse;
    const songs = data.results?.songs?.data;

    if (!Array.isArray(songs)) {
      return [];
    }

    return songs.map((item) => ({
      id: item.id,
      title: item.attributes.name,
      artist: item.attributes.artistName,
      album: item.attributes.albumName,
      releaseDate: item.attributes.releaseDate,
      durationInMillis: item.attributes.durationInMillis,
      isrc: item.attributes.isrc,
      genre: item.attributes.genreNames,
      artwork: item.attributes.artwork?.url,
      artistId: item.attributes.artistId,
      albumId: item.attributes.albumId,
      composer: item.attributes.composerName,
      copyright: item.attributes.copyright,
      audioLocale: item.attributes.audioLocale,
      hasLyrics: item.attributes.hasLyrics,
      url: item.attributes.url,
      raw: item,
    }));
  }
}
