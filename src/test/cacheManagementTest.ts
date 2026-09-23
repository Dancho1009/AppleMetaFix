import assert from "node:assert";
import { createAppleMusicSearchKey } from "../services/AppleMusicCacheService";

function main() {
  const jpKey = createAppleMusicSearchKey(
    {
      title: "ボーダーライト",
      artist: "FFF",
      album: "ボーダーライト",
    },
    "jp",
  );

  const usKey = createAppleMusicSearchKey(
    {
      title: "ボーダーライト",
      artist: "FFF",
      album: "ボーダーライト",
    },
    "us",
  );

  assert.ok(jpKey);
  assert.ok(usKey);
  assert.notStrictEqual(jpKey, usKey);

  console.log("Cache management test passed");
}

main();
