import type {
  MetadataChange,
  MetadataChangePlan,
} from "../models/MetadataChangePlan";
import type {
  MetadataWriteFormat,
  MetadataWriteValidationIssue,
} from "../models/MetadataWriteValidation";

const ALLOWED_FIELDS = new Set<MetadataChange["field"]>([
  "title",
  "artist",
  "album",
  "year",
  "genre",
  "composer",
  "artwork",
]);

function addIssue(
  issues: MetadataWriteValidationIssue[],
  code: string,
  message: string,
  field?: MetadataChange["field"],
) {
  issues.push({
    code,
    severity: "error",
    message,
    field,
  });
}

export function detectMetadataWriteFormat(filePath: string): MetadataWriteFormat {
  const normalized =
    typeof filePath === "string"
      ? filePath.trim().toLowerCase()
      : "";

  if (normalized.endsWith(".flac")) return "flac";
  if (normalized.endsWith(".mp3")) return "mp3";
  if (normalized.endsWith(".m4a")) return "m4a";
  return "unknown";
}

export function validateMetadataChangePlanStructure(
  plan: MetadataChangePlan,
): MetadataWriteValidationIssue[] {
  const issues: MetadataWriteValidationIssue[] = [];
  const filePath =
    typeof plan?.filePath === "string"
      ? plan.filePath.trim()
      : "";
  const changes = Array.isArray(plan?.changes) ? plan.changes : [];

  if (!filePath) {
    addIssue(issues, "missing-file-path", "写入计划缺少目标文件路径");
  }

  if (
    typeof plan?.appleMusicTrackId !== "string" ||
    !plan.appleMusicTrackId.trim()
  ) {
    addIssue(
      issues,
      "missing-apple-music-id",
      "写入计划缺少已确认的Apple Music曲目ID",
    );
  }

  if (
    typeof plan?.storefront !== "string" ||
    !plan.storefront.trim()
  ) {
    addIssue(
      issues,
      "missing-storefront",
      "写入计划缺少Apple Music地区信息",
    );
  }

  if (detectMetadataWriteFormat(filePath) === "unknown") {
    addIssue(
      issues,
      "unsupported-format",
      "当前Writer只接受FLAC、MP3、M4A格式",
    );
  }

  if (changes.length === 0) {
    addIssue(
      issues,
      "empty-change-plan",
      "至少需要选择一个Metadata差异",
    );
    return issues;
  }

  const seenFields = new Set<MetadataChange["field"]>();

  changes.forEach((change, index) => {
    if (!change || !ALLOWED_FIELDS.has(change.field)) {
      addIssue(
        issues,
        "unsupported-field",
        `第 ${index + 1} 个变更包含不支持的字段`,
      );
      return;
    }

    if (seenFields.has(change.field)) {
      addIssue(
        issues,
        "duplicate-field",
        `字段 ${change.field} 在写入计划中重复出现`,
        change.field,
      );
    }
    seenFields.add(change.field);

    const before =
      typeof change.before === "string" ? change.before : "";
    const after =
      typeof change.after === "string" ? change.after.trim() : "";

    if (!after) {
      addIssue(
        issues,
        "empty-target-value",
        `字段 ${change.field} 的目标值为空`,
        change.field,
      );
    }

    if (before === after) {
      addIssue(
        issues,
        "unchanged-value",
        `字段 ${change.field} 的写入前后值相同`,
        change.field,
      );
    }

    if (change.field === "artwork") {
      if (change.kind !== "artwork") {
        addIssue(
          issues,
          "invalid-change-kind",
          "封面字段必须使用 artwork 类型",
          change.field,
        );
      }

      try {
        const url = new URL(after);
        if (url.protocol !== "https:") {
          addIssue(
            issues,
            "unsafe-artwork-url",
            "封面地址必须使用HTTPS",
            change.field,
          );
        }
      } catch {
        addIssue(
          issues,
          "invalid-artwork-url",
          "封面目标值不是有效的URL",
          change.field,
        );
      }

      return;
    }

    if (change.kind !== "text") {
      addIssue(
        issues,
        "invalid-change-kind",
        `字段 ${change.field} 必须使用 text 类型`,
        change.field,
      );
    }

    if (change.field === "year" && !/^\d{4}$/.test(after)) {
      addIssue(
        issues,
        "invalid-year",
        "年份必须是4位数字",
        change.field,
      );
    }
  });

  return issues;
}
