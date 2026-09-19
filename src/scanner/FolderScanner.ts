import fs from "fs/promises";
import path from "path";
import { MetadataScanner, AudioMetadata } from "./MetadataScanner";

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
      results.push(await this.metadataScanner.scanFile(file));
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
