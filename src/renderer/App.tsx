import React, { useEffect, useMemo, useState } from "react";
import "./app.css";
import MusicDashboard, { LibraryStats } from "./components/MusicDashboard";

interface LyricsSource { exists:boolean; path?:string; content?:string; format?:string; }
interface LyricsInfo { embedded?:LyricsSource; external?:LyricsSource; }
interface SongItem {
 path:string; filename?:string; title?:string; artist?:string; album?:string;
 format?:string; coverPath?:string; cover_path?:string; coverDataUrl?:string;
 lyrics?:LyricsInfo; lyricsPath?:string; embeddedLyrics?:string;
}

function resolveCover(song:SongItem){
 if(song.coverDataUrl?.startsWith("data:image")) return song.coverDataUrl;
 const cover=song.coverPath||song.cover_path;
 if(!cover)return "";
 return `file:///${encodeURI(cover.replace(/\\/g,"/"))}`;
}

function getLyricsLabel(song:SongItem){
 const r=[];
 if(song.lyrics?.embedded?.exists||song.embeddedLyrics)r.push("内嵌");
 if(song.lyrics?.external?.exists||song.lyricsPath)r.push("LRC");
 return r.length?r.join(" + "):"无歌词";
}

function DetailPanel({song,onClose}:{song:SongItem;onClose:()=>void}){
 const api:any=window.appleMetaFix;
 return <aside className="card detail-panel">
  <button onClick={onClose}>关闭</button>
  {resolveCover(song)&&<img className="detail-cover" src={resolveCover(song)} alt="cover"/>}
  {!resolveCover(song)&&<div className="cover-empty">暂无封面</div>}
  <h3>{song.title}</h3>
  <p>艺术家：{song.artist}</p><p>专辑：{song.album}</p><p>格式：{song.format}</p>
  <p>歌词：{getLyricsLabel(song)}</p>
  {song.lyricsPath&&<button onClick={()=>api.openLyricsFile(song.lyricsPath)}>打开歌词文件</button>}
  <button onClick={()=>api.openFileLocation(song.path)}>打开所在文件夹</button>
 </aside>
}

export default function App(){
 const api:any=window.appleMetaFix;
 const [folder,setFolder]=useState("");
 const [songs,setSongs]=useState<SongItem[]>([]);
 const [selectedSong,setSelectedSong]=useState<SongItem|null>(null);
 const [keyword,setKeyword]=useState("");
 const [scanProgress,setScanProgress]=useState<any>(null);
 const [scanDone,setScanDone]=useState(false);
 const [dashboard,setDashboard]=useState<LibraryStats|null>(null);
 const [filter,setFilter]=useState("");

 useEffect(()=>{
  api.onScanProgress((progress:any)=>{
   setScanProgress(progress);
   setScanDone(false);
   if(progress.stats)setDashboard(progress.stats);
  });
 },[]);

 const selectFolder=async()=>{
  const dir=await api.selectFolder();
  if(!dir)return;
  setFolder(dir);setDashboard(null);setScanDone(false);
  const result=await api.scanFolder(dir)||[];
  setSongs(result);
  setScanDone(true);
 };

 const filtered=useMemo(()=>songs.filter(s=>{
  const text=`${s.title}${s.artist}${s.album}`.toLowerCase();
  if(!text.includes(keyword.toLowerCase()))return false;
  if(filter==="lyrics" )return !!(s.lyricsPath||s.embeddedLyrics);
  if(filter==="cover")return !resolveCover(s);
  return true;
 }),[songs,keyword,filter]);

 return <main className="app-container">
  <h1>AppleMetaFix</h1>
  <section className="card folder-bar"><button onClick={selectFolder}>选择音乐文件夹</button><span>{folder}</span></section>
  {scanProgress&& !scanDone && <section className="card scan-card"><strong>扫描中</strong><span>阶段：{scanProgress.phase}</span><span>{scanProgress.current||0}/{scanProgress.total||0}</span></section>}
  {scanDone&&<section className="scan-finished">✓ 扫描完成 {songs.length} 首歌曲</section>}
  <MusicDashboard stats={dashboard||scanProgress?.stats} onFilter={setFilter}/>
  <div className="music-layout">
   <section className="card song-card">
    <input className="search-box" placeholder="搜索歌曲、艺术家、专辑" value={keyword} onChange={e=>setKeyword(e.target.value)}/>
    <table><thead><tr><th>封面</th><th>标题</th><th>艺术家</th><th>专辑</th><th>歌词</th></tr></thead>
    <tbody>{filtered.map(song=><tr key={song.path} onClick={()=>setSelectedSong(song)}><td><img className="table-cover" src={resolveCover(song)} /></td><td>{song.title}</td><td>{song.artist}</td><td>{song.album}</td><td>{getLyricsLabel(song)}</td></tr>)}</tbody></table>
   </section>
   {selectedSong&&<DetailPanel song={selectedSong} onClose={()=>setSelectedSong(null)}/>} 
  </div>
 </main>;
}
