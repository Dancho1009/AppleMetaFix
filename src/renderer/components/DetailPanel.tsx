import React, {useState} from "react";

export default function DetailPanel({song,onClose}:{song:any;onClose:()=>void}){
 const api:any=(window as any).appleMetaFix;
 const [showLyrics,setShowLyrics]=useState(false);
 const cover=song.coverDataUrl || (song.coverPath ? `file:///${encodeURI(song.coverPath.replace(/\\/g,"/"))}` : "");
 const embedded=song.lyrics?.embedded?.content || song.embeddedLyrics || "";
 const external=song.lyrics?.external?.content || "";
 const lyrics=external || embedded;
 return <aside className="card detail-panel">
  <button onClick={onClose}>关闭</button>
  {cover ? <img className="detail-cover" src={cover}/> : <div className="cover-empty">暂无封面</div>}
  <h3>{song.title}</h3>
  <p>艺术家：{song.artist||"-"}</p>
  <p>专辑：{song.album||"-"}</p>
  <p>专辑艺术家：{song.albumArtist||"-"}</p>
  <p>流派：{song.genre||"-"}</p>
  <p>年份：{song.year||"-"}</p>
  <p>格式：{song.format||"-"}</p>
  <p>码率：{song.bitrate ? `${song.bitrate} kbps` : "-"}</p>
  <p>采样率：{song.sampleRate ? `${song.sampleRate} Hz` : "-"}</p>
  <p>位深：{song.bitDepth ? `${song.bitDepth} bit` : "-"}</p>
  <div className="lyrics-actions">
   <button onClick={()=>setShowLyrics(v=>!v)}>显示歌词</button>
   {song.lyricsPath && <button onClick={()=>api.openLyricsFile(song.lyricsPath)}>打开歌词文件</button>}
  </div>
  {showLyrics && <pre className="lyrics-viewer">{lyrics || "暂无歌词"}</pre>}
  <button onClick={()=>api.openFileLocation(song.path)}>打开所在文件夹</button>
 </aside>
}
