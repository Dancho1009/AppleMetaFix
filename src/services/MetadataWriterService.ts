import {
  accessSync,
  constants,
  existsSync,
  lstatSync,
} from "node:fs";
import { parseFile } from "music-metadata";
import { getSongByPath } from "../database/songRepository";
import type {
  MetadataChange,
  MetadataChangePlan,
} from "../models/MetadataChangePlan";
import type {
  MetadataWriteCheck,
  MetadataWriteDryRunResult,
  MetadataWriteValidationIssue,
} from "../models/MetadataWriteValidation";
import {
  detectMetadataWriteFormat,
  validateMetadataChangePlanStructure,
} from "./MetadataWritePlanValidator";
import { songMatchConfirmationService } from "./SongMatchConfirmationService";

function addCheck(
  checks: MetadataWriteCheck[],
  key: MetadataWriteCheck["key"],
  label: string,
  ok: boolean,
  detail: string,
) {
  checks.push({ key, label, ok, detail });
}

function addError(
  issues: MetadataWriteValidationIssue[],
  code: string,
  message: string,
) {
  issues.push({
    code,
    severity: "error",
    message,
  });
}

function text(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function currentMetadataValue(
  field: MetadataChange["field"],
  common: Awaited<ReturnType<typeof parseFile>>["common"],
): string | null {
  switch (field) {
    case "title":
      return text(common.title);
    case "artist":
      return text(common.artist);
    case "album":
      return text(common.album);
    case "year":
      return text(common.year);
    case "genre":
      return text(common.genre?.[0]);
    case "composer":
      return text(common.composer?.[0]);
    case "artwork":
      return null;
  }
}

export class MetadataWriterService {
  async dryRun(
    plan: MetadataChangePlan,
  ): Promise<MetadataWriteDryRunResult> {
    const checks: MetadataWriteCheck[] = [];
    const structuralIssues =
      validateMetadataChangePlanStructure(plan);
    const issues = [...structuralIssues];
    const filePath =
      typeof plan?.filePath === "string"
        ? plan.filePath.trim()
        : "";
    const changes = Array.isArray(plan?.changes) ? plan.changes : [];
    const format = detectMetadataWriteFormat(filePath);

    const planOk = !structuralIssues.some((issue) =>
      [
        "missing-file-path",
        "missing-apple-music-id",
        "missing-storefront",
      ].includes(issue.code),
    );
    addCheck(
      checks,
      "plan",
      "写入计划",
      planOk,
      planOk ? "写入计划基础信息完整" : "写入计划基础信息不完整",
    );

    const librarySong = filePath ? getSongByPath(filePath) : null;
    const libraryOk = Boolean(librarySong);
    addCheck(
      checks,
      "library",
      "歌曲库记录",
      libraryOk,
      libraryOk
        ? "目标文件已在AppleMetaFix歌曲库中"
        : "目标文件不在歌曲库中",
    );
    if (!libraryOk) {
      addError(
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
      confirmation?.track.id === plan?.appleMusicTrackId &&
      (confirmation?.track.storefront || "unknown") ===
        (plan?.storefront || "unknown");

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
      addError(
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
      addError(issues, "file-not-found", "目标文件不存在");
    }

    let regularFile = false;
    if (fileExists) {
      try {
        regularFile = lstatSync(filePath).isFile();
      } catch {
        regularFile = false;
      }
    }
    addCheck(
      checks,
      "regular-file",
      "普通文件",
      regularFile,
      regularFile
        ? "目标是普通文件"
        : "目标不是普通文件，符号链接和目录均不允许",
    );
    if (fileExists && !regularFile) {
      addError(
        issues,
        "not-regular-file",
        "目标路径必须是普通文件，不能是目录或符号链接",
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

    if (fileExists && regularFile && !readable) {
      addError(issues, "file-not-readable", "目标文件不可读取");
    }
    if (fileExists && regularFile && !writable) {
      addError(issues, "file-not-writable", "目标文件不可写入");
    }

    const formatSupported = format !== "unknown";
    addCheck(
      checks,
      "format",
      "音频格式",
      formatSupported,
      formatSupported
        ? `识别为 ${format.toUpperCase()}，允许进入Writer后续阶段`
        : "当前只接受FLAC、MP3、M4A",
    );

    let parsedMetadata:
      | Awaited<ReturnType<typeof parseFile>>
      | null = null;

    if (fileExists && regularFile && readable) {
      try {
        parsedMetadata = await parseFile(filePath);
      } catch {
        parsedMetadata = null;
      }
    }

    const audioMetadataOk = Boolean(parsedMetadata);
    addCheck(
      checks,
      "audio-metadata",
      "音频Metadata读取",
      audioMetadataOk,
      audioMetadataOk
        ? "已重新读取目标音频Metadata"
        : "无法重新读取目标音频Metadata",
    );
    if (fileExists && regularFile && readable && !audioMetadataOk) {
      addError(
        issues,
        "metadata-read-failed",
        "目标文件无法被music-metadata正常解析",
      );
    }

    const textChanges = changes.filter(
      (change) => change?.field !== "artwork",
    );
    const staleFields =
      parsedMetadata === null
        ? []
        : textChanges
            .filter((change) => {
              const current = currentMetadataValue(
                change.field,
                parsedMetadata.common,
              );
              return current !== null && current !== text(change.before);
            })
            .map((change) => change.field);

    const sourceMetadataOk =
      parsedMetadata !== null && staleFields.length === 0;
    addCheck(
      checks,
      "source-metadata",
      "源Metadata一致性",
      sourceMetadataOk,
      parsedMetadata === null
        ? "无法验证源Metadata"
        : staleFields.length === 0
          ? "当前文件Metadata与Preview生成时一致"
          : `以下字段已发生变化：${staleFields.join("、")}`,
    );
    if (parsedMetadata !== null && staleFields.length > 0) {
      addError(
        issues,
        "source-metadata-changed",
        "目标文件Metadata在Preview生成后发生变化，请重新扫描或重新生成Preview",
      );
    }

    const changesOk =
      changes.length > 0 &&
      !structuralIssues.some((issue) =>
        ![
          "missing-file-path",
          "missing-apple-music-id",
          "missing-storefront",
          "unsupported-format",
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
