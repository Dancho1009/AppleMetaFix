import {
  AppConfig,
  AppleMusicDisplayFieldKey,
  DEFAULT_APP_CONFIG,
} from "../../config/AppConfig";

export interface DisplayField {
  key: AppleMusicDisplayFieldKey;
  label: string;
}

export const MATCH_RESULT_FIELDS: DisplayField[] = [
  { key: "artwork", label: "封面" },
  { key: "title", label: "标题" },
  { key: "artist", label: "艺术家" },
  { key: "album", label: "专辑" },
  { key: "genre", label: "流派" },
  { key: "releaseDate", label: "发行日期" },
  { key: "durationInMillis", label: "时长" },
  { key: "composer", label: "作曲" },
  { key: "score", label: "评分" },
  { key: "confidence", label: "匹配置信" },
  { key: "url", label: "Apple Music链接" },
  { key: "isrc", label: "ISRC" },
  { key: "copyright", label: "版权" },
  { key: "audioLocale", label: "Audio Locale" },
  { key: "hasLyrics", label: "歌词状态" },
];

export function getMatchResultFields(config?: AppConfig): DisplayField[] {
  const enabled =
    config?.display.appleMusic ?? DEFAULT_APP_CONFIG.display.appleMusic;

  return MATCH_RESULT_FIELDS.filter((field) => enabled[field.key]);
}

export function getMatchResultValue(result: any, key: AppleMusicDisplayFieldKey): any {
  if (!result) return "-";

  let value: any;

  switch (key) {
    case "score":
      value = result.score;
      break;
    case "confidence":
      value = result.confidence;
      break;
    default:
      value = result.track?.[key];
      break;
  }

  if (value === undefined || value === null || value === "") return "-";
  if (Array.isArray(value)) return value.join(" / ");
  if (typeof value === "boolean") return value ? "有" : "无";

  return value;
}

export function formatDuration(value: number | undefined): string {
  if (!value) return "-";

  const seconds = Math.floor(value / 1000);
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;

  return minute + ":" + second.toString().padStart(2, "0");
}
