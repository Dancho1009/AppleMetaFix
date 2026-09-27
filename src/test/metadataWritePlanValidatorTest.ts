import assert from "node:assert/strict";
import type { MetadataChangePlan } from "../models/MetadataChangePlan";
import {
  detectMetadataWriteFormat,
  validateMetadataChangePlanStructure,
} from "../services/MetadataWritePlanValidator";

function issueCodes(plan: MetadataChangePlan) {
  return validateMetadataChangePlanStructure(plan).map(
    (issue) => issue.code,
  );
}

function run() {
  const validPlan: MetadataChangePlan = {
    filePath: "D:/Music/BITTER TASTE.flac",
    appleMusicTrackId: "1804621958",
    storefront: "jp",
    changes: [
      {
        field: "artist",
        label: "艺术家",
        before: "伊藤かな恵 早見沙織",
        after: "ノーラ starring 豊口めぐみ",
        kind: "text",
      },
      {
        field: "year",
        label: "年份",
        before: "",
        after: "2011",
        kind: "text",
      },
      {
        field: "artwork",
        label: "封面",
        before: "",
        after: "https://example.com/cover.jpg",
        kind: "artwork",
      },
    ],
  };

  assert.equal(detectMetadataWriteFormat(validPlan.filePath), "flac");
  assert.deepEqual(
    validateMetadataChangePlanStructure(validPlan),
    [],
    "合法写入计划不应产生结构错误",
  );

  const invalidPlan: MetadataChangePlan = {
    ...validPlan,
    filePath: "D:/Music/BITTER TASTE.wav",
    changes: [
      {
        field: "year",
        label: "年份",
        before: "2011",
        after: "11",
        kind: "text",
      },
      {
        field: "year",
        label: "年份",
        before: "2011",
        after: "2012",
        kind: "text",
      },
      {
        field: "artwork",
        label: "封面",
        before: "",
        after: "http://example.com/cover.jpg",
        kind: "artwork",
      },
    ],
  };

  const invalidCodes = issueCodes(invalidPlan);
  assert.ok(
    invalidCodes.includes("unsupported-format"),
    "不支持的扩展名应被拦截",
  );
  assert.ok(
    invalidCodes.includes("invalid-year"),
    "非法年份应被拦截",
  );
  assert.ok(
    invalidCodes.includes("duplicate-field"),
    "重复字段应被拦截",
  );
  assert.ok(
    invalidCodes.includes("unsafe-artwork-url"),
    "非HTTPS封面地址应被拦截",
  );

  const incompletePlan: MetadataChangePlan = {
    filePath: "",
    changes: [],
  };

  const incompleteCodes = issueCodes(incompletePlan);
  assert.ok(incompleteCodes.includes("missing-file-path"));
  assert.ok(incompleteCodes.includes("missing-apple-music-id"));
  assert.ok(incompleteCodes.includes("missing-storefront"));
  assert.ok(incompleteCodes.includes("empty-change-plan"));

  const malformedPlan = {
    filePath: "D:/Music/test.flac",
    appleMusicTrackId: 123,
    storefront: null,
    changes: [
      {
        field: "artist",
        label: "艺术家",
        before: "old",
        after: 456,
        kind: "text",
      },
      null,
    ],
  } as unknown as MetadataChangePlan;

  const malformedCodes = issueCodes(malformedPlan);
  assert.ok(
    malformedCodes.includes("missing-apple-music-id"),
    "非字符串Apple Music ID应被安全拒绝",
  );
  assert.ok(
    malformedCodes.includes("missing-storefront"),
    "非字符串地区应被安全拒绝",
  );
  assert.ok(
    malformedCodes.includes("empty-target-value"),
    "非字符串目标值应被安全拒绝",
  );
  assert.ok(
    malformedCodes.includes("unsupported-field"),
    "空变更项应被安全拒绝",
  );

  console.log("Metadata writer validator test passed");
}

run();
