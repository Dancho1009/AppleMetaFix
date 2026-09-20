export interface DisplayField {
  key: string;
  label: string;
  enabled: boolean;
}

const defaultFields: DisplayField[] = [
  { key: "artwork", label: "封面", enabled: true },
  { key: "title", label: "标题", enabled: true },
  { key: "artist", label: "艺术家", enabled: true },
  { key: "album", label: "专辑", enabled: true },
  { key: "genre", label: "流派", enabled: true },
  { key: "releaseDate", label: "发行日期", enabled: true },
  { key: "durationInMillis", label: "时长", enabled: true },
  { key: "composer", label: "作曲", enabled: true },
  { key: "score", label: "评分", enabled: true },
  { key: "confidence", label: "匹配置信", enabled: true }
];

export function getMatchResultFields(): DisplayField[] {
  return defaultFields.filter(item => item.enabled);
}

export function getMatchResultValue(result: any, key: string): any {
  if (!result) return "-";

  switch (key) {
    case "score":
      return result.score ?? "-";
    case "confidence":
      return result.confidence ?? "-";
    default:
      return result.track?.[key] ?? "-";
  }
}

export function formatDuration(value: number | undefined): string {
  if (!value) return "-";

  const seconds = Math.floor(value / 1000);
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;

  return `${minute}:${second.toString().padStart(2, "0")}`;
}
