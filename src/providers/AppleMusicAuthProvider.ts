export type AppleMusicAuthType = "media-user-token" | "authorization-token";

export interface AppleMusicAuthInfo {
  type: AppleMusicAuthType;
  token: string;
}

export class AppleMusicAuthProvider {
  getAuthorizationToken(): AppleMusicAuthInfo {
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
        token: authorizationToken,
      };
    }

    throw new Error("未找到Apple Music认证信息");
  }
}
