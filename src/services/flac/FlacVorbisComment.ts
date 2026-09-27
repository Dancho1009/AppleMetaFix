import type { MetadataChange } from "../../models/MetadataChangePlan";

export interface FlacMetadataBlock {
  type: number;
  data: Buffer;
}

export interface VorbisCommentData {
  vendor: string;
  comments: string[];
}

const FIELD_TO_VORBIS_TAG: Partial<Record<MetadataChange["field"], string>> = {
  title: "TITLE",
  artist: "ARTIST",
  album: "ALBUM",
  year: "DATE",
  genre: "GENRE",
  composer: "COMPOSER",
};

function tagsToReplace(field: MetadataChange["field"]): string[] {
  if (field === "year") return ["DATE", "YEAR"];

  const tag = FIELD_TO_VORBIS_TAG[field];
  return tag ? [tag] : [];
}

function readUInt32LE(buffer: Buffer, offset: number): number {
  if (offset < 0 || offset + 4 > buffer.length) {
    throw new Error("FLAC Vorbis Comment数据长度非法");
  }
  return buffer.readUInt32LE(offset);
}

export function parseVorbisCommentBlock(data: Buffer): VorbisCommentData {
  let offset = 0;

  const vendorLength = readUInt32LE(data, offset);
  offset += 4;

  if (offset + vendorLength > data.length) {
    throw new Error("FLAC Vorbis Comment vendor长度非法");
  }

  const vendor = data.subarray(offset, offset + vendorLength).toString("utf8");
  offset += vendorLength;

  const commentCount = readUInt32LE(data, offset);
  offset += 4;

  const comments: string[] = [];

  for (let index = 0; index < commentCount; index += 1) {
    const length = readUInt32LE(data, offset);
    offset += 4;

    if (offset + length > data.length) {
      throw new Error("FLAC Vorbis Comment字段长度非法");
    }

    comments.push(data.subarray(offset, offset + length).toString("utf8"));
    offset += length;
  }

  return { vendor, comments };
}

export function buildVorbisCommentBlock(
  vendor: string,
  comments: string[],
): Buffer {
  const vendorBuffer = Buffer.from(vendor || "AppleMetaFix", "utf8");
  const commentBuffers = comments.map((comment) => Buffer.from(comment, "utf8"));

  const totalLength =
    4 +
    vendorBuffer.length +
    4 +
    commentBuffers.reduce((sum, comment) => sum + 4 + comment.length, 0);

  const result = Buffer.allocUnsafe(totalLength);
  let offset = 0;

  result.writeUInt32LE(vendorBuffer.length, offset);
  offset += 4;
  vendorBuffer.copy(result, offset);
  offset += vendorBuffer.length;

  result.writeUInt32LE(commentBuffers.length, offset);
  offset += 4;

  for (const comment of commentBuffers) {
    result.writeUInt32LE(comment.length, offset);
    offset += 4;
    comment.copy(result, offset);
    offset += comment.length;
  }

  return result;
}

function commentKey(comment: string): string {
  const separator = comment.indexOf("=");
  if (separator <= 0) return "";
  return comment.slice(0, separator).trim().toUpperCase();
}

export function applyVorbisTextChanges(
  blocks: FlacMetadataBlock[],
  changes: MetadataChange[],
): FlacMetadataBlock[] {
  const textChanges = changes.filter(
    (change) =>
      change?.kind === "text" &&
      change.field !== "artwork" &&
      FIELD_TO_VORBIS_TAG[change.field],
  );

  if (textChanges.length === 0) {
    throw new Error("FLAC Writer没有可写入的文本字段");
  }

  const vorbisIndexes: number[] = [];
  let vendor = "AppleMetaFix";
  const comments: string[] = [];

  blocks.forEach((block, index) => {
    if (block.type !== 4) return;

    const parsed = parseVorbisCommentBlock(block.data);
    if (vorbisIndexes.length === 0 && parsed.vendor) {
      vendor = parsed.vendor;
    }

    vorbisIndexes.push(index);
    comments.push(...parsed.comments);
  });

  const targetTags = new Set(
    textChanges.flatMap((change) => tagsToReplace(change.field)),
  );

  const preserved = comments.filter(
    (comment) => !targetTags.has(commentKey(comment)),
  );

  for (const change of textChanges) {
    const tag = FIELD_TO_VORBIS_TAG[change.field];
    if (!tag) continue;
    preserved.push(`${tag}=${change.after}`);
  }

  const updatedBlock: FlacMetadataBlock = {
    type: 4,
    data: buildVorbisCommentBlock(vendor, preserved),
  };

  const result = blocks.filter((block) => block.type !== 4);
  const insertIndex =
    vorbisIndexes.length > 0
      ? Math.min(vorbisIndexes[0], result.length)
      : Math.min(1, result.length);

  result.splice(insertIndex, 0, updatedBlock);

  return result;
}

export function getVorbisTextValue(
  data: Buffer,
  tag: string,
): string | undefined {
  const expected = tag.trim().toUpperCase();

  for (const comment of parseVorbisCommentBlock(data).comments) {
    if (commentKey(comment) !== expected) continue;
    const separator = comment.indexOf("=");
    return separator >= 0 ? comment.slice(separator + 1) : undefined;
  }

  return undefined;
}
