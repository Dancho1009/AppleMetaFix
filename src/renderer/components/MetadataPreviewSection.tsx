import React, { useEffect, useMemo, useState } from "react";
import type {
  MetadataPreviewField,
  MetadataPreviewItem,
} from "../../models/MetadataPreview";
import type { MetadataWriteDryRunResult } from "../../models/MetadataWriteValidation";
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
}: {
  song: LocalMetadataPreviewSource;
  confirmation: SongMatchConfirmation;
  selectedFields: MetadataPreviewField[];
  onSelectedFieldsChange: (fields: MetadataPreviewField[]) => void;
}) {
  const api: any = (window as any).appleMetaFix;
  const [dryRunning, setDryRunning] = useState(false);
  const [dryRunResult, setDryRunResult] =
    useState<MetadataWriteDryRunResult | null>(null);
  const [dryRunError, setDryRunError] = useState("");

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

  useEffect(() => {
    setDryRunResult(null);
    setDryRunError("");
  }, [changePlanSignature]);

  const toggleField = (field: MetadataPreviewField) => {
    onSelectedFieldsChange(
      selectedFields.includes(field)
        ? selectedFields.filter((item) => item !== field)
        : [...selectedFields, field],
    );
  };

  const selectChanged = () => {
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

  return (
    <section className="detail-section metadata-preview-section">
      <div className="metadata-preview-heading">
        <div>
          <h3>Metadata Preview</h3>
          <p>
            基于已确认的 Apple Music 版本生成变更计划；当前仅预览，不会写入文件。
          </p>
        </div>
        <span className="metadata-preview-status">预览模式</span>
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
          onClick={() => onSelectedFieldsChange([])}
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
