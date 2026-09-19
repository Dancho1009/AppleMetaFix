import { AudioMetadata } from "./MetadataScanner";

export interface MetadataQuality {
  score: number;
  missing: string[];
}

export function analyzeMetadataQuality(metadata: AudioMetadata): MetadataQuality {
  const missing: string[] = [];

  if (!metadata.title) missing.push("标题");
  if (!metadata.artist) missing.push("艺术家");
  if (!metadata.album) missing.push("专辑");
  if (!metadata.albumArtist) missing.push("专辑艺术家");
  if (!metadata.composer) missing.push("作曲");
  if (!metadata.cover) missing.push("封面");
  if (!metadata.lyrics?.exists) missing.push("歌词");

  const total = 7;
  const score = Math.round(((total - missing.length) / total) * 100);

  return {
    score,
    missing,
  };
}
