import { createHash } from "node:crypto";
import * as https from "node:https";

const MAX_ARTWORK_BYTES = 12 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_ARTWORK_SIZE = 1200;

export interface DownloadedArtwork {
  sourceUrl: string;
  resolvedUrl: string;
  mime: "image/jpeg" | "image/png";
  data: Buffer;
  width: number;
  height: number;
  depth: number;
  colors: number;
  sha256: string;
}

export interface ArtworkImageInfo {
  mime: DownloadedArtwork["mime"];
  width: number;
  height: number;
  depth: number;
  colors: number;
}

export function expandAppleArtworkUrl(
  url: string,
  size = DEFAULT_ARTWORK_SIZE,
): string {
  const safeSize = Math.max(64, Math.min(3000, Math.round(size)));
  return url.replace(
    /\{w\}x\{h\}/g,
    `${safeSize}x${safeSize}`,
  );
}

function pngInfo(data: Buffer): ArtworkImageInfo | null {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  if (data.length < 29 || !data.subarray(0, 8).equals(signature)) {
    return null;
  }

  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const bitDepth = data[24];
  const colorType = data[25];

  const channels =
    colorType === 0
      ? 1
      : colorType === 2
        ? 3
        : colorType === 3
          ? 1
          : colorType === 4
            ? 2
            : colorType === 6
              ? 4
              : 0;

  if (!width || !height || !channels) {
    throw new Error("PNG封面尺寸或颜色类型非法");
  }

  let colors = 0;
  if (colorType === 3) {
    let offset = 8;
    while (offset + 12 <= data.length) {
      const length = data.readUInt32BE(offset);
      const type = data.subarray(offset + 4, offset + 8).toString("ascii");
      if (type === "PLTE") {
        colors = Math.floor(length / 3);
        break;
      }
      offset += 12 + length;
    }
  }

  return {
    mime: "image/png",
    width,
    height,
    depth: bitDepth * channels,
    colors,
  };
}

function jpegInfo(data: Buffer): ArtworkImageInfo | null {
  if (
    data.length < 4 ||
    data[0] !== 0xff ||
    data[1] !== 0xd8
  ) {
    return null;
  }

  let offset = 2;

  while (offset + 4 <= data.length) {
    while (offset < data.length && data[offset] !== 0xff) {
      offset += 1;
    }
    while (offset < data.length && data[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= data.length) break;

    const marker = data[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (marker === 0x01) continue;

    if (offset + 2 > data.length) break;
    const segmentLength = data.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > data.length) {
      throw new Error("JPEG封面段长度非法");
    }

    const isSof =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;

    if (isSof) {
      if (segmentLength < 8) {
        throw new Error("JPEG封面SOF段非法");
      }

      const precision = data[offset + 2];
      const height = data.readUInt16BE(offset + 3);
      const width = data.readUInt16BE(offset + 5);
      const components = data[offset + 7];

      if (!width || !height || !components) {
        throw new Error("JPEG封面尺寸非法");
      }

      return {
        mime: "image/jpeg",
        width,
        height,
        depth: precision * components,
        colors: 0,
      };
    }

    offset += segmentLength;
  }

  throw new Error("无法读取JPEG封面尺寸");
}

export function inspectArtworkImage(
  data: Buffer,
): ArtworkImageInfo {
  const png = pngInfo(data);
  if (png) return png;

  const jpeg = jpegInfo(data);
  if (jpeg) return jpeg;

  throw new Error("当前封面只支持JPEG或PNG图片");
}

function requestArtwork(
  url: URL,
  redirectsLeft: number,
): Promise<{ data: Buffer; resolvedUrl: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    if (url.protocol !== "https:") {
      reject(new Error("封面下载仅允许HTTPS"));
      return;
    }

    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "AppleMetaFix/0.1",
          Accept: "image/jpeg,image/png",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;

        if (
          status >= 300 &&
          status < 400 &&
          response.headers.location
        ) {
          response.resume();

          if (redirectsLeft <= 0) {
            reject(new Error("封面下载重定向次数过多"));
            return;
          }

          let nextUrl: URL;
          try {
            nextUrl = new URL(response.headers.location, url);
          } catch {
            reject(new Error("封面下载重定向地址无效"));
            return;
          }

          if (nextUrl.protocol !== "https:") {
            reject(new Error("封面下载重定向必须保持HTTPS"));
            return;
          }

          requestArtwork(nextUrl, redirectsLeft - 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (status !== 200) {
          response.resume();
          reject(new Error(`封面下载失败，HTTP状态码：${status}`));
          return;
        }

        const contentLength = Number(response.headers["content-length"] ?? 0);
        if (
          Number.isFinite(contentLength) &&
          contentLength > MAX_ARTWORK_BYTES
        ) {
          response.resume();
          reject(new Error("封面文件超过12MB安全限制"));
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;

        response.on("data", (chunk: Buffer) => {
          total += chunk.length;

          if (total > MAX_ARTWORK_BYTES) {
            request.destroy(
              new Error("封面文件超过12MB安全限制"),
            );
            return;
          }

          chunks.push(Buffer.from(chunk));
        });

        response.on("end", () => {
          resolve({
            data: Buffer.concat(chunks),
            resolvedUrl: url.toString(),
            contentType: String(
              response.headers["content-type"] ?? "",
            )
              .split(";")[0]
              .trim()
              .toLowerCase(),
          });
        });

        response.on("error", reject);
      },
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error("封面下载超时"));
    });

    request.on("error", reject);
  });
}

export async function downloadArtwork(
  sourceUrl: string,
): Promise<DownloadedArtwork> {
  const expanded = expandAppleArtworkUrl(sourceUrl);

  let url: URL;
  try {
    url = new URL(expanded);
  } catch {
    throw new Error("Apple Music封面URL无效");
  }

  if (url.protocol !== "https:") {
    throw new Error("Apple Music封面URL必须使用HTTPS");
  }

  const response = await requestArtwork(url, MAX_REDIRECTS);

  if (response.data.length === 0) {
    throw new Error("Apple Music封面下载结果为空");
  }

  const info = inspectArtworkImage(response.data);

  if (
    response.contentType &&
    response.contentType !== info.mime
  ) {
    throw new Error(
      `封面MIME与图片内容不一致：${response.contentType} / ${info.mime}`,
    );
  }

  return {
    sourceUrl,
    resolvedUrl: response.resolvedUrl,
    ...info,
    data: response.data,
    sha256: createHash("sha256")
      .update(response.data)
      .digest("hex"),
  };
}
