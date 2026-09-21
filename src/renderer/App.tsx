import React, { useEffect, useMemo, useState } from "react";
import "./app.css";
import MusicDashboard, { LibraryStats } from "./components/MusicDashboard";
import DetailPanel from "./components/DetailPanel";
import SettingsPanel from "./components/SettingsPanel";
import {
  AppConfig,
  DEFAULT_APP_CONFIG,
  normalizeAppConfig,
} from "../config/AppConfig";

interface SongItem {
  path: string;
  filename?: string;
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  composer?: string;
  genre?: string;
  year?: number;
  format?: string;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  size?: number;
  coverPath?: string;
  cover_path?: string;
  coverDataUrl?: string;
  lyrics?: any;
  lyricsPath?: string;
  embeddedLyrics?: string;
}

function resolveCover(song: SongItem) {
  if (song.coverDataUrl?.startsWith("data:image")) return song.coverDataUrl;
  const cover = song.coverPath || song.cover_path;
  if (!cover) return "";
  return "file:///" + encodeURI(cover.replace(/\\/g, "/"));
}

function getLyricsLabel(song: SongItem) {
  const result: string[] = [];
  if (song.lyrics?.embedded?.exists || song.embeddedLyrics) result.push("内嵌");
  if (song.lyrics?.external?.exists || song.lyricsPath) result.push("LRC");
  return result.length ? result.join(" + ") : "无歌词";
}

export default function App() {
  const api: any = (window as any).appleMetaFix;
  const [folder, setFolder] = useState("");
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [scanProgress, setScanProgress] = useState<any>(null);
  const [scanDone, setScanDone] = useState(false);
  const [dashboard, setDashboard] = useState<LibraryStats | null>(null);
  const [filter, setFilter] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig>(() =>
    normalizeAppConfig(DEFAULT_APP_CONFIG),
  );
  const rowRefs = React.useRef<Record<string, HTMLTableRowElement | null>>({});

  const selectSong = (song: SongItem) => {
    setSelectedSong(song);
    setSelectedSongId(song.path);
  };

  const filtered = useMemo(
    () =>
      songs.filter((song) => {
        const text = (
          String(song.title ?? "") +
          String(song.artist ?? "") +
          String(song.album ?? "") +
          String(song.genre ?? "")
        ).toLowerCase();

        if (!text.includes(keyword.toLowerCase())) return false;
        if (filter === "lyrics") {
          return Boolean(song.lyricsPath || song.embeddedLyrics);
        }
        if (filter === "cover") return !resolveCover(song);
        return true;
      }),
    [songs, keyword, filter],
  );

  useEffect(() => {
    api.getConfig()
      .then((loaded: AppConfig) => setConfig(normalizeAppConfig(loaded)))
      .catch((error: unknown) =>
        console.error("[CONFIG:UI] 读取配置失败", error),
      );

    api.onConfigChanged((next: AppConfig) => {
      setConfig(normalizeAppConfig(next));
    });
  }, []);

  useEffect(() => {
    api.onScanProgress((progress: any) => {
      setScanProgress(progress);
      setScanDone(false);
      if (progress.stats) setDashboard(progress.stats);
    });
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (settingsOpen) return;
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (!selectedSongId) return;

      const index = filtered.findIndex((song) => song.path === selectedSongId);
      if (index < 0) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

      event.preventDefault();
      const nextIndex = event.key === "ArrowDown" ? index + 1 : index - 1;
      if (nextIndex < 0 || nextIndex >= filtered.length) return;

      selectSong(filtered[nextIndex]);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedSongId, filtered, settingsOpen]);

  useEffect(() => {
    if (selectedSongId) {
      rowRefs.current[selectedSongId]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedSongId]);

  const selectFolder = async () => {
    const dir = await api.selectFolder();
    if (!dir) return;

    setFolder(dir);
    setDashboard(null);
    setScanDone(false);

    const result = (await api.scanFolder(dir)) || [];
    setSongs(result);
    setScanDone(true);
  };

  return (
    <main className="app-container">
      <div className="app-header">
        <h1>AppleMetaFix</h1>
        <button
          className="settings-button"
          onClick={() => setSettingsOpen(true)}
        >
          ⚙ 设置
        </button>
      </div>

      <section className="card folder-bar">
        <button onClick={selectFolder}>选择音乐文件夹</button>
        <span>{folder}</span>
      </section>

      {scanProgress && !scanDone && (
        <section className="card scan-card">
          <strong>扫描中</strong>
          <span>阶段：{scanProgress.phase}</span>
          <span>
            {scanProgress.current || 0}/{scanProgress.total || 0}
          </span>
        </section>
      )}

      {scanDone && (
        <section className="scan-finished">
          ✓ 扫描完成 {songs.length} 首歌曲
        </section>
      )}

      <MusicDashboard
        stats={dashboard || scanProgress?.stats}
        onFilter={setFilter}
      />

      <div className="music-layout">
        <section className="card song-card">
          <input
            className="search-box"
            placeholder="搜索歌曲、艺术家、专辑、流派"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />

          <div className="song-table-container">
            <table>
              <thead>
                <tr>
                  <th>封面</th>
                  <th>标题</th>
                  <th>艺术家</th>
                  <th>专辑</th>
                  <th>流派</th>
                  <th>歌词</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((song) => (
                  <tr
                    ref={(element) => {
                      rowRefs.current[song.path] = element;
                    }}
                    className={
                      selectedSongId === song.path ? "selected-song" : ""
                    }
                    key={song.path}
                    onClick={() => selectSong(song)}
                  >
                    <td>
                      <img className="table-cover" src={resolveCover(song)} />
                    </td>
                    <td>{song.title}</td>
                    <td>{song.artist}</td>
                    <td>{song.album}</td>
                    <td>{song.genre || "-"}</td>
                    <td>{getLyricsLabel(song)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedSong && (
        <DetailPanel
          key={selectedSong.path}
          open={!settingsOpen}
          song={selectedSong}
          config={config}
          onClose={() => setSelectedSong(null)}
        />
      )}

      <SettingsPanel
        open={settingsOpen}
        config={config}
        onClose={() => setSettingsOpen(false)}
        onSaved={setConfig}
      />
    </main>
  );
}
