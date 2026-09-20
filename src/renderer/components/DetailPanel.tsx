import React, {useMemo, useState} from "react";
import {formatDuration, getMatchResultFields, getMatchResultValue} from "../services/DisplayConfigService";

export default function DetailPanel({song,onClose}:{song:any;onClose:()=>void}){
 const api:any=(window as any).appleMetaFix;
 const [lyricsMode,setLyricsMode]=useState<"embedded"|"external">("embedded");
 const [matching,setMatching]=useState(false);
 const [matchResult,setMatchResult]=useState<any>(null);
 const cover=song.coverDataUrl || (song.coverPath ? `file:///${encodeURI(song.coverPath.replace(/\\/g,"/"))}` : "");

 const embedded=song.lyrics?.embedded?.content || song.embeddedLyrics || "";
 const external=song.lyrics?.external?.content || "";
 const lyrics=useMemo(()=>lyricsMode==="external" ? external : embedded,[lyricsMode,embedded,external]);

 const matchSong=async()=>{
  console.log("[MATCH:UI] 点击匹配", song);
  setMatching(true);
  try{
   const result=await api.matchSong(song);
   console.log("[MATCH:UI] 返回结果", result);
   setMatchResult(result);
  }catch(error){
   console.error("[MATCH:UI] 匹配异常", error);
  }finally{
   setMatching(false);
  }
 };

 const matchFields=getMatchResultFields();
 const appleMatch=matchResult?.match;

 return <aside className="card detail-panel">
  <button onClick={onClose}>关闭</button>

  {cover ? <img className="detail-cover" src={cover} alt="cover"/> : <div className="cover-empty">暂无封面</div>}

  <h3>{song.title||"未知标题"}</h3>

  <section className="metadata-block">
   <p>艺术家：{song.artist||"-"}</p>
   <p>专辑：{song.album||"-"}</p>
   <p>专辑艺术家：{song.albumArtist||"-"}</p>
   <p>作曲家：{song.composer||"-"}</p>
   <p>流派：{song.genre||"-"}</p>
   <p>年份：{song.year||"-"}</p>
  </section>

  <section className="match-section">
   <button onClick={matchSong} disabled={matching}>
    {matching ? "匹配中..." : "匹配 Apple Music"}
   </button>

   {appleMatch && <div>
    <h4>Apple Music结果</h4>
    {matchFields.map(field=>{
      let value=getMatchResultValue(appleMatch, field.key);
      if(field.key === "durationInMillis") value=formatDuration(value);
      if(field.key === "artwork" && value !== "-") {
        return <div key={field.key}>
          <p>{field.label}</p>
          <img className="detail-cover" src={value.replace("{w}x{h}", "300x300")} alt="apple artwork"/>
        </div>;
      }
      return <p key={field.key}>{field.label}：{value}</p>;
    })}
    <p>艺术家：{appleMatch.track?.artist || "-"}</p>
   </div>}
  </section>

  <section className="audio-info-block">
   <p>格式：{song.format||"-"}</p>
   <p>码率：{song.bitrate ? `${song.bitrate} kbps` : "-"}</p>
   <p>采样率：{song.sampleRate ? `${song.sampleRate} Hz` : "-"}</p>
   <p>位深：{song.bitDepth ? `${song.bitDepth} bit` : "-"}</p>
   <p>大小：{song.size ? `${(song.size/1024/1024).toFixed(2)} MB` : "-"}</p>
  </section>

  <section className="lyrics-section">
   <h4>歌词</h4>
   <div className="lyrics-actions">
    <button className={lyricsMode==="embedded"?"active":""} onClick={()=>setLyricsMode("embedded")}>内嵌歌词</button>
    <button className={lyricsMode==="external"?"active":""} onClick={()=>setLyricsMode("external")}>外置LRC</button>
   </div>
   <pre className="lyrics-viewer">{lyrics || "暂无歌词"}</pre>
  </section>

  <div className="detail-actions">
   {song.lyricsPath&&<button onClick={()=>api.openLyricsFile(song.lyricsPath)}>打开歌词文件</button>}
   <button onClick={()=>api.openFileLocation(song.path)}>打开所在文件夹</button>
  </div>
 </aside>
}
