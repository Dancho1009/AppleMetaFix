import assert from "node:assert/strict";
import type { TrackMetadata } from "../providers/AppleMusicProvider";
import { mergeConfirmedTrack } from "../services/MatchCandidateMerge";

function run() {
  const confirmed: TrackMetadata = {
    id: "confirmed-track",
    storefront: "jp",
    title: "正しい曲",
    artist: "Artist",
    album: "Album",
  };

  const usCandidate: TrackMetadata = {
    id: "us-result",
    storefront: "us",
    title: "正しい曲",
    artist: "Other Artist",
    album: "Other Album",
  };

  const merged = mergeConfirmedTrack([usCandidate], confirmed);

  assert.equal(merged.length, 2, "切换地区后应保留已确认曲目");
  assert.equal(
    merged[0].id,
    confirmed.id,
    "已确认曲目应重新加入候选池",
  );
  assert.equal(
    merged.some(
      (track) =>
        track.id === confirmed.id && track.storefront === confirmed.storefront,
    ),
    true,
    "已确认曲目的原 storefront 应被保留",
  );

  const duplicate = mergeConfirmedTrack(
    [
      {
        ...confirmed,
        artist: "缓存中的旧艺术家信息",
      },
      usCandidate,
    ],
    confirmed,
  );

  assert.equal(
    duplicate.filter(
      (track) =>
        track.id === confirmed.id && track.storefront === confirmed.storefront,
    ).length,
    1,
    "相同 storefront 和 track id 不应重复",
  );
  assert.equal(
    duplicate[0].artist,
    confirmed.artist,
    "已确认记录应优先于同键缓存候选",
  );

  console.log("Confirmed candidate merge test passed");
}

run();
