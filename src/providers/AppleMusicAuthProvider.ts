import { getMediaUserToken } from "../config/AppConfig";

export type AppleMusicAuthType = "media-user-token" | "authorization-token";

export interface AppleMusicAuthInfo {
  type: AppleMusicAuthType;
  token: string;
}

export class AppleMusicAuthProvider {
  async getAuthorizationToken(): Promise<AppleMusicAuthInfo> {
    const authorizationToken = process.env.APPLE_MUSIC_AUTHORIZATION_TOKEN;

    if (authorizationToken) {
      return {
        type: "authorization-token",
        token: authorizationToken.replace(/^Bearer\s+/i, ""),
      };
    }

    const autoToken = await this.fetchAppleMusicAuthorizationToken();

    if (autoToken) {
      return {
        type: "authorization-token",
        token: autoToken,
      };
    }

    const mediaUserToken =
      process.env.APPLE_MUSIC_MEDIA_USER_TOKEN ?? getMediaUserToken();

    if (mediaUserToken) {
      return {
        type: "media-user-token",
        token: mediaUserToken,
      };
    }

    throw new Error("未找到Apple Music authorization-token");
  }

  private async fetchAppleMusicAuthorizationToken(): Promise<string | null> {
    try {
      const response = await fetch("https://music.apple.com", {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (!response.ok) return null;

      const html = await response.text();
      const scripts = [...html.matchAll(/\/assets\/[^"']+\.js/g)].map(
        (item) => item[0],
      );

      for (const script of scripts) {
        const jsResponse = await fetch(`https://music.apple.com${script}`, {
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
        });

        if (!jsResponse.ok) continue;

        const js = await jsResponse.text();
        const token = js.match(
          /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
        );

        if (token?.[0]) return token[0];
      }
    } catch {
      return null;
    }

    return null;
  }
}
