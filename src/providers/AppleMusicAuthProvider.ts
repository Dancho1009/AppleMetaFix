export type AppleMusicAuthType = "media-user-token" | "authorization-token";

export interface AppleMusicAuthInfo {
  type: AppleMusicAuthType;
  token: string;
}

export class AppleMusicAuthProvider {
  async getAuthorizationToken(): Promise<AppleMusicAuthInfo> {
    const mediaUserToken = process.env.APPLE_MUSIC_MEDIA_USER_TOKEN;

    if (mediaUserToken) {
      return {
        type: "media-user-token",
        token: mediaUserToken,
      };
    }

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

    throw new Error("未找到Apple Music认证信息");
  }

  private async fetchAppleMusicAuthorizationToken(): Promise<string | null> {
    const homeResponse = await fetch("https://music.apple.com");
    if (!homeResponse.ok) {
      return null;
    }

    const html = await homeResponse.text();

    const jsMatch = html.match(/\/assets\/index~[^/]+\.js/);
    if (!jsMatch) {
      return null;
    }

    const jsResponse = await fetch(`https://music.apple.com${jsMatch[0]}`);
    if (!jsResponse.ok) {
      return null;
    }

    const js = await jsResponse.text();

    const tokenMatch = js.match(/eyJ[A-Za-z0-9\-_=.]+\.[A-Za-z0-9\-_=.]+\.[A-Za-z0-9\-_=.]+/);

    return tokenMatch?.[0] ?? null;
  }
}
