import assert from "node:assert/strict";
import type { MetadataChange } from "../models/MetadataChangePlan";
import {
  applyVorbisTextChanges,
  buildVorbisCommentBlock,
  getVorbisTextValue,
  parseVorbisCommentBlock,
  type FlacMetadataBlock,
} from "../services/flac/FlacVorbisComment";

function textChange(
  field: MetadataChange["field"],
  before: string,
  after: string,
): MetadataChange {
  return {
    field,
    label: field,
    before,
    after,
    kind: "text",
  };
}

function run() {
  const originalVorbis = buildVorbisCommentBlock(
    "reference libFLAC",
    [
      "TITLE=旧标题",
      "ARTIST=旧艺术家",
      "ALBUM=保留专辑",
      "GENRE=旧流派",
      "GENRE=旧流派2",
      "REPLAYGAIN_TRACK_GAIN=-3.25 dB",
      "CUSTOM_TAG=保留值",
    ],
  );

  const blocks: FlacMetadataBlock[] = [
    { type: 0, data: Buffer.alloc(34) },
    { type: 4, data: originalVorbis },
    { type: 6, data: Buffer.from([1, 2, 3]) },
  ];

  const updated = applyVorbisTextChanges(blocks, [
    textChange("title", "旧标题", "新标题"),
    textChange("artist", "旧艺术家", "新艺术家"),
    textChange("year", "", "2026"),
    textChange("genre", "旧流派", "J-Pop; アニメ"),
    textChange("composer", "", "作曲家A & 作曲家B"),
  ]);

  assert.equal(updated.length, 3, "更新后Metadata Block数量应保持稳定");
  assert.equal(updated[0].type, 0, "STREAMINFO必须保持第一块");
  assert.equal(updated[2].type, 6, "PICTURE块不能被文本写入修改");

  const vorbis = updated.find((block) => block.type === 4);
  assert.ok(vorbis, "应保留Vorbis Comment块");

  assert.equal(getVorbisTextValue(vorbis.data, "TITLE"), "新标题");
  assert.equal(getVorbisTextValue(vorbis.data, "ARTIST"), "新艺术家");
  assert.equal(getVorbisTextValue(vorbis.data, "ALBUM"), "保留专辑");
  assert.equal(getVorbisTextValue(vorbis.data, "DATE"), "2026");
  assert.equal(getVorbisTextValue(vorbis.data, "GENRE"), "J-Pop; アニメ");
  assert.equal(
    getVorbisTextValue(vorbis.data, "COMPOSER"),
    "作曲家A & 作曲家B",
  );

  const parsed = parseVorbisCommentBlock(vorbis.data);
  assert.equal(parsed.vendor, "reference libFLAC");
  assert.ok(
    parsed.comments.includes("REPLAYGAIN_TRACK_GAIN=-3.25 dB"),
    "ReplayGain等非目标标签必须保留",
  );
  assert.ok(
    parsed.comments.includes("CUSTOM_TAG=保留值"),
    "自定义标签必须保留",
  );
  assert.equal(
    parsed.comments.filter((comment) => comment.startsWith("GENRE=")).length,
    1,
    "旧的重复目标标签应收敛为新的单一值",
  );

  const noVorbisBlocks: FlacMetadataBlock[] = [
    { type: 0, data: Buffer.alloc(34) },
    { type: 1, data: Buffer.alloc(8) },
  ];
  const inserted = applyVorbisTextChanges(noVorbisBlocks, [
    textChange("title", "", "首次写入"),
  ]);

  assert.equal(inserted[0].type, 0);
  assert.equal(inserted[1].type, 4, "缺少Vorbis Comment时应安全插入");
  assert.equal(getVorbisTextValue(inserted[1].data, "TITLE"), "首次写入");

  console.log("FLAC Vorbis Comment writer test passed");
}

run();
