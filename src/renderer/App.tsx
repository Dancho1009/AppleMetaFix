import React, { useMemo, useState } from "react";
import "./app.css";

interface LyricsInfo { exists:boolean; type:"embedded"|"external"|"none"; format?:string; path?:string; }
interface SongItem {
 path:string; title?:string; artist?:string; album?:string; duration?:number; year?:number;
 cover?:string|boolean; lyrics?:LyricsInfo;
 quality?:{score:number; missing:string[]};
}

function getMetadataStatus(song:SongItem){
 const missing:string[]=[];
 if(!song.title) missing.push("标题");
 if(!song.artist) missing.push("艺术家");
 if(!song.album) missing.push("专辑");
 if(!song.cover) missing.push("封面");
 if(!song.lyrics?.exists) missing.push("歌词");
 return missing.length ? `缺少: ${missing.join("、")}` : "完整";
}

export default function App(){
 const [status,setStatus]=useState("等待扫描音乐库...");
 const [folder,setFolder]=useState("");
 const [songs,setSongs]=useState<SongItem[]>([]);
 const [keyword,setKeyword]=useState("");
 const [filter,setFilter]=useState("全部");
 const [selectedSong,setSelectedSong]=useState<SongItem|null>(null);
 const [selected,setSelected]=useState<string[]>([]);

 const api=window.appleMetaFix;

 const selectFolder=async()=>{
  if(!api){setStatus("错误：Electron preload 未加载");return;}
  const dir=await api.selectFolder();
  if(!dir)return;
  setFolder(dir);
  setStatus("正在扫描音乐库...");
  const result=await api.scanFolder(dir);
  setSongs(result||[]);
  setSelected([]);
  setStatus(`扫描完成，共发现 ${result?.length||0} 首歌曲`);
 };

 const filtered=useMemo(()=>songs.filter(s=>{
  const text=`${s.title||""} ${s.artist||""} ${s.album||""}`.toLowerCase();
  return text.includes(keyword.toLowerCase())&&(filter==="全部"||s.path.toLowerCase().endsWith(filter));
 }),[songs,keyword,filter]);

 const toggle=(path:string)=>setSelected(v=>v.includes(path)?v.filter(x=>x!==path):[...v,path]);
 const toggleAll=()=>setSelected(selected.length===filtered.length?[]:filtered.map(s=>s.path));

 const completeCount=songs.filter(s=>getMetadataStatus(s)==="完整").length;
 const lyricCount=songs.filter(s=>s.lyrics?.exists).length;
 const coverCount=songs.filter(s=>!!s.cover).length;

 return <main className="app-container">
  <header className="header compact-header"><h1>AppleMetaFix</h1><p>Apple Music 元数据增强工具</p></header>

  <section className="card toolbar-card">
   <button onClick={selectFolder}>选择音乐文件夹</button>
   <span>{folder||"未选择文件夹"}</span>
  </section>

  <section className="card compact-card"><h2>扫描状态</h2><p>{status}</p></section>

  <section className="card compact-card">
   <h2>音乐库统计</h2>
   <p>歌曲：{songs.length}　完整标签：{completeCount}　歌词：{lyricCount}　封面：{coverCount}</p>
  </section>

  <div className="workspace">
   <section className="card song-card">
    <div className="table-header">
     <h2>歌曲列表 ({filtered.length})</h2>
     <input placeholder="搜索歌曲、艺术家、专辑" value={keyword} onChange={e=>setKeyword(e.target.value)}/>
     <select value={filter} onChange={e=>setFilter(e.target.value)}>
      <option>全部</option><option value=".flac">FLAC</option><option value=".mp3">MP3</option><option value=".m4a">M4A</option>
     </select>
    </div>

    <div className="batch-toolbar">
     <button onClick={toggleAll}>{selected.length===filtered.length&&filtered.length?"取消全选":"全选当前"}</button>
     <span>已选择 {selected.length} 首</span>
     <button>批量匹配</button>
     <button>批量修复</button>
    </div>

    <div className="table-container large-table">
     <table>
      <thead><tr><th></th><th>标题</th><th>艺术家</th><th>专辑</th><th>歌词</th><th>评分</th></tr></thead>
      <tbody>{filtered.map(s=><tr className={selectedSong?.path===s.path?"selected-row":""} key={s.path} onClick={()=>setSelectedSong(s)}>
       <td><input type="checkbox" checked={selected.includes(s.path)} onClick={e=>e.stopPropagation()} onChange={()=>toggle(s.path)}/></td>
       <td>{s.title||"-"}</td><td>{s.artist||"-"}</td><td>{s.album||"-"}</td>
       <td>{s.lyrics?.type||"none"}</td><td>{s.quality?.score??"-"}</td>
      </tr>)}</tbody>
     </table>
    </div>
   </section>

   {selectedSong&&<aside className="card detail-panel">
    <h2>歌曲详情</h2>
    <p><b>标题：</b>{selectedSong.title||"-"}</p>
    <p><b>艺术家：</b>{selectedSong.artist||"-"}</p>
    <p><b>专辑：</b>{selectedSong.album||"-"}</p>
    <p><b>状态：</b>{getMetadataStatus(selectedSong)}</p>
    <p><b>歌词：</b>{selectedSong.lyrics?.type||"none"}</p>
    <p><b>标签评分：</b>{selectedSong.quality?.score??"待分析"}/100</p>
    <button>打开文件夹</button>
    <button>打开歌词文件</button>
    <button>匹配 Apple Music</button>
   </aside>}
  </div>
 </main>;
}
