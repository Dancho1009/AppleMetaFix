export type MusicLanguage = "ja" | "zh" | "ko" | "en" | "unknown";

export interface LanguagePreference {
  primary: MusicLanguage;
  storefronts: string[];
  locales: string[];
}

function hasJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9faf]/.test(text);
}

function hasKorean(text: string): boolean {
  return /[\uac00-\ud7af]/.test(text);
}

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9faf]/.test(text);
}

function hasLatin(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

export class LanguageDetector {
  static detect(input: {
    title?: string;
    artist?: string;
    album?: string;
    path?: string;
  }): LanguagePreference {
    const text = [input.title, input.artist, input.album, input.path]
      .filter(Boolean)
      .join(" ");

    if (hasJapanese(text)) {
      return {
        primary: "ja",
        storefronts: ["jp", "cn", "us"],
        locales: ["ja-JP", "zh-CN", "en-US"],
      };
    }

    if (hasKorean(text)) {
      return {
        primary: "ko",
        storefronts: ["kr", "us", "jp"],
        locales: ["ko-KR", "en-US", "ja-JP"],
      };
    }

    if (hasChinese(text)) {
      return {
        primary: "zh",
        storefronts: ["cn", "tw", "us"],
        locales: ["zh-CN", "zh-TW", "en-US"],
      };
    }

    if (hasLatin(text)) {
      return {
        primary: "en",
        storefronts: ["us", "gb", "jp"],
        locales: ["en-US", "en-GB", "ja-JP"],
      };
    }

    return {
      primary: "unknown",
      storefronts: ["us"],
      locales: ["en-US"],
    };
  }
}
