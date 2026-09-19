import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { app } from "electron";

function getCoverCacheDir() {
  return path.join(app.getPath("userData"), "cache", "covers");
}

export async function saveCoverToCache(
  filePath: string,
  data: Uint8Array,
  format?: string,
) {
  const stat = await fs.stat(filePath);
  const key = crypto
    .createHash("md5")
    .update(`${filePath}:${stat.mtimeMs}:${stat.size}`)
    .digest("hex");

  const ext = format?.toLowerCase().includes("png") ? "png" : "jpg";
  const dir = getCoverCacheDir();
  await fs.mkdir(dir, { recursive: true });

  const coverPath = path.join(dir, `${key}.${ext}`);

  try {
    await fs.access(coverPath);
    return coverPath;
  } catch {
    // continue writing cache
  }

  const tempPath = `${coverPath}.tmp`;
  await fs.writeFile(tempPath, Buffer.from(data));
  await fs.rename(tempPath, coverPath);

  return coverPath;
}
