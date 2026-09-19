import React, { useEffect, useMemo, useState } from "react";
import "./app.css";

interface LyricsSource { exists: boolean; path?: string; content?: string; format?: string; }
interface LyricsInfo { embedded?: LyricsSource; external?: LyricsSource; }

interface SongItem {
  path:string;
  filename?:string;
  title?:string;
  artist?:string;
  album?:string;
  albumArtist?:string;
  composer?:string;
  genre?:string;
  year?:number;
  duration?:number;
  format?:string;
  bitrate?:number;
  sampleRate?:number;
  coverPath?:string;
  cover_path?:string;
  coverDataUrl?:string;
  lyrics?:LyricsInfo;
  lyricsPath?:string;
  embeddedLyrics?:string;
}

function resolveCover(song:SongItem){
 const cover:any=song.coverDataUrl||song.coverPath||song.cover_path;
 if(!cover)return "";
 if(cover.startsWith("data:image"))return cover;
 return `file:///${cover.replace(/\\/g,"/")}`;
}

function getLyricsLabel(song:SongItem){
 const r=[];
 if(song.lyrics?.embedded?.exists||song.embeddedLyrics)r.push("内嵌歌词");
 if(song.lyrics?.external?.exists||song.lyricsPath)r.push("外置歌词");
 return r.length?r.join(" + "):"无歌词";
}

function DetailPanel({song}:{song:SongItem}){
 const api:any=window.appleMetaFix;
 const [showLyrics,setShowLyrics]=useState(false);
 const lyrics=song.lyrics?.external?.content||song.lyrics?.embedded?.content||song.embeddedLyrics||"暂无歌词";
 const cover=resolveCover(song);
 return <aside className="card detail-panel">
 <h2>歌曲详情</h2>
 {cover&&<img className="detail-cover" src={cover} alt="cover"/>}
 <h3>基础信息</h3>
 <p>标题：{song.title||"-"}</p>
 <p>艺术家：{song.artist||"-"}</p>
 <p>专辑：{song.album||"-"}</p>
 <p>专辑艺术家：{song.albumArtist||"-"}</p>
 <p>作曲：{song.composer||"-"}</p>
 <p>流派：{song.genre||"-"}</p>
 <p>年份：{song.year||"-"}</p>
 <h3>音频信息</h3>
 <p>格式：{song.format||"-"}</p>
 <p>比特率：{song.bitrate||"-"}</p>
 <p>采样率：{song.sampleRate||"-"}</p>
 <h3>歌词</h3>
 <p>{getLyricsLabel(song)}</p>
 <button onClick={()=>setShowLyrics(v=>!v)}>查看歌词</button>
 {song.lyricsPath&&<button onClick={()=>api.openLyricsFile(song.lyricsPath)}>打开歌词文件</button>}
 {showLyrics&&<pre className="lyrics-viewer">{lyrics}</pre>}
 <h3>文件</h3>
 <button onClick={()=>api.openFileLocation(song.path)}>打开所在文件夹</button>
 </aside>
}

export default function App(){
 const api:any=window.appleMetaFix;
 const [folder,setFolder]=useState("");
 const [songs,setSongs]=useState<SongItem[]>([]);
 const [selectedSong,setSelectedSong]=useState<SongItem|null>(null);
 const [keyword,setKeyword]=useState("");
 const [progress,setProgress]=useState<any>(null);

 useEffect(()=>{
  const handler=(p:any)=>setProgress(p);
  api.onScanProgress?.(handler);
  return ()=>api.offScanProgress?.(handler);
 },[]);

 const selectFolder=async()=>{
  const dir=await api.selectFolder();
  if(!dir)return;
  setFolder(dir);
  setSongs(await api.scanFolder(dir)||[]);
  setProgress(null);
 };

 const selectSong=async(song:SongItem)=>{
  if(selectedSong?.path===song.path){setSelectedSong(null);return;}
  const detail=await api.getSongDetail(song.path);
  setSelectedSong({...song,...detail});
 };

 const filtered=useMemo(()=>songs.filter(s=>`${s.title}${s.artist}${s.album}`.toLowerCase().includes(keyword.toLowerCase())),[songs,keyword]);
 return <main className="app-container">
 <h1>AppleMetaFix</h1>
 <section className="card"><button onClick={selectFolder}>选择音乐文件夹</button>{folder}</section>
 {progress&&<div className="card">扫描中 {progress.current}/{progress.total} {progress.file}</div>}
 <div className="music-layout">
 <section className="card song-card">
 <input placeholder="搜索歌曲、艺术家、专辑" value={keyword} onChange={e=>setKeyword(e.target.value)}/>
 <table><thead><tr><th>标题</th><th>艺术家</th><th>专辑</th><th>歌词</th></tr></thead><tbody>{filtered.map(song=><tr key={song.path} onClick={()=>selectSong(song)}><td>{song.title}</td><td>{song.artist}</td><td>{song.album}</td><td>{getLyricsLabel(song)}</td></tr>)}</tbody></table>
 </section>
 {selectedSong&&<DetailPanel song={selectedSong}/>} 
 </div></main>;
}
