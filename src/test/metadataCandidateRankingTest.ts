import assert from "node:assert/strict";
import { MetadataMatchService } from "../services/MetadataMatchService";
import type { TrackMetadata } from "../providers/AppleMusicProvider";

function run() {
  const service = new MetadataMatchService();
  const local = {
    title: "DIAMOND JOKER",
    artist: "Machico",
    album: "THE IDOLM@STER MILLION THE@TER VARIETY 01",
    durationMs: 245000,
  };

  const candidates: TrackMetadata[] = [
    {
      id: "group-version",
      storefront: "jp",
      title: "DIAMOND JOKER",
      artist:
        "Tsubasa Ibuki (CV: Machico), Matsuri Tokugawa (CV: Ayaka Ohashi)",
      album: "DIAMOND JOKER",
      durationInMillis: 245000,
    },
    {
      id: "exact-version",
      storefront: "jp",
      title: "DIAMOND JOKER",
      artist: "Machico",
      album: "THE IDOLM@STER MILLION THE@TER VARIETY 01",
      durationInMillis: 245000,
    },
    {
      id: "unrelated",
      storefront: "jp",
      title: "Another Song",
      artist: "Unknown Artist",
      album: "Unknown Album",
      durationInMillis: 180000,
    },
  ];

  const ranked = service.rank(local, candidates);

  assert.equal(ranked.length, candidates.length, "应保留全部候选结果");
  assert.equal(ranked[0].track.id, "exact-version", "完全一致版本应排在第一位");
  assert.equal(ranked[0].confidence, "high", "完全一致版本应为高置信度");
  assert.equal(
    ranked.find((item) => item.track.id === "group-version")?.identity.level,
    "warning",
    "多人/角色版本应标记为需确认",
  );
  assert.notEqual(
    ranked.find((item) => item.track.id === "group-version")?.confidence,
    "high",
    "存在版本风险的候选不应为高置信度",
  );

  for (let index = 1; index < ranked.length; index += 1) {
    assert.ok(
      ranked[index - 1].score >= ranked[index].score,
      "候选结果应按最终得分降序排列",
    );
  }

  assert.equal(
    service.match(local, candidates)?.track.id,
    ranked[0].track.id,
    "match应保持与rank第一名兼容",
  );

  console.log("Metadata candidate ranking test passed", ranked.map((item) => ({
    id: item.track.id,
    score: item.score,
    confidence: item.confidence,
    identity: item.identity.level,
  })));
}

run();
