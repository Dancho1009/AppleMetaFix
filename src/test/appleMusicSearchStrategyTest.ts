import assert from "node:assert/strict";
import {
  buildAppleMusicSearchTerms,
  buildStorefrontSearchOrder,
  hasExactTitleMatch,
  mergeSearchCandidates,
  prioritizeSearchCandidates,
} from "../services/AppleMusicSearchStrategy";

function run() {
  const terms = buildAppleMusicSearchTerms(
    "BITTER TASTE",
    "伊藤かな恵 早見沙織",
    "",
  );

  assert.deepEqual(
    terms,
    [
      "BITTER TASTE 伊藤かな恵 早見沙織",
      "BITTER TASTE",
      "伊藤かな恵 早見沙織 BITTER TASTE",
    ],
    "搜索词应包含去掉错误艺术家的标题回退查询",
  );

  assert.deepEqual(
    buildStorefrontSearchOrder("jp", ["jp", "cn", "us"]),
    ["jp"],
    "显式 storefront 应只搜索当前区域",
  );

  assert.deepEqual(
    buildStorefrontSearchOrder("auto", ["jp", "cn", "us"]),
    ["jp", "cn", "us"],
    "auto 模式应按检测结果进行多区域搜索",
  );

  const jpResults = [
    {
      id: "1801470280",
      storefront: "jp",
      title: "コイノシルシ",
      artist: "駆け魂隊 starring 伊藤かな恵&早見沙織",
    },
  ];

  assert.equal(
    hasExactTitleMatch("BITTER TASTE", jpResults),
    false,
    "只有无关搜索结果时不能提前停止",
  );

  const jpTitleOnlyResults = [
    {
      id: "1804621958",
      storefront: "jp",
      title: "BITTER TASTE",
      artist: "ノーラ starring 豊口めぐみ",
    },
  ];

  const merged = mergeSearchCandidates(jpResults, jpTitleOnlyResults);
  const prioritized = prioritizeSearchCandidates("BITTER TASTE", merged);

  assert.equal(
    hasExactTitleMatch("BITTER TASTE", jpTitleOnlyResults),
    true,
    "同一区域的纯标题搜索命中精确标题后应停止继续搜索",
  );
  assert.equal(
    prioritized[0].id,
    "1804621958",
    "精确标题候选应优先于仅艺术家相关的无关歌曲",
  );

  console.log("Apple Music search strategy test passed");
}

run();
