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

export interface ScanStats {
  files: number;
  songs: number;
  formats: Record<string, number>;
  totalSize: number;
  artists: number;
  albums: number;
  coverCount: number;
  lyricsCount: number;
  missingLyrics: number;
}

export interface ScanProgress {
  phase: "collect" | "metadata" | "index";
  current: number;
  total: number;
  file: string;
  stats: ScanStats;
}

export class FolderScanner {
  private metadataScanner = new MetadataScanner();

  async scanFolder(
    folderPath: string,
    onProgress?: (progress: ScanProgress) => void,
  ): Promise<AudioMetadata[]> {
    const files = await this.collectAudioFiles(folderPath);
    const results: AudioMetadata[] = [];

    const stats: ScanStats = {
      files: files.length,
      songs: 0,
      formats: {},
      totalSize: 0,
      artists: 0,
      albums: 0,
      coverCount: 0,
      lyricsCount: 0,
      missingLyrics: 0,
    };

    onProgress?.({ phase: "collect", current: files.length, total: files.length, file: folderPath, stats });

    const artists = new Set<string>();
    const albums = new Set<string>();

    let current = 0;

    for (const file of files) {
      const metadata = await this.metadataScanner.scanFile(file);
      results.push(metadata);
      current++;

      const format = (metadata.format || path.extname(file).slice(1) || "unknown").toUpperCase();
      stats.formats[format] = (stats.formats[format] || 0) + 1;
      stats.songs = current;
      if (metadata.artist) artists.add(metadata.artist);
      if (metadata.album) albums.add(metadata.album);
      if (metadata.coverPath) stats.coverCount++;
      if (metadata.lyrics || metadata.lyricsPath) stats.lyricsCount++;

      try {
        stats.totalSize += (await fs.stat(file)).size;
      } catch {}

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
        embedded_lyrics: metadata.lyrics?.embedded?.content ?? undefined,
        cover_path: metadata.coverPath,
        cover_exist: Boolean(metadata.coverPath),
      });

      stats.artists = artists.size;
      stats.albums = albums.size;
      stats.missingLyrics = stats.songs - stats.lyricsCount;

      onProgress?.({ phase: "metadata", current, total: files.length, file, stats: { ...stats } });
    }

    onProgress?.({ phase: "index", current: files.length, total: files.length, file: "", stats });

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
