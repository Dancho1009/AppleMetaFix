import assert from "node:assert/strict";
import type { SongMatchConfirmation } from "../models/SongMatchConfirmation";
import {
  createMetadataChangePlan,
  createMetadataPreview,
  getDefaultMetadataPreviewFields,
} from "../services/MetadataPreviewService";

function run() {
  const confirmation: SongMatchConfirmation = {
    id: 1,
    songPath: "BITTER TASTE.flac",
    score: 72,
    confidence: "medium",
    confirmed: true,
    confirmedAt: Date.now(),
    track: {
      id: "1804621958",
      storefront: "jp",
      title: "BITTER TASTE",
      artist: "ノーラ starring 豊口めぐみ",
      album: "SECOND MISSION",
      releaseDate: "2011-11-09",
      durationInMillis: 235000,
      genre: ["アニメ", "ミュージック"],
      composer: "若林 充",
      artwork: "https://example.com/{w}x{h}bb.jpg",
    },
  };

  const preview = createMetadataPreview(
    {
      path: confirmation.songPath,
      title: "BITTER TASTE",
      artist: "伊藤かな恵 早見沙織",
      album: "",
    },
    confirmation,
  );

  assert.equal(preview.changedCount, 6, "应识别6个可修复差异");
  assert.equal(
    preview.defaultSelectedCount,
    6,
    "本地缺失或不一致的字段应默认勾选",
  );

  const defaultFields = getDefaultMetadataPreviewFields(preview);
  assert.equal(defaultFields.length, 6, "默认选择应只包含建议修改字段");
  assert.equal(
    defaultFields.includes("title"),
    false,
    "一致标题不应进入默认变更计划",
  );

  const changePlan = createMetadataChangePlan(preview, [
    "title",
    "artist",
    "artwork",
  ]);
  assert.deepEqual(
    changePlan.changes.map((change) => change.field),
    ["artist", "artwork"],
    "变更计划应只保留被选择的真实差异",
  );
  assert.equal(changePlan.filePath, confirmation.songPath);
  assert.equal(changePlan.appleMusicTrackId, "1804621958");
  assert.equal(changePlan.storefront, "jp");

  const title = preview.items.find((item) => item.field === "title");
  assert.equal(title?.changed, false, "标题一致时不应标记为修改");
  assert.equal(title?.selectable, false, "标题一致时不应允许加入变更计划");
  assert.equal(title?.selectedByDefault, false);

  const artist = preview.items.find((item) => item.field === "artist");
  assert.equal(artist?.before, "伊藤かな恵 早見沙織");
  assert.equal(artist?.after, "ノーラ starring 豊口めぐみ");
  assert.equal(artist?.selectedByDefault, true);

  const artwork = preview.items.find((item) => item.field === "artwork");
  assert.equal(
    artwork?.selectedByDefault,
    true,
    "本地无封面且Apple Music有封面时应默认选择",
  );

  const existingArtwork = createMetadataPreview(
    {
      path: confirmation.songPath,
      title: "BITTER TASTE",
      coverPath: "D:/covers/local.jpg",
    },
    confirmation,
  ).items.find((item) => item.field === "artwork");

  assert.equal(existingArtwork?.changed, true);
  assert.equal(
    existingArtwork?.selectedByDefault,
    false,
    "本地已有封面时不应默认覆盖",
  );

  console.log("Metadata preview test passed");
}

run();
