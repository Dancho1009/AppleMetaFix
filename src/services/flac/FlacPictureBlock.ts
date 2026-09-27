import type { DownloadedArtwork } from "../artwork/ArtworkDownloader";
import type { FlacMetadataBlock } from "./FlacVorbisComment";

export interface FlacPictureData {
  pictureType: number;
  mime: string;
  description: string;
  width: number;
  height: number;
  depth: number;
  colors: number;
  data: Buffer;
}

function readUInt32BE(buffer: Buffer, offset: number): number {
  if (offset < 0 || offset + 4 > buffer.length) {
    throw new Error("FLAC PICTURE Block长度非法");
  }
  return buffer.readUInt32BE(offset);
}

export function parseFlacPictureBlock(
  data: Buffer,
): FlacPictureData {
  let offset = 0;

  const pictureType = readUInt32BE(data, offset);
  offset += 4;

  const mimeLength = readUInt32BE(data, offset);
  offset += 4;
  if (offset + mimeLength > data.length) {
    throw new Error("FLAC PICTURE MIME长度非法");
  }
  const mime = data
    .subarray(offset, offset + mimeLength)
    .toString("utf8");
  offset += mimeLength;

  const descriptionLength = readUInt32BE(data, offset);
  offset += 4;
  if (offset + descriptionLength > data.length) {
    throw new Error("FLAC PICTURE描述长度非法");
  }
  const description = data
    .subarray(offset, offset + descriptionLength)
    .toString("utf8");
  offset += descriptionLength;

  const width = readUInt32BE(data, offset);
  offset += 4;
  const height = readUInt32BE(data, offset);
  offset += 4;
  const depth = readUInt32BE(data, offset);
  offset += 4;
  const colors = readUInt32BE(data, offset);
  offset += 4;

  const imageLength = readUInt32BE(data, offset);
  offset += 4;
  if (offset + imageLength > data.length) {
    throw new Error("FLAC PICTURE图片数据长度非法");
  }

  const image = data.subarray(offset, offset + imageLength);

  return {
    pictureType,
    mime,
    description,
    width,
    height,
    depth,
    colors,
    data: Buffer.from(image),
  };
}

export function buildFlacPictureBlock(
  picture: FlacPictureData,
): Buffer {
  const mime = Buffer.from(picture.mime, "utf8");
  const description = Buffer.from(
    picture.description,
    "utf8",
  );
  const image = Buffer.from(picture.data);

  const totalLength =
    4 +
    4 +
    mime.length +
    4 +
    description.length +
    4 * 5 +
    image.length;

  const result = Buffer.allocUnsafe(totalLength);
  let offset = 0;

  result.writeUInt32BE(picture.pictureType, offset);
  offset += 4;

  result.writeUInt32BE(mime.length, offset);
  offset += 4;
  mime.copy(result, offset);
  offset += mime.length;

  result.writeUInt32BE(description.length, offset);
  offset += 4;
  description.copy(result, offset);
  offset += description.length;

  result.writeUInt32BE(picture.width, offset);
  offset += 4;
  result.writeUInt32BE(picture.height, offset);
  offset += 4;
  result.writeUInt32BE(picture.depth, offset);
  offset += 4;
  result.writeUInt32BE(picture.colors, offset);
  offset += 4;

  result.writeUInt32BE(image.length, offset);
  offset += 4;
  image.copy(result, offset);

  return result;
}

export function artworkToFrontCover(
  artwork: DownloadedArtwork,
): FlacPictureData {
  return {
    pictureType: 3,
    mime: artwork.mime,
    description: "Cover (front)",
    width: artwork.width,
    height: artwork.height,
    depth: artwork.depth,
    colors: artwork.colors,
    data: artwork.data,
  };
}

export function applyFrontCoverPicture(
  blocks: FlacMetadataBlock[],
  artwork: DownloadedArtwork,
): FlacMetadataBlock[] {
  const frontCoverBlock: FlacMetadataBlock = {
    type: 6,
    data: buildFlacPictureBlock(
      artworkToFrontCover(artwork),
    ),
  };

  const result: FlacMetadataBlock[] = [];
  let inserted = false;

  for (const block of blocks) {
    if (block.type !== 6) {
      result.push(block);
      continue;
    }

    const picture = parseFlacPictureBlock(block.data);

    if (picture.pictureType === 3) {
      if (!inserted) {
        result.push(frontCoverBlock);
        inserted = true;
      }
      continue;
    }

    result.push(block);
  }

  if (!inserted) {
    const firstPictureIndex = result.findIndex(
      (block) => block.type === 6,
    );
    const vorbisIndex = result
      .map((block) => block.type)
      .lastIndexOf(4);

    const insertIndex =
      firstPictureIndex >= 0
        ? firstPictureIndex
        : vorbisIndex >= 0
          ? vorbisIndex + 1
          : Math.min(1, result.length);

    result.splice(insertIndex, 0, frontCoverBlock);
  }

  return result;
}
