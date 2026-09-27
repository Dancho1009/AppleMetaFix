import React, { useEffect, useMemo, useState } from "react";
import type {
  MetadataPreviewField,
  MetadataPreviewItem,
} from "../../models/MetadataPreview";
import type { MetadataWriteDryRunResult } from "../../models/MetadataWriteValidation";
import type { MetadataWriteResult } from "../../models/MetadataWriteResult";
import type { SongMatchConfirmation } from "../../models/SongMatchConfirmation";
import {
  createMetadataChangePlan,
  createMetadataPreview,
  type LocalMetadataPreviewSource,
} from "../../services/MetadataPreviewService";

function displayValue(value: string) {
  return value || "-";
}

function artworkUrl(value: string) {
  if (!value) return "";
  if (value.includes("{w}x{h}")) {
    return value.replace("{w}x{h}", "160x160");
  }
  if (/^https?:\/\//i.test(value) || value.startsWith("data:image")) {
    return value;
  }
  return "file:///" + encodeURI(value.replace(/\\/g, "/"));
}

function ArtworkValue({
  item,
  side,
}: {
  item: MetadataPreviewItem;
  side: "before" | "after";
}) {
  const value = side === "before" ? item.before : item.after;
  const url = artworkUrl(value);

  if (!url) {
    return <span className="metadata-preview-empty">无封面</span>;
  }

  return (
    <img
      className="metadata-preview-artwork"
      src={url}
      alt={side === "before" ? "本地封面" : "Apple Music封面"}
    />
  );
}

export default function MetadataPreviewSection({
  song,
  confirmation,
  selectedFields,
  onSelectedFieldsChange,
  onWriteComplete,
}: {
  song: LocalMetadataPreviewSource;
  confirmation: SongMatchConfirmation;
  selectedFields: MetadataPreviewField[];
  onSelectedFieldsChange: (fields: MetadataPreviewField[]) => void;
  onWriteComplete: (result: MetadataWriteResult) => Promise<void>;
}) {
  const api: any = (window as any).appleMetaFix;
  const [dryRunning, setDryRunning] = useState(false);
  const [dryRunResult, setDryRunResult] =
    useState<MetadataWriteDryRunResult | null>(null);
  const [dryRunError, setDryRunError] = useState("");
  const [writeRunning, setWriteRunning] = useState(false);
  const [writeResult, setWriteResult] =
    useState<MetadataWriteResult | null>(null);
  const [writeError, setWriteError] = useState("");

  const preview = useMemo(
    () => createMetadataPreview(song, confirmation),
    [song, confirmation],
  );
  const selected = useMemo(
    () => new Set<MetadataPreviewField>(selectedFields),
    [selectedFields],
  );
  const changePlan = useMemo(
    () => createMetadataChangePlan(preview, selectedFields),
    [preview, selectedFields],
  );
  const changePlanSignature = useMemo(
    () => JSON.stringify(changePlan),
    [changePlan],
  );
  const flacTextWritable = useMemo(
    () =>
      changePlan.changes.length > 0 &&
      changePlan.changes.every(
        (change) =>
          change.kind === "text" &&
          change.field !== "artwork",
      ),
    [changePlan],
  );

  useEffect(() => {
    setDryRunResult(null);
    setDryRunError("");
    setWriteError("");
  }, [changePlanSignature]);

  const invalidateWriteResult = () => {
    setWriteResult(null);
    setWriteError("");
  };

  const toggleField = (field: MetadataPreviewField) => {
    invalidateWriteResult();
    onSelectedFieldsChange(
      selectedFields.includes(field)
        ? selectedFields.filter((item) => item !== field)
        : [...selectedFields, field],
    );
  };

  const selectChanged = () => {
    invalidateWriteResult();
    onSelectedFieldsChange(
      preview.items
        .filter((item) => item.selectable && item.changed)
        .map((item) => item.field),
    );
  };

  const runDryRun = async () => {
    if (changePlan.changes.length === 0) return;

    setDryRunning(true);
    setDryRunError("");
    setWriteResult(null);
    setWriteError("");

    try {
      const result = (await api.dryRunMetadataWrite(
        changePlan,
      )) as MetadataWriteDryRunResult;
      setDryRunResult(result);
    } catch (error) {
      console.error("[WRITER:UI] Dry Run失败", error);
      setDryRunResult(null);
      setDryRunError(
        error instanceof Error ? error.message : "Dry Run执行失败",
      );
    } finally {
      setDryRunning(false);
    }
  };

  const runWrite = async () => {
    if (
      !dryRunResult?.ok ||
      dryRunResult.format !== "flac" ||
      !flacTextWritable ||
      writeRunning
    ) {
      return;
    }

    const confirmed = window.confirm(
      "即将修改原FLAC文件的文本Metadata。写入前会再次执行安全校验，失败会自动回滚。是否继续？",
    );
    if (!confirmed) return;

    setWriteRunning(true);
    setWriteError("");

    try {
      const result = (await api.writeFlacTextMetadata(
        changePlan,
      )) as MetadataWriteResult;

      setWriteResult(result);
      setDryRunResult(null);

      try {
        await onWriteComplete(result);
      } catch (refreshError) {
        console.error("[WRITER:UI] 写入后刷新界面失败", refreshError);
      }
    } catch (error) {
      console.error("[WRITER:UI] FLAC写入失败", error);
      setWriteError(
        error instanceof Error ? error.message : "FLAC写入失败",
      );
    } finally {
      setWriteRunning(false);
    }
  };

  return (
    <section className="detail-section metadata-preview-section">
      <div className="metadata-preview-heading">
        <div>
          <h3>Metadata Preview</h3>
          <p>
            写入前必须先通过 Dry Run；当前实际写入仅支持 FLAC 文本字段，封面暂不写入。
          </p>
        </div>
        <span className="metadata-preview-status">FLAC Writer</span>
      </div>

      <div className="metadata-preview-summary">
        <span>差异 {preview.changedCount} 项</span>
        <span>计划写入 {changePlan.changes.length} 项</span>
        <span>区域 {preview.storefront || "-"}</span>
        <button
          className="secondary-button"
          onClick={selectChanged}
          disabled={preview.changedCount === 0}
        >
          选择全部差异
        </button>
        <button
          className="secondary-button"
          onClick={() => {
            invalidateWriteResult();
            onSelectedFieldsChange([]);
          }}
          disabled={selectedFields.length === 0}
        >
          清空选择
        </button>
        <button
          onClick={runDryRun}
          disabled={dryRunning || changePlan.changes.length === 0}
        >
          {dryRunning ? "校验中..." : "验证写入计划"}
        </button>
      </div>

      {dryRunError && (
        <div className="metadata-dry-run metadata-dry-run-error">
          <strong>Dry Run执行失败</strong>
          <p>{dryRunError}</p>
        </div>
      )}

      {dryRunResult && (
        <div
          className={[
            "metadata-dry-run",
            dryRunResult.ok
              ? "metadata-dry-run-success"
              : "metadata-dry-run-error",
          ].join(" ")}
        >
          <div className="metadata-dry-run-heading">
            <strong>
              {dryRunResult.ok
                ? "✓ Dry Run通过"
                : "✕ Dry Run未通过"}
            </strong>
            <span>
              {dryRunResult.format.toUpperCase()} ·{" "}
              {dryRunResult.changeCount} 项变更
            </span>
          </div>

          <div className="metadata-dry-run-checks">
            {dryRunResult.checks.map((check) => (
              <div
                className={
                  check.ok
                    ? "metadata-dry-run-check-ok"
                    : "metadata-dry-run-check-fail"
                }
                key={check.key}
              >
                <span>{check.ok ? "✓" : "✕"}</span>
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {dryRunResult.issues.length > 0 && (
            <div className="metadata-dry-run-issues">
              {dryRunResult.issues.map((issue, index) => (
                <p key={`${issue.code}-${issue.field || index}`}>
                  {issue.field ? `[${issue.field}] ` : ""}
                  {issue.message}
                </p>
              ))}
            </div>
          )}

          <p className="metadata-dry-run-note">
            Dry Run仅执行安全校验，没有修改音频文件。
          </p>

          {dryRunResult.ok && dryRunResult.format === "flac" && (
            flacTextWritable ? (
              <button
                className="metadata-write-button"
                onClick={runWrite}
                disabled={writeRunning}
              >
                {writeRunning
                  ? "写入并验证中..."
                  : "写入 FLAC Metadata"}
              </button>
            ) : (
              <p className="metadata-dry-run-note">
                当前首版 Writer 只支持文本字段。请取消封面选择后重新执行 Dry Run。
              </p>
            )
          )}
        </div>
      )}

      {writeError && (
        <div className="metadata-dry-run metadata-dry-run-error">
          <strong>FLAC写入失败</strong>
          <p>{writeError}</p>
        </div>
      )}

      {writeResult && (
        <div className="metadata-dry-run metadata-dry-run-success">
          <div className="metadata-dry-run-heading">
            <strong>✓ FLAC Metadata写入完成</strong>
            <span>{writeResult.changeCount} 项文本变更</span>
          </div>
          <p>
            已写入并重新读取验证：
            {writeResult.writtenFields.join("、")}
          </p>
          <p className="metadata-dry-run-note">
            原文件仅在临时副本验证通过后才被替换；写入失败会自动回滚。
          </p>
          {writeResult.warning && (
            <p className="metadata-dry-run-issues">
              {writeResult.warning}
            </p>
          )}
        </div>
      )}

      <div className="metadata-preview-list">
        {preview.items.map((item) => {
          const checked = selected.has(item.field);

          return (
            <label
              className={[
                "metadata-preview-row",
                item.changed ? "metadata-preview-row-changed" : "",
                checked ? "metadata-preview-row-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={item.field}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!item.selectable}
                onChange={() => toggleField(item.field)}
              />

              <div className="metadata-preview-label">
                <strong>{item.label}</strong>
                <span>
                  {!item.after
                    ? "Apple Music无可用值"
                    : item.changed
                      ? "将发生变化"
                      : "当前值一致"}
                </span>
              </div>

              <div className="metadata-preview-values">
                <div>
                  <span className="metadata-preview-value-label">本地</span>
                  {item.kind === "artwork" ? (
                    <ArtworkValue item={item} side="before" />
                  ) : (
                    <span>{displayValue(item.before)}</span>
                  )}
                </div>
                <span className="metadata-preview-arrow">→</span>
                <div>
                  <span className="metadata-preview-value-label">
                    Apple Music
                  </span>
                  {item.kind === "artwork" ? (
                    <ArtworkValue item={item} side="after" />
                  ) : (
                    <span>{displayValue(item.after)}</span>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}
