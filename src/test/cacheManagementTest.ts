import assert from "node:assert";
import { createAppleMusicSearchKey } from "../services/AppleMusicCacheService";

function createKey(storefront: string, language: string) {
  return createAppleMusicSearchKey(
    {
      title: "ボーダーライト",
      artist: "FFF",
      album: "ボーダーライト",
      language,
    },
    storefront,
  );
}

function main() {
  const jpJaKey = createKey("jp", "ja");
  const usJaKey = createKey("us", "ja");
  const jpEnKey = createKey("jp", "en");
  const normalizedJpJaKey = createKey(" JP ", " JA ");

  assert.ok(jpJaKey);
  assert.ok(usJaKey);
  assert.ok(jpEnKey);
  assert.ok(normalizedJpJaKey);

  assert.notStrictEqual(
    jpJaKey,
    usJaKey,
    "不同 storefront 必须生成不同缓存 key",
  );
  assert.notStrictEqual(
    jpJaKey,
    jpEnKey,
    "不同 language 必须生成不同缓存 key",
  );
  assert.strictEqual(
    jpJaKey,
    normalizedJpJaKey,
    "storefront 和 language 应忽略大小写与首尾空格",
  );

  assert.strictEqual(
    createAppleMusicSearchKey(
      {
        artist: "FFF",
        language: "ja",
      },
      "jp",
    ),
    null,
    "缺少标题时不应生成搜索缓存 key",
  );

  console.log("Cache management test passed");
}

main();
