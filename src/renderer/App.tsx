import React, { useMemo, useState } from "react";
import "./app.css";

interface LyricsSource { exists: boolean; path?: string; content?: string; format?: string; }
interface LyricsInfo { embedded?: LyricsSource; external?: LyricsSource; }
interface SongItem {
  path: string; title?: string; artist?: string; album?: string;
  albumArtist?: string; composer?: string; genre?: string; year?: number;
  coverPath?: string; coverExist?: boolean;
  lyrics?: LyricsInfo; lyricsPath?: string; embeddedLyrics?: string;
  format?: string; bitrate?: number; sampleRate?: number;
}

function resolveCover(coverPath?: string) {
  if (!coverPath) return "";
  if (coverPath.startsWith("data:image")) return coverPath;
  return `file:///${coverPath.replace(/\\/g, "/")}`;
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
  const cover = resolveCover(song.coverPath);
  const lyrics = song.lyrics?.external?.content || song.lyrics?.embedded?.content || song.embeddedLyrics || "暂无歌词内容";

  return <aside className="card detail-panel">
    <h2>歌曲详情</h2>
    <div className="detail-cover">
      {cover ? <img src={cover} alt="cover" onError={(e)=>((e.currentTarget.style.display="none"))}/> : "暂无封面"}
    </div>
    <section><h3>基础信息</h3>
      <p><b>标题：</b>{song.title || "-"}</p>
      <p><b>艺术家：</b>{song.artist || "-"}</p>
      <p><b>专辑：</b>{song.album || "-"}</p>
    </section>
    <section><h3>歌词</h3><p>{getLyricsLabel(song)}</p>
      <button onClick={()=>setShowLyrics(v=>!v)}>查看歌词</button>
      {song.lyricsPath && <button onClick={()=>api.openLyricsFile(song.lyricsPath)}>打开歌词文件</button>}
      {showLyrics && <pre className="lyrics-viewer">{lyrics}</pre>}
    </section>
    <section><h3>文件</h3><p className="path">{song.path}</p>
      <button onClick={()=>api.openFileLocation(song.path)}>打开所在文件夹</button>
    </section>
  </aside>;
}

export default function App(){
  const api:any=window.appleMetaFix;
  const [folder,setFolder]=useState("");
  const [songs,setSongs]=useState<SongItem[]>([]);
  const [keyword,setKeyword]=useState("");
  const [selectedSong,setSelectedSong]=useState<SongItem|null>(null);

  const selectFolder=async()=>{
    const dir=await api.selectFolder();
    if(!dir)return;
    setFolder(dir);
    const result=await api.scanFolder(dir);
    setSongs(result||[]);
  };

  const selectSong=async(song:SongItem)=>{
    const detail=await api.getSongDetail(song.path);
    setSelectedSong({...song,...(detail||{})});
  };

  const filtered=useMemo(()=>songs.filter(s=>`${s.title}${s.artist}${s.album}`.toLowerCase().includes(keyword.toLowerCase())),[songs,keyword]);

  return <main className="app-container">
    <h1>AppleMetaFix</h1><p>Apple Music 元数据增强工具</p>
    <section className="card"><button onClick={selectFolder}>选择音乐文件夹</button>{folder}</section>
    <div className="music-layout"><section className="card song-card">
      <input placeholder="搜索歌曲、艺术家、专辑" value={keyword} onChange={e=>setKeyword(e.target.value)}/>
      <table><tbody>{filtered.map(song=><tr key={song.path} onClick={()=>selectSong(song)}><td>{song.title}</td><td>{song.artist}</td><td>{song.album}</td><td>{getLyricsLabel(song)}</td></tr>)}</tbody></table>
    </section>{selectedSong&&<DetailPanel song={selectedSong}/>}</div>
  </main>;
}
