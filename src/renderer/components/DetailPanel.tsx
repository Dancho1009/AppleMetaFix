import React, { useMemo, useState } from "react";
import { AppConfig } from "../../config/AppConfig";
import type { MatchPipelineResult } from "../../services/MetadataMatchPipeline";
import type { MatchResult } from "../../services/MetadataMatchService";
import type { MetadataPreviewField } from "../../models/MetadataPreview";
import type { SongMatchConfirmation } from "../../models/SongMatchConfirmation";
import {
  formatDuration,
  getMatchResultFields,
  getMatchResultValue,
} from "../services/DisplayConfigService";
import MetadataPreviewSection from "./MetadataPreviewSection";
import SidePanel from "./SidePanel";

function getCandidateKey(candidate: MatchResult, index: number) {
  const { track } = candidate;
  return [
    track.storefront || "unknown",
    track.id || track.isrc || `${track.title || "track"}-${index}`,
  ].join(":");
}

function getConfidenceLabel(confidence: MatchResult["confidence"]) {
  if (confidence === "high") return "高";
  if (confidence === "medium") return "中";
  return "低";
}

function getIdentityLabel(candidate: MatchResult) {
  if (candidate.identity.level === "danger") return "高风险";
  if (candidate.identity.level === "warning") return "需确认";
  return "身份一致";
}

export default function DetailPanel({
  open,
  song,
  config,
  matchResult,
  selectedCandidateKey,
  confirmation,
  previewSelectedFields,
  onPreviewSelectedFieldsChange,
  onMatchResultChange,
  onSelectCandidate,
  onConfirmCandidate,
  onClose,
}: {
  open: boolean;
  song: any;
  config: AppConfig;
  matchResult: MatchPipelineResult | null;
  selectedCandidateKey?: string;
  confirmation: SongMatchConfirmation | null;
  previewSelectedFields: MetadataPreviewField[];
  onPreviewSelectedFieldsChange: (fields: MetadataPreviewField[]) => void;
  onMatchResultChange: (result: MatchPipelineResult) => void;
  onSelectCandidate: (candidateKey: string) => void;
  onConfirmCandidate: (
    candidate: MatchResult,
  ) => Promise<SongMatchConfirmation>;
  onClose: () => void;
}) {
  const api: any = (window as any).appleMetaFix;
  const [lyricsMode, setLyricsMode] = useState<"embedded" | "external">(
    "embedded",
  );
  const [matching, setMatching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const cover =
    song.coverDataUrl ||
    (song.coverPath
      ? "file:///" + encodeURI(song.coverPath.replace(/\\/g, "/"))
      : "");
  const embedded =
    song.lyrics?.embedded?.content || song.embeddedLyrics || "";
  const external = song.lyrics?.external?.content || "";
  const lyrics = useMemo(
    () => (lyricsMode === "external" ? external : embedded),
    [lyricsMode, embedded, external],
  );

  const matchSong = async () => {
    setMatching(true);
    try {
      const result = await api.matchSong(song);
      onMatchResultChange(result);
    } catch (error) {
      console.error("[MATCH:UI] 匹配异常", error);
    } finally {
      setMatching(false);
    }
  };

  const candidates = matchResult?.candidates ?? [];
  const recommended = matchResult?.match ?? null;
  const selectedCandidateIndex = candidates.findIndex(
    (candidate, index) =>
      getCandidateKey(candidate, index) === selectedCandidateKey,
  );
  const hasSelectedCandidate = selectedCandidateIndex >= 0;
  const selectedCandidate = hasSelectedCandidate
    ? candidates[selectedCandidateIndex]
    : recommended;
  const appleMatch = selectedCandidate ?? null;
  const isCurrentConfirmed = Boolean(
    appleMatch &&
      confirmation &&
      appleMatch.track.id === confirmation.track.id &&
      (appleMatch.track.storefront || "unknown") ===
        (confirmation.track.storefront || "unknown"),
  );
  const matchFields = getMatchResultFields(config);
  const scoreDetails =
    appleMatch?.scoreDetails ||
    (appleMatch as any)?.details ||
    (appleMatch as any)?.analysis ||
    {};

  const localDurationMs =
    song.durationInMillis ??
    (song.duration ? song.duration * 1000 : undefined);

  const confirmCurrentCandidate = async () => {
    if (!appleMatch || isCurrentConfirmed) return;

    setConfirming(true);
    setConfirmError("");

    try {
      await onConfirmCandidate(appleMatch);
    } catch (error) {
      console.error("[MATCH:UI] 保存确认结果失败", error);
      setConfirmError(
        error instanceof Error ? error.message : "保存确认结果失败",
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <SidePanel
      open={open}
      title={song.title || "未知标题"}
      subtitle={song.artist || "未知艺术家"}
      onClose={onClose}
      width="wide"
      footer={
        <div className="detail-actions">
          {song.lyricsPath && (
            <button onClick={() => api.openLyricsFile(song.lyricsPath)}>
              打开歌词文件
            </button>
          )}
          <button onClick={() => api.openFileLocation(song.path)}>
            打开所在文件夹
          </button>
        </div>
      }
    >
      <div className="detail-hero">
        {cover ? (
          <img className="detail-cover" src={cover} alt="cover" />
        ) : (
          <div className="cover-empty">暂无封面</div>
        )}
      </div>

      <section className="detail-section metadata-block">
        <h3>本地 Metadata</h3>
        <p>艺术家：{song.artist || "-"}</p>
        <p>专辑：{song.album || "-"}</p>
        <p>专辑艺术家：{song.albumArtist || "-"}</p>
        <p>作曲家：{song.composer || "-"}</p>
        <p>流派：{song.genre || "-"}</p>
        <p>年份：{song.year || "-"}</p>
        <p>时长：{localDurationMs ? formatDuration(localDurationMs) : "-"}</p>
      </section>

      <section className="detail-section match-section">
        <div className="detail-section-heading">
          <div>
            <h3>Apple Music</h3>
            {matchResult && (
              <span className="match-source">
                来源：{matchResult.source === "cache" ? "缓存" : "Apple Music"}
              </span>
            )}
          </div>
          <button onClick={matchSong} disabled={matching}>
            {matching ? "匹配中..." : matchResult ? "重新匹配" : "匹配 Apple Music"}
          </button>
        </div>

        {confirmation && (
          <div className="confirmed-match-card">
            <div className="confirmed-match-heading">
              <strong>已确认匹配</strong>
              <span>✓ 已持久化</span>
            </div>
            <p>{confirmation.track.title || "未知标题"}</p>
            <p>
              {confirmation.track.artist || "未知艺术家"} ·{" "}
              {confirmation.track.album || "未知专辑"}
            </p>
            <div className="confirmed-match-meta">
              <span>{confirmation.score} 分</span>
              <span>
                置信度：{getConfidenceLabel(confirmation.confidence)}
              </span>
              <span>
                区域：{confirmation.track.storefront || "-"}
              </span>
              <span>
                确认时间：
                {new Date(confirmation.confirmedAt).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {appleMatch && (
          <div className="apple-match-result">
            <div className="match-summary">
              <div>
                <strong>
                  {hasSelectedCandidate ? "当前选择" : "系统推荐"}
                </strong>
                <span className="match-score">{appleMatch.score} 分</span>
                <span className={`confidence-badge confidence-${appleMatch.confidence}`}>
                  置信度：{getConfidenceLabel(appleMatch.confidence)}
                </span>
              </div>
              <span
                className={`identity-badge identity-badge-${appleMatch.identity.level}`}
              >
                {getIdentityLabel(appleMatch)}
              </span>
            </div>

            <div className="match-confirm-actions">
              {isCurrentConfirmed ? (
                <span className="confirmed-current-badge">
                  ✓ 当前版本已确认
                </span>
              ) : (
                <button
                  onClick={confirmCurrentCandidate}
                  disabled={confirming || !appleMatch.track.id}
                >
                  {confirming ? "确认中..." : "确认当前版本"}
                </button>
              )}
              {confirmError && (
                <span className="match-confirm-error">{confirmError}</span>
              )}
            </div>

            {appleMatch.identity.level !== "none" && (
              <div
                className={`identity-warning identity-warning-${appleMatch.identity.level}`}
              >
                <strong>
                  {appleMatch.identity.level === "danger"
                    ? "版本身份风险较高"
                    : "请确认歌曲版本"}
                </strong>
                {appleMatch.identity.reasons.map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
              </div>
            )}

            {matchFields.map((field) => {
              let value = getMatchResultValue(appleMatch, field.key);

              if (field.key === "durationInMillis" && value !== "-") {
                value = formatDuration(Number(value));
              }

              if (field.key === "artwork" && value !== "-") {
                return (
                  <div className="apple-artwork-field" key={field.key}>
                    <p>{field.label}</p>
                    <img
                      className="detail-cover apple-detail-cover"
                      src={String(value).replace("{w}x{h}", "300x300")}
                      alt="apple artwork"
                    />
                  </div>
                );
              }

              return (
                <p key={field.key}>
                  {field.label}：{String(value)}
                </p>
              );
            })}

            <details className="match-analysis">
              <summary>查看评分详情</summary>
              <div>
                {Object.keys(scoreDetails).length > 0 ? (
                  Object.entries(scoreDetails).map(([key, value]: any) => (
                    <p key={key}>
                      {key}：
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </p>
                  ))
                ) : (
                  <p>暂无评分分析数据</p>
                )}
              </div>
            </details>
          </div>
        )}

        {candidates.length > 0 && (
          <div className="candidate-list">
            <div className="candidate-list-heading">
              <h4>候选版本</h4>
              <span>共 {candidates.length} 个，按匹配分数排序</span>
            </div>

            {candidates.map((candidate, index) => {
              const key = getCandidateKey(candidate, index);
              const isRecommended =
                recommended?.track.id === candidate.track.id &&
                recommended?.track.storefront === candidate.track.storefront;
              const isSelected = hasSelectedCandidate
                ? selectedCandidateKey === key
                : isRecommended;
              const isConfirmed =
                confirmation?.track.id === candidate.track.id &&
                (confirmation?.track.storefront || "unknown") ===
                  (candidate.track.storefront || "unknown");
              const artwork = candidate.track.artwork?.replace(
                "{w}x{h}",
                "120x120",
              );

              return (
                <article
                  className={`candidate-card ${isSelected ? "candidate-card-selected" : ""}`}
                  key={key}
                >
                  {artwork ? (
                    <img
                      className="candidate-artwork"
                      src={artwork}
                      alt="candidate artwork"
                    />
                  ) : (
                    <div className="candidate-artwork candidate-artwork-empty">
                      无封面
                    </div>
                  )}

                  <div className="candidate-content">
                    <div className="candidate-title-row">
                      <div>
                        <strong>{candidate.track.title || "未知标题"}</strong>
                        {isRecommended && (
                          <span className="recommended-badge">系统推荐</span>
                        )}
                        {isConfirmed && (
                          <span className="confirmed-candidate-badge">
                            已确认
                          </span>
                        )}
                      </div>
                      <span className="candidate-score">
                        {candidate.score} 分
                      </span>
                    </div>

                    <p>{candidate.track.artist || "未知艺术家"}</p>
                    <p>{candidate.track.album || "未知专辑"}</p>

                    <div className="candidate-meta">
                      <span>
                        置信度：{getConfidenceLabel(candidate.confidence)}
                      </span>
                      <span>区域：{candidate.track.storefront || "-"}</span>
                      <span
                        className={`identity-text identity-text-${candidate.identity.level}`}
                      >
                        {getIdentityLabel(candidate)}
                      </span>
                    </div>

                    {candidate.identity.level !== "none" && (
                      <div className="candidate-warning">
                        {candidate.identity.reasons.join("；")}
                      </div>
                    )}

                    <button
                      className={isSelected ? "secondary-button" : ""}
                      disabled={isSelected}
                      onClick={() => onSelectCandidate(key)}
                    >
                      {isSelected ? "已选择" : "选择此版本"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {matchResult && candidates.length === 0 && (
          <p className="empty-match-result">没有找到可用的 Apple Music 候选结果。</p>
        )}
      </section>

      {confirmation && (
        <MetadataPreviewSection
          song={song}
          confirmation={confirmation}
          selectedFields={previewSelectedFields}
          onSelectedFieldsChange={onPreviewSelectedFieldsChange}
        />
      )}

      <section className="detail-section audio-info-block">
        <h3>音频信息</h3>
        <p>格式：{song.format || "-"}</p>
        <p>码率：{song.bitrate ? String(song.bitrate) + " kbps" : "-"}</p>
        <p>
          采样率：{song.sampleRate ? String(song.sampleRate) + " Hz" : "-"}
        </p>
        <p>位深：{song.bitDepth ? String(song.bitDepth) + " bit" : "-"}</p>
        <p>
          大小：
          {song.size ? (song.size / 1024 / 1024).toFixed(2) + " MB" : "-"}
        </p>
      </section>

      <section className="detail-section lyrics-section">
        <h3>歌词</h3>
        <div className="lyrics-actions">
          <button
            className={lyricsMode === "embedded" ? "active" : ""}
            onClick={() => setLyricsMode("embedded")}
          >
            内嵌歌词
          </button>
          <button
            className={lyricsMode === "external" ? "active" : ""}
            onClick={() => setLyricsMode("external")}
          >
            外置LRC
          </button>
        </div>
        <pre className="lyrics-viewer">{lyrics || "暂无歌词"}</pre>
      </section>
    </SidePanel>
  );
}
