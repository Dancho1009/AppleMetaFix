import React from "react";

export interface LibraryStats {
  songs?: number;
  artists?: number;
  albums?: number;
  totalSize?: number;
  formats?: Record<string, number>;
  lyrics?: {
    embedded?: number;
    external?: number;
    missing?: number;
  };
}

function formatSize(size?: number) {
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value.toFixed(2)} ${units[index]}`;
}

export default function MusicDashboard({ stats }: { stats?: LibraryStats }) {
  if (!stats) return null;

  return (
    <section className="card dashboard compact-dashboard">
      <div className="dashboard-header">
        <h2>音乐库</h2>
        <span>
          {stats.songs || 0} 首歌曲 · {stats.artists || 0} 位艺术家 · {stats.albums || 0} 张专辑 · {formatSize(stats.totalSize)}
        </span>
      </div>

      <div className="dashboard-row">
        <span className="dashboard-label">格式</span>
        {Object.entries(stats.formats || {}).map(([name, count]) => (
          <span className="dashboard-tag" key={name}>{name} {count}</span>
        ))}
        <span className="dashboard-label lyrics-label">歌词</span>
        <span className="dashboard-tag">内嵌 {stats.lyrics?.embedded || 0}</span>
        <span className="dashboard-tag">LRC {stats.lyrics?.external || 0}</span>
        <span className="dashboard-tag">缺失 {stats.lyrics?.missing || 0}</span>
      </div>
    </section>
  );
}
