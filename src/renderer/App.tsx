import React, { useMemo, useState } from "react";
import "./app.css";

interface LyricsInfo { exists:boolean; type:"embedded"|"external"|"none"; format?:string; path?:string; }
interface SongItem { path:string; title?:string; artist?:string; album?:string; albumArtist?:string; composer?:string; genre?:string; year?:number; cover?:string|boolean; lyrics?:LyricsInfo; }

function getLyricsLabel(song:SongItem){
 const type=song.lyrics?.type;
 if(type==="embedded") return "内嵌歌词";
 if(type==="external") return "外置歌词";
 return "无歌词";
}

export default function App(){
 const [status,setStatus]=useState("等待扫描音乐库...");
 const [folder,setFolder]=useState("");
 const [songs,setSongs]=useState<SongItem[]>([]);
 const [keyword,setKeyword]=useState("");
 const [selectedSong,setSelectedSong]=useState<SongItem|null>(null);
 const api=window.appleMetaFix;

 const selectFolder=async()=>{
  if(!api){setStatus("错误：Electron preload 未加载");return;}
  const dir=await api.selectFolder();
  if(!dir)return;
  setFolder(dir);
  setStatus("正在扫描音乐库...");
  const result=await api.scanFolder(dir);
  setSongs(result||[]);
  setStatus(`扫描完成，共发现 ${result?.length||0} 首歌曲`);
 };

 const filtered=useMemo(()=>songs.filter(s=>`${s.title||""} ${s.artist||""} ${s.album||""} ${s.genre||""}`.toLowerCase().includes(keyword.toLowerCase())),[songs,keyword]);

 return <main className="app-container">
  <header className="header compact-header"><h1>AppleMetaFix</h1><p>Apple Music 元数据增强工具</p></header>
  <section className="card toolbar-card">
   <button onClick={selectFolder}>选择音乐文件夹</button>
   <span>{folder||"未选择文件夹"}</span>
  </section>

  <section className="workspace">
   <section className="card song-card">
    <div className="table-header">
     <h2>歌曲列表 ({filtered.length})</h2>
     <input placeholder="搜索歌曲、艺术家、专辑、流派" value={keyword} onChange={e=>setKeyword(e.target.value)}/>
    </div>
    <div className="table-container large-table">
     <table>
      <thead><tr><th>标题</th><th>艺术家</th><th>专辑</th><th>流派</th><th>年份</th><th>歌词</th></tr></thead>
      <tbody>{filtered.map(s=><tr key={s.path} onClick={()=>setSelectedSong(s)}>
       <td>{s.title||"-"}</td>
       <td>{s.artist||"-"}</td>
       <td>{s.album||"-"}</td>
       <td>{s.genre||"-"}</td>
       <td>{s.year||"-"}</td>
       <td>{getLyricsLabel(s)}</td>
      </tr>)}</tbody>
     </table>
    </div>
   </section>

   {selectedSong&&<aside className="card detail-panel">
    <h2>歌曲详情</h2>
    <p><b>标题：</b>{selectedSong.title||"-"}</p>
    <p><b>艺术家：</b>{selectedSong.artist||"-"}</p>
    <p><b>专辑：</b>{selectedSong.album||"-"}</p>
    <p><b>专辑艺术家：</b>{selectedSong.albumArtist||"-"}</p>
    <p><b>作曲：</b>{selectedSong.composer||"-"}</p>
    <p><b>流派：</b>{selectedSong.genre||"-"}</p>
    <p><b>年份：</b>{selectedSong.year||"-"}</p>
    <p><b>歌词：</b>{getLyricsLabel(selectedSong)}</p>
   </aside>}
  </section>
 </main>;
}
