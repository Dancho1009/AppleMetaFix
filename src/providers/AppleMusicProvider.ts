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
          artwork?: {
            url?: string;
          };
        };
      }>;
    };
  };
}

export class AppleMusicProvider {
  private storefront: string;
  private developerToken?: string;
  private mediaUserToken?: string;

  constructor(options?: {
    storefront?: string;
    developerToken?: string;
    mediaUserToken?: string;
  }) {
    this.storefront = options?.storefront ?? "us";
    this.developerToken = options?.developerToken ?? process.env.APPLE_MUSIC_DEVELOPER_TOKEN;
    this.mediaUserToken = options?.mediaUserToken ?? process.env.APPLE_MUSIC_MEDIA_USER_TOKEN;
  }

  async searchTrack(
    title: string,
    artist?: string,
    album?: string,
  ): Promise<TrackMetadata[]> {
    const term = [artist, title, album]
      .filter(Boolean)
      .join(" ");

    const url = new URL(
      `https://api.music.apple.com/v1/catalog/${this.storefront}/search`,
    );

    url.searchParams.set("term", term);
    url.searchParams.set("types", "songs");
    url.searchParams.set("limit", "10");

    const headers: Record<string, string> = {};

    if (this.developerToken) {
      headers.Authorization = `Bearer ${this.developerToken}`;
    }

    if (this.mediaUserToken) {
      headers["Music-User-Token"] = this.mediaUserToken;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(
        `Apple Music search failed: ${response.status}`,
      );
    }

    const data = (await response.json()) as AppleMusicSearchResponse;

    return (
      data.results?.songs?.data?.map((item) => ({
        id: item.id,
        title: item.attributes.name,
        artist: item.attributes.artistName,
        album: item.attributes.albumName,
        releaseDate: item.attributes.releaseDate,
        isrc: item.attributes.isrc,
        genre: item.attributes.genreNames,
        artwork: item.attributes.artwork?.url,
      })) ?? []
    );
  }
}
