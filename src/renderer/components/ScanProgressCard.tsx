import React from "react";

export default function ScanProgressCard({ progress }: { progress: any }) {
  if (!progress) return null;

  const percent = progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <section className="card">
      <h2>扫描状态</h2>
      <p>阶段：{progress.phase}</p>
      <progress value={percent} max={100} />
      <p>{percent}% ({progress.current}/{progress.total})</p>
      <p>当前文件：{progress.file || "-"}</p>
      {progress.stats && (
        <div>
          <p>歌曲：{progress.stats.songs}</p>
          <p>艺术家：{progress.stats.artists}</p>
          <p>专辑：{progress.stats.albums}</p>
          <p>封面：{progress.stats.coverCount}</p>
          <p>歌词：{progress.stats.lyricsCount}</p>
        </div>
      )}
    </section>
  );
}
