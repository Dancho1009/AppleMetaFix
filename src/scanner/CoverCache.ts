import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { app } from "electron";

export async function saveCoverToCache(
  filePath: string,
  data: Uint8Array,
  format?: string,
) {
  const stat = await fs.stat(filePath);
  const key = crypto
    .createHash("md5")
    .update(`${filePath}:${stat.mtimeMs}`)
    .digest("hex");

  const ext = format?.toLowerCase().includes("png") ? "png" : "jpg";
  const dir = path.join(app.getPath("userData"), "cache", "covers");
  await fs.mkdir(dir, { recursive: true });

  const coverPath = path.join(dir, `${key}.${ext}`);

  try {
    await fs.access(coverPath);
  } catch {
    await fs.writeFile(coverPath, Buffer.from(data));
  }

  return coverPath;
}
