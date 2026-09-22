import React, { useMemo, useState } from "react";
import { AppConfig } from "../../config/AppConfig";
import {
  formatDuration,
  getMatchResultFields,
  getMatchResultValue,
} from "../services/DisplayConfigService";
import SidePanel from "./SidePanel";

export default function DetailPanel({
  open,
  song,
  config,
  onClose,
}: {
  open: boolean;
  song: any;
  config: AppConfig;
  onClose: () => void;
}) {
  const api: any = (window as any).appleMetaFix;
  const [lyricsMode, setLyricsMode] = useState<"embedded" | "external">(
    "embedded",
  );
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
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
      setMatchResult(await api.matchSong(song));
    } catch (error) {
      console.error("[MATCH:UI] 匹配异常", error);
    } finally {
      setMatching(false);
    }
  };

  const appleMatch = matchResult?.match;
  const matchFields = getMatchResultFields(config);
  const scoreDetails =
    appleMatch?.scoreDetails ||
    appleMatch?.details ||
    appleMatch?.analysis ||
    {};

  const localDurationMs =
    song.durationInMillis ??
    (song.duration ? song.duration * 1000 : undefined);

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
          <h3>Apple Music</h3>
          <button onClick={matchSong} disabled={matching}>
            {matching ? "匹配中..." : "匹配 Apple Music"}
          </button>
        </div>

        {appleMatch && (
          <div className="apple-match-result">
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
      </section>

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
