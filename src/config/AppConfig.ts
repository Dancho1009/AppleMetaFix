export const APPLE_MUSIC_DISPLAY_FIELD_KEYS = [
  "artwork",
  "title",
  "artist",
  "album",
  "genre",
  "releaseDate",
  "durationInMillis",
  "composer",
  "score",
  "confidence",
  "url",
  "isrc",
  "copyright",
  "audioLocale",
  "hasLyrics",
] as const;

export type AppleMusicDisplayFieldKey =
  (typeof APPLE_MUSIC_DISPLAY_FIELD_KEYS)[number];

export interface AppConfig {
  appleMusic: {
    mediaUserToken: string;
    storefront: string;
    candidateLimit: number;
  };
  cache: {
    retentionDays: number;
  };
  display: {
    appleMusic: Record<AppleMusicDisplayFieldKey, boolean>;
  };
}

export type AppConfigPatch = {
  appleMusic?: Partial<AppConfig["appleMusic"]>;
  cache?: Partial<AppConfig["cache"]>;
  display?: {
    appleMusic?: Partial<AppConfig["display"]["appleMusic"]>;
  };
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  appleMusic: {
    mediaUserToken: "",
    storefront: "auto",
    candidateLimit: 10,
  },
  cache: {
    retentionDays: 30,
  },
  display: {
    appleMusic: {
      artwork: true,
      title: true,
      artist: true,
      album: true,
      genre: true,
      releaseDate: true,
      durationInMillis: true,
      composer: true,
      score: true,
      confidence: true,
      url: false,
      isrc: false,
      copyright: false,
      audioLocale: false,
      hasLyrics: false,
    },
  },
};

function normalizeCandidateLimit(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_APP_CONFIG.appleMusic.candidateLimit;
  }

  return Math.min(25, Math.max(1, Math.round(parsed)));
}

function normalizeRetentionDays(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_APP_CONFIG.cache.retentionDays;
  }

  return Math.min(3650, Math.max(1, Math.round(parsed)));
}

export function normalizeAppConfig(input?: AppConfigPatch | null): AppConfig {
  const storefront =
    String(input?.appleMusic?.storefront ?? DEFAULT_APP_CONFIG.appleMusic.storefront)
      .trim()
      .toLowerCase() || DEFAULT_APP_CONFIG.appleMusic.storefront;

  return {
    appleMusic: {
      mediaUserToken: String(
        input?.appleMusic?.mediaUserToken ??
          DEFAULT_APP_CONFIG.appleMusic.mediaUserToken,
      ).trim(),
      storefront,
      candidateLimit: normalizeCandidateLimit(
        input?.appleMusic?.candidateLimit ??
          DEFAULT_APP_CONFIG.appleMusic.candidateLimit,
      ),
    },
    cache: {
      retentionDays: normalizeRetentionDays(
        input?.cache?.retentionDays ?? DEFAULT_APP_CONFIG.cache.retentionDays,
      ),
    },
    display: {
      appleMusic: {
        ...DEFAULT_APP_CONFIG.display.appleMusic,
        ...(input?.display?.appleMusic ?? {}),
      },
    },
  };
}
