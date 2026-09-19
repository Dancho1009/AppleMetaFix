import React, { useMemo, useState } from "react";
import "./app.css";

interface LyricsSource { exists: boolean; path?: string; content?: string; format?: string; }
interface LyricsInfo { embedded?: LyricsSource; external?: LyricsSource; }
interface SongItem {
  path: string; title?: string; artist?: string; album?: string;
  albumArtist?: string; composer?: string; genre?: string; year?: number;
  coverDataUrl?: string; lyrics?: LyricsInfo; lyricsPath?: string;
  embeddedLyrics?: string; format?: string; bitrate?: number; sampleRate?: number;
}

function normalizeCover(value?: string) {
  if (!value) return "";
  if (value.startsWith("data:image")) return value;
  if (value.startsWith("/9j/")) return `data:image/jpeg;base64,${value}`;
  if (value.startsWith("iVBOR")) return `data:image/png;base64,${value}`;
  return value;
}

function getLyricsLabel(song: SongItem) {
  const result: string[] = [];
  if (song.lyrics?.embedded?.exists || song.embeddedLyrics) result.push("内嵌歌词");
  if (song.lyrics?.external?.exists || song.lyricsPath) result.push("外置歌词");
  return result.length ? result.join(" + ") : "无歌词";
}

function DetailPanel({ song }: { song: SongItem }) {
  const api: any = window.appleMetaFix;
  const [showLyrics, setShowLyrics] = useState(false);
  const lyrics = song.lyrics?.external?.content || song.lyrics?.embedded?.content || song.embeddedLyrics || "暂无歌词内容";
  const cover = normalizeCover(song.coverDataUrl);

  return <aside className="card detail-panel">
    <h2>歌曲详情</h2>
    <div className="detail-cover">{cover ? <img src={cover} alt="cover" /> : "暂无封面"}</div>
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
      <p><b>码率：</b>{song.bitrate ? `${song.bitrate} kbps` : "-"}</p>
      <p><b>采样率：</b>{song.sampleRate ? `${song.sampleRate} Hz` : "-"}</p>
    </section>
    <section><h3>歌词</h3>
      <p>{getLyricsLabel(song)}</p>
      <button onClick={() => setShowLyrics(v => !v)}>{showLyrics ? "收起歌词" : "查看歌词"}</button>
      {song.lyricsPath && <button onClick={() => api.openLyricsFile(song.lyricsPath)}>打开歌词文件</button>}
      {showLyrics && <pre className="lyrics-viewer">{lyrics}</pre>}
    </section>
    <section><h3>文件</h3>
      <p className="path">{song.path}</p>
      <button onClick={() => api.openFileLocation(song.path)}>打开所在文件夹</button>
    </section>
  </aside>;
}

export default function App() {
  const api: any = window.appleMetaFix;
  const [folder, setFolder] = useState("");
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);
  const [status, setStatus] = useState("等待扫描音乐库...");

  const selectFolder = async () => {
    const dir = await api.selectFolder();
    if (!dir) return;
    setFolder(dir);
    const result = await api.scanFolder(dir);
    setSongs(result || []);
    setStatus(`扫描完成，共发现 ${result?.length || 0} 首歌曲`);
  };

  const selectSong = async (song: SongItem) => {
    if (selectedSong?.path === song.path) {
      setSelectedSong(null);
      return;
    }

    try {
      console.log("[Detail Load]", song.path);
      const detail = await api.getSongDetail(song.path);
      console.log("[Detail Result]", detail);
      setSelectedSong({ ...song, ...(detail || {}) });
    } catch (error) {
      console.error("加载歌曲详情失败", error);
      setSelectedSong(song);
    }
  };

  const filtered = useMemo(() => songs.filter(s => `${s.title}${s.artist}${s.album}`.toLowerCase().includes(keyword.toLowerCase())), [songs, keyword]);

  return <main className="app-container">
    <h1>AppleMetaFix</h1><p>Apple Music 元数据增强工具</p>
    <section className="card"><button onClick={selectFolder}>选择音乐文件夹</button>{folder}</section>
    <div className="music-layout"><section className="card song-card">
      <input placeholder="搜索歌曲、艺术家、专辑" value={keyword} onChange={e => setKeyword(e.target.value)} />
      <table><thead><tr><th>标题</th><th>艺术家</th><th>专辑</th><th>歌词</th></tr></thead><tbody>
      {filtered.map(song => <tr key={song.path} className={selectedSong?.path === song.path ? "selected-row" : ""} onClick={() => selectSong(song)}><td>{song.title}</td><td>{song.artist}</td><td>{song.album}</td><td>{getLyricsLabel(song)}</td></tr>)}
      </tbody></table>
    </section>{selectedSong && <DetailPanel song={selectedSong}/>}</div>
    <p>{status}</p>
  </main>;
}
