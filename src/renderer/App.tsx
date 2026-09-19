import React, { useMemo, useState } from "react";
import "./app.css";

interface LyricsInfo {
  exists: boolean;
  type: "embedded" | "external" | "none";
  format?: string;
  path?: string;
}

interface SongItem {
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  year?: number;
  genre?: string;
  cover?: string | boolean;
  lyrics?: LyricsInfo;
  quality?: {
    score: number;
    missing: string[];
  };
}

function formatDuration(seconds?: number) {
  if (!seconds) return "-";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function getMetadataStatus(song: SongItem) {
  const missing: string[] = [];
  if (!song.title) missing.push("标题");
  if (!song.artist) missing.push("艺术家");
  if (!song.album) missing.push("专辑");
  if (!song.cover) missing.push("封面");
  if (!song.lyrics?.exists) missing.push("歌词");

  if (missing.length === 0) return "完整";
  return `缺少: ${missing.join("、")}`;
}

export default function App() {
  const [status, setStatus] = useState("等待扫描音乐库...");
  const [folder, setFolder] = useState("");
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState("全部");
  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);

  const handleSelectFolder = async () => {
    try {
      if (!window.appleMetaFix) {
        setStatus("错误：Electron preload 未加载");
        return;
      }
      const selectedFolder = await window.appleMetaFix.selectFolder();
      if (!selectedFolder) return;
      setFolder(selectedFolder);
      setStatus("正在扫描音乐库...");
      const result = await window.appleMetaFix.scanFolder(selectedFolder);
      setSongs(result || []);
      setStatus(`扫描完成，共发现 ${result?.length || 0} 首歌曲`);
    } catch (error) {
      setStatus(`选择文件夹失败: ${String(error)}`);
    }
  };

  const filteredSongs = useMemo(() => songs.filter((song) => {
    const text = `${song.title || ""} ${song.artist || ""} ${song.album || ""}`.toLowerCase();
    return text.includes(keyword.toLowerCase()) && (filter === "全部" || song.path.toLowerCase().endsWith(filter));
  }), [songs, keyword, filter]);

  return (
    <main className="app-container">
      <header className="header compact-header">
        <h1>AppleMetaFix</h1>
        <p className="subtitle">Apple Music 元数据增强工具</p>
      </header>

      <section className="card toolbar-card">
        <button onClick={handleSelectFolder}>选择音乐文件夹</button>
        <div className="path">{folder || "未选择文件夹"}</div>
      </section>

      <section className="card status-card compact-card">
        <h2>扫描状态</h2>
        <p>{status}</p>
      </section>

      <section className="card song-card">
        <div className="table-header">
          <h2>歌曲列表 ({filteredSongs.length})</h2>
          <div className="filters">
            <input placeholder="搜索歌曲、艺术家、专辑" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>全部</option><option value=".flac">.flac</option><option value=".mp3">.mp3</option><option value=".m4a">.m4a</option>
            </select>
          </div>
        </div>
        <div className="table-container large-table">
          <table>
            <thead><tr><th>标题</th><th>艺术家</th><th>专辑</th><th>年份</th><th>格式</th><th>时长</th><th>标签状态</th></tr></thead>
            <tbody>{filteredSongs.map((song) => (
              <tr key={song.path} onClick={() => setSelectedSong(song)}>
                <td title={song.title}>{song.title || "-"}</td>
                <td>{song.artist || "-"}</td>
                <td>{song.album || "-"}</td>
                <td>{song.year || "-"}</td>
                <td>{song.path.split(".").pop()?.toUpperCase()}</td>
                <td>{formatDuration(song.duration)}</td>
                <td>{getMetadataStatus(song)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      {selectedSong && <aside className="card detail-panel">
        <h2>歌曲详情</h2>
        <p><b>标题：</b>{selectedSong.title || "-"}</p>
        <p><b>艺术家：</b>{selectedSong.artist || "-"}</p>
        <p><b>专辑：</b>{selectedSong.album || "-"}</p>
        <p><b>标签评分：</b>{selectedSong.quality?.score ?? "待分析"}</p>
        <p><b>歌词：</b>{selectedSong.lyrics?.type === "external" ? "外置 LRC" : selectedSong.lyrics?.type === "embedded" ? "内嵌歌词" : "无歌词"}</p>
        <p><b>路径：</b>{selectedSong.path}</p>
      </aside>}
    </main>
  );
}
