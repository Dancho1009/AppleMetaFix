export class AppleMusicDeveloperAuthProvider {
  private developerToken?: string;

  constructor(token?: string) {
    this.developerToken = token ?? process.env.APPLE_MUSIC_DEVELOPER_TOKEN;
  }

  getAuthorizationHeader(): Record<string, string> {
    if (!this.developerToken) {
      throw new Error(
        "缺少 APPLE_MUSIC_DEVELOPER_TOKEN，Catalog API需要Apple Music Developer Token"
      );
    }

    return {
      Authorization: `Bearer ${this.developerToken}`,
    };
  }
}
