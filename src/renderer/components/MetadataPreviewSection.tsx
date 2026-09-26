import React, { useEffect, useMemo, useState } from "react";
import type {
  MetadataPreviewField,
  MetadataPreviewItem,
} from "../../models/MetadataPreview";
import type { SongMatchConfirmation } from "../../models/SongMatchConfirmation";
import {
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
}: {
  song: LocalMetadataPreviewSource;
  confirmation: SongMatchConfirmation;
}) {
  const preview = useMemo(
    () => createMetadataPreview(song, confirmation),
    [song, confirmation],
  );
  const [selectedFields, setSelectedFields] = useState<MetadataPreviewField[]>(
    [],
  );

  useEffect(() => {
    setSelectedFields(
      preview.items
        .filter((item) => item.selectable && item.selectedByDefault)
        .map((item) => item.field),
    );
  }, [
    preview.filePath,
    preview.appleMusicTrackId,
    preview.storefront,
  ]);

  const selected = useMemo(
    () => new Set<MetadataPreviewField>(selectedFields),
    [selectedFields],
  );

  const toggleField = (field: MetadataPreviewField) => {
    setSelectedFields((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field],
    );
  };

  const selectChanged = () => {
    setSelectedFields(
      preview.items
        .filter((item) => item.selectable && item.changed)
        .map((item) => item.field),
    );
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
        <span>已选择 {selectedFields.length} 项</span>
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
          onClick={() => setSelectedFields([])}
          disabled={selectedFields.length === 0}
        >
          清空选择
        </button>
      </div>

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
                  {!item.selectable
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
