import { getConfig } from "../config/ConfigService";
import { LanguageDetector } from "../services/LanguageDetector";
import {
  buildAppleMusicSearchTerms,
  buildStorefrontSearchOrder,
  hasExactTitleMatch,
  mergeSearchCandidates,
  prioritizeSearchCandidates,
} from "../services/AppleMusicSearchStrategy";
import { AppleMusicAuthProvider } from "./AppleMusicAuthProvider";

export interface TrackMetadata {
  id?: string;
  storefront?: string;
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

interface AppleMusicProviderOptions {
  storefront?: string;
  developerToken?: string;
  mediaUserToken?: string;
  candidateLimit?: number;
}

function normalizeText(value?: string) {
  return value
    ?.normalize("NFKC")
    .replace(/[.…·]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(25, Math.max(1, Math.round(parsed)));
}

export class AppleMusicProvider {
  private authProvider: AppleMusicAuthProvider;
  private options?: AppleMusicProviderOptions;

  constructor(options?: AppleMusicProviderOptions) {
    this.options = options;
    this.authProvider = new AppleMusicAuthProvider();
  }

  private getRuntimeSettings() {
    const config = getConfig();
    const environmentLimit = process.env.APPLE_MUSIC_CANDIDATE_LIMIT;

    return {
      storefront: (
        this.options?.storefront ??
        process.env.APPLE_MUSIC_STOREFRONT ??
        config.appleMusic.storefront ??
        "auto"
      ).toLowerCase(),
      mediaUserToken:
        this.options?.mediaUserToken ??
        process.env.APPLE_MUSIC_MEDIA_USER_TOKEN ??
        config.appleMusic.mediaUserToken,
      candidateLimit: normalizeLimit(
        this.options?.candidateLimit ??
          environmentLimit ??
          config.appleMusic.candidateLimit,
      ),
    };
  }

  async searchTrack(
    title: string,
    artist?: string,
    album?: string,
  ): Promise<TrackMetadata[]> {
    const preference = LanguageDetector.detect({ title, artist, album });
    const settings = this.getRuntimeSettings();
    const terms = buildAppleMusicSearchTerms(title, artist, album);
    const storefronts = buildStorefrontSearchOrder(
      settings.storefront,
      preference.storefronts,
    );

    let candidates: TrackMetadata[] = [];

    for (const storefront of storefronts) {
      let storefrontCandidates: TrackMetadata[] = [];

      for (const term of terms) {
        const results = await this.search(
          term,
          storefront,
          settings.mediaUserToken,
          settings.candidateLimit,
        );

        console.log("[APPLE] search", {
          storefront,
          language: preference.primary,
          term,
          limit: settings.candidateLimit,
          count: results.length,
          exactTitle: hasExactTitleMatch(title, results),
          first: results[0],
        });

        storefrontCandidates = mergeSearchCandidates(
          storefrontCandidates,
          results,
        );
        candidates = mergeSearchCandidates(candidates, results);

        if (hasExactTitleMatch(title, storefrontCandidates)) {
          break;
        }
      }

      if (hasExactTitleMatch(title, storefrontCandidates)) {
        break;
      }
    }

    return prioritizeSearchCandidates(title, candidates).slice(
      0,
      settings.candidateLimit,
    );
  }

  private async search(
    term: string,
    storefront: string,
    mediaUserToken: string | undefined,
    candidateLimit: number,
  ): Promise<TrackMetadata[]> {
    const auth = await this.authProvider.getAuthorizationToken();

    if (!mediaUserToken) {
      throw new Error("缺少 Apple Music media-user-token");
    }

    const url = new URL(
      "https://amp-api.music.apple.com/v1/catalog/" +
        storefront +
        "/search",
    );
    url.searchParams.set("term", normalizeText(term) ?? "");
    url.searchParams.set("types", "songs");
    url.searchParams.set("limit", String(candidateLimit));

    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + auth.token,
        "Music-User-Token": mediaUserToken,
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
      storefront,
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
