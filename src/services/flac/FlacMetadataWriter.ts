import { randomUUID } from "node:crypto";
import {
  chmod,
  copyFile,
  link,
  open,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import {
  constants as fsConstants,
  createReadStream,
  createWriteStream,
  existsSync,
} from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { parseFile } from "music-metadata";
import type { MetadataChange } from "../../models/MetadataChangePlan";
import type { FlacWrittenMetadata } from "../../models/MetadataWriteResult";
import {
  applyVorbisTextChanges,
  type FlacMetadataBlock,
} from "./FlacVorbisComment";

interface FlacFileStructure {
  blocks: FlacMetadataBlock[];
  audioOffset: number;
}

const FLAC_MAGIC = Buffer.from("fLaC", "ascii");
const MAX_METADATA_BLOCK_SIZE = 0xffffff;

async function readExact(
  filePath: string,
  position: number,
  length: number,
): Promise<Buffer> {
  const handle = await open(filePath, "r");

  try {
    const buffer = Buffer.alloc(length);
    let total = 0;

    while (total < length) {
      const { bytesRead } = await handle.read(
        buffer,
        total,
        length - total,
        position + total,
      );

      if (bytesRead <= 0) {
        throw new Error("FLAC文件意外结束");
      }

      total += bytesRead;
    }

    return buffer;
  } finally {
    await handle.close();
  }
}

export async function readFlacStructure(
  filePath: string,
): Promise<FlacFileStructure> {
  const magic = await readExact(filePath, 0, 4);
  if (!magic.equals(FLAC_MAGIC)) {
    throw new Error("目标文件不是有效的FLAC文件");
  }

  const blocks: FlacMetadataBlock[] = [];
  let offset = 4;
  let last = false;

  while (!last) {
    const header = await readExact(filePath, offset, 4);
    last = Boolean(header[0] & 0x80);
    const type = header[0] & 0x7f;
    const length = header.readUIntBE(1, 3);

    const data = await readExact(filePath, offset + 4, length);
    blocks.push({ type, data });
    offset += 4 + length;

    if (blocks.length > 128) {
      throw new Error("FLAC Metadata Block数量异常");
    }
  }

  if (blocks.length === 0 || blocks[0].type !== 0) {
    throw new Error("FLAC缺少STREAMINFO Metadata Block");
  }

  return {
    blocks,
    audioOffset: offset,
  };
}

function serializeMetadataPrefix(blocks: FlacMetadataBlock[]): Buffer {
  if (blocks.length === 0 || blocks[0].type !== 0) {
    throw new Error("FLAC Metadata结构非法");
  }

  const parts: Buffer[] = [FLAC_MAGIC];

  blocks.forEach((block, index) => {
    if (block.data.length > MAX_METADATA_BLOCK_SIZE) {
      throw new Error("FLAC Metadata Block超过24位长度限制");
    }

    if (block.type < 0 || block.type > 126) {
      throw new Error(`不支持的FLAC Metadata Block类型：${block.type}`);
    }

    const header = Buffer.alloc(4);
    const isLast = index === blocks.length - 1;
    header[0] = (isLast ? 0x80 : 0) | block.type;
    header.writeUIntBE(block.data.length, 1, 3);

    parts.push(header, block.data);
  });

  return Buffer.concat(parts);
}

function text(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function metadataValue(
  field: MetadataChange["field"],
  common: Awaited<ReturnType<typeof parseFile>>["common"],
): string | null {
  switch (field) {
    case "title":
      return text(common.title);
    case "artist":
      return text(common.artist);
    case "album":
      return text(common.album);
    case "year":
      return text(common.year);
    case "genre":
      return text(common.genre?.[0]);
    case "composer":
      return text(common.composer?.[0]);
    case "artwork":
      return null;
  }

  return null;
}

function verifyTextChanges(
  changes: MetadataChange[],
  metadata: Awaited<ReturnType<typeof parseFile>>,
) {
  const mismatches = changes
    .filter((change) => change.kind === "text" && change.field !== "artwork")
    .filter((change) => metadataValue(change.field, metadata.common) !== change.after)
    .map((change) => change.field);

  if (mismatches.length > 0) {
    throw new Error(
      `FLAC写后验证失败，字段未按计划写入：${mismatches.join("、")}`,
    );
  }
}

function verifyAudioProperties(
  before: Awaited<ReturnType<typeof parseFile>>,
  after: Awaited<ReturnType<typeof parseFile>>,
) {
  const beforeFormat = before.format;
  const afterFormat = after.format;

  const sameSampleRate = beforeFormat.sampleRate === afterFormat.sampleRate;
  const sameChannels =
    beforeFormat.numberOfChannels === afterFormat.numberOfChannels;
  const sameBits = beforeFormat.bitsPerSample === afterFormat.bitsPerSample;
  const durationDelta = Math.abs(
    (beforeFormat.duration ?? 0) - (afterFormat.duration ?? 0),
  );
  const sameDuration = durationDelta <= 0.01;

  if (!sameSampleRate || !sameChannels || !sameBits || !sameDuration) {
    throw new Error("FLAC写后音频参数发生变化，已拒绝替换原文件");
  }
}

function writtenMetadata(
  metadata: Awaited<ReturnType<typeof parseFile>>,
): FlacWrittenMetadata {
  return {
    title: metadata.common.title,
    artist: metadata.common.artist,
    album: metadata.common.album,
    year: metadata.common.year,
    genre: metadata.common.genre?.[0],
    composer: metadata.common.composer?.[0],
  };
}

async function safeUnlink(filePath: string) {
  try {
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  } catch {
    // 清理失败不覆盖原始错误。
  }
}

async function createRollbackSnapshot(
  filePath: string,
  rollbackPath: string,
): Promise<void> {
  try {
    await link(filePath, rollbackPath);
    return;
  } catch {
    await copyFile(filePath, rollbackPath, fsConstants.COPYFILE_EXCL);
  }
}

async function restoreOriginal(
  filePath: string,
  rollbackPath: string,
): Promise<void> {
  await safeUnlink(filePath);
  await rename(rollbackPath, filePath);
}

export async function writeFlacTextMetadata(
  filePath: string,
  changes: MetadataChange[],
): Promise<FlacWrittenMetadata> {
  const textChanges = changes.filter(
    (change) => change.kind === "text" && change.field !== "artwork",
  );

  if (textChanges.length !== changes.length || textChanges.length === 0) {
    throw new Error("FLAC首版Writer仅支持文本Metadata字段，不支持封面写入");
  }

  const originalMetadata = await parseFile(filePath);
  const structure = await readFlacStructure(filePath);
  const updatedBlocks = applyVorbisTextChanges(structure.blocks, textChanges);
  const prefix = serializeMetadataPrefix(updatedBlocks);

  const directory = path.dirname(filePath);
  const base = path.basename(filePath);
  const token = randomUUID();
  const tempPath = path.join(
    directory,
    `.${base}.applemetafix-${token}.tmp.flac`,
  );
  const rollbackPath = path.join(
    directory,
    `.${base}.applemetafix-${token}.rollback`,
  );

  let rollbackCreated = false;
  let writeCompleted = false;

  try {
    await writeFile(tempPath, prefix, { flag: "wx" });

    await pipeline(
      createReadStream(filePath, { start: structure.audioOffset }),
      createWriteStream(tempPath, { flags: "a" }),
    );

    const originalStat = await stat(filePath);
    await chmod(tempPath, originalStat.mode);

    const tempHandle = await open(tempPath, "r+");
    try {
      await tempHandle.sync();
    } finally {
      await tempHandle.close();
    }

    const tempMetadata = await parseFile(tempPath);
    verifyTextChanges(textChanges, tempMetadata);
    verifyAudioProperties(originalMetadata, tempMetadata);

    await createRollbackSnapshot(filePath, rollbackPath);
    rollbackCreated = true;

    try {
      await rename(tempPath, filePath);

      const finalMetadata = await parseFile(filePath);
      verifyTextChanges(textChanges, finalMetadata);
      verifyAudioProperties(originalMetadata, finalMetadata);

      await unlink(rollbackPath);
      rollbackCreated = false;
      writeCompleted = true;

      return writtenMetadata(finalMetadata);
    } catch (error) {
      if (rollbackCreated) {
        try {
          await restoreOriginal(filePath, rollbackPath);
          rollbackCreated = false;
        } catch (restoreError) {
          throw new Error(
            `FLAC替换失败且自动回滚失败。原文件回滚副本保留在：${rollbackPath}。原始错误：${String(
              error,
            )}；回滚错误：${String(restoreError)}`,
          );
        }
      }

      throw error;
    }
  } finally {
    await safeUnlink(tempPath);

    if (writeCompleted || !rollbackCreated) {
      await safeUnlink(rollbackPath);
    }
  }
}
