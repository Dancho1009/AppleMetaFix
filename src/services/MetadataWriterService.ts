import {
  accessSync,
  constants,
  existsSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { getSongByPath } from "../database/songRepository";
import type {
  MetadataChange,
  MetadataChangePlan,
} from "../models/MetadataChangePlan";
import type {
  MetadataWriteCheck,
  MetadataWriteDryRunResult,
  MetadataWriteFormat,
  MetadataWriteValidationIssue,
} from "../models/MetadataWriteValidation";
import { songMatchConfirmationService } from "./SongMatchConfirmationService";

const ALLOWED_FIELDS = new Set<MetadataChange["field"]>([
  "title",
  "artist",
  "album",
  "year",
  "genre",
  "composer",
  "artwork",
]);

function detectFormat(filePath: string): MetadataWriteFormat {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".flac") return "flac";
  if (extension === ".mp3") return "mp3";
  if (extension === ".m4a") return "m4a";
  return "unknown";
}

function addCheck(
  checks: MetadataWriteCheck[],
  key: MetadataWriteCheck["key"],
  label: string,
  ok: boolean,
  detail: string,
) {
  checks.push({ key, label, ok, detail });
}

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

function validateChange(
  change: MetadataChange,
  index: number,
  seenFields: Set<MetadataChange["field"]>,
  issues: MetadataWriteValidationIssue[],
) {
  if (!ALLOWED_FIELDS.has(change.field)) {
    addIssue(
      issues,
      "unsupported-field",
      `第 ${index + 1} 个变更包含不支持的字段：${String(change.field)}`,
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

  if (!change.after?.trim()) {
    addIssue(
      issues,
      "empty-target-value",
      `字段 ${change.field} 的目标值为空`,
      change.field,
    );
  }

  if (change.before === change.after) {
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
      const url = new URL(change.after);
      if (url.protocol !== "https:") {
        addIssue(
          issues,
          "unsafe-artwork-url",
          "封面地址必须使用 HTTPS",
          change.field,
        );
      }
    } catch {
      addIssue(
        issues,
        "invalid-artwork-url",
        "封面目标值不是有效的 URL",
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

  if (change.field === "year" && !/^\d{4}$/.test(change.after.trim())) {
    addIssue(
      issues,
      "invalid-year",
      "年份必须是4位数字",
      change.field,
    );
  }
}

export class MetadataWriterService {
  dryRun(plan: MetadataChangePlan): MetadataWriteDryRunResult {
    const checks: MetadataWriteCheck[] = [];
    const issues: MetadataWriteValidationIssue[] = [];
    const filePath =
      typeof plan?.filePath === "string"
        ? plan.filePath.trim()
        : "";
    const changes = Array.isArray(plan?.changes) ? plan.changes : [];
    const format = detectFormat(filePath);

    const planOk = Boolean(filePath);
    addCheck(
      checks,
      "plan",
      "写入计划",
      planOk,
      planOk ? "写入计划结构有效" : "缺少目标文件路径",
    );
    if (!planOk) {
      addIssue(issues, "missing-file-path", "写入计划缺少目标文件路径");
    }

    const librarySong = filePath ? getSongByPath(filePath) : null;
    const libraryOk = Boolean(librarySong);
    addCheck(
      checks,
      "library",
      "歌曲库记录",
      libraryOk,
      libraryOk ? "目标文件已在AppleMetaFix歌曲库中" : "目标文件不在歌曲库中",
    );
    if (!libraryOk) {
      addIssue(
        issues,
        "song-not-in-library",
        "目标文件必须先通过AppleMetaFix扫描进入歌曲库",
      );
    }

    const confirmation = filePath
      ? songMatchConfirmationService.get(filePath)
      : null;
    const confirmationMatches =
      Boolean(confirmation) &&
      Boolean(plan.appleMusicTrackId) &&
      confirmation?.track.id === plan.appleMusicTrackId &&
      (confirmation?.track.storefront || "unknown") ===
        (plan.storefront || "unknown");

    addCheck(
      checks,
      "confirmation",
      "匹配确认",
      confirmationMatches,
      confirmationMatches
        ? "写入计划与当前已确认Apple Music版本一致"
        : "写入计划与当前已确认版本不一致",
    );
    if (!confirmationMatches) {
      addIssue(
        issues,
        "confirmation-mismatch",
        "写入前必须确认Apple Music版本，且写入计划必须与当前确认结果一致",
      );
    }

    const fileExists = Boolean(filePath) && existsSync(filePath);
    addCheck(
      checks,
      "file-exists",
      "文件存在",
      fileExists,
      fileExists ? "目标文件存在" : "目标文件不存在",
    );
    if (!fileExists) {
      addIssue(issues, "file-not-found", "目标文件不存在");
    }

    let regularFile = false;
    if (fileExists) {
      try {
        regularFile = statSync(filePath).isFile();
      } catch {
        regularFile = false;
      }
    }
    addCheck(
      checks,
      "regular-file",
      "文件类型",
      regularFile,
      regularFile ? "目标是普通文件" : "目标不是可写入的普通文件",
    );
    if (fileExists && !regularFile) {
      addIssue(
        issues,
        "not-regular-file",
        "目标路径不是普通文件",
      );
    }

    let readable = false;
    let writable = false;
    if (fileExists && regularFile) {
      try {
        accessSync(filePath, constants.R_OK);
        readable = true;
      } catch {
        readable = false;
      }

      try {
        accessSync(filePath, constants.W_OK);
        writable = true;
      } catch {
        writable = false;
      }
    }

    addCheck(
      checks,
      "readable",
      "读取权限",
      readable,
      readable ? "文件可读取" : "文件不可读取",
    );
    addCheck(
      checks,
      "writable",
      "写入权限",
      writable,
      writable ? "文件可写入" : "文件不可写入",
    );
    if (!readable) {
      addIssue(issues, "file-not-readable", "目标文件不可读取");
    }
    if (!writable) {
      addIssue(issues, "file-not-writable", "目标文件不可写入");
    }

    const formatSupported = format !== "unknown";
    addCheck(
      checks,
      "format",
      "音频格式",
      formatSupported,
      formatSupported
        ? `识别为 ${format.toUpperCase()}，Writer阶段允许进入后续处理`
        : "当前只接受 FLAC、MP3、M4A",
    );
    if (!formatSupported) {
      addIssue(
        issues,
        "unsupported-format",
        "当前Writer只接受FLAC、MP3、M4A格式",
      );
    }

    const seenFields = new Set<MetadataChange["field"]>();
    changes.forEach((change, index) =>
      validateChange(change, index, seenFields, issues),
    );

    const changesOk =
      changes.length > 0 &&
      !issues.some((issue) =>
        [
          "unsupported-field",
          "duplicate-field",
          "empty-target-value",
          "unchanged-value",
          "invalid-change-kind",
          "unsafe-artwork-url",
          "invalid-artwork-url",
          "invalid-year",
        ].includes(issue.code),
      );

    addCheck(
      checks,
      "changes",
      "变更字段",
      changesOk,
      changes.length > 0
        ? `计划包含 ${changes.length} 个字段变更`
        : "未选择任何Metadata变更",
    );
    if (changes.length === 0) {
      addIssue(
        issues,
        "empty-change-plan",
        "至少需要选择一个Metadata差异",
      );
    }

    return {
      mode: "dry-run",
      ok: issues.every((issue) => issue.severity !== "error"),
      filePath,
      format,
      changeCount: changes.length,
      changes,
      checks,
      issues,
      validatedAt: Date.now(),
    };
  }
}

export const metadataWriterService = new MetadataWriterService();
