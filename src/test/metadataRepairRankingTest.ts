import assert from "node:assert/strict";
import { MetadataMatchService } from "../services/MetadataMatchService";
import type { TrackMetadata } from "../providers/AppleMusicProvider";

function run() {
  const service = new MetadataMatchService();
  const local = {
    title: "BITTER TASTE",
    artist: "伊藤かな恵 早見沙織",
    album: "",
    durationMs: 235400,
  };

  const candidates: TrackMetadata[] = [
    {
      id: "1801470280",
      storefront: "jp",
      title: "コイノシルシ",
      artist: "駆け魂隊 starring 伊藤かな恵&早見沙織",
      album: "Greetings from special agents",
      durationInMillis: 259907,
    },
    {
      id: "1804621958",
      storefront: "cn",
      title: "BITTER TASTE",
      artist: "ノーラ starring 豊口めぐみ",
      album: "SECOND MISSION",
      durationInMillis: 235000,
    },
  ];

  const ranked = service.rank(local, candidates);
  const best = ranked[0];

  assert.equal(
    best.track.id,
    "1804621958",
    "标题和时长强一致时，应优先于仅艺术家相关的错误歌曲",
  );
  assert.equal(
    best.identity.level,
    "warning",
    "艺术家冲突仍应提示用户确认，不能静默视为完全一致",
  );
  assert.equal(
    best.confidence,
    "medium",
    "本地艺术家疑似错误时不应给高置信度",
  );
  assert.ok(
    best.score >= 70,
    "标题和时长强一致应达到可用的候选分数",
  );

  console.log(
    "Metadata repair ranking test passed",
    ranked.map((item) => ({
      id: item.track.id,
      score: item.score,
      confidence: item.confidence,
      identity: item.identity.level,
    })),
  );
}

run();
