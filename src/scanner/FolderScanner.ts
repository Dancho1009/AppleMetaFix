import fs from "fs/promises";
import path from "path";
import { MetadataScanner, AudioMetadata } from "./MetadataScanner";
import { upsertSong } from "../database/songRepository";

const AUDIO_EXTENSIONS = new Set([
  ".flac",
  ".mp3",
  ".m4a",
  ".aac",
  ".wav",
  ".ogg",
  ".opus",
]);

export class FolderScanner {
  private metadataScanner = new MetadataScanner();

  async scanFolder(folderPath: string): Promise<AudioMetadata[]> {
    const files = await this.collectAudioFiles(folderPath);
    const results: AudioMetadata[] = [];

    for (const file of files) {
      const metadata = await this.metadataScanner.scanFile(file);
      results.push(metadata);

      upsertSong({
        path: metadata.path,
        filename: path.basename(metadata.path),
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        album_artist: metadata.albumArtist,
        composer: metadata.composer,
        genre: metadata.genre,
        year: metadata.year,
        duration: metadata.duration,
        format: metadata.format,
        bitrate: metadata.bitrate,
        sample_rate: metadata.sampleRate,
        lyrics_type: metadata.lyrics?.type,
        lyrics_path: metadata.lyricsPath,
        embedded_lyrics:
          metadata.lyrics?.embedded?.content ?? undefined,
        cover_path: metadata.coverPath,
        cover_exist: Boolean(metadata.coverPath),
      });
    }

    return results;
  }

  private async collectAudioFiles(folderPath: string): Promise<string[]> {
    const result: string[] = [];
    const entries = await fs.readdir(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);

      if (entry.isDirectory()) {
        result.push(...(await this.collectAudioFiles(fullPath)));
        continue;
      }

      if (AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        result.push(fullPath);
      }
    }

    return result;
  }
}
