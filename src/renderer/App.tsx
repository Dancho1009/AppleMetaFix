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
  albumArtist?: string;
  composer?: string;
  genre?: string;
  year?: number;
  cover?: string | boolean;
  coverDataUrl?: string;
  lyrics?: LyricsInfo;
  format?: string;
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
}

function getLyricsLabel(song: SongItem) {
  if (song.lyrics?.type === "embedded") return "内嵌歌词";
  if (song.lyrics?.type === "external") return "外置歌词";
  return "无歌词";
}

function DetailPanel({ song }: { song: SongItem }) {
  return <aside className="card detail-panel">
    <h2>歌曲详情</h2>
    <div className="detail-cover">
      {song.coverDataUrl ? <img src={song.coverDataUrl} /> : "暂无封面"}
    </div>
    <section><h3>基础信息</h3>
      <p><b>标题：</b>{song.title || "-"}</p>
      <p><b>艺术家：</b>{song.artist || "-"}</p>
      <p><b>专辑：</b>{song.album || "-"}</p>
      <p><b>专辑艺术家：</b>{song.albumArtist || "-"}</p>
    </section>
    <section><h3>Metadata</h3>
      <p><b>作曲：</b>{song.composer || "-"}</p>
      <p><b>流派：</b>{song.genre || "-"}</p>
      <p><b>年份：</b>{song.year || "-"}</p>
    </section>
    <section><h3>音频信息</h3>
      <p><b>格式：</b>{song.format || "-"}</p>
      <p><b>码率：</b>{song.bitrate || "-"}</p>
      <p><b>采样率：</b>{song.sampleRate || "-"}</p>
    </section>
    <section><h3>歌词</h3><p>{getLyricsLabel(song)}</p></section>
    <section><h3>文件</h3><p className="path">{song.path}</p></section>
  </aside>;
}

export default function App() {
  const [folder, setFolder] = useState("");
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);
  const [status, setStatus] = useState("等待扫描音乐库...");
  const api: any = window.appleMetaFix;

  const selectFolder = async () => {
    const dir = await api.selectFolder();
    if (!dir) return;
    setFolder(dir);
    setStatus("正在扫描音乐库...");
    const result = await api.scanFolder(dir);
    setSongs(result || []);
    setStatus(`扫描完成，共发现 ${result?.length || 0} 首歌曲`);
  };

  const selectSong = async (song: SongItem) => {
    try {
      const detail = await api.getSongDetail(song.path);
      setSelectedSong(detail || song);
    } catch {
      setSelectedSong(song);
    }
  };

  const filtered = useMemo(() => songs.filter(s => `${s.title} ${s.artist} ${s.album} ${s.genre}`.toLowerCase().includes(keyword.toLowerCase())), [songs, keyword]);

  return <main className="app-container">
    <header className="header compact-header"><h1>AppleMetaFix</h1><p>Apple Music 元数据增强工具</p></header>
    <section className="card toolbar-card"><button onClick={selectFolder}>选择音乐文件夹</button><span>{folder || "未选择文件夹"}</span></section>
    <div className="music-layout">
      <section className="card song-card">
        <div className="table-header"><h2>歌曲列表 ({filtered.length})</h2><input placeholder="搜索歌曲、艺术家、专辑、流派" value={keyword} onChange={e=>setKeyword(e.target.value)} /></div>
        <div className="table-container large-table"><table><thead><tr><th>标题</th><th>艺术家</th><th>专辑</th><th>流派</th><th>年份</th><th>歌词</th></tr></thead><tbody>
        {filtered.map(song=><tr key={song.path} className={selectedSong?.path===song.path?"selected-row":""} onClick={()=>selectSong(song)}><td>{song.title||"-"}</td><td>{song.artist||"-"}</td><td>{song.album||"-"}</td><td>{song.genre||"-"}</td><td>{song.year||"-"}</td><td>{getLyricsLabel(song)}</td></tr>)}
        </tbody></table></div>
      </section>
      {selectedSong && <DetailPanel song={selectedSong}/>} 
    </div>
    <p>{status}</p>
  </main>;
}
